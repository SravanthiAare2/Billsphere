# app/services/plan_service.py

"""
BillSphere Plan Service

Business logic for subscription plan management.
"""

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.plan import Plan
from app.schemas.plan import PlanCreate, PlanUpdate


PLAN_ORDER = {
    "basic": 1,
    "standard": 2,
    "premium": 3,
}


def _normalize_platform(value: str) -> str:
    """
    Normalize a platform name without changing its display casing.
    """

    value = value.strip()

    if not value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Platform is required.",
        )

    return value


def _normalize_plan_name(value: str) -> str:
    """
    Normalize supported plan names.

    BillSphere uses exactly:
        Basic
        Standard
        Premium
    """

    value = value.strip()

    if not value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan name is required.",
        )

    normalized = value.lower()

    canonical_names = {
        "basic": "Basic",
        "standard": "Standard",
        "premium": "Premium",
    }

    if normalized in canonical_names:
        return canonical_names[normalized]

    return value


def get_plan_by_id(
    db: Session,
    plan_id: int,
) -> Plan | None:
    """
    Fetch a plan by primary key.
    """

    statement = select(Plan).where(
        Plan.id == plan_id,
    )

    return db.execute(statement).scalar_one_or_none()


def get_plan_by_name(
    db: Session,
    name: str,
    platform: str | None = None,
) -> Plan | None:
    """
    Fetch a plan using platform + plan name.
    """

    normalized_name = name.strip()
    statement = select(Plan).where(
        func.lower(Plan.name) == normalized_name.lower(),
    )

    if platform:
        normalized_platform = platform.strip()

        statement = statement.where(
            func.lower(Plan.platform)
            == normalized_platform.lower(),
        )

    return db.execute(statement).scalar_one_or_none()


def create_plan(
    db: Session,
    plan_data: PlanCreate,
    created_by: int,
) -> Plan:
    """
    Create a new subscription plan.
    """

    platform = _normalize_platform(
        plan_data.platform,
    )

    name = _normalize_plan_name(
        plan_data.name,
    )

    existing_plan = get_plan_by_name(
        db=db,
        name=name,
        platform=platform,
    )

    if existing_plan:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Plan '{name}' already exists "
                f"for platform '{platform}'."
            ),
        )

    plan = Plan(
        platform=platform,
        name=name,
        description=plan_data.description,
        price=plan_data.price,
        currency=plan_data.currency.strip().upper(),
        billing_cycle=plan_data.billing_cycle.strip().lower(),
        trial_days=plan_data.trial_days,
        feature_entitlements=(
            plan_data.feature_entitlements
        ),
        max_customers=plan_data.max_customers,
        max_invoices=plan_data.max_invoices,
        created_by=created_by,
        is_active=True,
    )

    db.add(plan)

    try:
        db.commit()
        db.refresh(plan)
    except Exception:
        db.rollback()

        duplicate = get_plan_by_name(
            db=db,
            name=name,
            platform=platform,
        )

        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Plan '{name}' already exists "
                    f"for platform '{platform}'."
                ),
            )

        raise

    return plan


def list_plans(
    db: Session,
    page: int = 1,
    page_size: int = 10,
    search: str | None = None,
    platform: str | None = None,
):
    """
    Return active plans with pagination.

    Supported filters:
    - platform
    - search

    Plans are ordered:
    Basic
    Standard
    Premium
    """

    conditions = [
        Plan.is_active.is_(True),
    ]

    if platform:
        platform_value = platform.strip()

        if platform_value:
            conditions.append(
                func.lower(Plan.platform)
                == platform_value.lower()
            )

    if search:
        search_value = search.strip()

        if search_value:
            pattern = f"%{search_value}%"

            conditions.append(
                or_(
                    Plan.platform.ilike(pattern),
                    Plan.name.ilike(pattern),
                    Plan.description.ilike(pattern),
                )
            )

    count_statement = select(
        func.count(Plan.id)
    ).where(*conditions)

    total = db.execute(
        count_statement
    ).scalar_one()

    offset = (page - 1) * page_size

    statement = (
        select(Plan)
        .where(*conditions)
        .order_by(
            func.lower(Plan.platform).asc(),
            func.case(
                (
                    func.lower(Plan.name) == "basic",
                    PLAN_ORDER["basic"],
                ),
                (
                    func.lower(Plan.name) == "standard",
                    PLAN_ORDER["standard"],
                ),
                (
                    func.lower(Plan.name) == "premium",
                    PLAN_ORDER["premium"],
                ),
                else_=99,
            ).asc(),
            Plan.price.asc(),
            Plan.id.asc(),
        )
        .offset(offset)
        .limit(page_size)
    )

    plans = db.execute(
        statement
    ).scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "plans": plans,
    }


def update_plan(
    db: Session,
    plan_id: int,
    plan_data: PlanUpdate,
) -> Plan:
    """
    Update an existing subscription plan.
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

    update_data = plan_data.model_dump(
        exclude_unset=True,
    )

    if "platform" in update_data:
        if update_data["platform"] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Platform cannot be null.",
            )

        update_data["platform"] = _normalize_platform(
            update_data["platform"],
        )

    if "name" in update_data:
        if update_data["name"] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Plan name cannot be null.",
            )

        update_data["name"] = _normalize_plan_name(
            update_data["name"],
        )

    if "currency" in update_data:
        if update_data["currency"] is not None:
            currency = update_data["currency"].strip()

            if not currency:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Currency cannot be empty.",
                )

            update_data["currency"] = currency.upper()

    if "billing_cycle" in update_data:
        if update_data["billing_cycle"] is not None:
            billing_cycle = (
                update_data["billing_cycle"]
                .strip()
                .lower()
            )

            if not billing_cycle:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Billing cycle cannot be empty.",
                )

            update_data["billing_cycle"] = billing_cycle

    final_platform = update_data.get(
        "platform",
        plan.platform,
    )

    final_name = update_data.get(
        "name",
        plan.name,
    )

    duplicate_plan = get_plan_by_name(
        db=db,
        name=final_name,
        platform=final_platform,
    )

    if (
        duplicate_plan is not None
        and duplicate_plan.id != plan.id
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Plan '{final_name}' already exists "
                f"for platform '{final_platform}'."
            ),
        )

    for key, value in update_data.items():
        setattr(
            plan,
            key,
            value,
        )

    try:
        db.commit()
        db.refresh(plan)
    except Exception:
        db.rollback()
        raise

    return plan


def delete_plan(
    db: Session,
    plan_id: int,
) -> None:
    """
    Soft delete a plan.
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

    plan.is_active = False

    db.commit()