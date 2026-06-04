import uuid

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class AiAnalysis(Base, UUIDMixin, TimestampMixin):
    """Результат AI-анализа транскрипции (саммари, тезисы, action items).

    UNIQUE (transcription_id, type) — защита от race condition при параллельном
    запросе одного и того же типа анализа из двух вкладок. Без этого создавались
    дубликаты, юзер видел разный текст саммари в зависимости от того, какую
    строку отдал first-row scalar_one_or_none.
    """

    __tablename__ = "ai_analyses"
    __table_args__ = (
        UniqueConstraint(
            "transcription_id", "type", name="ux_ai_analyses_transcription_type"
        ),
    )

    transcription_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("transcriptions.id", ondelete="CASCADE")
    )
    type: Mapped[str] = mapped_column(
        String(30)
    )  # summary/key_points/action_items
    content: Mapped[str] = mapped_column(Text)
    # Объём анализа: short / standard / detailed. Та же строка (transcription_id,
    # type) перегенерируется при смене уровня (см. api/ai_analysis.py).
    length: Mapped[str] = mapped_column(
        String(20), default="standard", server_default="standard"
    )
    model_used: Mapped[str] = mapped_column(String(50), default="gemini-2.5-flash")
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)

    transcription = relationship("Transcription", back_populates="ai_analyses")
