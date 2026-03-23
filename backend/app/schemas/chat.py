import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Запрос на отправку сообщения в RAG-чат."""
    message: str = Field(..., min_length=1, max_length=2000)


class ChatReference(BaseModel):
    """Ссылка на фрагмент транскрипции."""
    chunk_text: str
    start_time: float | None = None
    end_time: float | None = None


class ChatMessageResponse(BaseModel):
    """Ответ с сообщением чата."""
    id: uuid.UUID
    role: str
    content: str
    references: list[ChatReference] | None = None
    tokens_used: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatHistoryResponse(BaseModel):
    """История чата с оставшимися вопросами."""
    messages: list[ChatMessageResponse]
    remaining_questions: int  # -1 = unlimited
