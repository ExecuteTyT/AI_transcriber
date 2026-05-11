"""Тесты ротации refresh-токенов (RFC 6819 §5.2.2.3)."""
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from sqlalchemy import select

from app.config import settings
from app.models.refresh_token import RefreshToken
from app.services.auth import hash_jti


VALID_PASSWORD = "TestPassword123!"


async def _register(client, email: str = "rotation@test.local") -> dict:
    """Register helper. Возвращает access/refresh tokens."""
    r = await client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": VALID_PASSWORD,
            "name": "Test",
            "consent_pd_processing": True,
            "consent_cross_border": True,
            "consent_marketing": False,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


def _jti_of(token: str) -> str:
    """Декодирует JWT и возвращает jti claim."""
    payload = jwt.decode(
        token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
    )
    return payload["jti"]


@pytest.mark.asyncio
async def test_login_issues_refresh_with_jti(client, db_session):
    """После register/login создаётся строка в refresh_tokens с правильным jti_hash."""
    tokens = await _register(client)
    jti = _jti_of(tokens["refresh_token"])

    rows = (
        await db_session.execute(
            select(RefreshToken).where(RefreshToken.jti_hash == hash_jti(jti))
        )
    ).scalars().all()
    assert len(rows) == 1
    rec = rows[0]
    assert rec.consumed_at is None
    assert rec.revoked_at is None


@pytest.mark.asyncio
async def test_refresh_rotates_and_invalidates_old(client, db_session):
    """После /refresh старый токен → 401, новый работает."""
    tokens = await _register(client)
    old = tokens["refresh_token"]

    r = await client.post("/api/auth/refresh", json={"refresh_token": old})
    assert r.status_code == 200, r.text
    new = r.json()["refresh_token"]
    assert new != old

    # Старый — 401 (он consumed). Но это РОВНО reuse-кейс, должен среагировать
    # на повторное использование → 401 + revoke family.
    r2 = await client.post("/api/auth/refresh", json={"refresh_token": old})
    assert r2.status_code == 401

    # Новый тоже теперь отозван (revoke family при reuse).
    r3 = await client.post("/api/auth/refresh", json={"refresh_token": new})
    assert r3.status_code == 401


@pytest.mark.asyncio
async def test_refresh_reuse_detection_revokes_all_user(client, db_session):
    """Reuse → revoke ВСЕ refresh-токены пользователя (RFC 6819 рекомендация)."""
    tokens = await _register(client)
    old = tokens["refresh_token"]

    # Делаем дополнительный login, чтобы у пользователя было 2 активные сессии.
    r_login = await client.post(
        "/api/auth/login",
        json={"email": "rotation@test.local", "password": VALID_PASSWORD},
    )
    assert r_login.status_code == 200
    other_session_refresh = r_login.json()["refresh_token"]

    # Первый refresh — ok.
    r = await client.post("/api/auth/refresh", json={"refresh_token": old})
    assert r.status_code == 200

    # Re-use старого → reuse detected → revoke ВСЕ токены этого юзера.
    r2 = await client.post("/api/auth/refresh", json={"refresh_token": old})
    assert r2.status_code == 401

    # Другая сессия тоже должна быть отозвана.
    r3 = await client.post("/api/auth/refresh", json={"refresh_token": other_session_refresh})
    assert r3.status_code == 401


@pytest.mark.asyncio
async def test_logout_revokes_only_current_session(client, db_session):
    """logout без all_devices=True отзывает только переданный refresh-токен."""
    tokens = await _register(client)
    access = tokens["access_token"]
    refresh = tokens["refresh_token"]

    # Второй login.
    r_login = await client.post(
        "/api/auth/login",
        json={"email": "rotation@test.local", "password": VALID_PASSWORD},
    )
    other_refresh = r_login.json()["refresh_token"]

    # Logout первой сессии.
    r = await client.post(
        "/api/auth/logout",
        json={"refresh_token": refresh, "all_devices": False},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert r.status_code == 200

    # Старый refresh — 401.
    r2 = await client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert r2.status_code == 401

    # Другая сессия живёт.
    r3 = await client.post("/api/auth/refresh", json={"refresh_token": other_refresh})
    assert r3.status_code == 200


@pytest.mark.asyncio
async def test_logout_all_devices(client, db_session):
    """all_devices=True отзывает все активные refresh-токены user'а."""
    tokens = await _register(client)
    access = tokens["access_token"]
    refresh = tokens["refresh_token"]

    r_login = await client.post(
        "/api/auth/login",
        json={"email": "rotation@test.local", "password": VALID_PASSWORD},
    )
    other_refresh = r_login.json()["refresh_token"]

    r = await client.post(
        "/api/auth/logout",
        json={"refresh_token": refresh, "all_devices": True},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert r.status_code == 200

    for tok in (refresh, other_refresh):
        r_check = await client.post("/api/auth/refresh", json={"refresh_token": tok})
        assert r_check.status_code == 401


@pytest.mark.asyncio
async def test_change_password_revokes_all_refresh(client, db_session):
    """После смены пароля все активные refresh-токены revoked."""
    tokens = await _register(client)
    access = tokens["access_token"]
    refresh = tokens["refresh_token"]

    r = await client.post(
        "/api/auth/change-password",
        json={"current_password": VALID_PASSWORD, "new_password": "NewPassword456!"},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert r.status_code == 200

    r2 = await client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert r2.status_code == 401


@pytest.mark.asyncio
async def test_invalid_refresh_token_rejected(client):
    """Произвольная строка / истёкший токен / wrong type → 401."""
    # 1. Произвольная строка.
    r = await client.post("/api/auth/refresh", json={"refresh_token": "garbage"})
    assert r.status_code == 401

    # 2. JWT с правильным секретом, но wrong type.
    bad = jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000000",
            "exp": datetime.now(timezone.utc) + timedelta(days=1),
            "type": "access",  # не refresh
            "jti": "x" * 32,
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    r2 = await client.post("/api/auth/refresh", json={"refresh_token": bad})
    assert r2.status_code == 401

    # 3. JWT без jti (pre-rotation legacy токены).
    legacy = jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000000",
            "exp": datetime.now(timezone.utc) + timedelta(days=1),
            "type": "refresh",
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    r3 = await client.post("/api/auth/refresh", json={"refresh_token": legacy})
    assert r3.status_code == 401


@pytest.mark.asyncio
async def test_refresh_chain_replaced_by_id_set(client, db_session):
    """После rotate новая запись имеет replaced_by_id указывающее на старую."""
    tokens = await _register(client)
    old_jti = _jti_of(tokens["refresh_token"])

    r = await client.post(
        "/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    new_jti = _jti_of(r.json()["refresh_token"])

    old_rec = (
        await db_session.execute(
            select(RefreshToken).where(RefreshToken.jti_hash == hash_jti(old_jti))
        )
    ).scalar_one()
    new_rec = (
        await db_session.execute(
            select(RefreshToken).where(RefreshToken.jti_hash == hash_jti(new_jti))
        )
    ).scalar_one()

    assert old_rec.consumed_at is not None
    assert new_rec.replaced_by_id == old_rec.id
