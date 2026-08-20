"""
BillSphere Subscription Model

Database model for customer subscriptions.

Handles:

- Customer and plan relationships
- Subscription dates
- Subscription status
- Billing cycle
- Pause / Resume metadata
- Billing period metadata
- Cancellation metadata
- Lifecycle metadata
- Billing cycle history
- Usage records
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


if TYPE_CHECKING:
    from app.models.billing_cycle import BillingCycle
    from app.models.customer import Customer
    from app.models.plan import Plan
    from app.models.usage_record import UsageRecord


# ==========================================================
# Subscription Status Constants
# ==========================================================

SUBSCRIPTION_TRIAL = "trial"
SUBSCRIPTION_ACTIVE = "active"
SUBSCRIPTION_PAUSED = "paused"
SUBSCRIPTION_PAST_DUE = "past_due"
SUBSCRIPTION_CANCELLED = "cancelled"


class Subscription(Base):
    """
    Subscription database model.

    Stores the current lifecycle state of a customer's
    subscription and its current billing period.
    """

    __tablename__ = "subscriptions"

    # ==========================================================
    # Primary Key
    # ==========================================================

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ==========================================================
    # Customer
    # ==========================================================

    customer_id: Mapped[int] = mapped_column(
        ForeignKey(
            "customers.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    customer: Mapped["Customer"] = relationship(
        "Customer",
        foreign_keys=[customer_id],
    )

    # ==========================================================
    # Plan
    # ==========================================================

    plan_id: Mapped[int] = mapped_column(
        ForeignKey(
            "plans.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    plan: Mapped["Plan"] = relationship(
        "Plan",
        foreign_keys=[plan_id],
    )

    # ==========================================================
    # Billing Cycles
    # ==========================================================

    billing_cycles: Mapped[list["BillingCycle"]] = relationship(
        "BillingCycle",
        back_populates="subscription",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="BillingCycle.cycle_start",
        lazy="selectin",
    )

    # ==========================================================
    # Usage Records
    # ==========================================================

    usage_records: Mapped[list["UsageRecord"]] = relationship(
        "UsageRecord",
        back_populates="subscription",
        foreign_keys="UsageRecord.subscription_id",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="UsageRecord.recorded_at",
        lazy="selectin",
    )

    # ==========================================================
    # Subscription Dates
    # ==========================================================

    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    end_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ==========================================================
    # Status
    # ==========================================================

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default=SUBSCRIPTION_TRIAL,
        server_default=SUBSCRIPTION_TRIAL,
        index=True,
    )

    # ==========================================================
    # Billing Cycle
    # ==========================================================

    billing_cycle: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="monthly",
        server_default="monthly",
        index=True,
    )

    # ==========================================================
    # Pause / Resume
    # ==========================================================

    paused_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    resumed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ==========================================================
    # Current Billing Period
    # ==========================================================

    current_period_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    current_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    next_billing_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    # ==========================================================
    # Cancellation
    # ==========================================================

    cancel_at_period_end: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        index=True,
    )

    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # ==========================================================
    # Lifecycle Metadata
    # ==========================================================

    lifecycle_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # ==========================================================
    # Status Helpers
    # ==========================================================

    def is_trial(self) -> bool:
        return self.status == SUBSCRIPTION_TRIAL

    def is_active(self) -> bool:
        return self.status == SUBSCRIPTION_ACTIVE

    def is_paused(self) -> bool:
        return self.status == SUBSCRIPTION_PAUSED

    def is_past_due(self) -> bool:
        return self.status == SUBSCRIPTION_PAST_DUE

    def is_cancelled(self) -> bool:
        return self.status == SUBSCRIPTION_CANCELLED

    # ==========================================================
    # Lifecycle Helpers
    # ==========================================================

    def mark_paused(self) -> None:
        now = datetime.now(timezone.utc)

        self.status = SUBSCRIPTION_PAUSED
        self.paused_at = now

    def mark_resumed(self) -> None:
        now = datetime.now(timezone.utc)

        self.status = SUBSCRIPTION_ACTIVE
        self.resumed_at = now

    def mark_past_due(self) -> None:
        self.status = SUBSCRIPTION_PAST_DUE

    def mark_cancelled(self) -> None:
        now = datetime.now(timezone.utc)

        self.status = SUBSCRIPTION_CANCELLED
        self.cancelled_at = now
        self.cancel_at_period_end = False

    def cancel_at_end_of_period(self) -> None:
        self.cancel_at_period_end = True

    # ==========================================================
    # Billing Period Helpers
    # ==========================================================

    def has_active_billing_period(self) -> bool:
        return (
            self.current_period_start is not None
            and self.current_period_end is not None
        )

    def is_billing_period_expired(
        self,
        now: datetime | None = None,
    ) -> bool:
        if self.current_period_end is None:
            return False

        current_time = now or datetime.now(timezone.utc)

        if current_time.tzinfo is None:
            current_time = current_time.replace(
                tzinfo=timezone.utc
            )
        else:
            current_time = current_time.astimezone(
                timezone.utc
            )

        period_end = self.current_period_end

        if period_end.tzinfo is None:
            period_end = period_end.replace(
                tzinfo=timezone.utc
            )
        else:
            period_end = period_end.astimezone(
                timezone.utc
            )

        return period_end <= current_time

    # ==========================================================
    # Cancellation Helpers
    # ==========================================================

    def is_cancellation_scheduled(self) -> bool:
        return (
            self.cancel_at_period_end
            and not self.is_cancelled()
        )

    # ==========================================================
    # Lifecycle Metadata
    # ==========================================================

    def set_lifecycle_metadata(
        self,
        key: str,
        value: Any,
    ) -> None:
        metadata = dict(
            self.lifecycle_metadata or {}
        )

        metadata[key] = value

        self.lifecycle_metadata = metadata

    def get_lifecycle_metadata(
        self,
        key: str,
        default: Any = None,
    ) -> Any:
        if not self.lifecycle_metadata:
            return default

        return self.lifecycle_metadata.get(
            key,
            default,
        )

    # ==========================================================
    # Representation
    # ==========================================================

    def __repr__(self) -> str:
        return (
            f"<Subscription "
            f"id={self.id} "
            f"customer_id={self.customer_id} "
            f"plan_id={self.plan_id} "
            f"status={self.status} "
            f"billing_cycle={self.billing_cycle}>"
        )