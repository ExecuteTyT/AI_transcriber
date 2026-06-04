import uuid

import pytest
from httpx import AsyncClient

from app.models.transcription import Transcription


async def _register_and_get_token(client: AsyncClient) -> str:
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "pass1234", "consent_pd_processing": True, "consent_cross_border": True},
    )
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_summary_not_found(client: AsyncClient):
    """Саммари несуществующей транскрипции → 404."""
    token = await _register_and_get_token(client)
    fake_id = str(uuid.uuid4())
    response = await client.get(
        f"/api/transcriptions/{fake_id}/summary", headers=_auth_headers(token)
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_summary_not_completed(client: AsyncClient, db_session):
    """Саммари незавершённой транскрипции → 400."""
    token = await _register_and_get_token(client)
    me = await client.get("/api/auth/me", headers=_auth_headers(token))
    user_id = me.json()["id"]

    t = Transcription(
        user_id=uuid.UUID(user_id),
        title="In progress",
        file_key="uploads/test.mp3",
        status="processing",
    )
    db_session.add(t)
    await db_session.commit()
    await db_session.refresh(t)

    response = await client.get(
        f"/api/transcriptions/{t.id}/summary", headers=_auth_headers(token)
    )
    assert response.status_code == 400
    assert "не завершена" in response.json()["detail"]


@pytest.mark.asyncio
async def test_key_points_not_found(client: AsyncClient):
    """Тезисы несуществующей транскрипции → 404."""
    token = await _register_and_get_token(client)
    fake_id = str(uuid.uuid4())
    response = await client.get(
        f"/api/transcriptions/{fake_id}/key-points", headers=_auth_headers(token)
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_transcription_with_analysis_does_not_crash(client: AsyncClient, db_session):
    """Регресс: удаление транскрипции с привязанным AiAnalysis не падает.

    Раньше связь ai_analyses была без cascade → ORM при db.delete(parent) слал
    UPDATE ai_analyses SET transcription_id=NULL → NOT NULL violation, из-за чего
    ночная cleanup_expired падала каждую ночь. Теперь passive_deletes=True +
    cascade — удаление детей на стороне БД (FK ondelete=CASCADE в проде).
    """
    from sqlalchemy import select

    from app.models.ai_analysis import AiAnalysis

    token = await _register_and_get_token(client)
    me = await client.get("/api/auth/me", headers=_auth_headers(token))
    user_id = me.json()["id"]

    t = Transcription(
        user_id=uuid.UUID(user_id), title="x", file_key="uploads/x.mp3",
        status="completed", full_text="текст",
    )
    db_session.add(t)
    await db_session.commit()
    await db_session.refresh(t)

    db_session.add(AiAnalysis(
        transcription_id=t.id, type="key_points", content="### тезис", tokens_used=10,
    ))
    await db_session.commit()

    # Ключевое: до фикса здесь падал IntegrityError (UPDATE ...=NULL).
    await db_session.delete(t)
    await db_session.commit()

    res = await db_session.execute(select(Transcription).where(Transcription.id == t.id))
    assert res.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_action_items_not_found(client: AsyncClient):
    """Action items несуществующей транскрипции → 404."""
    token = await _register_and_get_token(client)
    fake_id = str(uuid.uuid4())
    response = await client.get(
        f"/api/transcriptions/{fake_id}/action-items", headers=_auth_headers(token)
    )
    assert response.status_code == 404
