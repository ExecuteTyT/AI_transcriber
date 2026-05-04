import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Transcription(Base, UUIDMixin, TimestampMixin):
    """Транскрипция аудио/видео файла."""

    __tablename__ = "transcriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(String(500), default="")
    status: Mapped[str] = mapped_column(
        String(20), default="queued"
    )  # queued/processing/completed/failed
    language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    duration_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_key: Mapped[str] = mapped_column(String(500))  # S3 ключ
    original_filename: Mapped[str] = mapped_column(String(500), default="")
    content_type: Mapped[str] = mapped_column(String(100), default="")
    full_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    segments: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # Срок авто-удаления ВСЕЙ записи (текст+аудио). Вычисляется при создании
    # = created_at + user.data_retention_days. None = бессрочно (Pro/Бизнес).
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    # 152-ФЗ: отдельный срок хранения только АУДИО-файла. После audio_delete_at
    # cron удалит S3-объект и обнулит file_key, но текст транскрипции и анализ
    # останутся доступны пользователю (минимизация хранения исходных данных).
    audio_retention_days: Mapped[int] = mapped_column(Integer, default=7)
    audio_delete_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    # Заполняется при фактическом удалении аудио — для акта уничтожения.
    audio_deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    audio_deleted_log: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # "auto-cron" | "user-manual" | "user-account-deleted"

    user = relationship("User", back_populates="transcriptions")
    ai_analyses = relationship("AiAnalysis", back_populates="transcription", lazy="selectin")
    embeddings = relationship("Embedding", back_populates="transcription", lazy="noload")
    chat_messages = relationship("ChatMessage", back_populates="transcription", lazy="noload")
