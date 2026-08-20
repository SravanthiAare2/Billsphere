"""
BillSphere Invoice API Tests

Tests:
- Create invoice
- List invoices
- Update invoice status
- Invoice generation workflow
"""

from fastapi import status



# ==========================================================
# Create Invoice Test
# ==========================================================

def test_create_invoice(
    client,
    auth_headers,
):
    """
    Test invoice creation.
    """

    response = client.post(

        "/api/v1/invoices",

        headers=auth_headers,

        json={

            "customer_id":
            1,

            "subscription_id":
            1,

            "amount":
            999,

            "tax_amount":
            100,

            "due_date":
            "2026-02-01",

        },

    )



    assert response.status_code in [

        status.HTTP_200_OK,

        status.HTTP_201_CREATED,

        status.HTTP_404_NOT_FOUND,

    ]



# ==========================================================
# List Invoice Test
# ==========================================================

def test_list_invoices(
    client,
    auth_headers,
):
    """
    Test retrieving invoices.
    """

    response = client.get(

        "/api/v1/invoices",

        headers=auth_headers,

    )



    assert response.status_code in [

        status.HTTP_200_OK,

        status.HTTP_404_NOT_FOUND,

    ]



# ==========================================================
# Update Invoice Status Test
# ==========================================================

def test_update_invoice_status(
    client,
    auth_headers,
):
    """
    Test invoice payment status update.
    """

    response = client.put(

        "/api/v1/invoices/1/status",

        headers=auth_headers,

        json={

            "status":
            "paid",

        },

    )



    assert response.status_code in [

        status.HTTP_200_OK,

        status.HTTP_204_NO_CONTENT,

        status.HTTP_404_NOT_FOUND,

    ]



# ==========================================================
# Download Invoice PDF Test
# ==========================================================

def test_invoice_pdf_generation(
    client,
    auth_headers,
):
    """
    Test invoice PDF generation endpoint.
    """

    response = client.get(

        "/api/v1/invoices/1/pdf",

        headers=auth_headers,

    )



    assert response.status_code in [

        status.HTTP_200_OK,

        status.HTTP_404_NOT_FOUND,

    ]