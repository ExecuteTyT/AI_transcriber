"""RefreshToken: стейтфул запись о выпущенном refresh-токене (RFC 6819).

JWT остаётся подписанным, jti claim — uuid4.hex. В БД храним sha256(jti).
Логика rotation/revoke живёт в app.services.refresh_tokens.
"""
import uuid
from datetime import datetime

from sqlalchemy import CHAR, DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


# Возможные значения revoke_reason — central source of truth.
REVOKE_LOGOUT = "logout"
REVOKE_PASSWORD_CHANGE = "password_change"
REVOKE_PASSWORD_RESET = "password_reset"
REVOKE_REUSE_FAMILY = "reuse_family"
REVOKE_ACCOUNT_DELETED = "account_deleted"


class RefreshToken(Base, UUIDMixin):
    """Журнал refresh-токенов для single-use rotation + reuse detection."""

    __tablename__ = "refresh_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    # sha256(jti) — храним хеш, не сам jti. См. comment в migration.
    jti_hash: Mapped[str] = mapped_column(CHAR(64), unique=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    # NULL = active. NOT NULL = был использован для rotate.
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # NULL = не отозван.
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoke_reason: Mapped[str | None] = mapped_column(String(32), nullable=True)

    # Цепочка ротации: новый refresh указывает на старого через replaced_by_id.
    # На самом деле наоборот будет удобнее (старый указывает на нового → легче
    # walk chain forward), но в SQL обычно делают чтобы новый знал про старого.
    # Я выбираю: НОВАЯ строка указывает на ПРЕДЫДУЩУЮ через replaced_by_id.
    # Это даёт chain "new → ... → original", walk вверх находит всех предков.
    replaced_by_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("refresh_tokens.id", ondelete="SET NULL"), nullable=True
    )

    # Метаданные для UI "активные сессии" в будущем и для аудита.
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
