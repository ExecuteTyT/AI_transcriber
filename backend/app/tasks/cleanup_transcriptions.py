"""Celery-beat task: удаляет транскрипции с истёкшим expires_at.

Расписание — в app.tasks.celery_app.beat_schedule (по умолчанию ежедневно в 03:00 UTC).
"""
import logging
from datetime import datetime, timezone

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.transcription import Transcription
from app.services.storage import s3_service
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
sync_engine = create_engine(sync_url)
SyncSession = sessionmaker(sync_engine)


@celery_app.task(name="app.tasks.cleanup_transcriptions.cleanup_expired")
def cleanup_expired():
    """Удаляет все Transcription с expires_at < now() и их файлы из S3.

    Возвращает количество удалённых записей. Если S3-удаление падает —
    продолжаем, запись в БД всё равно сносим (файлы без записи не критичны,
    бизнес-задача cleanup — освободить базу и соблюсти retention policy).
    """
    now = datetime.now(timezone.utc)
    deleted = 0
    s3_errors = 0

    with SyncSession() as db:
        result = db.execute(
            select(Transcription).where(
                Transcription.expires_at.is_not(None),
                Transcription.expires_at < now,
            )
        )
        rows = result.scalars().all()

        for trans in rows:
            # Удаление файла из S3 / локального хранилища.
            if s3_service is not None and trans.file_key:
                try:
                    s3_service.delete_file(trans.file_key)
                except Exception as exc:
                    s3_errors += 1
                    logger.warning(
                        "cleanup: не удалось удалить S3 file_key=%s: %s",
                        trans.file_key, exc,
                    )

            # ON DELETE CASCADE удалит связанные embeddings, ai_analyses, chat_messages.
            db.delete(trans)
            deleted += 1

        db.commit()

    logger.info(
        "cleanup_expired: удалено %d транскрипций (S3-ошибок: %d)",
        deleted, s3_errors,
    )
    return {"deleted": deleted, "s3_errors": s3_errors}
