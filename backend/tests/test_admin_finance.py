"""Тесты финансовой админ-аналитики: overview/timeseries/payments/wallets/CSV."""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import Subscription
from app.models.user import User
from app.models.wallet_topup import WalletTopup
from app.services.auth import hash_password


async def _create_admin(db: AsyncSession) -> User:
    admin = User(
        email=f"fin-admin-{uuid.uuid4().hex[:6]}@test.com",
        password_hash=hash_password("admin123"),
        name="FinAdmin",
        is_admin=True,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    return admin


async def _get_admin_token(client: AsyncClient, db: AsyncSession) -> str:
    admin = await _create_admin(db)
    resp = await client.post("/api/auth/login", json={"email": admin.email, "password": "admin123"})
    return resp.json()["access_token"]


async def _get_user_token(client: AsyncClient) -> str:
    email = f"fin-user-{uuid.uuid4().hex[:6]}@test.com"
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "pass1234", "consent_pd_processing": True, "consent_cross_border": True},
    )
    return resp.json()["access_token"]


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _seed_payments(db: AsyncSession) -> User:
    """Юзер с активной подпиской Pro (990₽) и пополнением кошелька w150 (299₽)."""
    u = User(
        email=f"payer-{uuid.uuid4().hex[:6]}@test.com",
        password_hash=hash_password("x"), name="Payer",
        plan="pro", wallet_minutes=150,
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)

    db.add_all([
        Subscription(
            user_id=u.id, plan="pro", yookassa_id=f"yk-sub-{uuid.uuid4().hex[:6]}",
            status="active", amount_rub=990,
        ),
        WalletTopup(
            user_id=u.id, yookassa_id=f"yk-wal-{uuid.uuid4().hex[:6]}",
            minutes=150, pack="w150", amount_rub=299,
        ),
    ])
    await db.commit()
    return u


# ─── Access control ───

