import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def _register_and_get_token(client: AsyncClient) -> str:
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "pass1234", "consent_pd_processing": True, "consent_cross_border": True},
    )
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_upload_when_limit_exhausted(client: AsyncClient, db_session: AsyncSession):
    """Загрузка при исчерпанных минутах (bonus=0, monthly=full) → 402 пейволл."""
    token = await _register_and_get_token(client)
    me = await client.get("/api/auth/me", headers=_auth_headers(token))
    user_id = me.json()["id"]

    # Исчерпаем и бонус, и месячный лимит (free: 0 мин/мес, bonus 180 единоразово)
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
    assert response.status_code == 402
    assert response.json()["detail"]["paths"] == ["wallet", "pro"]


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
    assert response.status_code == 201  # local-fallback: upload принят, лимит пройден


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
    assert response.status_code == 201  # local-fallback: upload принят, лимит пройден


def test_plan_configs():
    """Проверка корректности конфигов тарифов (актуальная сетка)."""
    from app.services.plans import PLANS, get_plan

    expected_keys = {"free", "start", "pro", "expert", "premium"}
    assert expected_keys == set(PLANS.keys())

    free = get_plan("free")
    # Free больше не получает ежемесячных минут — все 180 приходят
    # из bonus_minutes (единоразово при регистрации).
    assert free.minutes_limit == 0
    assert free.max_file_duration_sec == 15 * 60
    assert free.price_rub == 0
    assert free.ai_summaries == 1
    assert free.action_items is False

    start = get_plan("start")
    assert start.minutes_limit == 600
    assert start.price_rub == 500
    assert start.action_items is True

    pro = get_plan("pro")
    assert pro.minutes_limit == 1800
    assert pro.price_rub == 990
    assert pro.action_items is True

    expert = get_plan("expert")
    assert expert.minutes_limit == 4200
    assert expert.price_rub == 1990
    assert expert.max_users == 1
    assert expert.rag_chat_limit == -1

    premium = get_plan("premium")
    assert premium.minutes_limit == 8400
    assert premium.price_rub == 3490
    assert premium.max_users == 1
    assert premium.max_file_duration_sec == 6 * 60 * 60

    # Неизвестный план → free
    unknown = get_plan("unknown")
    assert unknown.minutes_limit == 0
