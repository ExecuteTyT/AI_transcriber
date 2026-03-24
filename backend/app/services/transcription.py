from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from app.config import settings


@dataclass
class Segment:
    """Сегмент транскрипции с таймкодом и спикером."""

    start: float
    end: float
    text: str
    speaker: str = ""


@dataclass
class TranscriptionResult:
    """Результат транскрибации."""

    full_text: str
    segments: list[Segment] = field(default_factory=list)
    language: str | None = None
    duration_sec: int | None = None


class TranscriptionProvider(ABC):
    """Абстрактный провайдер транскрибации."""

    @abstractmethod
    def transcribe(self, file_path: str) -> TranscriptionResult:
        """Транскрибировать аудиофайл."""
        ...


def get_provider() -> TranscriptionProvider:
    """Фабрика провайдеров. Используем Voxtral (Mistral AI)."""
    from app.services.voxtral import VoxtralProvider
    return VoxtralProvider()