@pytest.mark.asyncio
async def test_finance_overview_requires_admin(client: AsyncClient):
    token = await _get_user_token(client)
    resp = await client.get("/api/admin/finance/overview", headers=_h(token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_finance_payments_requires_admin(client: AsyncClient):
    token = await _get_user_token(client)
    resp = await client.get("/api/admin/finance/payments", headers=_h(token))
    assert resp.status_code == 403


# ─── Overview ───

@pytest.mark.asyncio
async def test_finance_overview(client: AsyncClient, db_session: AsyncSession):
    token = await _get_admin_token(client, db_session)
    await _seed_payments(db_session)

    data = (await client.get("/api/admin/finance/overview", headers=_h(token))).json()
    assert data["mrr_rub"] == 990              # одна активная подписка Pro
    assert data["paying_users"] == 1
    assert data["arpu_rub"] == 990.0
    # выручка all = подписка 990 + кошелёк 299
    rev_all = data["revenue"]["all"]
    assert rev_all["subscriptions"] == 990
    assert rev_all["wallet"] == 299
    assert rev_all["total"] == 1289


@pytest.mark.asyncio
async def test_finance_overview_churn(client: AsyncClient, db_session: AsyncSession):
    token = await _get_admin_token(client, db_session)
    u = await _seed_payments(db_session)
    # Добавим отменённую подписку → churn должен быть > 0.
    db_session.add(Subscription(
        user_id=u.id, plan="start", yookassa_id=f"yk-cancel-{uuid.uuid4().hex[:6]}",
        status="cancelled", amount_rub=500,
    ))
    await db_session.commit()

    data = (await client.get("/api/admin/finance/overview", headers=_h(token))).json()
    assert data["churn_pct"] > 0
    # MRR не учитывает отменённую.
    assert data["mrr_rub"] == 990


# ─── Timeseries ───

@pytest.mark.asyncio
async def test_finance_timeseries_shape(client: AsyncClient, db_session: AsyncSession):
    token = await _get_admin_token(client, db_session)
    await _seed_payments(db_session)

    data = (await client.get("/api/admin/finance/timeseries?days=7", headers=_h(token))).json()
    assert len(data) == 7
    assert {"date", "subscriptions_rub", "wallet_rub"} <= set(data[0].keys())
    # сегодняшний день содержит выручку
    assert data[-1]["subscriptions_rub"] == 990
    assert data[-1]["wallet_rub"] == 299


# ─── Payments feed ───

@pytest.mark.asyncio
async def test_finance_payments_feed(client: AsyncClient, db_session: AsyncSession):
    token = await _get_admin_token(client, db_session)
    u = await _seed_payments(db_session)

    body = (await client.get("/api/admin/finance/payments", headers=_h(token))).json()
    assert body["total"] == 2
    types = {item["type"] for item in body["items"]}
    assert types == {"subscription", "wallet"}
    # email подтянут join'ом
    assert all(item["email"] == u.email for item in body["items"])
    amounts = {item["amount_rub"] for item in body["items"]}
    assert amounts == {990, 299}


@pytest.mark.asyncio
async def test_finance_payments_filter_and_search(client: AsyncClient, db_session: AsyncSession):
    token = await _get_admin_token(client, db_session)
    u = await _seed_payments(db_session)

    only_wallet = (await client.get("/api/admin/finance/payments?type=wallet", headers=_h(token))).json()
    assert only_wallet["total"] == 1
    assert only_wallet["items"][0]["type"] == "wallet"

    found = (await client.get(f"/api/admin/finance/payments?search={u.email}", headers=_h(token))).json()
    assert found["total"] == 2


# ─── Wallets ───

@pytest.mark.asyncio
async def test_finance_wallets(client: AsyncClient, db_session: AsyncSession):
    token = await _get_admin_token(client, db_session)
    u = await _seed_payments(db_session)

    data = (await client.get("/api/admin/finance/wallets", headers=_h(token))).json()
    assert len(data) >= 1
    row = next(r for r in data if r["email"] == u.email)
    assert row["wallet_minutes"] == 150
    assert row["topup_count"] == 1
    assert row["total_topped_up_min"] == 150
    assert row["total_paid_rub"] == 299


# ─── Per-user payments ───

@pytest.mark.asyncio
async def test_user_payments_history(client: AsyncClient, db_session: AsyncSession):
    token = await _get_admin_token(client, db_session)
    u = await _seed_payments(db_session)

    data = (await client.get(f"/api/admin/users/{u.id}/payments", headers=_h(token))).json()
    assert len(data) == 2
    assert {item["amount_rub"] for item in data} == {990, 299}


# ─── CSV export ───

@pytest.mark.asyncio
async def test_finance_export_payments_csv(client: AsyncClient, db_session: AsyncSession):
    token = await _get_admin_token(client, db_session)
    await _seed_payments(db_session)

    resp = await client.get("/api/admin/finance/export.csv?type=payments", headers=_h(token))
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "attachment" in resp.headers["content-disposition"]
    text = resp.text
    assert "amount_rub" in text     # заголовок
    assert "990" in text and "299" in text


@pytest.mark.asyncio
async def test_finance_export_wallets_csv(client: AsyncClient, db_session: AsyncSession):
    token = await _get_admin_token(client, db_session)
    await _seed_payments(db_session)

    resp = await client.get("/api/admin/finance/export.csv?type=wallets", headers=_h(token))
    assert resp.status_code == 200
    assert "wallet_minutes" in resp.text


# ─── AdminUserResponse: финансы по юзеру ───

@pytest.mark.asyncio
async def test_user_detail_finance_fields(client: AsyncClient, db_session: AsyncSession):
    token = await _get_admin_token(client, db_session)
    u = await _seed_payments(db_session)

    data = (await client.get(f"/api/admin/users/{u.id}", headers=_h(token))).json()
    assert data["wallet_minutes"] == 150
    assert data["subscription_plan"] == "pro"
    assert data["subscription_status"] == "active"
    # LTV = 990 (подписка) + 299 (кошелёк)
    assert data["total_paid_rub"] == 1289
    assert data["last_payment_date"] is not None
