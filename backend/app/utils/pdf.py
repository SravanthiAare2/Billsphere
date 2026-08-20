"""
BillSphere PDF Generator

Creates:
- Invoice PDF
- Payment Receipt PDF
"""

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas



BASE_DIR = Path(
    "app/static/invoices"
)


BASE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)



# ==========================================================
# Generate Invoice PDF
# ==========================================================

def generate_invoice_pdf(
    invoice_id: int,
    customer_name: str,
    amount: float,
    tax: float,
    total: float,
):
    """
    Generate invoice PDF file.
    """

    file_path = (
        BASE_DIR
        /
        f"invoice_{invoice_id}.pdf"
    )


    pdf = canvas.Canvas(
        str(file_path),
        pagesize=A4,
    )


    pdf.setFont(
        "Helvetica",
        14,
    )


    pdf.drawString(
        50,
        800,
        "BillSphere Invoice",
    )


    pdf.setFont(
        "Helvetica",
        11,
    )


    pdf.drawString(
        50,
        760,
        f"Invoice ID: {invoice_id}",
    )


    pdf.drawString(
        50,
        730,
        f"Customer: {customer_name}",
    )


    pdf.drawString(
        50,
        700,
        f"Amount: ₹{amount}",
    )


    pdf.drawString(
        50,
        670,
        f"Tax: ₹{tax}",
    )


    pdf.drawString(
        50,
        640,
        f"Total: ₹{total}",
    )


    pdf.save()


    return str(file_path)