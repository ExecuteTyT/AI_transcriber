import logging
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.transcription import Transcription
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.transcription import (
    PaginatedTranscriptions,
    TranscriptionListItem,
    TranscriptionResponse,
    TranscriptionStatusResponse,
    TranscriptionUploadResponse,
)
from app.services.plans import get_plan
from app.services.storage import s3_service

router = APIRouter(prefix="/api/transcriptions", tags=["transcriptions"])


@router.get("/media/stream")
async def stream_media(request: Request, token: str):
    """Стриминг локально хранящегося файла по signed-токену с поддержкой Range.

    Объявлен первым, чтобы путь `/media/stream` не конфликтовал с `/{transcription_id}/...`.
    """
    from fastapi.responses import StreamingResponse

    from app.services.auth import decode_media_token

    payload = decode_media_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный токен")

    file_key = payload.get("fk")
    if not file_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Неверный токен")

    if s3_service is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Хранилище не настроено")

    try:
        total_size = s3_service.get_file_size(file_key)
    except (FileNotFoundError, NotImplementedError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл не найден")

    content_type = s3_service.get_content_type(file_key)
    range_header = request.headers.get("range")
    start = 0
    end = total_size - 1
    status_code = 200
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Type": content_type,
    }

    if range_header and range_header.startswith("bytes="):
        try:
            rng = range_header.split("=", 1)[1].strip()
            start_str, _, end_str = rng.partition("-")
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str else total_size - 1
            end = min(end, total_size - 1)
            if start > end or start >= total_size:
                raise ValueError
            status_code = 206
            headers["Content-Range"] = f"bytes {start}-{end}/{total_size}"
        except ValueError:
            raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail="Неверный Range")

    length = end - start + 1
    headers["Content-Length"] = str(length)

    def iter_chunks(chunk_size: int = 64 * 1024):
        remaining = length
        f = s3_service.open_stream(file_key, start=start)
        try:
            while remaining > 0:
                read = f.read(min(chunk_size, remaining))
                if not read:
                    break
                remaining -= len(read)
                yield read
        finally:
            f.close()

    return StreamingResponse(iter_chunks(), status_code=status_code, headers=headers, media_type=content_type)

# Допустимые форматы файлов
ALLOWED_AUDIO_TYPES = {
    "audio/mpeg", "audio/wav", "audio/x-wav", "audio/flac",
    "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac",
    "audio/webm",
}
ALLOWED_VIDEO_TYPES = {
    "video/mp4", "video/webm", "video/quicktime",
}
ALLOWED_TYPES = ALLOWED_AUDIO_TYPES | ALLOWED_VIDEO_TYPES
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 МБ


