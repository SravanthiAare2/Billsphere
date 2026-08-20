"""
BillSphere Customer API

Endpoints:
- Create customer
- List customers
- Get customer
- Update customer
- Delete customer
"""

from fastapi import (
    APIRouter,
    Depends,
    Query,
    status,
)

from sqlalchemy.orm import Session

from app.dependencies import (
    database_session,
    get_current_user_token,
)

from app.schemas.customer import (
    CustomerCreate,
    CustomerListResponse,
    CustomerResponse,
    CustomerUpdate,
)

from app.services.customer_service import (
    create_customer,
    delete_customer,
    get_customer_by_id,
    list_customers,
    update_customer,
)


# ==========================================================
# Router
# ==========================================================

router = APIRouter(
    prefix="/customers",
    tags=["Customers"],
)


# ==========================================================
# Create Customer
# ==========================================================

@router.post(
    "",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create(
    customer_data: CustomerCreate,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    """
    Create new customer.
    """

    owner_id = int(
        current_user["sub"]
    )

    return create_customer(
        db,
        customer_data,
        owner_id,
    )


# ==========================================================
# List Customers
# ==========================================================

@router.get(
    "",
    response_model=CustomerListResponse,
)
def list_all(
    page: int = Query(
        default=1,
        ge=1,
    ),

    page_size: int = Query(
        default=10,
        ge=1,
        le=100,
    ),

    search: str | None = Query(
        default=None,
    ),

    db: Session = Depends(database_session),

    current_user: dict = Depends(get_current_user_token),
):
    """
    Get paginated customers.
    """

    owner_id = int(
        current_user["sub"]
    )


    return list_customers(
        db,
        owner_id,
        page,
        page_size,
        search,
    )


# ==========================================================
# Get Customer
# ==========================================================

@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
)
def get_customer(
    customer_id: int,

    db: Session = Depends(database_session),

    current_user: dict = Depends(get_current_user_token),
):
    """
    Get customer details.
    """

    owner_id = int(
        current_user["sub"]
    )


    customer = get_customer_by_id(
        db,
        customer_id,
        owner_id,
    )


    if not customer:

        from fastapi import HTTPException

        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )


    return customer


# ==========================================================
# Update Customer
# ==========================================================

@router.put(
    "/{customer_id}",
    response_model=CustomerResponse,
)
def update(
    customer_id: int,

    customer_data: CustomerUpdate,

    db: Session = Depends(database_session),

    current_user: dict = Depends(get_current_user_token),
):
    """
    Update customer details.
    """

    owner_id = int(
        current_user["sub"]
    )


    return update_customer(
        db,
        customer_id,
        owner_id,
        customer_data,
    )


# ==========================================================
# Delete Customer
# ==========================================================

@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete(
    customer_id: int,

    db: Session = Depends(database_session),

    current_user: dict = Depends(get_current_user_token),
):
    """
    Soft delete customer.
    """

    owner_id = int(
        current_user["sub"]
    )


    delete_customer(
        db,
        customer_id,
        owner_id,
    )

    return None