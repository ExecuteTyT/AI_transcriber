"""Тесты профиля: обновление данных, смена пароля."""
import pytest
from httpx import AsyncClient


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _register(client: AsyncClient, email: str = "profile@test.com", password: str = "pass1234", name: str = "Test") -> str:
    resp = await client.post("/api/auth/register", json={"email": email, "password": password, "name": name})
    return resp.json()["access_token"]


# ─── Update Profile ───

@pytest.mark.asyncio
async def test_update_name(client: AsyncClient):
    """Обновление имени."""
    token = await _register(client, "name@test.com")
    resp = await client.patch("/api/auth/profile", headers=_h(token), json={"name": "Новое Имя"})
    assert resp.status_code == 200

    me = await client.get("/api/auth/me", headers=_h(token))
    assert me.json()["name"] == "Новое Имя"


@pytest.mark.asyncio
async def test_update_profile_unauthorized(client: AsyncClient):
    """Обновление без токена → 401/403."""
    resp = await client.patch("/api/auth/profile", json={"name": "Hacker"})
    assert resp.status_code in (401, 403)


# ─── Change Password ───

@pytest.mark.asyncio
async def test_change_password(client: AsyncClient):
    """Смена пароля."""
    token = await _register(client, "chpass@test.com", "oldpass12")
    resp = await client.post(
        "/api/auth/change-password", headers=_h(token),
        json={"current_password": "oldpass12", "new_password": "newpass12"},
    )
    assert resp.status_code == 200

    # Логин с новым паролем
    login = await client.post("/api/auth/login", json={"email": "chpass@test.com", "password": "newpass12"})
    assert login.status_code == 200


@pytest.mark.asyncio
async def test_change_password_wrong_current(client: AsyncClient):
    """Смена пароля с неверным текущим → ошибка."""
    token = await _register(client, "wrongcur@test.com", "correct1")
    resp = await client.post(
        "/api/auth/change-password", headers=_h(token),
        json={"current_password": "wrong123", "new_password": "newpass12"},
    )
    assert resp.status_code in (400, 401, 403)


@pytest.mark.asyncio
async def test_change_password_too_short(client: AsyncClient):
    """Новый пароль < 8 символов → 422."""
    token = await _register(client, "short@test.com", "pass1234")
    resp = await client.post(
        "/api/auth/change-password", headers=_h(token),
        json={"current_password": "pass1234", "new_password": "short"},
    )
    assert resp.status_code == 422


# ─── /me returns is_admin ───

@pytest.mark.asyncio
async def test_me_returns_is_admin(client: AsyncClient):
    """Ответ /me содержит поле is_admin."""
    token = await _register(client, "admin_field@test.com")
    me = await client.get("/api/auth/me", headers=_h(token))
    assert me.status_code == 200
    assert "is_admin" in me.json()
    assert me.json()["is_admin"] is False
