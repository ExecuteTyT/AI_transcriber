import uuid
from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class UrlIngestRequest(BaseModel):
    """Запрос на транскрибацию по URL (YouTube / VK / Rutube / OK / Дзен)."""

    url: HttpUrl
    language: str = Field("auto", min_length=2, max_length=10)


class TranscriptionResponse(BaseModel):
    """Ответ с данными транскрипции."""

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    status: str
    language: str | None
    duration_sec: int | None
    original_filename: str
    full_text: str | None
    segments: list[dict] | None
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class TranscriptionListItem(BaseModel):
    """Элемент списка транскрипций."""

    id: uuid.UUID
    title: str
    status: str
    language: str | None
    duration_sec: int | None
    original_filename: str
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class TranscriptionStatusResponse(BaseModel):
    """Статус обработки транскрипции."""

    id: uuid.UUID
    status: str
    error_message: str | None


class TranscriptionUploadResponse(BaseModel):
    """Ответ после загрузки файла."""

    id: uuid.UUID
    status: str
    message: str


class PaginatedTranscriptions(BaseModel):
    """Список транскрипций с пагинацией."""

    items: list[TranscriptionListItem]
    total: int
    limit: int
    offset: int
