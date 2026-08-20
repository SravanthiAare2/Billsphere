"""
BillSphere Customer Service

Business logic layer for customer management.

Handles:
- Creating customers
- Fetching customers
- Searching customers
- Updating customers
- Deactivating customers
"""

from sqlalchemy import (
    or_,
    select,
)
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from app.models.customer import Customer
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
)


# ==========================================================
# Get Customer By ID
# ==========================================================

def get_customer_by_id(
    db: Session,
    customer_id: int,
    owner_id: int,
) -> Customer | None:
    """
    Fetch customer by ID belonging to owner.
    """

    statement = select(Customer).where(
        Customer.id == customer_id,
        Customer.owner_id == owner_id,
    )

    result = db.execute(statement)

    return result.scalar_one_or_none()


# ==========================================================
# Get Customer By Email
# ==========================================================

def get_customer_by_email(
    db: Session,
    email: str,
    owner_id: int,
) -> Customer | None:
    """
    Fetch customer using email.
    """

    statement = select(Customer).where(
        Customer.email == email,
        Customer.owner_id == owner_id,
    )

    result = db.execute(statement)

    return result.scalar_one_or_none()


# ==========================================================
# Create Customer
# ==========================================================

def create_customer(
    db: Session,
    customer_data: CustomerCreate,
    owner_id: int,
) -> Customer:
    """
    Create a new customer.
    """

    existing_customer = get_customer_by_email(
        db,
        customer_data.email,
        owner_id,
    )


    if existing_customer:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer email already exists",
        )


    customer = Customer(
        **customer_data.model_dump(),
        owner_id=owner_id,
    )


    db.add(customer)

    db.commit()

    db.refresh(customer)


    return customer


# ==========================================================
# List Customers
# ==========================================================

def list_customers(
    db: Session,
    owner_id: int,
    page: int = 1,
    page_size: int = 10,
    search: str | None = None,
):
    """
    Return paginated customer list.
    """

    query = select(Customer).where(
        Customer.owner_id == owner_id,
        Customer.is_active.is_(True),
    )


    if search:

        search_filter = f"%{search}%"

        query = query.where(
            or_(
                Customer.company_name.ilike(
                    search_filter
                ),

                Customer.contact_name.ilike(
                    search_filter
                ),

                Customer.email.ilike(
                    search_filter
                ),
            )
        )


    offset = (
        page - 1
    ) * page_size


    query = query.offset(
        offset
    ).limit(
        page_size
    )


    result = db.execute(query)


    customers = result.scalars().all()


    count_query = select(
        Customer
    ).where(
        Customer.owner_id == owner_id,
        Customer.is_active.is_(True),
    )


    total = len(
        db.execute(count_query)
        .scalars()
        .all()
    )


    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "customers": customers,
    }


# ==========================================================
# Update Customer
# ==========================================================

def update_customer(
    db: Session,
    customer_id: int,
    owner_id: int,
    customer_data: CustomerUpdate,
) -> Customer:
    """
    Update existing customer.
    """

    customer = get_customer_by_id(
        db,
        customer_id,
        owner_id,
    )


    if not customer:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )


    update_data = customer_data.model_dump(
        exclude_unset=True
    )


    for key, value in update_data.items():

        setattr(
            customer,
            key,
            value,
        )


    db.commit()

    db.refresh(customer)


    return customer


# ==========================================================
# Delete Customer
# ==========================================================

def delete_customer(
    db: Session,
    customer_id: int,
    owner_id: int,
) -> None:
    """
    Soft delete customer.

    Customer data remains in database.
    """

    customer = get_customer_by_id(
        db,
        customer_id,
        owner_id,
    )


    if not customer:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )


    customer.is_active = False


    db.commit()