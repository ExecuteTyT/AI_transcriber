import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_db
from app.models.ai_analysis import AiAnalysis
from app.models.subscription import Subscription
from app.models.transcription import Transcription
from app.models.user import User
from app.services.audit_log import audit

router = APIRouter(prefix="/api/admin", tags=["admin"])


async def _count_admins(db: AsyncSession) -> int:
    """Сколько сейчас активных админов. Используется для last-admin guard."""
    result = await db.execute(
        select(func.count()).select_from(User).where(User.is_admin == True)  # noqa: E712
    )
    return result.scalar_one()


# ─── Schemas ───

class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    plan: str
    minutes_used: int
    minutes_limit: int
    # Welcome-бонус (180 мин при регистрации). У free-юзеров расход списывается
    # СНАЧАЛА отсюда, и только после исчерпания растёт minutes_used — поэтому без
    # этого поля админка показывала «0 / 0» даже у активно расходующих free.
    bonus_minutes: int = 0
    is_admin: bool
    is_unlimited: bool
    is_email_verified: bool
    created_at: datetime | None
    transcription_count: int = 0

    model_config = {"from_attributes": True}


class AdminUserUpdate(BaseModel):
    name: str | None = None
    plan: str | None = None
    minutes_used: int | None = None
    minutes_limit: int | None = None
    is_admin: bool | None = None
    is_unlimited: bool | None = None


class AdminTranscriptionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str = ""
    title: str
    status: str
    language: str | None
    duration_sec: int | None
    original_filename: str
    created_at: datetime | None
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class PeriodStats(BaseModel):
    """KPI за период (today/yesterday/last_7d/last_30d/all)."""

    transcriptions: int = 0      # создано транскрипций
    minutes: int = 0             # минут обработано (сумма длительности завершённых)
    new_users: int = 0           # регистраций
    active_users: int = 0        # уникальных юзеров, делавших транскрипцию
    failed: int = 0              # сбоев (status=failed)


class StatsOverview(BaseModel):
    total_users: int
    total_transcriptions: int
    total_analyses: int
    total_minutes_used: int
    users_by_plan: dict[str, int]
    transcriptions_by_status: dict[str, int]
    users_today: int
    transcriptions_today: int
    # Бизнес-аналитика: KPI по периодам + повторные пользователи (≥2 транскрипций).
    periods: dict[str, PeriodStats] = {}
    repeat_users: int = 0


class TimeseriesPoint(BaseModel):
    date: str          # YYYY-MM-DD (UTC)
    signups: int = 0
    transcriptions: int = 0


class FailureItem(BaseModel):
    id: uuid.UUID
    user_email: str | None = None
    title: str = ""
    error_message: str | None = None
    original_filename: str = ""
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class FailuresResponse(BaseModel):
    counts: dict[str, int]      # today / last_7d / total
    items: list[FailureItem]


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int


# ─── Stats ───

