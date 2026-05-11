"""Refresh-token lifecycle: issue / consume_and_rotate / revoke (RFC 6819 §5.2.2.3).

Stateful журнал в `refresh_tokens` поверх stateless JWT. На каждый /refresh
делаем atomic UPDATE consumed_at=NOW() WHERE consumed_at IS NULL — если
rowcount=0, кто-то нас опередил, это reuse-атака → revoke whole family.
"""
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.refresh_token import (
    REVOKE_REUSE_FAMILY,
    RefreshToken,
)
from app.services.audit_log import audit
from app.services.auth import create_refresh_token, decode_token, hash_jti

logger = logging.getLogger(__name__)


# ─── Exceptions ────────────────────────────────────────────────────────────

class InvalidToken(Exception):
    """Подпись битая / нет jti / type != refresh / истёк exp."""


class TokenRevoked(Exception):
    """Запись в БД помечена revoked (logout/password change/reuse family)."""


class TokenReused(Exception):
    """🚨 Токен уже был использован для rotate — взломанная сессия.

    Caller должен trigger revoke_family и потребовать re-login на 401.
    """


# ─── Internal helpers ──────────────────────────────────────────────────────

def _jti_prefix(jti: str) -> str:
    """Первые 8 hex — достаточно для разделения в audit, не раскрывает токен."""
    return jti[:8]


# ─── Public API ────────────────────────────────────────────────────────────

async def issue_refresh_token(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    ip: str | None = None,
    user_agent: str | None = None,
    replaced_by: uuid.UUID | None = None,
) -> tuple[str, datetime]:
    """Создаёт JWT с jti + строку в refresh_tokens. Возвращает (token, expires_at).

    Без db.commit() — caller сам коммитит. Это нужно чтобы login/register
    могли запихнуть issue + другие операции (welcome email, consents) в одну
    транзакцию.
    """
    token, jti, expires_at = create_refresh_token(str(user_id))
    record = RefreshToken(
        user_id=user_id,
        jti_hash=hash_jti(jti),
        created_at=datetime.now(timezone.utc),
        expires_at=expires_at,
        replaced_by_id=replaced_by,
        ip_address=ip,
        user_agent=user_agent,
    )
    db.add(record)
    await db.flush()  # получаем record.id для возможного chain ниже
    audit(
        "refresh_token_issued",
        user_id=str(user_id),
        jti_prefix=_jti_prefix(jti),
        ip=ip,
    )
    return token, expires_at


