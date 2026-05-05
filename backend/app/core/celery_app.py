from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "ai_resume_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.services.tasks",
        "app.services.worker_maintenance",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
)

# ── Celery Beat Schedule ──────────────────────────────────────────────────────
celery_app.conf.beat_schedule = {
    "daily-cleanup-at-midnight": {
        "task": "daily_maintenance",
        "schedule": crontab(hour=0, minute=0),  # Daily at midnight
    },
}
