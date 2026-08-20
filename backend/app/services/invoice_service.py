"""
BillSphere Invoice Service

Invoice engine:
- Unique invoice numbers
- Real invoice line items
- Subscription charges
- Usage charges
- Tax line items
- Invoice retrieval/update/delete
- PDF invoice generation
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.invoice_line_item import InvoiceLineItem
from app.models.audit_log import AuditLog
from app.models.plan import Plan
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate
from app.services.tax_service import calculate_tax


MONEY = Decimal("0.01")


def money(value: Any) -> Decimal:
    return Decimal(str(value or 0)).quantize(MONEY)


def generate_invoice_number(db: Session) -> str:
    """Generate a unique daily invoice reference."""
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"{getattr(settings, 'INVOICE_PREFIX', 'INV')}-{today}-"
    last = (
        db.query(Invoice)
        .filter(Invoice.invoice_number.like(f"{prefix}%"))
        .order_by(Invoice.id.desc())
        .first()
    )
    last_number = 0
    if last and last.invoice_number:
        try:
            last_number = int(last.invoice_number.rsplit("-", 1)[-1])
        except (ValueError, IndexError):
            last_number = 0
    return f"{prefix}{last_number + 1:06d}"


def _country_for_customer(db: Session, customer_id: int) -> str:
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    return str(getattr(customer, "country", None) or "IN").upper()


def _add_tax_lines(db: Session, invoice: Invoice, breakdown) -> None:
    if breakdown.cgst > 0:
        db.add(InvoiceLineItem(
            invoice_id=invoice.id,
            description=f"CGST ({breakdown.tax_rate_percent / 2}%)",
            item_type="tax_cgst",
            amount=money(breakdown.cgst),
        ))
    if breakdown.sgst > 0:
        db.add(InvoiceLineItem(
            invoice_id=invoice.id,
            description=f"SGST ({breakdown.tax_rate_percent / 2}%)",
            item_type="tax_sgst",
            amount=money(breakdown.sgst),
        ))
    if breakdown.igst > 0:
        db.add(InvoiceLineItem(
            invoice_id=invoice.id,
            description=f"IGST ({breakdown.tax_rate_percent}%)",
            item_type="tax_igst",
            amount=money(breakdown.igst),
        ))


def _recalculate_invoice_totals(invoice: Invoice) -> None:
    taxable = sum(
        (
            money(item.amount)
            for item in invoice.line_items
            if not str(item.item_type).startswith("tax")
        ),
        Decimal("0.00"),
    )
    tax = sum(
        (
            money(item.amount)
            for item in invoice.line_items
            if str(item.item_type).startswith("tax")
        ),
        Decimal("0.00"),
    )
    invoice.amount = money(taxable)
    invoice.tax_amount = money(tax)
    invoice.total_amount = money(taxable + tax)


def create_invoice(
    db: Session,
    invoice_data: InvoiceCreate,
    owner_id: int | None = None,
    commit: bool = True,
) -> Invoice:
    """Create an invoice and its real database line items."""
    customer = db.query(Customer).filter(Customer.id == invoice_data.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    if owner_id is not None and customer.owner_id != owner_id:
        raise HTTPException(status_code=404, detail="Invoice customer not found.")

    amount = money(invoice_data.amount)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invoice amount must be greater than zero.")

    country_code = _country_for_customer(db, customer.id)
    same_state = (
        country_code == str(getattr(settings, "COMPANY_COUNTRY", "IN")).upper()
        and (
            getattr(customer, "state", None) or ""
        ).strip().lower()
        == str(getattr(settings, "COMPANY_STATE", "")).strip().lower()
    )
    breakdown = calculate_tax(
        amount=amount,
        country_code=country_code,
        tax_rate_percent=None,
        same_state=same_state,
    )

    now = datetime.now(timezone.utc)
    invoice = Invoice(
        invoice_number=generate_invoice_number(db),
        customer_id=invoice_data.customer_id,
        subscription_id=invoice_data.subscription_id,
        amount=breakdown.taxable_amount,
        tax_amount=breakdown.total_tax,
        total_amount=breakdown.total_amount,
        status=invoice_data.status,
        created_at=now,
    )
    db.add(invoice)
    db.flush()

    description = "Subscription charge"
    if invoice.subscription_id:
        # Resolve through the subscription without introducing a model-level
        # relationship dependency in this service.
        from app.models.subscription import Subscription
        subscription = db.query(Subscription).filter(Subscription.id == invoice.subscription_id).first()
        if subscription:
            plan_obj = db.query(Plan).filter(Plan.id == subscription.plan_id).first()
            if plan_obj:
                description = f"{plan_obj.name} subscription"

    db.add(InvoiceLineItem(
        invoice_id=invoice.id,
        description=description,
        item_type="subscription",
        amount=amount,
    ))
    _add_tax_lines(db, invoice, breakdown)
    db.add(AuditLog(
        user_id=None,
        action="invoice_generated",
        module="billing",
        description=f"Invoice {invoice.invoice_number} generated.",
        entity_id=invoice.id,
        entity_type="invoice",
    ))

    if commit:
        db.commit()
        db.refresh(invoice)
    return invoice


def get_invoice_by_id(
    db: Session,
    invoice_id: int,
    owner_id: int | None = None,
) -> Invoice | None:
    query = (
        db.query(Invoice)
        .options(joinedload(Invoice.line_items))
        .filter(Invoice.id == invoice_id)
    )

    if owner_id is not None:
        query = query.join(Customer, Customer.id == Invoice.customer_id).filter(
            Customer.owner_id == owner_id,
        )

    return query.first()


def get_invoice(
    db: Session,
    invoice_id: int,
    owner_id: int | None = None,
) -> Invoice:
    invoice = get_invoice_by_id(db, invoice_id, owner_id=owner_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    return invoice


def get_invoice_line_items(db: Session, invoice_id: int) -> list[InvoiceLineItem]:
    get_invoice(db, invoice_id)
    return (
        db.query(InvoiceLineItem)
        .filter(InvoiceLineItem.invoice_id == invoice_id)
        .order_by(InvoiceLineItem.id.asc())
        .all()
    )


def list_invoices(
    db: Session,
    page: int = 1,
    page_size: int = 10,
    owner_id: int | None = None,
) -> dict:
    if page < 1 or page_size < 1 or page_size > 100:
        raise HTTPException(status_code=400, detail="Invalid pagination values.")
    query = db.query(Invoice).options(joinedload(Invoice.line_items))
    if owner_id is not None:
        query = query.join(Customer, Customer.id == Invoice.customer_id).filter(
            Customer.owner_id == owner_id,
        )
    total = query.count()
    items = (
        query.order_by(Invoice.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"total": total, "page": page, "page_size": page_size, "items": items}


def update_invoice(
    db: Session,
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    owner_id: int | None = None,
) -> Invoice:
    invoice = get_invoice(db, invoice_id, owner_id=owner_id)
    data = invoice_data.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(invoice, field, value)
    db.commit()
    db.refresh(invoice)
    return invoice


def delete_invoice(
    db: Session,
    invoice_id: int,
    owner_id: int | None = None,
) -> bool:
    invoice = get_invoice(db, invoice_id, owner_id=owner_id)
    db.delete(invoice)
    db.commit()
    return True


def generate_invoice_pdf_file(db: Session, invoice_id: int) -> str:
    invoice = get_invoice(db, invoice_id)

    base_directory = Path(getattr(settings, "BASE_DIR", Path.cwd()))
    pdf_directory = base_directory / "generated" / "invoices"
    pdf_directory.mkdir(parents=True, exist_ok=True)
    pdf_path = pdf_directory / f"invoice_{invoice.id}.pdf"

    amount = money(invoice.amount)
    tax_amount = money(invoice.tax_amount)
    total_amount = money(invoice.total_amount)
    created_date = (
        invoice.created_at.strftime("%d %B %Y")
        if invoice.created_at else datetime.now(timezone.utc).strftime("%d %B %Y")
    )

    document = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"BillSphere Invoice {invoice.invoice_number}",
        author="BillSphere",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("BillSphereTitle", parent=styles["Title"], fontSize=24, leading=28, spaceAfter=8)
    heading_style = ParagraphStyle("BillSphereHeading", parent=styles["Heading2"], fontSize=13, leading=16, spaceBefore=8, spaceAfter=8)
    normal_style = ParagraphStyle("BillSphereNormal", parent=styles["Normal"], fontSize=10, leading=14)
    small_style = ParagraphStyle("BillSphereSmall", parent=styles["Normal"], fontSize=8, leading=11)

    story = [
        Paragraph(getattr(settings, "COMPANY_NAME", "BillSphere"), title_style),
        Paragraph("SaaS Subscription & Billing Platform", normal_style),
        Spacer(1, 12),
    ]

    customer = db.query(Customer).filter(Customer.id == invoice.customer_id).first()
    customer_name = getattr(customer, "company_name", None) or getattr(customer, "contact_name", None) or f"Customer #{invoice.customer_id}"

    info = [
        [Paragraph("<b>Invoice Number</b>", normal_style), invoice.invoice_number],
        [Paragraph("<b>Invoice Date</b>", normal_style), created_date],
        [Paragraph("<b>Customer</b>", normal_style), customer_name],
        [Paragraph("<b>Customer ID</b>", normal_style), str(invoice.customer_id)],
        [Paragraph("<b>Subscription ID</b>", normal_style), str(invoice.subscription_id or "-")],
        [Paragraph("<b>Status</b>", normal_style), str(invoice.status).upper()],
    ]
    table = Table(info, colWidths=[50 * mm, 120 * mm])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [table, Spacer(1, 18), Paragraph("Invoice Details", heading_style)]

    rows = [[
        Paragraph("<b>Description</b>", normal_style),
        Paragraph("<b>Type</b>", normal_style),
        Paragraph("<b>Amount</b>", normal_style),
    ]]
    for item in invoice.line_items:
        rows.append([
            Paragraph(item.description, normal_style),
            str(item.item_type),
            f"₹{money(item.amount):.2f}",
        ])
    if len(rows) == 1:
        rows.append(["No line items", "-", "₹0.00"])

    details = Table(rows, colWidths=[105 * mm, 30 * mm, 35 * mm])
    details.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("ALIGN", (2, 1), (2, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story += [details, Spacer(1, 15)]

    totals = Table([
        [Paragraph("<b>Subtotal</b>", normal_style), f"₹{amount:.2f}"],
        [Paragraph("<b>Tax</b>", normal_style), f"₹{tax_amount:.2f}"],
        [Paragraph("<b>Total</b>", normal_style), f"₹{total_amount:.2f}"],
    ], colWidths=[120 * mm, 50 * mm])
    totals.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BACKGROUND", (0, 2), (-1, 2), colors.whitesmoke),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story += [
        totals,
        Spacer(1, 25),
        Paragraph("Payment terms: due on the invoice due date.", normal_style),
        Spacer(1, 8),
        Paragraph("This is a system-generated invoice.", small_style),
    ]

    try:
        document.build(story)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate invoice PDF: {exc}") from exc
    return str(pdf_path.resolve())
