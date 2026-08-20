"""
BillSphere Plan Model

SQLAlchemy database model for subscription plans.

Each plan belongs to a specific platform and billing cycle.

Example:

Amazon
    ├── Basic
    │   ├── Monthly
    │   └── Yearly
    ├── Standard
    │   ├── Monthly
    │   └── Yearly
    └── Premium
        ├── Monthly
        └── Yearly

Netflix
    ├── Basic
    │   ├── Monthly
    │   └── Yearly
    ├── Standard
    │   ├── Monthly
    │   └── Yearly
    └── Premium
        ├── Monthly
        └── Yearly
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from app.core.database import Base


if TYPE_CHECKING:
    from app.models.subscription import Subscription


class Plan(Base):
    """
    Subscription plan database model.

    A platform can have multiple plans.

    The same plan name may exist once per billing cycle.

    Examples:

        Amazon + Basic + monthly  -> allowed
        Amazon + Basic + yearly   -> allowed

        Amazon + Standard + monthly -> allowed
        Amazon + Standard + yearly  -> allowed

        Amazon + Premium + monthly -> allowed
        Amazon + Premium + yearly  -> allowed

        Amazon + Basic + monthly -> duplicate, not allowed
    """

    __tablename__ = "plans"

    # ==========================================================
    # TABLE CONSTRAINTS
    # ==========================================================

    __table_args__ = (
        UniqueConstraint(
            "platform",
            "name",
            "billing_cycle",
            name="uq_plans_platform_name_billing_cycle",
        ),
    )

    # ==========================================================
    # PRIMARY KEY
    # ==========================================================

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ==========================================================
    # PLATFORM
    # ==========================================================

    platform: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    # ==========================================================
    # PLAN INFORMATION
    # ==========================================================

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # ==========================================================
    # PRICING
    # ==========================================================

    price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="INR",
        server_default="INR",
    )

    # ==========================================================
    # BILLING
    # ==========================================================

    billing_cycle: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="monthly",
        server_default="monthly",
        index=True,
    )

    trial_days: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    # ==========================================================
    # FEATURES
    # ==========================================================

    feature_entitlements: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        default=dict,
    )

    # ==========================================================
    # USAGE LIMITS
    # ==========================================================

    max_customers: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    max_invoices: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    # ==========================================================
    # STATUS
    # ==========================================================

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        index=True,
    )

    # ==========================================================
    # OWNERSHIP
    # ==========================================================

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # ==========================================================
    # TIMESTAMPS
    # ==========================================================

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ==========================================================
    # RELATIONSHIPS
    # ==========================================================

    created_by_user = relationship(
        "User",
        foreign_keys=[created_by],
    )

    subscriptions: Mapped[list["Subscription"]] = relationship(
        "Subscription",
        foreign_keys="Subscription.plan_id",
        back_populates="plan",
    )

    # ==========================================================
    # HELPER METHODS
    # ==========================================================

    def is_available(self) -> bool:
        """
        Return True when the plan is available
        for new subscriptions.
        """

        return self.is_active

    def activate(self) -> None:
        """Activate the plan."""

        self.is_active = True

    def deactivate(self) -> None:
        """
        Deactivate the plan.

        Existing subscriptions are not modified.
        The plan simply becomes unavailable for
        new subscriptions.
        """

        self.is_active = False

    # ==========================================================
    # REPRESENTATION
    # ==========================================================

    def __repr__(self) -> str:
        return (
            f"<Plan "
            f"id={self.id} "
            f"platform={self.platform} "
            f"name={self.name} "
            f"price={self.price} "
            f"currency={self.currency} "
            f"billing_cycle={self.billing_cycle} "
            f"is_active={self.is_active}>"
        )