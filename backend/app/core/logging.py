"""
BillSphere Logging Configuration

Centralized production logging setup.

Features:
- Console logging
- Rotating file logging
- Structured formatting
- Environment-based log level
- Application logger access
"""

import sys
from pathlib import Path

from loguru import logger

from app.core.config import settings



__all__ = [
    "logger",
    "app_logger",
    "setup_logging"
]
# ==========================================================
# Logging Format
# ==========================================================

LOG_FORMAT = (
    "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
    "<level>{level: <8}</level> | "
    "<cyan>{name}</cyan>:"
    "<cyan>{function}</cyan>:"
    "<cyan>{line}</cyan> - "
    "<level>{message}</level>"
)


# ==========================================================
# Setup Logging
# ==========================================================

def setup_logging() -> None:
    """
    Configure Loguru logging.
    """

    logger.remove()

    # Console logging
    logger.add(
        sys.stdout,
        level=settings.LOG_LEVEL,
        format=LOG_FORMAT,
        colorize=True,
        backtrace=True,
        diagnose=settings.DEBUG,
    )

    # File logging

    log_file: Path = settings.get_log_path()

    logger.add(
        str(log_file),
        level=settings.LOG_LEVEL,
        format=LOG_FORMAT,
        rotation="10 MB",
        retention="30 days",
        compression="zip",
        enqueue=True,
        backtrace=True,
        diagnose=settings.DEBUG,
    )


# ==========================================================
# Application Logger
# ==========================================================

app_logger = logger


# ==========================================================
# Initialize Logging
# ==========================================================

setup_logging()