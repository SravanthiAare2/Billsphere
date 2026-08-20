"""
BillSphere Application Configuration

Centralized configuration management using Pydantic Settings.
All environment variables are loaded from .env file.
"""

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# ==========================================================
# Base Directory
# ==========================================================

BASE_DIR = Path(__file__).resolve().parent.parent.parent


# ==========================================================
# Settings
# ==========================================================

class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """

    # --------------------------------------------------
    # Application
    # --------------------------------------------------

    APP_NAME: str = Field(
        default="BillSphere",
        description="Application name",
    )

    APP_VERSION: str = Field(
        default="1.0.0",
        description="Application version",
    )

    APP_DESCRIPTION: str = Field(
        default="SaaS Subscription & Billing Management Platform",
    )

    ENVIRONMENT: str = Field(
        default="development",
    )

    DEBUG: bool = Field(
        default=False,
    )

    HOST: str = Field(
        default="0.0.0.0",
    )

    PORT: int = Field(
        default=8000,
    )

    # --------------------------------------------------
    # API
    # --------------------------------------------------

    API_V1_PREFIX: str = Field(
        default="/api/v1",
    )

    # --------------------------------------------------
    # Database
    # --------------------------------------------------

    POSTGRES_USER: str = Field(
        default="postgres",
    )

    POSTGRES_PASSWORD: str = Field(
        default="postgres",
    )

    POSTGRES_DB: str = Field(
        default="billsphere",
    )

    POSTGRES_HOST: str = Field(
        default="localhost",
    )

    POSTGRES_PORT: int = Field(
        default=5432,
    )

    DATABASE_URL: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/billsphere",
    )

    # --------------------------------------------------
    # JWT Security
    # --------------------------------------------------

    SECRET_KEY: str = Field(
        default="CHANGE_THIS_SECRET_KEY",
    )

    ALGORITHM: str = Field(
        default="HS256",
    )

    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
    )

    PAYMENT_CONFIRMATION_EXPIRE_MINUTES: int = Field(
        default=30,
    )

    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
    )

    # --------------------------------------------------
    # Email
    # --------------------------------------------------

    MAIL_USERNAME: str | None = None

    MAIL_PASSWORD: str | None = None

    MAIL_FROM: str = Field(
        default="noreply@billsphere.com",
    )

    MAIL_FROM_NAME: str = Field(
        default="BillSphere",
    )

    MAIL_PORT: int = Field(
        default=587,
    )

    MAIL_SERVER: str = Field(
        default="smtp.gmail.com",
    )

    MAIL_STARTTLS: bool = Field(
        default=True,
    )

    MAIL_SSL_TLS: bool = Field(
        default=False,
    )

    FRONTEND_URL: str = Field(
        default="http://localhost:5173",
        description="Frontend URL used in email links",
    )
    # --------------------------------------------------
    # Uploads
    # --------------------------------------------------

    UPLOAD_DIR: str = Field(
        default="uploads",
    )

    MAX_UPLOAD_SIZE: int = Field(
        default=10485760,
    )

    # --------------------------------------------------
    # Invoice
    # --------------------------------------------------

    INVOICE_PREFIX: str = Field(
        default="INV",
    )

    CURRENCY: str = Field(
        default="USD",
    )

    TAX_PERCENTAGE: float = Field(
        default=18,
    )

    TAX_RATES_JSON: str = Field(
        default='{"IN": 18.0, "US": 0.0, "GB": 20.0, "AE": 5.0, "SG": 9.0}',
        description="JSON map of country code to default tax percentage.",
    )

    # --------------------------------------------------
    # Scheduler
    # --------------------------------------------------

    SCHEDULER_TIMEZONE: str = Field(
        default="UTC",
    )

    ENABLE_APSCHEDULER: bool = Field(
        default=False,
        description="Legacy in-process scheduler. Celery Beat is the primary scheduler.",
    )

    PAYMENT_RETRY_INTERVAL_HOURS: int = Field(
        default=24,
    )

    MOCK_PAYMENT_SUCCESS_RATE: float = Field(
        default=0.80,
        ge=0.0,
        le=1.0,
        description="Default success probability for the mock payment gateway.",
    )

    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL for scheduler and background tasks",
    )

    # --------------------------------------------------
    # Logging
    # --------------------------------------------------

    LOG_LEVEL: str = Field(
        default="INFO",
    )

    LOG_FILE: str = Field(
        default="logs/billsphere.log",
    )

    # --------------------------------------------------
    # CORS
    # --------------------------------------------------

    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:5173,http://localhost:3000",
    )

    # --------------------------------------------------
    # Company Information
    # --------------------------------------------------

    COMPANY_NAME: str = Field(
        default="BillSphere",
    )

    COMPANY_EMAIL: str = Field(
        default="support@billsphere.com",
    )

    COMPANY_PHONE: str = Field(
        default="+1-000-000-0000",
    )

    COMPANY_ADDRESS: str = Field(
        default="Your Company Address",
    )

    COMPANY_COUNTRY: str = Field(default="IN")
    COMPANY_STATE: str = Field(default="Telangana")

    COMPANY_WEBSITE: str = Field(
        default="https://billsphere.com",
    )

    # --------------------------------------------------
    # Pydantic Settings Configuration
    # --------------------------------------------------

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # --------------------------------------------------
    # Helper Methods
    # --------------------------------------------------

    def get_allowed_origins(self) -> List[str]:
        """
        Convert comma-separated origins into a list.
        """

        return [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]

    def get_upload_path(self) -> Path:
        """
        Returns absolute upload directory path.
        """

        path = BASE_DIR / self.UPLOAD_DIR

        path.mkdir(
            parents=True,
            exist_ok=True,
        )

        return path

    def get_log_path(self) -> Path:
        """
        Returns absolute log file path.
        """

        log_path = BASE_DIR / self.LOG_FILE

        log_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        return log_path


# ==========================================================
# Settings Instance
# ==========================================================

@lru_cache()
def get_settings() -> Settings:
    """
    Cached settings instance.

    Prevents loading environment variables repeatedly.
    """

    return Settings()


settings = get_settings()