"""
BillSphere Payment API

Endpoints:

POST   /payments
GET    /payments
GET    /payments/{id}
PUT    /payments/{id}
POST   /payments/{id}/success
POST   /payments/{id}/failed
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

from app.schemas.payment import (
    PaymentCreate,
    PaymentUpdate,
    PaymentResponse,
    PaymentListResponse,
    PaymentRefundRequest,
)

from app.services.payment_service import (
    create_payment,
    get_payment_by_id,
    list_payments,
    update_payment,
    mark_payment_success,
    mark_payment_failed,
    refund_payment,
)


# ==========================================================
# Router
# ==========================================================

router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)


# ==========================================================
# Create Payment
# ==========================================================


@router.post(
    "",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create(
    payment_data: PaymentCreate,
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Create a new payment record.
    """

    return create_payment(
        db,
        payment_data,
    )


# ==========================================================
# List Payments
# ==========================================================


@router.get(
    "",
    response_model=PaymentListResponse,
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
        description="Number of payments per page.",
    ),
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Return paginated payments.
    """

    return list_payments(
        db,
        page,
        page_size,
    )


# ==========================================================
# Get Payment
# ==========================================================


@router.get(
    "/{payment_id}",
    response_model=PaymentResponse,
)
def get(
    payment_id: int,
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Get payment by ID.
    """

    payment = get_payment_by_id(
        db,
        payment_id,
    )

    if not payment:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    return payment


# ==========================================================
# Update Payment
# ==========================================================


@router.put(
    "/{payment_id}",
    response_model=PaymentResponse,
)
def update(
    payment_id: int,
    payment_data: PaymentUpdate,
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Update payment details.
    """

    return update_payment(
        db,
        payment_id,
        payment_data,
    )


# ==========================================================
# Mark Payment Successful
# ==========================================================


@router.post(
    "/{payment_id}/success",
    response_model=PaymentResponse,
)
def success(
    payment_id: int,
    transaction_id: str = Query(
        ...,
        min_length=1,
        description="Successful payment transaction ID.",
    ),
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Mark a payment as successfully completed.
    """

    return mark_payment_success(
        db,
        payment_id,
        transaction_id,
    )


# ==========================================================
# Mark Payment Failed
# ==========================================================


@router.post(
    "/{payment_id}/failed",
    response_model=PaymentResponse,
)
def failed(
    payment_id: int,
    db: Session = Depends(database_session),
    current_user: dict = Depends(
        get_current_user_token,
    ),
):
    """
    Mark a payment as failed.
    """

    return mark_payment_failed(
        db,
        payment_id,
    )

# ==========================================================
# Refund Payment
# ==========================================================

@router.post(
    "/{payment_id}/refund",
    response_model=PaymentResponse,
)
def refund(
    payment_id: int,
    request: PaymentRefundRequest,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    return refund_payment(
        db=db,
        payment_id=payment_id,
        amount=request.amount,
        reason=request.reason,
    )
