import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_db
from app.models.ai_analysis import AiAnalysis
from app.models.subscription import Subscription
from app.models.transcription import Transcription
from app.models.user import User

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ─── Schemas ───

class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    plan: str
    minutes_used: int
    minutes_limit: int
    is_admin: bool
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


class StatsOverview(BaseModel):
    total_users: int
    total_transcriptions: int
    total_analyses: int
    total_minutes_used: int
    users_by_plan: dict[str, int]
    transcriptions_by_status: dict[str, int]
    users_today: int
    transcriptions_today: int


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int


# ─── Stats ───

@router.get("/stats", response_model=StatsOverview)
async def get_stats(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Общая статистика сервиса."""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

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

    return StatsOverview(
        total_users=total_users,
        total_transcriptions=total_transcriptions,
        total_analyses=total_analyses,
        total_minutes_used=total_minutes,
        users_by_plan=users_by_plan,
        transcriptions_by_status=transcriptions_by_status,
        users_today=users_today,
        transcriptions_today=transcriptions_today,
    )


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
            "is_admin": u.is_admin,
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
        is_admin=user.is_admin, is_email_verified=user.is_email_verified,
        created_at=user.created_at, transcription_count=t_count,
    )


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: AdminUserUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Обновить пользователя (план, лимиты, админ-права)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Пользователь не найден")

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        for key, value in update_data.items():
            setattr(user, key, value)
        await db.commit()
        await db.refresh(user)

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

    await db.delete(user)
    await db.commit()
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
    await db.delete(t)
    await db.commit()
    return {"message": "Транскрипция удалена"}
