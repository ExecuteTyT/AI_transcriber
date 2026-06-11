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


def test_has_paid_access_logic():
    """has_paid_access: True если подписка не free ИЛИ есть минуты кошелька."""
    from app.services.plans import has_paid_access

    class U:
        def __init__(self, plan, wallet):
            self.plan = plan
            self.wallet_minutes = wallet

    assert has_paid_access(U("free", 0)) is False
    assert has_paid_access(U("free", 10)) is True     # есть кошелёк
    assert has_paid_access(U("start", 0)) is True      # платная подписка
    assert has_paid_access(U("pro", 0)) is True


def test_free_plan_proba_one_summary():
    """Free-проба: ровно 1 бесплатный разбор (ai_summaries=1)."""
    from app.services.plans import get_plan
    assert get_plan("free").ai_summaries == 1
