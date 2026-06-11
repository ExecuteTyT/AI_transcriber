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


@pytest.mark.asyncio
async def test_wallet_topup_model_exists(db_session: AsyncSession):
    """Модель WalletTopup создаётся и пишется (идемпотентность по yookassa_id)."""
    from app.models.wallet_topup import WalletTopup
    t = WalletTopup(user_id=uuid.uuid4(), yookassa_id="pay_1", minutes=150, pack="w150")
    db_session.add(t)
    await db_session.commit()
    assert t.id is not None


@pytest.mark.asyncio
async def test_credit_wallet_adds_minutes_idempotent(db_session: AsyncSession):
    """credit_wallet начисляет минуты и не дублирует по тому же yookassa_id."""
    from app.services.payment import credit_wallet

    user = User(email=f"w-{uuid.uuid4().hex[:6]}@e.com", password_hash="x",
                plan="free", wallet_minutes=0)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    await credit_wallet(user.id, pack="w150", yookassa_id="pay_X", db=db_session)
    await db_session.refresh(user)
    assert user.wallet_minutes == 150

    # повторный webhook тем же платежом — не начисляет второй раз
    await credit_wallet(user.id, pack="w150", yookassa_id="pay_X", db=db_session)
    await db_session.refresh(user)
    assert user.wallet_minutes == 150


@pytest.mark.asyncio
async def test_wallet_topup_endpoint_rejects_bad_pack(client: AsyncClient):
    """POST /api/payments/wallet с неизвестным пакетом → 400."""
    token, _ = await _register(client)
    resp = await client.post("/api/payments/wallet", headers=_h(token),
                             json={"pack": "nonexistent"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_webhook_wallet_credits_minutes(client: AsyncClient, db_session: AsyncSession, monkeypatch):
    """payment.succeeded с metadata.type=wallet начисляет минуты на кошелёк."""
    import app.api.payments as payments_mod
    _, email = await _register(client)
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()

    async def fake_verify(pid):
        return {"status": "succeeded",
                "amount": {"value": "299.00"},
                "metadata": {"type": "wallet", "user_id": str(user.id), "pack": "w150"}}

    monkeypatch.setattr(payments_mod, "verify_payment_via_api", fake_verify)
    monkeypatch.setattr(payments_mod, "is_yookassa_ip", lambda ip: True)

    resp = await client.post(
        "/api/payments/webhook",
        json={"event": "payment.succeeded", "object": {"id": "pay_W1"}},
        headers={"x-forwarded-for": "185.71.76.1"},
    )
    assert resp.status_code == 200
    # credit_wallet коммитит в request-scoped сессии; сбрасываем снапшот db_session
    # (отдельное SQLite-соединение), чтобы перечитать актуальное состояние.
    await db_session.rollback()
    user = (await db_session.execute(select(User).where(User.email == email))).scalar_one()
    assert user.wallet_minutes == 150
