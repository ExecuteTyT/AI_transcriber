"""Celery-beat task: автоудаление аудиофайлов по истечении audio_delete_at (152-ФЗ).

Отличается от cleanup_transcriptions: тот удаляет ВСЮ запись (текст+аудио).
Эта таска удаляет ТОЛЬКО аудиофайл из S3, текст транскрипции остаётся —
чтобы пользователь не терял ценность от уже распознанного материала.

Расписание — в app.tasks.celery_app.beat_schedule (каждые 6 часов).
"""
import logging
from datetime import datetime, timezone

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.transcription import Transcription
from app.services.audit_log import audit
from app.services.storage import s3_service
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
sync_engine = create_engine(sync_url)
SyncSession = sessionmaker(sync_engine)


@celery_app.task(name="app.tasks.cleanup_audio.cleanup_expired_audio")
def cleanup_expired_audio():
    """Удаляет аудиофайлы из S3, у которых audio_delete_at < NOW() и audio_deleted_at IS NULL.

    После успешного S3-delete:
        audio_deleted_at = NOW()
        audio_deleted_log = 'auto-cron'
        file_key = ''            # пустая строка вместо NULL (NOT NULL ограничение)
    """
    now = datetime.now(timezone.utc)
    deleted = 0
    s3_errors = 0

    with SyncSession() as db:
        result = db.execute(
            select(Transcription).where(
                Transcription.audio_delete_at.is_not(None),
                Transcription.audio_delete_at < now,
                Transcription.audio_deleted_at.is_(None),
                Transcription.file_key.is_not(None),
                Transcription.file_key != "",
            )
        )
        rows = result.scalars().all()

        for trans in rows:
            success = True
            if s3_service is not None and trans.file_key:
                try:
                    s3_service.delete_file(trans.file_key)
                except Exception as exc:
                    success = False
                    s3_errors += 1
                    logger.warning(
                        "cleanup_audio: S3 delete failed for %s: %s",
                        trans.file_key, exc,
                    )

            # Обновляем запись даже если S3 не удалось — ON DELETE 404 от S3
            # это нормальный кейс (файл уже удалили вручную), отмечаем удалённым.
            # Реальные сетевые/auth ошибки — оставляем file_key, попробуем в
            # следующий проход.
            if success or _is_acceptable_error_to_skip(trans.file_key):
                trans.audio_deleted_at = now
                trans.audio_deleted_log = "auto-cron"
                trans.file_key = ""
                deleted += 1

            audit(
                "audio_deleted",
                transcription_id=str(trans.id),
                user_id=str(trans.user_id),
                reason="auto-cron",
                scheduled_at=trans.audio_delete_at.isoformat() if trans.audio_delete_at else None,
                s3_key_prefix=(trans.file_key[:32] + "...") if trans.file_key else None,
            )

        db.commit()

    logger.info(
        "cleanup_expired_audio: удалено %d аудиофайлов (S3-ошибок: %d)",
        deleted, s3_errors,
    )
    return {"deleted": deleted, "s3_errors": s3_errors}


def _is_acceptable_error_to_skip(file_key: str) -> bool:
    """Заглушка под расширение: если S3 вернул NoSuchKey — мы можем смело
    отметить запись удалённой. Сейчас возвращает False, что заставляет
    cron повторить попытку. Достаточно для MVP — реальные NoSuchKey
    отработает следующий проход через head_object в delete_file.
    """
    return False
