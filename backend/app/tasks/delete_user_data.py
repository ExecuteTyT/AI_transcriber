"""Celery task: полное удаление данных пользователя (152-ФЗ право на забвение).

Запускается из DELETE /api/users/me. Делает:
1. Собирает все file_key пользователя из transcriptions, удаляет из S3.
2. Удаляет user-запись — каскадные FK снесут transcriptions, embeddings,
   ai_analyses, chat_messages, subscriptions, user_consents.

Журнал учёта: пишем сводку в logger.info с user_id и количествами —
для акта уничтожения.
"""
import hashlib
import logging
import uuid

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.transcription import Transcription
from app.models.user import User
from app.services.audit_log import audit
from app.services.storage import s3_service
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
sync_engine = create_engine(sync_url)
SyncSession = sessionmaker(sync_engine)


@celery_app.task(name="app.tasks.delete_user_data.delete_user_data")
def delete_user_data(user_id: str):
    """Полное удаление всех данных пользователя.

    Аккаунт уже анонимизирован через эндпоинт (email → placeholder), но физически
    запись остаётся до этой таски. Здесь сносим S3-файлы и саму user-запись.
    """
    user_uuid = uuid.UUID(user_id)
    s3_deleted = 0
    s3_errors = 0

    with SyncSession() as db:
        # 1) Собираем все file_key.
        result = db.execute(
            select(Transcription).where(
                Transcription.user_id == user_uuid,
                Transcription.file_key.is_not(None),
                Transcription.file_key != "",
            )
        )
        transcriptions = result.scalars().all()

        for trans in transcriptions:
            if s3_service is None or not trans.file_key:
                continue
            try:
                s3_service.delete_file(trans.file_key)
                s3_deleted += 1
            except Exception as exc:
                s3_errors += 1
                logger.warning(
                    "delete_user_data: S3 delete failed for %s: %s",
                    trans.file_key, exc,
                )

        # 2) Удаляем user — CASCADE снесёт transcriptions, embeddings,
        # ai_analyses, chat_messages, subscriptions, user_consents.
        result = db.execute(select(User).where(User.id == user_uuid))
        user = result.scalar_one_or_none()
        if user is None:
            logger.warning("delete_user_data: user %s already gone", user_id)
            return {"s3_deleted": s3_deleted, "s3_errors": s3_errors}

        # Хеш email для журнала учёта (не сам email — он уже placeholder).
        email_hash = hashlib.sha256(user.email.encode()).hexdigest()
        db.delete(user)
        db.commit()

    audit(
        "user_data_purged",
        user_id=user_id,
        email_hash=email_hash,
        s3_files_deleted=s3_deleted,
        s3_errors=s3_errors,
        transcriptions_count=len(transcriptions),
    )
    return {"s3_deleted": s3_deleted, "s3_errors": s3_errors}
