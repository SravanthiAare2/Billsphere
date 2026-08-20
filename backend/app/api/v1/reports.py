"""
BillSphere Reports API

Endpoints:

GET /reports/revenue
GET /reports/customers
GET /reports/subscriptions
GET /reports/tax-summary
"""

from fastapi import APIRouter, Depends

from sqlalchemy.orm import Session

from app.dependencies import (
    database_session,
    get_current_user_token,
)

from app.services.report_service import (
    generate_revenue_report,
    generate_customer_report,
    generate_subscription_report,
    generate_tax_summary_report,
)


# ==========================================================
# Router
# ==========================================================

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
)


# ==========================================================
# Revenue Report
# ==========================================================

@router.get(
    "/revenue",
)
def revenue_report(
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Generate revenue report.
    """

    return generate_revenue_report(
        db,
    )


# ==========================================================
# Customer Report
# ==========================================================

@router.get(
    "/customers",
)
def customer_report(
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Generate customer report.
    """

    return generate_customer_report(
        db,
    )


# ==========================================================
# Subscription Report
# ==========================================================

@router.get(
    "/subscriptions",
)
def subscription_report(
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Generate subscription report.
    """

    return generate_subscription_report(
        db,
    )


# ==========================================================
# Tax Summary Report
# ==========================================================

@router.get(
    "/tax-summary",
)
def tax_summary_report(
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Generate tax summary report (CGST/SGST/IGST totals).
    """

    return generate_tax_summary_report(
        db,
    )