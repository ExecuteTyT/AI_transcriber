from app.services.transcription import TranscriptionProvider, TranscriptionResult


class WhisperProvider(TranscriptionProvider):
    """Fallback-провайдер через faster-whisper (TODO: реализовать)."""

    def transcribe(self, file_path: str) -> TranscriptionResult:
        """Транскрибировать аудиофайл через faster-whisper."""
        raise NotImplementedError(
            "WhisperProvider ещё не реализован. "
            "Установите TRANSCRIPTION_PROVIDER=voxtral в .env"
        )
