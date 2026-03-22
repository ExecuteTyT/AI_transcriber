import base64
import logging

import httpx

from app.config import settings
from app.services.transcription import Segment, TranscriptionProvider, TranscriptionResult

logger = logging.getLogger(__name__)


class VoxtralProvider(TranscriptionProvider):
    """Провайдер транскрибации через Voxtral Transcribe V2 (Mistral AI)."""

    API_URL = "https://api.mistral.ai/v1/audio/transcriptions"

    def transcribe(self, file_path: str) -> TranscriptionResult:
        """Транскрибировать аудиофайл через Voxtral V2 API."""
        with open(file_path, "rb") as f:
            file_data = f.read()

        # Определяем MIME-тип
        ext = file_path.rsplit(".", 1)[-1].lower()
        mime_map = {
            "mp3": "audio/mpeg", "wav": "audio/wav", "flac": "audio/flac",
            "ogg": "audio/ogg", "m4a": "audio/mp4", "webm": "audio/webm",
        }
        mime_type = mime_map.get(ext, "audio/mpeg")

        # Кодируем в base64 data URI
        b64_data = base64.b64encode(file_data).decode()
        data_uri = f"data:{mime_type};base64,{b64_data}"

        response = httpx.post(
            self.API_URL,
            headers={
                "Authorization": f"Bearer {settings.MISTRAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "mistral-audio-latest",
                "file": data_uri,
                "response_format": "verbose_json",
                "timestamp_granularities": ["segment"],
            },
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

        return TranscriptionResult(
            full_text=full_text,
            segments=segments,
            language=data.get("language"),
            duration_sec=int(duration) if duration else None,
        )
