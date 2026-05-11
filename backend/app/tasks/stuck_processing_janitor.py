"""Stuck-in-processing janitor: помечает зависшие транскрипции failed.

Если celery-worker крашится во время обработки (OOM, SIGKILL, sigterm-without-
cleanup), запись остаётся в status='processing' навсегда — пользователь
видит вечный спиннер. Janitor каждые 5 минут сканирует и переводит такие
записи в failed.
"""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, update
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.transcription import Transcription
from app.services.audit_log import audit
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# Сколько минут даём воркеру на обработку до пометки failed.
# 30 мин покрывает даже самые длинные файлы (Voxtral на 2-часовой записи
# отрабатывает за 5-10 мин). Если когда-то будут реально длинные файлы —
# поднимаем порог, не пытаемся угадать прецизионно.
STUCK_PROCESSING_TIMEOUT_MIN = 30

sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
sync_engine = create_engine(sync_url)
SyncSession = sessionmaker(sync_engine)


@celery_app.task(name="app.tasks.stuck_processing_janitor.cleanup_stuck")
def cleanup_stuck():
    """Помечает Transcription failed если processing_started_at < now - 30 мин."""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=STUCK_PROCESSING_TIMEOUT_MIN)

    with SyncSession() as db:
        result = db.execute(
            update(Transcription)
            .where(
                Transcription.status == "processing",
                Transcription.processing_started_at.is_not(None),
                Transcription.processing_started_at < cutoff,
            )
            .values(
                status="failed",
                error_message=(
                    "Обработка прервана: воркер не ответил вовремя. "
                    "Попробуйте загрузить файл заново."
                ),
            )
            .returning(Transcription.id, Transcription.user_id)
        )
        rows = result.fetchall()
        db.commit()

    for transcription_id, user_id in rows:
        audit(
            "transcription_marked_failed_stuck",
            transcription_id=str(transcription_id),
            user_id=str(user_id),
            timeout_min=STUCK_PROCESSING_TIMEOUT_MIN,
        )

    if rows:
        logger.warning(
            "stuck-janitor: помечено %d транскрипций failed (timeout %d мин)",
            len(rows), STUCK_PROCESSING_TIMEOUT_MIN,
        )
    return {"marked_failed": len(rows)}