@router.post("/upload", response_model=TranscriptionUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Загрузка аудио/видео файла для транскрибации."""
    # Проверка лимитов (админы без ограничений)
    plan = get_plan(user.plan)
    if not user.is_admin and user.minutes_used >= user.minutes_limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Лимит минут исчерпан ({user.minutes_used}/{user.minutes_limit}). "
            "Перейдите на более высокий тариф.",
        )

    # Валидация типа файла
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Неподдерживаемый формат файла: {file.content_type}. "
            f"Допустимые: mp3, wav, flac, ogg, m4a, aac, webm, mp4, mov",
        )

    # Чтение и проверка размера
    file_data = await file.read()
    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Файл превышает максимальный размер 500 МБ",
        )

    # Загрузка в S3
    if s3_service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="S3-хранилище не настроено",
        )

    safe_filename = os.path.basename(file.filename) if file.filename else "audio"
    file_key = s3_service.generate_file_key(safe_filename)
    s3_service.upload_file(file_data, file_key, file.content_type or "application/octet-stream")

    # Создание записи в БД
    # expires_at = now + user.data_retention_days (None = бессрочно).
    from datetime import datetime, timedelta, timezone
    expires_at = None
    if user.data_retention_days is not None and user.data_retention_days > 0:
        expires_at = datetime.now(timezone.utc) + timedelta(days=user.data_retention_days)

    transcription = Transcription(
        user_id=user.id,
        title=safe_filename or "Без названия",
        file_key=file_key,
        original_filename=safe_filename,
        content_type=file.content_type or "",
        status="queued",
        expires_at=expires_at,
    )
    db.add(transcription)
    await db.commit()
    await db.refresh(transcription)

    # Запуск фоновой обработки (Celery)
    try:
        from app.tasks.transcribe import process_transcription
        process_transcription.delay(str(transcription.id))
    except (ImportError, ConnectionError, OSError) as exc:
        logger = logging.getLogger(__name__)
        logger.error("Celery unavailable, marking transcription %s as failed: %s", transcription.id, exc)
        transcription.status = "failed"
        transcription.error_message = "Сервис обработки временно недоступен. Попробуйте позже."
        await db.commit()

    return TranscriptionUploadResponse(
        id=transcription.id,
        status=transcription.status,
        message="Файл загружен, обработка начата",
    )


@router.get("/{transcription_id}", response_model=TranscriptionResponse)
async def get_transcription(
    transcription_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получение транскрипции по ID."""
    result = await db.execute(
        select(Transcription).where(
            Transcription.id == transcription_id,
            Transcription.user_id == user.id,
        )
    )
    transcription = result.scalar_one_or_none()
    if transcription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Транскрипция не найдена")
    return transcription


@router.get("/{transcription_id}/status", response_model=TranscriptionStatusResponse)
async def get_transcription_status(
    transcription_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получение статуса обработки."""
    result = await db.execute(
        select(Transcription).where(
            Transcription.id == transcription_id,
            Transcription.user_id == user.id,
        )
    )
    transcription = result.scalar_one_or_none()
    if transcription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Транскрипция не найдена")
    return TranscriptionStatusResponse(
        id=transcription.id,
        status=transcription.status,
        error_message=transcription.error_message,
    )


@router.get("", response_model=PaginatedTranscriptions)
async def list_transcriptions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Список транскрипций пользователя с пагинацией."""
    base_query = select(Transcription).where(Transcription.user_id == user.id)

    # Общее количество
    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar() or 0

    # Записи с пагинацией
    result = await db.execute(
        base_query.order_by(Transcription.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    items = result.scalars().all()

    return PaginatedTranscriptions(
        items=[TranscriptionListItem.model_validate(t) for t in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.delete("/{transcription_id}", response_model=MessageResponse)
async def delete_transcription(
    transcription_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Удаление транскрипции."""
    result = await db.execute(
        select(Transcription).where(
            Transcription.id == transcription_id,
            Transcription.user_id == user.id,
        )
    )
    transcription = result.scalar_one_or_none()
    if transcription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Транскрипция не найдена")

    # Удаление файла из S3
    if s3_service and transcription.file_key:
        try:
            s3_service.delete_file(transcription.file_key)
        except (OSError, Exception):
            pass  # Файл мог быть уже удалён

    await db.delete(transcription)
    await db.commit()
    return MessageResponse(message="Транскрипция удалена")


@router.get("/{transcription_id}/audio-url")
async def get_audio_url(
    transcription_id: uuid.UUID,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Короткоживущая ссылка для <audio src>: presigned S3 или signed-токен для локального стрима."""
    result = await db.execute(
        select(Transcription).where(
            Transcription.id == transcription_id,
            Transcription.user_id == user.id,
        )
    )
    transcription = result.scalar_one_or_none()
    if transcription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Транскрипция не найдена")
    if not transcription.file_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл недоступен")

    if s3_service is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Хранилище не настроено")

    # 1) Если это S3 — выдаём прямой presigned URL (браузер тянет напрямую с S3)
    presigned = s3_service.get_presigned_url(transcription.file_key, expires_in=3600)
    if presigned:
        return {"url": presigned, "content_type": transcription.content_type or "audio/mpeg"}

    # 2) Локальное хранилище — выдаём signed-токен на проксирующий стрим
    from app.services.auth import create_media_token

    token = create_media_token(transcription.file_key, str(user.id), expires_in=3600)
    base = str(request.base_url).rstrip("/")
    return {
        "url": f"{base}/api/transcriptions/media/stream?token={token}",
        "content_type": transcription.content_type or "audio/mpeg",
    }


@router.get("/{transcription_id}/export/{format}")
async def export_transcription(
    transcription_id: uuid.UUID,
    format: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Экспорт транскрипции в формате TXT, SRT или DOCX."""
    result = await db.execute(
        select(Transcription).where(
            Transcription.id == transcription_id,
            Transcription.user_id == user.id,
        )
    )
    transcription = result.scalar_one_or_none()
    if transcription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Транскрипция не найдена")

    if transcription.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Транскрипция ещё не завершена",
        )

    from urllib.parse import quote

    from app.services.export import export_docx, export_srt, export_txt
    from fastapi.responses import PlainTextResponse, Response

    # RFC 5987: filename* для Unicode, filename для ASCII-fallback
    safe_title = transcription.title or "export"

    def _content_disposition(ext: str) -> str:
        encoded = quote(f"{safe_title}.{ext}")
        return f"attachment; filename=\"export.{ext}\"; filename*=UTF-8''{encoded}"

    if format == "txt":
        content = export_txt(transcription)
        return PlainTextResponse(
            content, media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": _content_disposition("txt")},
        )
    elif format == "srt":
        content = export_srt(transcription)
        return PlainTextResponse(
            content, media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": _content_disposition("srt")},
        )
    elif format == "docx":
        content_bytes = export_docx(transcription)
        return Response(
            content=content_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": _content_disposition("docx")},
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Неподдерживаемый формат: {format}. Допустимые: txt, srt, docx",
        )
