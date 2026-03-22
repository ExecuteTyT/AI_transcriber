import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.transcription import Transcription


async def _register_and_get_token(client: AsyncClient) -> str:
    """Вспомогательная функция: регистрация + получение токена."""
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "pass123"},
    )
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_list_transcriptions_empty(client: AsyncClient):
    """Список транскрипций пустой для нового пользователя."""
    token = await _register_and_get_token(client)
    response = await client.get("/api/transcriptions", headers=_auth_headers(token))
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_transcriptions_unauthorized(client: AsyncClient):
    """Список транскрипций без токена → 401/403."""
    response = await client.get("/api/transcriptions")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_get_transcription_not_found(client: AsyncClient):
    """Получение несуществующей транскрипции → 404."""
    token = await _register_and_get_token(client)
    fake_id = str(uuid.uuid4())
    response = await client.get(
        f"/api/transcriptions/{fake_id}", headers=_auth_headers(token)
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_transcription_status_not_found(client: AsyncClient):
    """Статус несуществующей транскрипции → 404."""
    token = await _register_and_get_token(client)
    fake_id = str(uuid.uuid4())
    response = await client.get(
        f"/api/transcriptions/{fake_id}/status", headers=_auth_headers(token)
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_transcription_not_found(client: AsyncClient):
    """Удаление несуществующей транскрипции → 404."""
    token = await _register_and_get_token(client)
    fake_id = str(uuid.uuid4())
    response = await client.delete(
        f"/api/transcriptions/{fake_id}", headers=_auth_headers(token)
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_upload_invalid_mime_type(client: AsyncClient):
    """Загрузка файла с неподдерживаемым MIME → 400."""
    token = await _register_and_get_token(client)
    response = await client.post(
        "/api/transcriptions/upload",
        headers=_auth_headers(token),
        files={"file": ("test.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 400
    assert "Неподдерживаемый формат" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_no_s3(client: AsyncClient):
    """Загрузка файла когда S3 не настроен → 503."""
    token = await _register_and_get_token(client)
    # S3 не настроен в тестовом окружении (s3_service = None)
    response = await client.post(
        "/api/transcriptions/upload",
        headers=_auth_headers(token),
        files={"file": ("test.mp3", b"fake-audio-data", "audio/mpeg")},
    )
    assert response.status_code == 503
    assert "S3" in response.json()["detail"]


@pytest.mark.asyncio
async def test_crud_with_db_record(client: AsyncClient, db_session):
    """CRUD операции с транскрипцией созданной напрямую в БД."""
    # Регистрируем пользователя
    token = await _register_and_get_token(client)

    # Получаем user_id из /me
    me_resp = await client.get("/api/auth/me", headers=_auth_headers(token))
    user_id = me_resp.json()["id"]

    # Создаём запись напрямую в БД
    transcription = Transcription(
        user_id=uuid.UUID(user_id),
        title="Test audio.mp3",
        file_key="uploads/test-key.mp3",
        original_filename="audio.mp3",
        content_type="audio/mpeg",
        status="completed",
        full_text="Привет мир",
        segments=[{"start": 0, "end": 5, "text": "Привет мир", "speaker": "Speaker 1"}],
        language="ru",
        duration_sec=5,
    )
    db_session.add(transcription)
    await db_session.commit()
    await db_session.refresh(transcription)
    t_id = str(transcription.id)

    # GET by id
    resp = await client.get(f"/api/transcriptions/{t_id}", headers=_auth_headers(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Test audio.mp3"
    assert data["full_text"] == "Привет мир"
    assert data["status"] == "completed"
    assert len(data["segments"]) == 1

    # GET status
    resp = await client.get(f"/api/transcriptions/{t_id}/status", headers=_auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"

    # GET list
    resp = await client.get("/api/transcriptions", headers=_auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["id"] == t_id

    # Export TXT
    resp = await client.get(f"/api/transcriptions/{t_id}/export/txt", headers=_auth_headers(token))
    assert resp.status_code == 200
    assert "Привет мир" in resp.text

    # Export SRT
    resp = await client.get(f"/api/transcriptions/{t_id}/export/srt", headers=_auth_headers(token))
    assert resp.status_code == 200
    assert "00:00:00,000" in resp.text
    assert "Привет мир" in resp.text

    # Export DOCX
    resp = await client.get(f"/api/transcriptions/{t_id}/export/docx", headers=_auth_headers(token))
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    # Export invalid format
    resp = await client.get(f"/api/transcriptions/{t_id}/export/pdf", headers=_auth_headers(token))
    assert resp.status_code == 400

    # DELETE
    resp = await client.delete(f"/api/transcriptions/{t_id}", headers=_auth_headers(token))
    assert resp.status_code == 200

    # Verify deleted
    resp = await client.get(f"/api/transcriptions/{t_id}", headers=_auth_headers(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_other_user_cannot_access(client: AsyncClient, db_session):
    """Другой пользователь не видит чужие транскрипции."""
    # User 1
    token1 = await _register_and_get_token(client)
    me1 = await client.get("/api/auth/me", headers=_auth_headers(token1))
    user1_id = me1.json()["id"]

    # User 2
    token2 = await _register_and_get_token(client)

    # Создаём запись для User 1
    t = Transcription(
        user_id=uuid.UUID(user1_id),
        title="Private",
        file_key="uploads/private.mp3",
        status="completed",
    )
    db_session.add(t)
    await db_session.commit()
    await db_session.refresh(t)

    # User 2 не может увидеть
    resp = await client.get(
        f"/api/transcriptions/{t.id}", headers=_auth_headers(token2)
    )
    assert resp.status_code == 404

    # User 2 не может удалить
    resp = await client.delete(
        f"/api/transcriptions/{t.id}", headers=_auth_headers(token2)
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_pagination(client: AsyncClient):
    """Пагинация с limit/offset валидацией."""
    token = await _register_and_get_token(client)

    # Невалидный limit
    resp = await client.get(
        "/api/transcriptions?limit=0", headers=_auth_headers(token)
    )
    assert resp.status_code == 422

    resp = await client.get(
        "/api/transcriptions?limit=200", headers=_auth_headers(token)
    )
    assert resp.status_code == 422

    # Невалидный offset
    resp = await client.get(
        "/api/transcriptions?offset=-1", headers=_auth_headers(token)
    )
    assert resp.status_code == 422
