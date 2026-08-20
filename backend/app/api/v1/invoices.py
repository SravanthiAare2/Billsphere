"""
BillSphere Invoice API

Endpoints:

POST    /invoices
GET     /invoices
GET     /invoices/{id}
GET     /invoices/{id}/line-items
GET     /invoices/{id}/pdf
PUT     /invoices/{id}
DELETE  /invoices/{id}
"""


from fastapi import (
    APIRouter,
    Depends,
    Query,
    status,
    HTTPException,
)

from fastapi.responses import FileResponse

from sqlalchemy.orm import Session


from app.dependencies import (
    database_session,
    get_current_user_token,
)


from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceListResponse,
    InvoiceLineItemResponse,
)


from app.services.invoice_service import (
    create_invoice,
    list_invoices,
    get_invoice_by_id,
    get_invoice_line_items,
    update_invoice,
    delete_invoice,
    generate_invoice_pdf_file,
)



router = APIRouter(
    prefix="/invoices",
    tags=["Invoices"],
)



# ==========================================================
# Create Invoice
# ==========================================================

@router.post(
    "",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create(
    invoice_data: InvoiceCreate,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):

    return create_invoice(
        db,
        invoice_data,
        owner_id=int(current_user["sub"]),
    )



# ==========================================================
# List Invoice
# ==========================================================

@router.get(
    "",
    response_model=InvoiceListResponse,
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

    db: Session = Depends(database_session),

    current_user: dict = Depends(get_current_user_token),
):

    return list_invoices(
        db,
        page,
        page_size,
        owner_id=int(current_user["sub"]),
    )



# ==========================================================
# Get Invoice
# ==========================================================

@router.get(
    "/{invoice_id}",
    response_model=InvoiceResponse,
)
def get(
    invoice_id: int,

    db: Session = Depends(database_session),

    current_user: dict = Depends(get_current_user_token),
):

    invoice = get_invoice_by_id(
        db,
        invoice_id,
        owner_id=int(current_user["sub"]),
    )


    if not invoice:

        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )


    return invoice



# ==========================================================
# Get Invoice Line Items
# ==========================================================

@router.get(
    "/{invoice_id}/line-items",
    response_model=list[InvoiceLineItemResponse],
)
def get_line_items(
    invoice_id: int,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    """
    Get itemized line items for an invoice.
    """

    invoice = get_invoice_by_id(
        db,
        invoice_id,
        owner_id=int(current_user["sub"]),
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found",
        )

    return get_invoice_line_items(db, invoice_id)



# ==========================================================
# Download Invoice PDF
# ==========================================================

@router.get(
    "/{invoice_id}/pdf",
)
def download_pdf(
    invoice_id: int,
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    """
    Generate and download the invoice as a PDF.
    """

    invoice = get_invoice_by_id(
        db,
        invoice_id,
        owner_id=int(current_user["sub"]),
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    file_path = generate_invoice_pdf_file(db, invoice_id)

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=f"invoice_{invoice_id}.pdf",
    )



# ==========================================================
# Update Invoice
# ==========================================================

@router.put(
    "/{invoice_id}",
    response_model=InvoiceResponse,
)
def update(
    invoice_id: int,

    invoice_data: InvoiceUpdate,

    db: Session = Depends(database_session),

    current_user: dict = Depends(get_current_user_token),
):

    return update_invoice(
        db,
        invoice_id,
        invoice_data,
        owner_id=int(current_user["sub"]),
    )



# ==========================================================
# Delete Invoice
# ==========================================================

@router.delete(
    "/{invoice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete(
    invoice_id: int,

    db: Session = Depends(database_session),

    current_user: dict = Depends(get_current_user_token),
):

    delete_invoice(
        db,
        invoice_id,
        owner_id=int(current_user["sub"]),
    )

    return None