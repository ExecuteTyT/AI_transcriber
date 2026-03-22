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
    # Проверка лимитов
    plan = get_plan(user.plan)
    if user.minutes_used >= user.minutes_limit:
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
    transcription = Transcription(
        user_id=user.id,
        title=safe_filename or "Без названия",
        file_key=file_key,
        original_filename=safe_filename,
        content_type=file.content_type or "",
        status="queued",
    )
    db.add(transcription)
    await db.commit()
    await db.refresh(transcription)

    # Запуск фоновой обработки (Celery)
    try:
        from app.tasks.transcribe import process_transcription
        process_transcription.delay(str(transcription.id))
    except (ImportError, ConnectionError, OSError):
        pass  # Celery может быть недоступен в dev-окружении

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
