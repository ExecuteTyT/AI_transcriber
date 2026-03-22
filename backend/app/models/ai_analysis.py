import uuid

from sqlalchemy import ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class AiAnalysis(Base, UUIDMixin, TimestampMixin):
    """Результат AI-анализа транскрипции (саммари, тезисы, action items)."""

    __tablename__ = "ai_analyses"

    transcription_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("transcriptions.id", ondelete="CASCADE")
    )
    type: Mapped[str] = mapped_column(
        String(30)
    )  # summary/key_points/action_items
    content: Mapped[str] = mapped_column(Text)
    model_used: Mapped[str] = mapped_column(String(50), default="gpt-4o-mini")
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)

    transcription = relationship("Transcription", back_populates="ai_analyses")
