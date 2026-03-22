import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    """Регистрация нового пользователя."""
    response = await client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "secret123", "name": "Тест"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Нельзя зарегистрироваться с тем же email."""
    payload = {"email": "dup@example.com", "password": "secret123"}
    await client.post("/api/auth/register", json=payload)
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    """Вход по email + пароль."""
    await client.post(
        "/api/auth/register",
        json={"email": "login@example.com", "password": "pass123"},
    )
    response = await client.post(
        "/api/auth/login",
        json={"email": "login@example.com", "password": "pass123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Неверный пароль."""
    await client.post(
        "/api/auth/register",
        json={"email": "wrong@example.com", "password": "correct"},
    )
    response = await client.post(
        "/api/auth/login",
        json={"email": "wrong@example.com", "password": "incorrect"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient):
    """Обновление токенов через refresh."""
    reg = await client.post(
        "/api/auth/register",
        json={"email": "refresh@example.com", "password": "pass123"},
    )
    refresh_token = reg.json()["refresh_token"]

    response = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_me_unauthorized(client: AsyncClient):
    """Доступ к /me без токена."""
    response = await client.get("/api/auth/me")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_me_authorized(client: AsyncClient):
    """Доступ к /me с валидным токеном."""
    reg = await client.post(
        "/api/auth/register",
        json={"email": "me@example.com", "password": "pass123", "name": "Вася"},
    )
    token = reg.json()["access_token"]

    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
    assert data["name"] == "Вася"
    assert data["plan"] == "free"
    assert data["minutes_limit"] == 15
