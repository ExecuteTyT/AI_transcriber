from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "aivoice",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "reset-monthly-limits": {
            "task": "app.tasks.reset_limits.reset_monthly_limits",
            "schedule": crontab(day_of_month="1", hour="0", minute="0"),
        },
    },
)

celery_app.conf.include = [
    "app.tasks.transcribe",
    "app.tasks.reset_limits",
]
