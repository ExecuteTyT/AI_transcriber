import logging
import os

import httpx

from app.config import settings
from app.services.transcription import Segment, TranscriptionProvider, TranscriptionResult

logger = logging.getLogger(__name__)


class VoxtralProvider(TranscriptionProvider):
    """Провайдер транскрибации через Voxtral Transcribe V2 (Mistral AI)."""

    API_URL = "https://api.mistral.ai/v1/audio/transcriptions"

    def transcribe(
        self, file_path: str, language: str | None = None
    ) -> TranscriptionResult:
        """Транскрибировать аудиофайл через Voxtral V2 API.

        language — ISO-код (ru, en, de, …) или None для автоопределения.
        """
        ext = file_path.rsplit(".", 1)[-1].lower()
        mime_map = {
            "mp3": "audio/mpeg", "wav": "audio/wav", "flac": "audio/flac",
            "ogg": "audio/ogg", "m4a": "audio/mp4", "webm": "audio/webm",
        }
        mime_type = mime_map.get(ext, "audio/mpeg")
        filename = os.path.basename(file_path)

        payload = {
            "model": "voxtral-mini-latest",
            "timestamp_granularities": "segment",
            "diarize": "true",
        }
        # Передаём language только если явно выбран (не "auto" / None).
        if language and language.lower() != "auto":
            payload["language"] = language

        with open(file_path, "rb") as f:
            response = httpx.post(
                self.API_URL,
                headers={"Authorization": f"Bearer {settings.MISTRAL_API_KEY}"},
                files={"file": (filename, f, mime_type)},
                data=payload,
                timeout=600,
            )

        response.raise_for_status()
        data = response.json()

        # Парсинг ответа
        segments = []
        for seg in data.get("segments", []):
            segments.append(Segment(
                start=seg.get("start", 0),
                end=seg.get("end", 0),
                text=seg.get("text", "").strip(),
                speaker=seg.get("speaker", ""),
            ))

        full_text = data.get("text", "")
        duration = data.get("duration", None)

        # Fallback: вычисляем длительность из последнего сегмента
        if duration is None and segments:
            duration = segments[-1].end

        return TranscriptionResult(
            full_text=full_text,
            segments=segments,
            language=data.get("language"),
            duration_sec=int(duration) if duration else None,
        )
