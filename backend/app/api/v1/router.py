"""
BillSphere API v1 Router

Central router for all version 1 API endpoints.
"""

from fastapi import APIRouter

from app.api.v1 import (
    analytics,
    audit_logs,
    auth,
    billing_cycles,
    customers,
    invoices,
    notifications,
    payments,
    payment_retries,
    plans,
    reports,
    subscriptions,
    usage,
    users,
    webhooks,
)

# ==========================================================
# API v1 Router
# ==========================================================

api_router = APIRouter()

# ==========================================================
# Authentication
# ==========================================================

api_router.include_router(
    auth.router,
    tags=["Authentication"],
)

api_router.include_router(
    billing_cycles.router,
    tags=["Billing Cycles"],
)

# ==========================================================
# Customers
# ==========================================================

api_router.include_router(
    customers.router,
    tags=["Customers"],
)

# ==========================================================
# Plans
# ==========================================================

api_router.include_router(
    plans.router,
    tags=["Plans"],
)

# ==========================================================
# Subscriptions
# ==========================================================

api_router.include_router(
    subscriptions.router,
    tags=["Subscriptions"],
)

# ==========================================================
# Invoices
# ==========================================================

api_router.include_router(
    invoices.router,
    tags=["Invoices"],
)

# ==========================================================
# Payments
# ==========================================================

api_router.include_router(
    payments.router,
    tags=["Payments"],
)

api_router.include_router(
    payment_retries.router,
    tags=["Payment Retries"],
)

# ==========================================================
# Webhooks
# ==========================================================

api_router.include_router(
    webhooks.router,
    tags=["Webhooks"],
)

# ==========================================================
# Usage
# ==========================================================

api_router.include_router(
    usage.router,
    tags=["Usage"],
)

# ==========================================================
# Audit Logs
# ==========================================================

api_router.include_router(
    audit_logs.router,
    tags=["Audit Logs"],
)

# ==========================================================
# Analytics
# ==========================================================

api_router.include_router(
    analytics.router,
    tags=["Analytics"],
)

# ==========================================================
# Reports
# ==========================================================

api_router.include_router(
    reports.router,
    tags=["Reports"],
)

# ==========================================================
# Notifications
# ==========================================================

api_router.include_router(
    notifications.router,
    tags=["Notifications"],
)

#  ==========================================================
# Users
# ==========================================================

api_router.include_router(
    users.router,
    tags=["Users"],
)