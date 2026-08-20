"""
BillSphere Plan Service

Business logic for subscription plan management.
"""

from fastapi import HTTPException, status
from sqlalchemy import case, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.plan import Plan
from app.schemas.plan import PlanCreate, PlanUpdate


# ==========================================================
# PLAN DISPLAY ORDER
# ==========================================================

PLAN_ORDER = {
    "basic": 1,
    "standard": 2,
    "premium": 3,
}


# ==========================================================
# NORMALIZATION HELPERS
# ==========================================================

def _normalize_platform(value: str) -> str:
    """
    Normalize a platform name without changing its
    display casing.
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

    BillSphere uses:
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


def _normalize_billing_cycle(value: str) -> str:
    """
    Normalize billing cycle.

    Supported examples:

        monthly
        yearly
    """

    value = value.strip().lower()

    if not value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Billing cycle is required.",
        )

    return value


def _normalize_currency(value: str) -> str:
    """
    Normalize currency to uppercase.
    """

    value = value.strip()

    if not value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Currency is required.",
        )

    return value.upper()


# ==========================================================
# GET PLAN BY ID
# ==========================================================

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

    return db.execute(
        statement
    ).scalar_one_or_none()


# ==========================================================
# GET PLAN BY PLATFORM + NAME + BILLING CYCLE
# ==========================================================

def get_plan_by_name(
    db: Session,
    name: str,
    platform: str | None = None,
    billing_cycle: str | None = None,
) -> Plan | None:
    """
    Fetch a plan using:

        platform
        plan name
        billing cycle

    This matches the database uniqueness rule:

        platform + name + billing_cycle

    Examples:

        Amazon + Basic + monthly
        Amazon + Basic + yearly

    These are two different valid plans.
    """

    normalized_name = _normalize_plan_name(name)

    statement = select(Plan).where(
        func.lower(Plan.name)
        == normalized_name.lower(),
    )

    if platform:
        normalized_platform = _normalize_platform(
            platform,
        )

        statement = statement.where(
            func.lower(Plan.platform)
            == normalized_platform.lower(),
        )

    if billing_cycle:
        normalized_cycle = _normalize_billing_cycle(
            billing_cycle,
        )

        statement = statement.where(
            func.lower(Plan.billing_cycle)
            == normalized_cycle.lower(),
        )

    return db.execute(
        statement
    ).scalar_one_or_none()


# ==========================================================
# CREATE PLAN
# ==========================================================

def create_plan(
    db: Session,
    plan_data: PlanCreate,
    created_by: int,
) -> Plan:
    """
    Create a new subscription plan.

    Duplicate detection is based on:

        platform + name + billing_cycle
    """

    platform = _normalize_platform(
        plan_data.platform,
    )

    name = _normalize_plan_name(
        plan_data.name,
    )

    billing_cycle = _normalize_billing_cycle(
        plan_data.billing_cycle,
    )

    currency = _normalize_currency(
        plan_data.currency,
    )

    # ------------------------------------------------------
    # Check duplicate using the SAME combination as the DB
    # ------------------------------------------------------

    existing_plan = get_plan_by_name(
        db=db,
        name=name,
        platform=platform,
        billing_cycle=billing_cycle,
    )

    if existing_plan:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Plan '{name}' with billing cycle "
                f"'{billing_cycle}' already exists "
                f"for platform '{platform}'."
            ),
        )

    # ------------------------------------------------------
    # Create plan
    # ------------------------------------------------------

    plan = Plan(
        platform=platform,
        name=name,
        description=plan_data.description,
        price=plan_data.price,
        currency=currency,
        billing_cycle=billing_cycle,
        trial_days=plan_data.trial_days,
        feature_entitlements=plan_data.feature_entitlements,
        max_customers=plan_data.max_customers,
        max_invoices=plan_data.max_invoices,
        created_by=created_by,
        is_active=True,
    )

    db.add(plan)

    try:
        db.commit()
        db.refresh(plan)

    except IntegrityError:
        db.rollback()

        # --------------------------------------------------
        # Re-check the exact unique combination after a
        # database constraint conflict.
        # --------------------------------------------------

        duplicate = get_plan_by_name(
            db=db,
            name=name,
            platform=platform,
            billing_cycle=billing_cycle,
        )

        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Plan '{name}' with billing cycle "
                    f"'{billing_cycle}' already exists "
                    f"for platform '{platform}'."
                ),
            )

        raise

    except Exception:
        db.rollback()
        raise

    return plan


# ==========================================================
# LIST PLANS
# ==========================================================

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

    Search checks:

    - platform
    - plan name
    - description

    Plans are ordered:

        Platform alphabetically
        Basic
        Standard
        Premium
        Price
        ID
    """

    # ------------------------------------------------------
    # Validate pagination
    # ------------------------------------------------------

    if page < 1:
        page = 1

    if page_size < 1:
        page_size = 10

    # ------------------------------------------------------
    # Base conditions
    # ------------------------------------------------------

    conditions = [
        Plan.is_active.is_(True),
    ]

    # ------------------------------------------------------
    # Exact platform filter
    # ------------------------------------------------------

    if platform:
        platform_value = platform.strip()

        if platform_value:
            conditions.append(
                func.lower(Plan.platform)
                == platform_value.lower()
            )

    # ------------------------------------------------------
    # Search filter
    # ------------------------------------------------------

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

    # ------------------------------------------------------
    # Count
    # ------------------------------------------------------

    count_statement = select(
        func.count(Plan.id)
    ).where(
        *conditions,
    )

    total = db.execute(
        count_statement
    ).scalar_one()

    # ------------------------------------------------------
    # Pagination
    # ------------------------------------------------------

    offset = (page - 1) * page_size

    # ------------------------------------------------------
    # Tier ordering
    # ------------------------------------------------------

    plan_order = case(
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
    )

    # ------------------------------------------------------
    # Query
    # ------------------------------------------------------

    statement = (
        select(Plan)
        .where(*conditions)
        .order_by(
            func.lower(Plan.platform).asc(),
            plan_order.asc(),
            func.lower(Plan.billing_cycle).asc(),
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


# ==========================================================
# UPDATE PLAN
# ==========================================================

def update_plan(
    db: Session,
    plan_id: int,
    plan_data: PlanUpdate,
) -> Plan:
    """
    Update an existing subscription plan.

    Duplicate detection uses:

        platform + name + billing_cycle
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

    # ------------------------------------------------------
    # Normalize platform
    # ------------------------------------------------------

    if "platform" in update_data:
        if update_data["platform"] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Platform cannot be null.",
            )

        update_data["platform"] = _normalize_platform(
            update_data["platform"],
        )

    # ------------------------------------------------------
    # Normalize name
    # ------------------------------------------------------

    if "name" in update_data:
        if update_data["name"] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Plan name cannot be null.",
            )

        update_data["name"] = _normalize_plan_name(
            update_data["name"],
        )

    # ------------------------------------------------------
    # Normalize currency
    # ------------------------------------------------------

    if "currency" in update_data:
        if update_data["currency"] is not None:
            update_data["currency"] = _normalize_currency(
                update_data["currency"],
            )

    # ------------------------------------------------------
    # Normalize billing cycle
    # ------------------------------------------------------

    if "billing_cycle" in update_data:
        if update_data["billing_cycle"] is not None:
            update_data["billing_cycle"] = _normalize_billing_cycle(
                update_data["billing_cycle"],
            )

    # ------------------------------------------------------
    # Determine final unique values
    # ------------------------------------------------------

    final_platform = update_data.get(
        "platform",
        plan.platform,
    )

    final_name = update_data.get(
        "name",
        plan.name,
    )

    final_billing_cycle = update_data.get(
        "billing_cycle",
        plan.billing_cycle,
    )

    # ------------------------------------------------------
    # Check duplicate using:
    #
    # platform + name + billing_cycle
    # ------------------------------------------------------

    duplicate_plan = get_plan_by_name(
        db=db,
        name=final_name,
        platform=final_platform,
        billing_cycle=final_billing_cycle,
    )

    if (
        duplicate_plan is not None
        and duplicate_plan.id != plan.id
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Plan '{final_name}' with billing cycle "
                f"'{final_billing_cycle}' already exists "
                f"for platform '{final_platform}'."
            ),
        )

    # ------------------------------------------------------
    # Apply updates
    # ------------------------------------------------------

    for key, value in update_data.items():
        setattr(
            plan,
            key,
            value,
        )

    # ------------------------------------------------------
    # Commit
    # ------------------------------------------------------

    try:
        db.commit()
        db.refresh(plan)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Another plan already exists with the same "
                "platform, name, and billing cycle."
            ),
        )

    except Exception:
        db.rollback()
        raise

    return plan


# ==========================================================
# DELETE PLAN
# ==========================================================

def delete_plan(
    db: Session,
    plan_id: int,
) -> None:
    """
    Soft delete a plan.

    Existing subscriptions are not modified.
    The plan simply becomes unavailable for
    new subscriptions.
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

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise