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
    # Срок авто-удаления. Вычисляется при создании = created_at + user.data_retention_days.
    # None = бессрочно (Pro/Бизнес опция).
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    user = relationship("User", back_populates="transcriptions")
    ai_analyses = relationship("AiAnalysis", back_populates="transcription", lazy="selectin")
    embeddings = relationship("Embedding", back_populates="transcription", lazy="noload")
    chat_messages = relationship("ChatMessage", back_populates="transcription", lazy="noload")
