"""Тесты POST /transcriptions/upload-url: whitelist, plan-gate, language."""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def _register(client: AsyncClient) -> tuple[str, str]:
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "password1", "consent_pd_processing": True, "consent_cross_border": True},
    )
    return resp.json()["access_token"], email


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── Plan gate ───

@pytest.mark.asyncio
async def test_free_plan_allowed_url_ingest_with_bonus(client: AsyncClient):
    """URL-ingest больше не закрыт по тарифу: free с bonus-минутами проходит (201)."""
    token, _ = await _register(client)  # новый free-юзер: bonus_minutes=180
    resp = await client.post(
        "/api/transcriptions/upload-url",
        headers=_h(token),
        json={"url": "https://www.youtube.com/watch?v=abc"},
    )
    assert resp.status_code == 201
    assert resp.json()["status"] == "queued"


@pytest.mark.asyncio
async def test_start_plan_allowed(client: AsyncClient, db_session: AsyncSession):
    """Start юзер проходит plan-gate. Celery не поднят в тестах — примем любой 2xx/5xx."""
    token, email = await _register(client)
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.plan = "start"
    user.minutes_limit = 600
    await db_session.commit()

    resp = await client.post(
        "/api/transcriptions/upload-url",
        headers=_h(token),
        json={"url": "https://www.youtube.com/watch?v=abc"},
    )
    # 201 — создана транскрипция и поставлена в очередь (даже если Celery упадёт в тестах).
    assert resp.status_code == 201


# ─── URL whitelist ───

@pytest.mark.asyncio
async def test_vimeo_not_allowed(client: AsyncClient, db_session: AsyncSession):
    """Vimeo не в whitelist → 400."""
    token, email = await _register(client)
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.plan = "start"
    await db_session.commit()

    resp = await client.post(
        "/api/transcriptions/upload-url",
        headers=_h(token),
        json={"url": "https://vimeo.com/12345"},
    )
    assert resp.status_code == 400
    assert "поддерживается" in resp.json()["detail"].lower() or "support" in resp.json()["detail"].lower()


@pytest.mark.asyncio
@pytest.mark.parametrize("url", [
    "https://www.youtube.com/watch?v=abc",
    "https://youtu.be/abc",
    "https://m.youtube.com/watch?v=abc",
    "https://vk.com/video-123",
    "https://rutube.ru/video/abc/",
    "https://ok.ru/video/12345",
    "https://dzen.ru/video/watch/abc",
])
async def test_whitelisted_hosts_pass(
    client: AsyncClient, db_session: AsyncSession, url: str
):
    """Все whitelisted host — проходят."""
    token, email = await _register(client)
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.plan = "pro"
    await db_session.commit()

    resp = await client.post(
        "/api/transcriptions/upload-url",
        headers=_h(token),
        json={"url": url},
    )
    assert resp.status_code == 201, f"URL {url} должен пройти (получили {resp.status_code})"


# ─── Validation ───

