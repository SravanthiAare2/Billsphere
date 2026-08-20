# app/api/v1/plans.py

"""
BillSphere Plans API

Endpoints:
- Create plan
- List plans
- Get plan details
- Update plan
- Delete plan
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies import database_session, get_current_user_token
from app.schemas.plan import (
    PlanCreate,
    PlanListResponse,
    PlanResponse,
    PlanUpdate,
)
from app.services.plan_service import (
    create_plan,
    delete_plan,
    get_plan_by_id,
    list_plans,
    update_plan,
)


router = APIRouter(
    prefix="/plans",
    tags=["Plans"],
)


@router.post(
    "",
    response_model=PlanResponse,
    status_code=status.HTTP_201_CREATED,
)
def create(
    plan_data: PlanCreate,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    """
    Create a new subscription plan.
    """

    created_by = int(current_user["sub"])

    return create_plan(
        db=db,
        plan_data=plan_data,
        created_by=created_by,
    )


@router.get(
    "",
    response_model=PlanListResponse,
)
def list_all(
    page: int = Query(
        default=1,
        ge=1,
        description="Page number.",
    ),
    page_size: int = Query(
        default=10,
        ge=1,
        le=100,
        description="Number of plans per page.",
    ),
    search: str | None = Query(
        default=None,
        description="Search by platform, plan name, or description.",
    ),
    platform: str | None = Query(
        default=None,
        min_length=1,
        max_length=100,
        description="Filter plans by exact platform.",
        examples=["Amazon"],
    ),
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    """
    List active plans with pagination and filters.
    """

    return list_plans(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        platform=platform,
    )


@router.get(
    "/{plan_id}",
    response_model=PlanResponse,
)
def get_plan(
    plan_id: int,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    """
    Get a plan by ID.
    """

    plan = get_plan_by_id(
        db=db,
        plan_id=plan_id,
    )

    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found.",
        )

    return plan


@router.put(
    "/{plan_id}",
    response_model=PlanResponse,
)
def update(
    plan_id: int,
    plan_data: PlanUpdate,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    """
    Update an existing subscription plan.
    """

    return update_plan(
        db=db,
        plan_id=plan_id,
        plan_data=plan_data,
    )


@router.delete(
    "/{plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete(
    plan_id: int,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    """
    Soft delete a subscription plan.
    """

    delete_plan(
        db=db,
        plan_id=plan_id,
    )

    return None