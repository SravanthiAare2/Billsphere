"""
BillSphere Scheduler Service

Contains the business-level scheduled billing job.

APScheduler is managed by app.core.scheduler.
This service only triggers Celery background tasks.
"""

from app.core.logging import app_logger
from app.workers.tasks import (
    process_subscription_renewals,
    process_payment_retries,
)


# ==========================================================
# Run Billing Jobs
# ==========================================================

def run_billing_jobs() -> None:
    """
    Queue all scheduled billing jobs through Celery.

    APScheduler calls this function every hour.
    Celery workers execute the actual tasks.
    """

    try:
        app_logger.info(
            "Starting scheduled BillSphere billing jobs..."
        )

        # --------------------------------------------------
        # Subscription Renewal
        # --------------------------------------------------

        process_subscription_renewals.delay()

        app_logger.info(
            "Subscription renewal job queued successfully."
        )

        # --------------------------------------------------
        # Payment Retry
        # --------------------------------------------------

        process_payment_retries.delay()

        app_logger.info(
            "Payment retry job queued successfully."
        )

        app_logger.info(
            "All scheduled billing jobs queued successfully."
        )

    except Exception as exc:
        app_logger.error(
            f"Scheduled billing jobs failed: {exc}"
        )