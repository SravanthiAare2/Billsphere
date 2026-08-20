"""
BillSphere Dashboard API

Endpoints:
- Dashboard statistics
"""

from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
)

from sqlalchemy.orm import Session

from app.dependencies import (
    database_session,
    get_current_user_token,
)

from app.schemas.dashboard import (
    DashboardResponse,
    CustomerSummary,
    InvoiceSummary,
    RevenueSummary,
    SubscriptionSummary,
)

from app.services.analytics_service import (
    get_customer_analytics,
    get_invoice_analytics,
    get_revenue_analytics,
    get_subscription_analytics,
)



# ==========================================================
# Router
# ==========================================================

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)



# ==========================================================
# Dashboard Overview
# ==========================================================

@router.get(
    "",
    response_model=DashboardResponse,
)
def dashboard(
    db: Session = Depends(
        database_session
    ),

    current_user: dict = Depends(
        get_current_user_token
    ),
):
    """
    Get complete dashboard analytics.
    """

    created_by = int(
        current_user["sub"]
    )



    revenue_data = get_revenue_analytics(
        db,
        created_by,
    )


    subscription_data = get_subscription_analytics(
        db,
        created_by,
    )


    customer_data = get_customer_analytics(
        db,
        created_by,
    )


    invoice_data = get_invoice_analytics(
        db,
        created_by,
    )



    return DashboardResponse(

        revenue=RevenueSummary(
            **revenue_data,
            yearly_revenue=0,
        ),


        subscriptions=SubscriptionSummary(
            **subscription_data,
        ),


        customers=CustomerSummary(
            **customer_data,
        ),


        invoices=InvoiceSummary(
            **invoice_data,
        ),


        generated_at=datetime.now(
            timezone.utc
        ),

    )