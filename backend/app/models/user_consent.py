"""Журнал согласий пользователя (152-ФЗ)."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


# Возможные значения consent_type — один источник правды для бэкенда и валидации.
CONSENT_TYPE_PD_PROCESSING = "pd_processing"
CONSENT_TYPE_CROSS_BORDER = "cross_border"
CONSENT_TYPE_MARKETING = "marketing"
CONSENT_TYPES_VALID = {
    CONSENT_TYPE_PD_PROCESSING,
    CONSENT_TYPE_CROSS_BORDER,
    CONSENT_TYPE_MARKETING,
}


class UserConsent(Base, UUIDMixin):
    """Запись о факте согласия/отзыва согласия пользователя.

    Каждое согласие = отдельная строка с timestamp, IP, User-Agent и версией
    политики. При отзыве согласия (например marketing) — granted=False и
    revoked_at=NOW(). Старая granted=True строка остаётся в журнале для
    исторической доказательной базы (журнал учёта).
    """

    __tablename__ = "user_consents"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    consent_type: Mapped[str] = mapped_column(String(64), index=True)
    granted: Mapped[bool] = mapped_column(Boolean, default=False)

    # IP и User-Agent в момент действия — для доказательства "это был именно тот юзер".
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Версия текста политики (settings.POLICY_VERSION) — позволяет позже
    # доказать что юзер видел именно ту редакцию политики.
    policy_version: Mapped[str] = mapped_column(String(16))

    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
