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
async def test_generate_analysis_max_tokens_per_length(monkeypatch):
    """Каждый уровень объёма шлёт свой max_tokens и свою директиву в промпт."""
    from app.services import ai_analysis as svc

    captured: dict = {}

    async def fake_call(prompt, max_tokens):
        captured["max_tokens"] = max_tokens
        captured["prompt"] = prompt
        return "result", 5

    monkeypatch.setattr(svc, "_call_llm", fake_call)

    for length, expected_tokens, marker in [
        ("short", 1200, "КРАТКО"),
        ("standard", 3000, "СТАНДАРТ"),
        ("detailed", 6000, "ПОДРОБНО"),
    ]:
        await svc.generate_analysis("короткий текст", "key_points", length)
        assert captured["max_tokens"] == expected_tokens, length
        assert marker in captured["prompt"], length


async def _completed_transcription(client, db_session):
    token = await _register_and_get_token(client)
    me = await client.get("/api/auth/me", headers=_auth_headers(token))
    t = Transcription(
        user_id=uuid.UUID(me.json()["id"]), title="x", file_key="uploads/x.mp3",
        status="completed", full_text="достаточно текста для анализа",
    )
    db_session.add(t)
    await db_session.commit()
    await db_session.refresh(t)
    return token, t


@pytest.mark.asyncio
async def test_length_change_regenerates_same_row_no_double_limit(client, db_session, monkeypatch):
    """Смена уровня перегенерирует ТУ ЖЕ строку (лимит не задваивается)."""
    from sqlalchemy import func as sa_func
    from sqlalchemy import select as sa_select

    from app.api import ai_analysis as api_mod
    from app.models.ai_analysis import AiAnalysis

    calls = {"n": 0}

    async def fake_gen(text, analysis_type, length="standard"):
        calls["n"] += 1
        return f"content-{length}", 7

    monkeypatch.setattr(api_mod, "generate_analysis", fake_gen)
    token, t = await _completed_transcription(client, db_session)

    r1 = await client.get(f"/api/transcriptions/{t.id}/key-points", headers=_auth_headers(token))
    assert r1.status_code == 200 and r1.json()["length"] == "standard"
    id1 = r1.json()["id"]

    r2 = await client.get(
        f"/api/transcriptions/{t.id}/key-points?length=detailed", headers=_auth_headers(token)
    )
    assert r2.status_code == 200
    assert r2.json()["length"] == "detailed"
    assert r2.json()["id"] == id1                 # та же строка
    assert r2.json()["content"] == "content-detailed"

    # Повторный detailed → кэш, без новой генерации
    r3 = await client.get(
        f"/api/transcriptions/{t.id}/key-points?length=detailed", headers=_auth_headers(token)
    )
    assert r3.status_code == 200
    assert calls["n"] == 2                          # standard + detailed; повтор из кэша

    cnt = (await db_session.execute(
        sa_select(sa_func.count()).select_from(AiAnalysis).where(
            AiAnalysis.transcription_id == t.id, AiAnalysis.type == "key_points"
        )
    )).scalar()
    assert cnt == 1                                 # одна строка → лимит не задвоен


@pytest.mark.asyncio
async def test_invalid_length_rejected(client, db_session):
    """Невалидный length → 422."""
    token, t = await _completed_transcription(client, db_session)
    r = await client.get(
        f"/api/transcriptions/{t.id}/key-points?length=huge", headers=_auth_headers(token)
    )
    assert r.status_code == 422


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
