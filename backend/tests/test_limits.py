import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def _register_and_get_token(client: AsyncClient) -> str:
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "pass123"},
    )
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_upload_when_limit_exhausted(client: AsyncClient, db_session: AsyncSession):
    """Загрузка файла при исчерпанных минутах → 403."""
    token = await _register_and_get_token(client)
    me = await client.get("/api/auth/me", headers=_auth_headers(token))
    user_id = me.json()["id"]

    # Исчерпаем лимит: free = 15 мин
    from sqlalchemy import select
    result = await db_session.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one()
    user.minutes_used = 15
    await db_session.commit()

    response = await client.post(
        "/api/transcriptions/upload",
        headers=_auth_headers(token),
        files={"file": ("test.mp3", b"fake", "audio/mpeg")},
    )
    assert response.status_code == 403
    assert "Лимит минут исчерпан" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_within_limit(client: AsyncClient):
    """Загрузка файла в пределах лимита (S3 не настроен → 503, но лимит пройден)."""
    token = await _register_and_get_token(client)

    response = await client.post(
        "/api/transcriptions/upload",
        headers=_auth_headers(token),
        files={"file": ("test.mp3", b"fake", "audio/mpeg")},
    )
    # 503 потому что S3 не настроен — но это значит, что проверка лимитов прошла
    assert response.status_code == 503


def test_plan_configs():
    """Проверка корректности конфигов тарифов."""
    from app.services.plans import PLANS, get_plan

    assert "free" in PLANS
    assert "start" in PLANS
    assert "pro" in PLANS

    free = get_plan("free")
    assert free.minutes_limit == 15
    assert free.max_file_duration_sec == 600
    assert free.price_rub == 0

    start = get_plan("start")
    assert start.minutes_limit == 300
    assert start.price_rub == 290
    assert start.speakers is True

    pro = get_plan("pro")
    assert pro.minutes_limit == 1200
    assert pro.price_rub == 590
    assert pro.action_items is True

    # Неизвестный план → free
    unknown = get_plan("unknown")
    assert unknown.minutes_limit == 15
