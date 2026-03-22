import pytest

from app.services.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.services.export import _format_srt_time, export_docx, export_srt, export_txt
from app.services.transcription import TranscriptionProvider


def test_hash_and_verify_password():
    """Пароль хешируется и проверяется корректно."""
    hashed = hash_password("mysecret")
    assert hashed != "mysecret"
    assert verify_password("mysecret", hashed)
    assert not verify_password("wrong", hashed)


def test_create_and_decode_access_token():
    """Access token создаётся и декодируется."""
    token = create_access_token("test-user-id")
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "test-user-id"
    assert payload["type"] == "access"


def test_create_and_decode_refresh_token():
    """Refresh token создаётся и декодируется."""
    token = create_refresh_token("test-user-id")
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "test-user-id"
    assert payload["type"] == "refresh"


def test_decode_invalid_token():
    """Невалидный токен возвращает None."""
    assert decode_token("invalid.token.here") is None
    assert decode_token("") is None


def test_transcription_provider_is_abstract():
    """TranscriptionProvider нельзя инстанцировать."""
    with pytest.raises(TypeError):
        TranscriptionProvider()


def test_whisper_provider_not_implemented():
    """WhisperProvider.transcribe() кидает NotImplementedError."""
    from app.services.whisper import WhisperProvider
    provider = WhisperProvider()
    with pytest.raises(NotImplementedError):
        provider.transcribe("/fake/path.mp3")


def test_format_srt_time():
    """Форматирование секунд в SRT-формат."""
    assert _format_srt_time(0) == "00:00:00,000"
    assert _format_srt_time(61.5) == "00:01:01,500"
    assert _format_srt_time(3661.123) == "01:01:01,123"


def test_export_txt():
    """Экспорт в TXT возвращает полный текст."""
    class FakeTranscription:
        full_text = "Привет мир"
        segments = None
    assert export_txt(FakeTranscription()) == "Привет мир"


def test_export_txt_empty():
    """Экспорт пустого текста."""
    class FakeTranscription:
        full_text = None
        segments = None
    assert export_txt(FakeTranscription()) == ""


def test_export_srt():
    """Экспорт в SRT с таймкодами и спикерами."""
    class FakeTranscription:
        full_text = "Текст"
        segments = [
            {"start": 0, "end": 5.5, "text": "Привет", "speaker": "Speaker 1"},
            {"start": 5.5, "end": 10, "text": "Мир", "speaker": ""},
        ]
    result = export_srt(FakeTranscription())
    assert "1\n00:00:00,000 --> 00:00:05,500\n[Speaker 1] Привет" in result
    assert "2\n00:00:05,500 --> 00:00:10,000\nМир" in result


def test_export_srt_empty_segments():
    """SRT с пустым списком сегментов."""
    class FakeTranscription:
        full_text = ""
        segments = []
    assert export_srt(FakeTranscription()) == ""


def test_export_docx():
    """Экспорт в DOCX возвращает bytes."""
    from datetime import datetime

    class FakeTranscription:
        title = "Test"
        full_text = "Привет мир"
        segments = [
            {"start": 0, "end": 5, "text": "Привет", "speaker": "Speaker 1"},
            {"start": 5, "end": 10, "text": "Мир", "speaker": "Speaker 2"},
        ]
        language = "ru"
        duration_sec = 10
        created_at = datetime(2026, 1, 1)

    result = export_docx(FakeTranscription())
    assert isinstance(result, bytes)
    assert len(result) > 0
    # DOCX files start with PK (ZIP format)
    assert result[:2] == b"PK"


def test_export_docx_no_segments():
    """DOCX экспорт с текстом, но без сегментов."""
    from datetime import datetime

    class FakeTranscription:
        title = "Only text"
        full_text = "Только текст без сегментов"
        segments = None
        language = None
        duration_sec = None
        created_at = datetime(2026, 1, 1)

    result = export_docx(FakeTranscription())
    assert isinstance(result, bytes)
    assert result[:2] == b"PK"


def test_split_text():
    """Разбиение текста на чанки."""
    from app.services.ai_analysis import _split_text

    text = "First sentence. Second sentence. Third sentence."
    chunks = _split_text(text, 30)
    assert len(chunks) >= 2
    # Все чанки не пустые
    assert all(c.strip() for c in chunks)


def test_split_text_long_sentence():
    """Разбиение текста с предложением длиннее лимита."""
    from app.services.ai_analysis import _split_text

    text = "A" * 100
    chunks = _split_text(text, 30)
    assert len(chunks) >= 3
    assert all(len(c) <= 30 for c in chunks)


def test_split_text_empty():
    """Пустой текст."""
    from app.services.ai_analysis import _split_text

    assert _split_text("", 100) == []


def test_s3_generate_file_key():
    """S3 file key генерируется с UUID."""
    import re
    from app.services.storage import S3Service

    # Создаём без реального подключения — только тестируем метод
    service = S3Service.__new__(S3Service)
    key = service.generate_file_key("test.mp3")
    assert key.startswith("uploads/")
    assert key.endswith(".mp3")
    # UUID в середине
    uuid_part = key.replace("uploads/", "").replace(".mp3", "")
    assert re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-", uuid_part)
