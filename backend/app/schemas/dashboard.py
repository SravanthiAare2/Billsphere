"""
BillSphere Dashboard Schemas

Provides:
- Admin dashboard statistics
- Revenue metrics
- Subscription analytics
"""

from decimal import Decimal

from pydantic import BaseModel



# ==========================================================
# Dashboard Statistics
# ==========================================================

class DashboardStats(BaseModel):
    """
    Main dashboard overview.
    """

    total_customers: int

    total_plans: int

    active_subscriptions: int

    cancelled_subscriptions: int

    total_invoices: int

    total_payments: int



# ==========================================================
# Revenue Statistics
# ==========================================================

class RevenueStats(BaseModel):
    """
    Revenue analytics.
    """

    monthly_revenue: Decimal

    yearly_revenue: Decimal

    pending_amount: Decimal

    failed_payment_amount: Decimal



# ==========================================================
# Subscription Analytics
# ==========================================================

class SubscriptionStats(BaseModel):
    """
    Subscription metrics.
    """

    trial_count: int

    active_count: int

    past_due_count: int

    cancelled_count: int



# ==========================================================
# Complete Dashboard Response
# ==========================================================

class DashboardResponse(BaseModel):
    """
    Complete dashboard payload.
    """

    stats: DashboardStats

    revenue: RevenueStats

    subscriptions: SubscriptionStats