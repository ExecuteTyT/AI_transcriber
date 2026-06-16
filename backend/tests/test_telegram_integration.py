"""Тесты Telegram-интеграции: /auth (auto-create / link / secret guard) + /link-token."""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User

SECRET = "test-bot-secret"


@pytest.fixture(autouse=True)
def _set_bot_secret(monkeypatch):
    monkeypatch.setattr(settings, "BOT_INTERNAL_SECRET", SECRET)
    monkeypatch.setattr(settings, "BOT_USERNAME", "dicto_test_bot")


async def _register(client: AsyncClient) -> tuple[str, str]:
    email = f"tg-{uuid.uuid4().hex[:8]}@example.com"
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "password1", "name": "Web",
              "consent_pd_processing": True, "consent_cross_border": True},
    )
    return resp.json()["access_token"], email


def _bot(secret: str = SECRET) -> dict:
    return {"X-Bot-Secret": secret}


# ─── Secret guard ───

@pytest.mark.asyncio
async def test_auth_requires_secret(client: AsyncClient):
    resp = await client.post("/api/integrations/telegram/auth", json={"telegram_id": 111})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_auth_rejects_wrong_secret(client: AsyncClient):
    resp = await client.post("/api/integrations/telegram/auth",
                             headers=_bot("wrong"), json={"telegram_id": 111})
    assert resp.status_code == 403


# ─── Auto-create ───

@pytest.mark.asyncio
async def test_auth_autocreates_account(client: AsyncClient, db_session: AsyncSession):
    resp = await client.post(
        "/api/integrations/telegram/auth",
        headers=_bot(), json={"telegram_id": 555001, "tg_name": "Иван"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_new"] is True
    assert data["linked"] is False
    assert data["access_token"] and data["refresh_token"]
    assert data["bonus_minutes"] == 30   # welcome-бонус работает

    user = (await db_session.execute(
        select(User).where(User.telegram_id == 555001)
    )).scalar_one()
    assert user.email == "tg555001@telegram.dicto.pro"
    assert user.is_email_verified is True


@pytest.mark.asyncio
async def test_auth_returns_existing_account(client: AsyncClient, db_session: AsyncSession):
    # Первый вызов создаёт.
    r1 = await client.post("/api/integrations/telegram/auth",
                           headers=_bot(), json={"telegram_id": 555002})
    assert r1.json()["is_new"] is True
    uid1 = r1.json()["user_id"]
    # Повторный — тот же аккаунт, не дублируем.
    r2 = await client.post("/api/integrations/telegram/auth",
                           headers=_bot(), json={"telegram_id": 555002})
    assert r2.json()["is_new"] is False
    assert r2.json()["user_id"] == uid1

    count = len((await db_session.execute(
        select(User).where(User.telegram_id == 555002)
    )).scalars().all())
    assert count == 1


# ─── Link existing web account ───

@pytest.mark.asyncio
async def test_link_token_and_auth_links_web_account(client: AsyncClient, db_session: AsyncSession):
    # Веб-юзер берёт код привязки.
    token, email = await _register(client)
    lt = await client.post("/api/integrations/telegram/link-token",
                           headers={"Authorization": f"Bearer {token}"})
    assert lt.status_code == 200
    code = lt.json()["code"]
    assert lt.json()["deep_link"].endswith(f"?start={code}")

    # Бот авторизует telegram-юзера с этим кодом → привязка к веб-аккаунту.
    resp = await client.post(
        "/api/integrations/telegram/auth",
        headers=_bot(), json={"telegram_id": 555003, "link_code": code},
    )
    assert resp.status_code == 200
    assert resp.json()["linked"] is True
    assert resp.json()["is_new"] is False

    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    assert user.telegram_id == 555003


@pytest.mark.asyncio
async def test_used_link_code_is_rejected(client: AsyncClient):
    token, _ = await _register(client)
    code = (await client.post("/api/integrations/telegram/link-token",
                              headers={"Authorization": f"Bearer {token}"})).json()["code"]
    # Первый раз — ок.
    await client.post("/api/integrations/telegram/auth",
                      headers=_bot(), json={"telegram_id": 555004, "link_code": code})
    # Второй раз тем же кодом с другого telegram_id → код уже использован,
    # привязки не происходит, а telegram_id 555005 авто-создаётся как новый.
    r = await client.post("/api/integrations/telegram/auth",
                          headers=_bot(), json={"telegram_id": 555005, "link_code": code})
    assert r.json()["linked"] is False
    assert r.json()["is_new"] is True


# ─── link-token auth ───

@pytest.mark.asyncio
async def test_link_token_requires_auth(client: AsyncClient):
    resp = await client.post("/api/integrations/telegram/link-token")
    assert resp.status_code in (401, 403)
