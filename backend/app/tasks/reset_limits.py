import logging

from sqlalchemy import create_engine, update
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.user import User
from app.services.plans import get_plan
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
sync_engine = create_engine(sync_url)
SyncSession = sessionmaker(sync_engine)


@celery_app.task
def reset_monthly_limits():
    """Сброс minutes_used для всех пользователей 1-го числа каждого месяца."""
    with SyncSession() as db:
        result = db.execute(
            update(User).values(minutes_used=0)
        )
        db.commit()
        logger.info("Monthly limits reset for %d users", result.rowcount)
        return result.rowcount
