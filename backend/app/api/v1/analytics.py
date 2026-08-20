"""
BillSphere Analytics API

Endpoints:

GET /analytics/dashboard
"""


from fastapi import (
    APIRouter,
    Depends,
)

from sqlalchemy.orm import Session


from app.dependencies import (
    database_session,
    get_current_user_token,
)


from app.services.analytics_service import (
    get_dashboard_analytics,
)



router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)



# ==========================================================
# Dashboard Analytics
# ==========================================================

@router.get(
    "/dashboard",
)
def dashboard(
    db: Session = Depends(
        database_session
    ),

    current_user: dict = Depends(
        get_current_user_token
    ),
):

    return get_dashboard_analytics(
        db
    )