async def _period_stats(
    db: AsyncSession, start: datetime | None, end: datetime | None = None
) -> PeriodStats:
    """KPI за окно [start, end). start=None → всё время."""
    def _win(col):
        conds = []
        if start is not None:
            conds.append(col >= start)
        if end is not None:
            conds.append(col < end)
        return conds

    transcriptions = (await db.execute(
        select(func.count(Transcription.id)).where(*_win(Transcription.created_at))
    )).scalar() or 0
    minutes_sec = (await db.execute(
        select(func.coalesce(func.sum(Transcription.duration_sec), 0)).where(
            Transcription.status == "completed", *_win(Transcription.created_at)
        )
    )).scalar() or 0
    new_users = (await db.execute(
        select(func.count(User.id)).where(*_win(User.created_at))
    )).scalar() or 0
    active_users = (await db.execute(
        select(func.count(func.distinct(Transcription.user_id))).where(
            *_win(Transcription.created_at)
        )
    )).scalar() or 0
    failed = (await db.execute(
        select(func.count(Transcription.id)).where(
            Transcription.status == "failed", *_win(Transcription.created_at)
        )
    )).scalar() or 0

    return PeriodStats(
        transcriptions=transcriptions,
        minutes=int(minutes_sec // 60),
        new_users=new_users,
        active_users=active_users,
        failed=failed,
    )


@router.get("/stats", response_model=StatsOverview)
async def get_stats(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Общая статистика сервиса."""
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_transcriptions = (await db.execute(select(func.count(Transcription.id)))).scalar() or 0
    total_analyses = (await db.execute(select(func.count(AiAnalysis.id)))).scalar() or 0
    total_minutes = (await db.execute(select(func.coalesce(func.sum(User.minutes_used), 0)))).scalar() or 0

    users_today = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= today)
    )).scalar() or 0

    transcriptions_today = (await db.execute(
        select(func.count(Transcription.id)).where(Transcription.created_at >= today)
    )).scalar() or 0

    # Users by plan
    plan_rows = (await db.execute(
        select(User.plan, func.count(User.id)).group_by(User.plan)
    )).all()
    users_by_plan = {row[0]: row[1] for row in plan_rows}

    # Transcriptions by status
    status_rows = (await db.execute(
        select(Transcription.status, func.count(Transcription.id)).group_by(Transcription.status)
    )).all()
    transcriptions_by_status = {row[0]: row[1] for row in status_rows}

    # KPI по периодам
    yesterday = today - timedelta(days=1)
    periods = {
        "today": await _period_stats(db, today),
        "yesterday": await _period_stats(db, yesterday, today),
        "last_7d": await _period_stats(db, now - timedelta(days=7)),
        "last_30d": await _period_stats(db, now - timedelta(days=30)),
        "all": await _period_stats(db, None),
    }

    # Повторные пользователи: ≥2 транскрипций (вовлечённость/возврат).
    repeat_subq = (
        select(Transcription.user_id)
        .group_by(Transcription.user_id)
        .having(func.count(Transcription.id) >= 2)
        .subquery()
    )
    repeat_users = (await db.execute(select(func.count()).select_from(repeat_subq))).scalar() or 0

    return StatsOverview(
        total_users=total_users,
        total_transcriptions=total_transcriptions,
        total_analyses=total_analyses,
        total_minutes_used=total_minutes,
        users_by_plan=users_by_plan,
        transcriptions_by_status=transcriptions_by_status,
        users_today=users_today,
        transcriptions_today=transcriptions_today,
        periods=periods,
        repeat_users=repeat_users,
    )


@router.get("/stats/timeseries", response_model=list[TimeseriesPoint])
async def get_stats_timeseries(
    days: int = Query(30, ge=1, le=90),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Регистрации и транскрипции по дням за последние `days` дней (для графика)."""
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    signup_rows = (await db.execute(
        select(func.date(User.created_at), func.count(User.id))
        .where(User.created_at >= start)
        .group_by(func.date(User.created_at))
    )).all()
    tr_rows = (await db.execute(
        select(func.date(Transcription.created_at), func.count(Transcription.id))
        .where(Transcription.created_at >= start)
        .group_by(func.date(Transcription.created_at))
    )).all()

    # func.date может вернуть date или строку (PG vs SQLite) — нормализуем в ISO.
    def _key(d) -> str:
        return d.isoformat() if hasattr(d, "isoformat") else str(d)[:10]

    signups = {_key(d): c for d, c in signup_rows}
    transcriptions = {_key(d): c for d, c in tr_rows}

    out: list[TimeseriesPoint] = []
    for i in range(days):
        day = (start + timedelta(days=i)).date().isoformat()
        out.append(TimeseriesPoint(
            date=day,
            signups=signups.get(day, 0),
            transcriptions=transcriptions.get(day, 0),
        ))
    return out


@router.get("/failures", response_model=FailuresResponse)
async def get_failures(
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Последние сбои транскрибации + счётчики (видимость без чтения логов)."""
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    async def _count(start: datetime | None) -> int:
        conds = [Transcription.status == "failed"]
        if start is not None:
            conds.append(Transcription.created_at >= start)
        return (await db.execute(
            select(func.count(Transcription.id)).where(*conds)
        )).scalar() or 0

    counts = {
        "today": await _count(today),
        "last_7d": await _count(now - timedelta(days=7)),
        "total": await _count(None),
    }

    rows = (await db.execute(
        select(Transcription, User.email)
        .join(User, Transcription.user_id == User.id, isouter=True)
        .where(Transcription.status == "failed")
        .order_by(Transcription.created_at.desc())
        .limit(limit)
    )).all()
    items = [
        FailureItem(
            id=t.id,
            user_email=email,
            title=t.title,
            error_message=t.error_message,
            original_filename=t.original_filename,
            created_at=t.created_at,
        )
        for t, email in rows
    ]
    return FailuresResponse(counts=counts, items=items)


# ─── Users ───

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str = Query("", description="Поиск по email или имени"),
    plan: str = Query("", description="Фильтр по плану"),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Список пользователей с пагинацией."""
    query = select(User)
    count_query = select(func.count(User.id))

    if search:
        search_filter = User.email.ilike(f"%{search}%") | User.name.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if plan:
        query = query.where(User.plan == plan)
        count_query = count_query.where(User.plan == plan)

    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    users = result.scalars().all()

    items = []
    for u in users:
        t_count = (await db.execute(
            select(func.count(Transcription.id)).where(Transcription.user_id == u.id)
        )).scalar() or 0
        items.append({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "plan": u.plan,
            "minutes_used": u.minutes_used,
            "minutes_limit": u.minutes_limit,
            "bonus_minutes": u.bonus_minutes,
            "is_admin": u.is_admin,
            "is_unlimited": u.is_unlimited,
            "is_email_verified": u.is_email_verified,
            "created_at": u.created_at,
            "transcription_count": t_count,
        })

    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Детали пользователя."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Пользователь не найден")

    t_count = (await db.execute(
        select(func.count(Transcription.id)).where(Transcription.user_id == user_id)
    )).scalar() or 0

    return AdminUserResponse(
        id=user.id, email=user.email, name=user.name, plan=user.plan,
        minutes_used=user.minutes_used, minutes_limit=user.minutes_limit,
        bonus_minutes=user.bonus_minutes,
        is_admin=user.is_admin, is_unlimited=user.is_unlimited,
        is_email_verified=user.is_email_verified,
        created_at=user.created_at, transcription_count=t_count,
    )


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: AdminUserUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Обновить пользователя (план, лимиты, админ-права).

    Last-admin guard: запрещаем демоутить последнего админа — иначе система
    остаётся без управления. Все изменения логируются в audit (actor, target,
    field, old, new) — компрометированный админ-аккаунт не сможет тихо
    повысить attacker'а до is_admin.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Пользователь не найден")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return await get_user(user_id, admin, db)

    # Last-admin guard: если демоутим админа — проверяем что он не последний.
    if "is_admin" in update_data and user.is_admin and not update_data["is_admin"]:
        active_admins = await _count_admins(db)
        if active_admins <= 1:
            raise HTTPException(
                400,
                "Нельзя снять админ-права с последнего администратора — "
                "сначала назначьте другого админа",
            )

    # Снапшот старых значений ДО изменений — нужен для audit log.
    old_snapshot = {key: getattr(user, key, None) for key in update_data.keys()}

    for key, value in update_data.items():
        setattr(user, key, value)
    await db.commit()
    await db.refresh(user)

    # Audit: одна запись на изменение, диффом по каждому полю.
    for key, new_value in update_data.items():
        if old_snapshot.get(key) != new_value:
            audit(
                "admin_user_updated",
                actor_id=str(admin.id),
                target_user_id=str(user.id),
                field=key,
                old=str(old_snapshot.get(key)) if old_snapshot.get(key) is not None else None,
                new=str(new_value) if new_value is not None else None,
            )

    return await get_user(user_id, admin, db)


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Удалить пользователя и все его данные."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    if user.id == admin.id:
        raise HTTPException(400, "Нельзя удалить самого себя")
    # Last-admin guard: удаление другого админа допустимо, только если ты не
    # делаешь систему «без админов» (но self-delete уже выше запрещено).
    if user.is_admin:
        active_admins = await _count_admins(db)
        if active_admins <= 1:
            raise HTTPException(400, "Нельзя удалить последнего администратора")

    # Сохраняем для audit ДО удаления (после CASCADE user.email недоступен).
    target_email = user.email
    target_was_admin = user.is_admin

    await db.delete(user)
    await db.commit()

    audit(
        "admin_user_deleted",
        actor_id=str(admin.id),
        target_user_id=str(user_id),
        target_email=target_email,
        target_was_admin=target_was_admin,
    )
    return {"message": "Пользователь удалён"}


# ─── Transcriptions ───

@router.get("/transcriptions")
async def list_transcriptions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: str = Query("", description="Фильтр по статусу"),
    user_id: uuid.UUID | None = Query(None, description="Фильтр по пользователю"),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Все транскрипции с пагинацией."""
    query = select(Transcription)
    count_query = select(func.count(Transcription.id))

    if status:
        query = query.where(Transcription.status == status)
        count_query = count_query.where(Transcription.status == status)
    if user_id:
        query = query.where(Transcription.user_id == user_id)
        count_query = count_query.where(Transcription.user_id == user_id)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Transcription.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    transcriptions = result.scalars().all()

    items = []
    for t in transcriptions:
        # Get user email
        user_result = await db.execute(select(User.email).where(User.id == t.user_id))
        user_email = user_result.scalar() or ""
        items.append({
            "id": t.id,
            "user_id": t.user_id,
            "user_email": user_email,
            "title": t.title,
            "status": t.status,
            "language": t.language,
            "duration_sec": t.duration_sec,
            "original_filename": t.original_filename,
            "created_at": t.created_at,
            "completed_at": t.completed_at,
        })

    return {"items": items, "total": total, "page": page, "per_page": per_page}


@router.delete("/transcriptions/{transcription_id}")
async def delete_transcription(
    transcription_id: uuid.UUID,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Удалить транскрипцию."""
    result = await db.execute(select(Transcription).where(Transcription.id == transcription_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Транскрипция не найдена")
    owner_user_id = t.user_id
    await db.delete(t)
    await db.commit()
    audit(
        "admin_transcription_deleted",
        actor_id=str(admin.id),
        transcription_id=str(transcription_id),
        target_user_id=str(owner_user_id),
    )
    return {"message": "Транскрипция удалена"}
