"""Тесты админ-панели: stats, users CRUD, access control."""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transcription import Transcription
from app.models.user import User
from app.services.auth import hash_password


async def _create_admin(db: AsyncSession) -> User:
    """Создать админа напрямую в БД."""
    admin = User(
        email=f"admin-{uuid.uuid4().hex[:6]}@test.com",
        password_hash=hash_password("admin123"),
        name="Admin",
        is_admin=True,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)
    return admin


async def _get_admin_token(client: AsyncClient, db: AsyncSession) -> str:
    """Создать админа и получить токен."""
    admin = await _create_admin(db)
    resp = await client.post("/api/auth/login", json={"email": admin.email, "password": "admin123"})
    return resp.json()["access_token"]


async def _get_user_token(client: AsyncClient) -> str:
    """Создать обычного пользователя и получить токен."""
    email = f"user-{uuid.uuid4().hex[:6]}@test.com"
    resp = await client.post("/api/auth/register", json={"email": email, "password": "pass1234"})
    return resp.json()["access_token"]


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── Access Control ───

@pytest.mark.asyncio
async def test_admin_stats_requires_admin(client: AsyncClient):
    """Обычный пользователь не имеет доступа к админке."""
    token = await _get_user_token(client)
    resp = await client.get("/api/admin/stats", headers=_h(token))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_stats_requires_auth(client: AsyncClient):
    """Без токена — 401/403."""
    resp = await client.get("/api/admin/stats")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_admin_users_requires_admin(client: AsyncClient):
    """Обычный пользователь не видит список юзеров."""
    token = await _get_user_token(client)
    resp = await client.get("/api/admin/users", headers=_h(token))
    assert resp.status_code == 403


# ─── Stats ───

@pytest.mark.asyncio
async def test_admin_stats(client: AsyncClient, db_session: AsyncSession):
    """Админ получает статистику."""
    token = await _get_admin_token(client, db_session)
    resp = await client.get("/api/admin/stats", headers=_h(token))
    assert resp.status_code == 200
    data = resp.json()
    assert "total_users" in data
    assert "total_transcriptions" in data
    assert "users_by_plan" in data
    assert "transcriptions_by_status" in data
    assert data["total_users"] >= 1  # как минимум сам админ


# ─── Users CRUD ───

@pytest.mark.asyncio
async def test_admin_list_users(client: AsyncClient, db_session: AsyncSession):
    """Админ видит список пользователей."""
    token = await _get_admin_token(client, db_session)
    # Создаём пару юзеров
    await client.post("/api/auth/register", json={"email": "u1@test.com", "password": "pass1234", "name": "User1"})
    await client.post("/api/auth/register", json={"email": "u2@test.com", "password": "pass1234", "name": "User2"})

    resp = await client.get("/api/admin/users", headers=_h(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 3  # admin + 2 users
    assert len(data["items"]) >= 3


@pytest.mark.asyncio
async def test_admin_search_users(client: AsyncClient, db_session: AsyncSession):
    """Поиск пользователей по email."""
    token = await _get_admin_token(client, db_session)
    await client.post("/api/auth/register", json={"email": "searchme@test.com", "password": "pass1234"})

    resp = await client.get("/api/admin/users", headers=_h(token), params={"search": "searchme"})
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_admin_get_user(client: AsyncClient, db_session: AsyncSession):
    """Получить конкретного пользователя."""
    token = await _get_admin_token(client, db_session)
    reg = await client.post("/api/auth/register", json={"email": "getme@test.com", "password": "pass1234", "name": "GetMe"})
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {reg.json()['access_token']}"})
    user_id = me.json()["id"]

    resp = await client.get(f"/api/admin/users/{user_id}", headers=_h(token))
    assert resp.status_code == 200
    assert resp.json()["email"] == "getme@test.com"
    assert resp.json()["name"] == "GetMe"


@pytest.mark.asyncio
async def test_admin_update_user_plan(client: AsyncClient, db_session: AsyncSession):
    """Админ меняет план пользователя."""
    token = await _get_admin_token(client, db_session)
    reg = await client.post("/api/auth/register", json={"email": "upgrade@test.com", "password": "pass1234"})
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {reg.json()['access_token']}"})
    user_id = me.json()["id"]

    resp = await client.patch(f"/api/admin/users/{user_id}", headers=_h(token), json={"plan": "pro", "minutes_limit": 1500})
    assert resp.status_code == 200
    assert resp.json()["plan"] == "pro"
    assert resp.json()["minutes_limit"] == 1500


@pytest.mark.asyncio
async def test_admin_toggle_admin(client: AsyncClient, db_session: AsyncSession):
    """Админ может назначить другого админа."""
    token = await _get_admin_token(client, db_session)
    reg = await client.post("/api/auth/register", json={"email": "newadmin@test.com", "password": "pass1234"})
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {reg.json()['access_token']}"})
    user_id = me.json()["id"]

    resp = await client.patch(f"/api/admin/users/{user_id}", headers=_h(token), json={"is_admin": True})
    assert resp.status_code == 200
    assert resp.json()["is_admin"] is True


@pytest.mark.asyncio
async def test_admin_delete_user(client: AsyncClient, db_session: AsyncSession):
    """Админ удаляет пользователя."""
    token = await _get_admin_token(client, db_session)
    reg = await client.post("/api/auth/register", json={"email": "deleteme@test.com", "password": "pass1234"})
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {reg.json()['access_token']}"})
    user_id = me.json()["id"]

    resp = await client.delete(f"/api/admin/users/{user_id}", headers=_h(token))
    assert resp.status_code == 200

    # Проверяем что удалён
    resp2 = await client.get(f"/api/admin/users/{user_id}", headers=_h(token))
    assert resp2.status_code == 404


@pytest.mark.asyncio
async def test_admin_cannot_delete_self(client: AsyncClient, db_session: AsyncSession):
    """Админ не может удалить самого себя."""
    admin = await _create_admin(db_session)
    login = await client.post("/api/auth/login", json={"email": admin.email, "password": "admin123"})
    token = login.json()["access_token"]

    resp = await client.delete(f"/api/admin/users/{admin.id}", headers=_h(token))
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_admin_get_nonexistent_user(client: AsyncClient, db_session: AsyncSession):
    """404 для несуществующего пользователя."""
    token = await _get_admin_token(client, db_session)
    fake_id = str(uuid.uuid4())
    resp = await client.get(f"/api/admin/users/{fake_id}", headers=_h(token))
    assert resp.status_code == 404


# ─── Transcriptions ───

@pytest.mark.asyncio
async def test_admin_list_transcriptions(client: AsyncClient, db_session: AsyncSession):
    """Админ видит все транскрипции."""
    token = await _get_admin_token(client, db_session)

    # Создаём транскрипцию через БД
    user = await _create_admin(db_session)
    t = Transcription(
        user_id=user.id, title="test.mp3", status="completed",
        original_filename="test.mp3", full_text="hello world",
    )
    db_session.add(t)
    await db_session.commit()

    resp = await client.get("/api/admin/transcriptions", headers=_h(token))
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


@pytest.mark.asyncio
async def test_admin_delete_transcription(client: AsyncClient, db_session: AsyncSession):
    """Админ удаляет транскрипцию."""
    token = await _get_admin_token(client, db_session)
    user = await _create_admin(db_session)
    t = Transcription(
        user_id=user.id, title="del.mp3", status="completed",
        original_filename="del.mp3", full_text="delete me",
    )
    db_session.add(t)
    await db_session.commit()
    await db_session.refresh(t)

    resp = await client.delete(f"/api/admin/transcriptions/{t.id}", headers=_h(token))
    assert resp.status_code == 200
