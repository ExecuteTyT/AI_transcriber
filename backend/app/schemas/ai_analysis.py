import uuid

from pydantic import BaseModel


class AiAnalysisResponse(BaseModel):
    """Ответ с результатом AI-анализа."""

    id: uuid.UUID
    transcription_id: uuid.UUID
    type: str
    content: str
    model_used: str
    tokens_used: int

    model_config = {"from_attributes": True}
