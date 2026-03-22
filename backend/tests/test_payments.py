import uuid

import pytest
from httpx import AsyncClient


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
async def test_get_subscription_free(client: AsyncClient):
    """Новый пользователь — free план без подписки."""
    token = await _register_and_get_token(client)
    response = await client.get(
        "/api/payments/subscription", headers=_auth_headers(token)
    )
    assert response.status_code == 200
    data = response.json()
    assert data["plan"] == "free"
    assert data["status"] == "none"
    assert data["minutes_limit"] == 15
    assert data["minutes_used"] == 0


@pytest.mark.asyncio
async def test_subscribe_unauthorized(client: AsyncClient):
    """Подписка без авторизации → 401/403."""
    response = await client.post(
        "/api/payments/subscribe",
        json={"plan": "start"},
    )
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_subscribe_invalid_plan(client: AsyncClient):
    """Подписка на невалидный план → 400."""
    token = await _register_and_get_token(client)
    response = await client.post(
        "/api/payments/subscribe",
        headers=_auth_headers(token),
        json={"plan": "super-premium"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_subscribe_same_plan(client: AsyncClient):
    """Подписка на текущий план → 400."""
    token = await _register_and_get_token(client)
    # free plan пользователю, подписка на free невозможна (только start/pro), но
    # проверяем start на start — нужно сначала активировать
    # Пока проверяем что нельзя подписаться на "free"
    response = await client.post(
        "/api/payments/subscribe",
        headers=_auth_headers(token),
        json={"plan": "free"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_cancel_no_active_subscription(client: AsyncClient):
    """Отмена при отсутствии подписки → 404."""
    token = await _register_and_get_token(client)
    response = await client.post(
        "/api/payments/cancel", headers=_auth_headers(token)
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_webhook_invalid_body(client: AsyncClient):
    """Вебхук с невалидным JSON."""
    response = await client.post(
        "/api/payments/webhook",
        content=b"not-json",
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_webhook_payment_succeeded(client: AsyncClient, db_session):
    """Вебхук payment.succeeded активирует подписку."""
    # Создаём пользователя
    token = await _register_and_get_token(client)
    me = await client.get("/api/auth/me", headers=_auth_headers(token))
    user_id = me.json()["id"]

    # Имитируем вебхук
    response = await client.post(
        "/api/payments/webhook",
        json={
            "type": "payment.succeeded",
            "object": {
                "id": "test-payment-123",
                "metadata": {
                    "user_id": user_id,
                    "plan": "start",
                },
            },
        },
    )
    assert response.status_code == 200

    # Проверяем что подписка активирована
    sub_resp = await client.get(
        "/api/payments/subscription", headers=_auth_headers(token)
    )
    data = sub_resp.json()
    assert data["plan"] == "start"
    assert data["status"] == "active"
    assert data["minutes_limit"] == 300
