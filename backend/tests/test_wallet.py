"""Тесты кошелька (wallet_minutes), пробы-пейволла и платного доступа."""
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
        json={"email": email, "password": "password1", "name": "T",
              "consent_pd_processing": True, "consent_cross_border": True},
    )
    return resp.json()["access_token"], email


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_new_user_wallet_minutes_default_zero(client: AsyncClient, db_session: AsyncSession):
    """Новый юзер: wallet_minutes = 0 по умолчанию."""
    _, email = await _register(client)
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    assert user.wallet_minutes == 0
