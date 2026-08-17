
"""
BillSphere Alembic Environment Configuration

Handles:

- SQLAlchemy metadata loading
- Database connection
- PostgreSQL migration execution
- Offline and online migrations
- Automatic model discovery

Important:
The database URL is taken directly from application settings
and is NOT injected through ConfigParser. This avoids problems
with URL-encoded passwords containing characters such as `%40`.
"""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config
from sqlalchemy import pool

from app.core.config import settings
from app.core.database import Base


# ==========================================================
# Import All Models
# ==========================================================
#
# These imports are intentionally explicit.
# Alembic needs the model classes imported before reading
# Base.metadata so that all tables are registered.
#

from app.models.user import User
from app.models.customer import Customer
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.invoice import Invoice
from app.models.invoice_line_item import InvoiceLineItem
from app.models.payment import Payment
from app.models.payment_retry import PaymentRetry
from app.models.notification import Notification
from app.models.audit_log import AuditLog

# Phase 1 / lifecycle models
from app.models.subscription_history import SubscriptionHistory

from app.models.billing_cycle import BillingCycle
from app.models.usage_record import UsageRecord

# Phase 2 / billing cycle model



# ==========================================================
# Alembic Config
# ==========================================================

config = context.config


# ==========================================================
# Logging Configuration
# ==========================================================

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# ==========================================================
# SQLAlchemy Metadata
# ==========================================================

target_metadata = Base.metadata


# ==========================================================
# Database URL
# ==========================================================
#
# IMPORTANT:
#
# Do NOT use:
#
#     config.set_main_option(
#         "sqlalchemy.url",
#         settings.DATABASE_URL,
#     )
#
# ConfigParser treats `%` as interpolation syntax.
#
# Example:
#
#     %40
#
# in an encoded PostgreSQL password can therefore produce:
#
#     ValueError: invalid interpolation syntax
#
# Instead, the URL is supplied directly to SQLAlchemy in
# run_migrations_online().
#
# ==========================================================


# ==========================================================
# Offline Migration
# ==========================================================

def run_migrations_offline() -> None:
    """
    Run migrations in offline mode.

    Offline mode generates SQL without establishing a
    live database connection.
    """

    url = settings.DATABASE_URL

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named",
        },
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ==========================================================
# Online Migration
# ==========================================================

def run_migrations_online() -> None:
    """
    Run migrations against the live PostgreSQL database.

    The database URL is passed directly to SQLAlchemy so
    ConfigParser interpolation cannot modify or reject
    encoded characters such as `%40`.
    """

    connectable = engine_from_config(
        {
            "sqlalchemy.url": settings.DATABASE_URL,
        },
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


# ==========================================================
# Migration Entry Point
# ==========================================================

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
