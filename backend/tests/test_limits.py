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
    """Загрузка при исчерпанных минутах (bonus=0, monthly=full) → 403."""
    token = await _register_and_get_token(client)
    me = await client.get("/api/auth/me", headers=_auth_headers(token))
    user_id = me.json()["id"]

    # Исчерпаем и бонус, и месячный лимит (free: 30 мин, bonus по умолчанию 180)
    from sqlalchemy import select
    result = await db_session.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one()
    user.bonus_minutes = 0
    user.minutes_used = user.minutes_limit
    await db_session.commit()

    response = await client.post(
        "/api/transcriptions/upload",
        headers=_auth_headers(token),
        files={"file": ("test.mp3", b"fake", "audio/mpeg")},
    )
    assert response.status_code == 403
    assert "Лимит минут исчерпан" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_allowed_when_bonus_left(client: AsyncClient, db_session: AsyncSession):
    """Если monthly исчерпан, но bonus > 0 — upload проходит проверку лимитов."""
    token = await _register_and_get_token(client)
    me = await client.get("/api/auth/me", headers=_auth_headers(token))
    user_id = me.json()["id"]

    from sqlalchemy import select
    result = await db_session.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one()
    user.minutes_used = user.minutes_limit  # месячный исчерпан
    user.bonus_minutes = 50                  # но есть бонус
    await db_session.commit()

    response = await client.post(
        "/api/transcriptions/upload",
        headers=_auth_headers(token),
        files={"file": ("test.mp3", b"fake", "audio/mpeg")},
    )
    # 503 = S3 не настроен, но значит проверка лимита прошла.
    assert response.status_code == 503


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
    """Проверка корректности конфигов тарифов (актуальная сетка)."""
    from app.services.plans import PLANS, get_plan

    assert {"free", "start", "pro", "business", "premium"} <= set(PLANS.keys())

    free = get_plan("free")
    assert free.minutes_limit == 30
    assert free.max_file_duration_sec == 15 * 60
    assert free.price_rub == 0
    assert free.ai_summaries == 5
    assert free.action_items is False

    start = get_plan("start")
    assert start.minutes_limit == 600
    assert start.price_rub == 500
    assert start.action_items is True

    pro = get_plan("pro")
    assert pro.minutes_limit == 1500
    assert pro.price_rub == 820
    assert pro.action_items is True

    business = get_plan("business")
    assert business.minutes_limit == 3600
    assert business.price_rub == 2300
    assert business.max_users == 5

    premium = get_plan("premium")
    assert premium.minutes_limit == 7200
    assert premium.price_rub == 4600
    assert premium.max_users == 10

    # Неизвестный план → free
    unknown = get_plan("unknown")
    assert unknown.minutes_limit == 30
