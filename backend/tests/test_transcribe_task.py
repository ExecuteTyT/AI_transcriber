"""Юнит-тесты решения «перекодировать ли аудио перед Voxtral».

Корень бага (2026-06-19): Voxtral принимает только WAV/MP3/FLAC/OGG/WEBM
(Mistral known-limitations). Сырой m4a (`audio/mp4`) уходил в API напрямую и
получал 400. Все аудио/URL-загрузки идут через одну точку `_prepare_audio`,
поэтому проверяем именно её решение через чистый предикат.
"""
from app.tasks.transcribe import _needs_voxtral_transcode


def test_m4a_needs_transcode():
    """m4a (audio/mp4) НЕ поддерживается Voxtral → перекодировать (это и был баг)."""
    assert _needs_voxtral_transcode("audio/mp4", None) is True
    assert _needs_voxtral_transcode("audio/x-m4a", None) is True
    assert _needs_voxtral_transcode("audio/aac", None) is True


def test_native_audio_no_transcode():
    """WAV/MP3/FLAC/OGG/WEBM Voxtral принимает напрямую → не трогаем (быстрый путь)."""
    for ct in ("audio/wav", "audio/x-wav", "audio/mpeg", "audio/flac",
               "audio/ogg", "application/ogg", "audio/webm"):
        assert _needs_voxtral_transcode(ct, None) is False, ct


def test_video_needs_transcode():
    """Видео — всегда извлекаем дорожку."""
    assert _needs_voxtral_transcode("video/mp4", None) is True
    assert _needs_voxtral_transcode("video/quicktime", None) is True


def test_truncation_forces_transcode_even_for_native():
    """Частичная расшифровка (max_sec) требует ffmpeg-обрезки даже для mp3/wav."""
    assert _needs_voxtral_transcode("audio/mpeg", 1800) is True
    assert _needs_voxtral_transcode("audio/wav", 600) is True