@pytest.mark.asyncio
async def test_invalid_url_format(client: AsyncClient, db_session: AsyncSession):
    """Не URL → 422."""
    token, email = await _register(client)
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.plan = "start"
    await db_session.commit()

    resp = await client.post(
        "/api/transcriptions/upload-url",
        headers=_h(token),
        json={"url": "not-a-url"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_language_saved_when_not_auto(
    client: AsyncClient, db_session: AsyncSession
):
    """Language=ru сохраняется в Transcription.language до обработки."""
    from app.models.transcription import Transcription

    token, email = await _register(client)
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.plan = "start"
    await db_session.commit()

    resp = await client.post(
        "/api/transcriptions/upload-url",
        headers=_h(token),
        json={"url": "https://www.youtube.com/watch?v=abc", "language": "ru"},
    )
    assert resp.status_code == 201
    transcription_id = resp.json()["id"]

    result2 = await db_session.execute(
        select(Transcription).where(Transcription.id == uuid.UUID(transcription_id))
    )
    tr = result2.scalar_one()
    assert tr.language == "ru"


@pytest.mark.asyncio
async def test_unauthenticated_blocked(client: AsyncClient):
    """Без токена → 401/403."""
    resp = await client.post(
        "/api/transcriptions/upload-url",
        json={"url": "https://www.youtube.com/watch?v=abc"},
    )
    assert resp.status_code in (401, 403)


# ─── Обработка ошибок yt-dlp ───

def test_youtube_bot_block_message_is_friendly():
    """Бот-блок YouTube → понятное сообщение с предложением RU-источников."""
    from app.tasks.transcribe_url import _translate_ytdlp_error

    raw = "ERROR: [youtube] xyz: Sign in to confirm you're not a bot."
    msg = _translate_ytdlp_error(raw)
    assert "не удалось скачать" not in msg.lower()  # не generic
    assert "rutube" in msg.lower() or "vk" in msg.lower() or "дзен" in msg.lower()


def test_video_not_available_message_is_friendly():
    """«This video is not available» (реальная строка из прод-лога) → понятный текст,
    а не generic «не удалось скачать». Не утверждаем «удалено» (видео часто живое —
    это наша экстракция), но зовём в RU-источники / на загрузку файла."""
    from app.tasks.transcribe_url import _translate_ytdlp_error

    raw = "ERROR: [youtube] Bm7a4Xtpr8g: This video is not available"
    msg = _translate_ytdlp_error(raw)
    assert "не удалось скачать" not in msg.lower()  # не generic
    assert "rutube" in msg.lower() or "vk" in msg.lower() or "дзен" in msg.lower()


def test_permanent_errors_not_retried():
    """Бот-блок/приват/недоступно/неподдерж. — перманентны (не ретраим)."""
    from app.tasks.transcribe_url import _is_permanent_ytdlp_error

    for raw in (
        "Sign in to confirm you're not a bot",
        "Private video. Login required",
        "Video unavailable",
        # реальная строка из прод-лога 2026-06-08 (ролик Bm7a4Xtpr8g): раньше
        # не распознавалась («not available» с пробелом ≠ «unavailable») → 3× ретрай.
        "ERROR: [youtube] Bm7a4Xtpr8g: This video is not available",
        "Unsupported URL: https://example.com/x",
    ):
        assert _is_permanent_ytdlp_error(raw) is True, raw


def test_transient_errors_are_retried():
    """Таймаут/сеть — транзиентные (ретраим)."""
    from app.tasks.transcribe_url import _is_permanent_ytdlp_error

    assert _is_permanent_ytdlp_error("Read timed out") is False
    assert _is_permanent_ytdlp_error("Temporary failure in name resolution") is False


# ─── Яндекс.Видео (видеопоиск) резолвер ───

def test_is_yandex_preview_url():
    from app.services.yandex_video import is_yandex_preview_url

    assert is_yandex_preview_url("https://yandex.ru/video/preview/123")
    assert is_yandex_preview_url("https://ya.ru/video/preview/999")
    assert is_yandex_preview_url("https://www.yandex.ru/video/preview/5")
    assert not is_yandex_preview_url("https://yandex.ru/video/search?text=x")
    assert not is_yandex_preview_url("https://www.youtube.com/watch?v=x")


def test_extract_source_from_html():
    from app.services.yandex_video import extract_source_from_html

    # videoUrl нужного ролика идёт после его videoId; videoSrc-тизер игнорим.
    html = (
        '{"videoId":"123","videoSrc":"https://video-preview.s3.yandex.net/x.mp4",'
        '"playerUri":"<iframe","videoUrl":"http://vk.com/video-1_2"}'
        '{"videoId":"777","videoUrl":"http://rutube.ru/video/zzz/"}'
    )
    assert extract_source_from_html(html, "123") == "http://vk.com/video-1_2"
    # экранированные слеши
    html2 = '{"videoId":"7","videoUrl":"https:\\/\\/rutube.ru\\/video\\/abc\\/"}'
    assert extract_source_from_html(html2, "7") == "https://rutube.ru/video/abc/"
    # капча → None
    assert extract_source_from_html("... showcaptcha ...", "123") is None
    # нет videoUrl → None
    assert extract_source_from_html('{"videoId":"123"}', "123") is None


@pytest.mark.asyncio
async def test_yandex_preview_resolves_to_source(client: AsyncClient, monkeypatch):
    """Yandex preview резолвится в источник → 201."""
    import app.services.yandex_video as yv

    async def fake_resolve(url):
        return "https://vk.com/video-1_2"

    monkeypatch.setattr(yv, "resolve_yandex_video", fake_resolve)

    token, _ = await _register(client)  # free + bonus → проходит
    resp = await client.post(
        "/api/transcriptions/upload-url",
        headers=_h(token),
        json={"url": "https://yandex.ru/video/preview/123"},
    )
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_yandex_preview_unresolved_gives_hint(client: AsyncClient, monkeypatch):
    """Не зарезолвилось → 400 с подсказкой вставить ссылку на источник."""
    import app.services.yandex_video as yv

    async def fake_resolve(url):
        return None

    monkeypatch.setattr(yv, "resolve_yandex_video", fake_resolve)

    token, _ = await _register(client)
    resp = await client.post(
        "/api/transcriptions/upload-url",
        headers=_h(token),
        json={"url": "https://yandex.ru/video/preview/123"},
    )
    assert resp.status_code == 400
    assert "источник" in resp.json()["detail"].lower()
