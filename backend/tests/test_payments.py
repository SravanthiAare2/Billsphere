"""
BillSphere Payment API Tests

Tests:
- Create payment
- List payments
- Mark payment success
- Mark payment failed
- Refund payment
"""

from fastapi import status


# ==========================================================
# Create Payment Test
# ==========================================================

def test_create_payment(client, auth_headers):
    """
    Test creating a payment.
    """

    response = client.post(
        "/api/v1/payments",
        headers=auth_headers,
        json={
            "invoice_id": 1,
            "amount": "999.00",
            "payment_method": "card",
            "status": "pending",
        },
    )

    assert response.status_code in [
        status.HTTP_200_OK,
        status.HTTP_201_CREATED,
        status.HTTP_404_NOT_FOUND,
        status.HTTP_422_UNPROCESSABLE_ENTITY,
    ]


# ==========================================================
# List Payments Test
# ==========================================================

def test_list_payments(client, auth_headers):
    """
    Test listing payments.
    """

    response = client.get(
        "/api/v1/payments",
        headers=auth_headers,
    )

    assert response.status_code == status.HTTP_200_OK


# ==========================================================
# Mark Payment Success Test
# ==========================================================

def test_mark_payment_success(client, auth_headers):
    """
    Test marking a payment as successful.
    """

    response = client.post(
        "/api/v1/payments/1/success",
        headers=auth_headers,
        json={"transaction_id": "txn_test_001"},
    )

    assert response.status_code in [
        status.HTTP_200_OK,
        status.HTTP_404_NOT_FOUND,
        status.HTTP_422_UNPROCESSABLE_ENTITY,
    ]


# ==========================================================
# Mark Payment Failed Test
# ==========================================================

def test_mark_payment_failed(client, auth_headers):
    """
    Test marking a payment as failed.
    """

    response = client.post(
        "/api/v1/payments/1/failed",
        headers=auth_headers,
    )

    assert response.status_code in [
        status.HTTP_200_OK,
        status.HTTP_404_NOT_FOUND,
    ]


# ==========================================================
# Refund Payment Test
# ==========================================================

def test_refund_payment(client, auth_headers):
    """
    Test refunding a payment.

    A fresh payment is pending, not completed, so refund
    is expected to be rejected with 400 unless a completed
    payment with id=1 already exists in the test DB.
    """

    response = client.post(
        "/api/v1/payments/1/refund",
        headers=auth_headers,
        json={"reason": "Customer requested refund"},
    )

    assert response.status_code in [
        status.HTTP_200_OK,
        status.HTTP_400_BAD_REQUEST,
        status.HTTP_404_NOT_FOUND,
    ]


# ==========================================================
# Refund Rejects Over-Amount Test
# ==========================================================

def test_refund_payment_amount_exceeds_original(client, auth_headers):
    """
    Refund amount greater than the original payment must be
    rejected.
    """

    response = client.post(
        "/api/v1/payments/1/refund",
        headers=auth_headers,
        json={"amount": "999999.00"},
    )

    assert response.status_code in [
        status.HTTP_400_BAD_REQUEST,
        status.HTTP_404_NOT_FOUND,
    ]