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
        json={"email": email, "password": "password1"},
    )
    return resp.json()["access_token"], email


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── Plan gate ───

@pytest.mark.asyncio
async def test_free_plan_blocked_from_url_ingest(client: AsyncClient):
    """Free юзер → 403 с понятным текстом."""
    token, _ = await _register(client)
    resp = await client.post(
        "/api/transcriptions/upload-url",
        headers=_h(token),
        json={"url": "https://www.youtube.com/watch?v=abc"},
    )
    assert resp.status_code == 403
    assert "Старт" in resp.json()["detail"]


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
