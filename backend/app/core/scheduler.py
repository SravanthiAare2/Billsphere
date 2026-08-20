"""
BillSphere Scheduler Configuration

APScheduler integration.

Handles:

- Background task execution
- Invoice reminders
- Payment retries
- Subscription expiry checks
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import settings
from app.core.logging import app_logger


# ==========================================================
# Scheduler Instance
# ==========================================================

scheduler = BackgroundScheduler(
    timezone="UTC"
)


# ==========================================================
# Job Registration
# ==========================================================

def start_scheduler() -> None:
    """
    Start background scheduler.
    """

    if not settings.ENABLE_APSCHEDULER:
        app_logger.info("APScheduler disabled; Celery Beat is the primary billing scheduler.")
        return

    if scheduler.running:
        return

    from app.services.scheduler_service import run_billing_jobs

    scheduler.add_job(
        func=run_billing_jobs,
        trigger=IntervalTrigger(
            hours=1
        ),
        id="billing_jobs",
        replace_existing=True,
        max_instances=1,
    )

    scheduler.start()

    app_logger.info(
        "BillSphere scheduler started"
    )


# ==========================================================
# Shutdown Scheduler
# ==========================================================

def stop_scheduler() -> None:
    """
    Stop background scheduler.
    """

    if scheduler.running:
        scheduler.shutdown()

        app_logger.info(
            "BillSphere scheduler stopped"
        )