async def consume_and_rotate(
    db: AsyncSession,
    *,
    token: str,
    ip: str | None = None,
    user_agent: str | None = None,
) -> tuple[str, datetime, uuid.UUID]:
    """Decode → atomic consume → issue new linked via replaced_by_id.

    Returns:
        (new_token, new_expires_at, user_id)

    Raises:
        InvalidToken, TokenRevoked, TokenReused
    """
    # 1) Decode + базовая валидация payload.
    payload = decode_token(token)
    if payload is None or payload.get("type") != "refresh":
        raise InvalidToken("decode failed or wrong type")
    jti = payload.get("jti")
    sub = payload.get("sub")
    if not jti or not sub:
        # Старые pre-rotation токены без jti — приземляются сюда.
        raise InvalidToken("missing jti or sub claim")
    try:
        user_uuid = uuid.UUID(sub)
    except (ValueError, TypeError):
        raise InvalidToken("invalid sub")

    jti_h = hash_jti(jti)

    # 2) Найти запись.
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.jti_hash == jti_h)
    )
    record = result.scalar_one_or_none()
    if record is None:
        # JWT валиден, но записи нет — либо токен issued до rotation-фикса
        # (hard rollover), либо запись удалена cleanup'ом, либо forged.
        raise InvalidToken("no record")
    if record.user_id != user_uuid:
        # JWT decoded'ится с тем же ключом, но sub в payload не совпадает
        # с user_id в БД — корруптовано / атака. Не должно происходить.
        raise InvalidToken("user mismatch")
    if record.revoked_at is not None:
        raise TokenRevoked()

    # 3) 🚨 Reuse detection: если consumed_at уже стоит — токен взломан.
    if record.consumed_at is not None:
        await revoke_family(db, starting_record_id=record.id, reason=REVOKE_REUSE_FAMILY)
        await db.commit()
        audit(
            "refresh_token_reuse_detected",
            user_id=str(user_uuid),
            jti_prefix=_jti_prefix(jti),
            ip=ip,
        )
        raise TokenReused()

    # 4) Atomic consume через UPDATE ... WHERE consumed_at IS NULL.
    # Если rowcount=0, два concurrent refresh'а столкнулись — второй
    # трактуется как reuse. SQLite в тестах не поддерживает RETURNING нативно,
    # но UPDATE с WHERE достаточно (rowcount).
    now = datetime.now(timezone.utc)
    upd = await db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.id == record.id,
            RefreshToken.consumed_at.is_(None),
        )
        .values(consumed_at=now)
    )
    if upd.rowcount == 0:
        # Race: кто-то параллельно успел consume этот же токен.
        await revoke_family(db, starting_record_id=record.id, reason=REVOKE_REUSE_FAMILY)
        await db.commit()
        audit(
            "refresh_token_reuse_detected",
            user_id=str(user_uuid),
            jti_prefix=_jti_prefix(jti),
            ip=ip,
            note="race-condition",
        )
        raise TokenReused()

    # 5) Выпустить новый, привязать к старому через replaced_by_id.
    new_token, new_expires = await issue_refresh_token(
        db,
        user_id=user_uuid,
        ip=ip,
        user_agent=user_agent,
        replaced_by=record.id,
    )
    audit(
        "refresh_token_rotated",
        user_id=str(user_uuid),
        old_jti_prefix=_jti_prefix(jti),
        ip=ip,
    )
    return new_token, new_expires, user_uuid


async def revoke_one_by_token(
    db: AsyncSession, *, token: str, reason: str
) -> bool:
    """Отзыв одной сессии по refresh-токену (для /logout).

    Возвращает True если запись найдена и отозвана. False если токен невалиден
    или уже отозван — caller всё равно проксирует успех клиенту (logout
    идемпотентен).
    """
    payload = decode_token(token)
    if payload is None or payload.get("type") != "refresh":
        return False
    jti = payload.get("jti")
    if not jti:
        return False
    jti_h = hash_jti(jti)

    now = datetime.now(timezone.utc)
    upd = await db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.jti_hash == jti_h,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=now, revoke_reason=reason)
    )
    if upd.rowcount > 0:
        audit("refresh_token_revoked", count=upd.rowcount, reason=reason, scope="one")
    return upd.rowcount > 0


async def revoke_all_user(
    db: AsyncSession, *, user_id: uuid.UUID, reason: str
) -> int:
    """Отзыв всех активных refresh-токенов пользователя.

    Используется при /change-password, /reset-password, /delete-account,
    /logout?all_devices=true. Возвращает количество отозванных строк.
    """
    now = datetime.now(timezone.utc)
    upd = await db.execute(
        update(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=now, revoke_reason=reason)
    )
    count = upd.rowcount or 0
    if count > 0:
        audit(
            "refresh_token_revoked",
            user_id=str(user_id),
            count=count,
            reason=reason,
            scope="all_user",
        )
    return count


async def revoke_family(
    db: AsyncSession,
    *,
    starting_record_id: uuid.UUID,
    reason: str = REVOKE_REUSE_FAMILY,
) -> int:
    """Walk цепочку replaced_by_id и помечает все звенья revoked.

    При reuse detection отзываем не только скомпрометированную запись, но и
    всю цепочку — иначе атакующий с украденным токеном может получить новый
    и продолжать через него. Простая стратегия: revoke ВСЕ токены этого
    пользователя (не только цепочку — пользователь и так заметит и
    переавторизуется). Это RFC 6819 рекомендация.
    """
    result = await db.execute(
        select(RefreshToken.user_id).where(RefreshToken.id == starting_record_id)
    )
    user_id = result.scalar_one_or_none()
    if user_id is None:
        return 0
    return await revoke_all_user(db, user_id=user_id, reason=reason)
