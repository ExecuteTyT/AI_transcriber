"""Тесты welcome-bonus (180 мин при регистрации) + приоритета расхода."""
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
        json={"email": email, "password": "password1", "name": "T"},
    )
    return resp.json()["access_token"], email


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_new_user_gets_180_bonus(client: AsyncClient):
    """При регистрации начисляется 180 bonus_minutes."""
    token, _ = await _register(client)
    me = await client.get("/api/auth/me", headers=_h(token))
    assert me.json()["bonus_minutes"] == 180


@pytest.mark.asyncio
async def test_upload_allowed_when_only_bonus(client: AsyncClient, db_session: AsyncSession):
    """monthly = 0, bonus=180: upload должен пройти проверку лимита."""
    token, email = await _register(client)
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    # Обнулим monthly, оставим bonus
    user.minutes_limit = 30
    user.minutes_used = 30
    user.bonus_minutes = 180
    await db_session.commit()

    response = await client.post(
        "/api/transcriptions/upload",
        headers=_h(token),
        files={"file": ("test.mp3", b"fake", "audio/mpeg")},
    )
    # 503 = S3 не настроен, значит лимит прошёл.
    assert response.status_code == 503


@pytest.mark.asyncio
async def test_upload_blocked_when_all_zero(client: AsyncClient, db_session: AsyncSession):
    """monthly=0 И bonus=0 → 403."""
    token, email = await _register(client)
    result = await db_session.execute(select(User).where(User.email == email))
    user = result.scalar_one()
    user.minutes_limit = 30
    user.minutes_used = 30
    user.bonus_minutes = 0
    await db_session.commit()

    response = await client.post(
        "/api/transcriptions/upload",
        headers=_h(token),
        files={"file": ("test.mp3", b"fake", "audio/mpeg")},
    )
    assert response.status_code == 403


def test_bonus_consumption_priority():
    """Unit-тест логики расхода (как в tasks/transcribe.py): сначала bonus, потом monthly."""

    def _consume(bonus: int, used: int, limit: int, minutes: int) -> tuple[int, int]:
        """Возвращает (new_bonus, new_used) после расхода minutes."""
        if bonus > 0:
            spent = min(bonus, minutes)
            bonus -= spent
            minutes -= spent
        if minutes > 0:
            used += minutes
        return bonus, used

    # Full consumption из bonus
    assert _consume(180, 0, 30, 50) == (130, 0)

    # Exhaust bonus, переход на monthly
    assert _consume(100, 0, 600, 150) == (0, 50)

    # Bonus=0, только monthly
    assert _consume(0, 0, 600, 100) == (0, 100)

    # Точное совпадение с bonus
    assert _consume(180, 0, 30, 180) == (0, 0)
