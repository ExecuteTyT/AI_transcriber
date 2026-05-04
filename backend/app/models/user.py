from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin):
    """Пользователь платформы."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255), default="")
    plan: Mapped[str] = mapped_column(String(20), default="free")  # free/start/pro
    minutes_used: Mapped[int] = mapped_column(Integer, default=0)
    # Free план не получает ежемесячных минут — только bonus_minutes (180 при
    # регистрации). Платные планы выставляют minutes_limit при активации
    # подписки в payment.activate_subscription.
    minutes_limit: Mapped[int] = mapped_column(Integer, default=0)

    # Email verification
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Admin access
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)

    # Password reset token (хранится хеш, не сам токен)
    password_reset_token_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    password_reset_expires_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # 152-ФЗ: фиксация согласий пользователя (дата даёт доказательство)
    consent_terms_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    consent_cross_border_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Срок хранения транскрипций в днях (None = бессрочно, доступно Pro/Бизнес+).
    # Каждый день Celery-beat запускает cleanup: удаляет записи с истёкшим expires_at.
    data_retention_days: Mapped[int | None] = mapped_column(Integer, nullable=True, default=30)

    # 152-ФЗ: дефолтный срок хранения АУДИО-файлов в днях (1-30).
    # Применяется к новым transcription'ам — текст транскрипции остаётся
    # дольше (см. data_retention_days), удаляется только аудио.
    default_audio_retention_days: Mapped[int] = mapped_column(Integer, default=7)

    # Язык распознавания по умолчанию ("auto" = определить автоматически).
    # ISO-коды: ru, en, de, fr, es, it, pt, nl, pl, uk, zh, ja, ko, tr, ar.
    default_language: Mapped[str] = mapped_column(String(10), default="auto")

    # Welcome-бонус минут: начисляется one-time при регистрации.
    # Расходуется ПЕРЕД monthly-лимитом. reset_monthly_limits его НЕ трогает.
    bonus_minutes: Mapped[int] = mapped_column(Integer, default=180)

    transcriptions = relationship("Transcription", back_populates="user", lazy="selectin")
    subscriptions = relationship("Subscription", back_populates="user", lazy="selectin")
