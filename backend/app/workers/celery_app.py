
"""
BillSphere Celery Configuration

Handles:
- Background workers
- Scheduled billing jobs
- Email jobs
- Payment retry jobs
"""

from celery import Celery
from datetime import timedelta

from app.core.config import settings


# ==========================================================
# Celery Application
# ==========================================================

celery_app = Celery(
    "billsphere",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.tasks",
    ],
)


# ==========================================================
# Celery Configuration
# ==========================================================

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    timezone="UTC",
    enable_utc=True,

    # Prevent tasks from being prefetched unnecessarily.
    worker_prefetch_multiplier=1,

    # Acknowledge tasks after successful execution.
    task_acks_late=True,

    # Do not lose tasks if the worker crashes.
    task_reject_on_worker_lost=True,

    # Celery Beat drives the billing automation. The tasks themselves
    # select only subscriptions/payments that are actually due.
    beat_schedule={
        "subscription-renewals-every-15-minutes": {
            "task": "process_subscription_renewals",
            "schedule": timedelta(minutes=15),
        },
        "payment-retries-every-hour": {
            "task": "process_payment_retries",
            "schedule": timedelta(hours=1),
        },
    },
)


# ==========================================================
# Explicit Task Discovery
# ==========================================================

celery_app.autodiscover_tasks(
    packages=["app.workers"],
)


# ==========================================================
# Debug Helper
# ==========================================================

if __name__ == "__main__":
    celery_app.start()
