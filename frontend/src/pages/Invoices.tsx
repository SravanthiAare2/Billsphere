import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Search,
  X,
  Eye,
  CreditCard,
} from "lucide-react";
import jsPDF from "jspdf";

import { getMyInvoices } from "../services/api";

interface InvoiceRecord {
  id: number;
  invoice_number?: string | null;
  description?: string | null;
  created_at?: string | null;
  due_date?: string | null;
  amount?: number | string | null;
  total_amount?: number | string | null;
  status?: string | null;

  /* Optional fields if your backend already provides them */
  currency?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  plan_name?: string | null;
  billing_cycle?: string | null;
  payment_method?: string | null;
  transaction_id?: string | null;
  tax_amount?: number | string | null;
  subtotal?: number | string | null;
}

function formatMoney(
  value: number | string | null | undefined,
  currency = "INR"
) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "-";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatLongDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isInDateFilter(
  value: string | null | undefined,
  filter: string
) {
  if (filter === "All Dates" || !value) {
    return true;
  }

  const date = new Date(value);
  const now = new Date();

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  if (filter === "This Year") {
    return date.getFullYear() === now.getFullYear();
  }

  if (filter === "This Month") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  if (filter === "Last 3 Months") {
    const threshold = new Date(now);
    threshold.setMonth(now.getMonth() - 3);

    return date >= threshold;
  }

  return true;
}

function getInvoiceAmount(invoice: InvoiceRecord) {
  return Number(
    invoice.total_amount ??
      invoice.amount ??
      0
  );
}

function getInvoiceNumber(invoice: InvoiceRecord) {
  return (
    invoice.invoice_number ||
    `INV-${String(invoice.id).padStart(6, "0")}`
  );
}

function getCustomerName(invoice: InvoiceRecord) {
  return invoice.customer_name || "Sravanthi";
}

function getPlanName(invoice: InvoiceRecord) {
  return invoice.plan_name || invoice.description || "Subscription";
}

function getBillingCycle(invoice: InvoiceRecord) {
  return invoice.billing_cycle || "Subscription Billing";
}

function getStatus(invoice: InvoiceRecord) {
  return (invoice.status || "unknown").toLowerCase();
}

/* =========================================================
   PROFESSIONAL INVOICE PDF
========================================================= */

function downloadInvoice(invoice: InvoiceRecord) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const margin = 18;

  const gold = {
    r: 184,
    g: 145,
    b: 63,
  };

  const black = {
    r: 25,
    g: 25,
    b: 25,
  };

  const darkGrey = {
    r: 65,
    g: 65,
    b: 65,
  };

  const grey = {
    r: 110,
    g: 110,
    b: 110,
  };

  const lightGrey = {
    r: 235,
    g: 235,
    b: 235,
  };

  const veryLightGrey = {
    r: 248,
    g: 248,
    b: 248,
  };

  const status = getStatus(invoice);
  const invoiceNumber = getInvoiceNumber(invoice);

  const currency = invoice.currency || "INR";

  const total = getInvoiceAmount(invoice);

  const providedSubtotal = Number(
    invoice.subtotal ?? NaN
  );

  const providedTax = Number(
    invoice.tax_amount ?? NaN
  );

  let subtotal = Number.isFinite(providedSubtotal)
    ? providedSubtotal
    : total;

  let tax = Number.isFinite(providedTax)
    ? providedTax
    : 0;

  /*
   * If backend provides only total_amount and no tax/subtotal,
   * do not invent a tax percentage.
   */
  if (
    !Number.isFinite(providedSubtotal) &&
    !Number.isFinite(providedTax)
  ) {
    subtotal = total;
    tax = 0;
  }

  /* =======================================================
     WHITE PAGE
  ======================================================= */

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  /* =======================================================
     TOP GOLD BAR
  ======================================================= */

  doc.setFillColor(
    gold.r,
    gold.g,
    gold.b
  );

  doc.rect(
    0,
    0,
    pageWidth,
    4,
    "F"
  );

  /* =======================================================
     BILLSPHERE HEADER
  ======================================================= */

  doc.setTextColor(
    black.r,
    black.g,
    black.b
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(24);

  doc.text(
    "BILLSPHERE",
    margin,
    24
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    grey.r,
    grey.g,
    grey.b
  );

  doc.text(
    "BILLING OS",
    margin,
    30
  );

  /* =======================================================
     INVOICE TITLE
  ======================================================= */

  doc.setTextColor(
    black.r,
    black.g,
    black.b
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(25);

  doc.text(
    "INVOICE",
    pageWidth - margin,
    24,
    {
      align: "right",
    }
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(9);

  doc.setTextColor(
    grey.r,
    grey.g,
    grey.b
  );

  doc.text(
    invoiceNumber,
    pageWidth - margin,
    31,
    {
      align: "right",
    }
  );

  /* =======================================================
     HEADER DIVIDER
  ======================================================= */

  doc.setDrawColor(
    gold.r,
    gold.g,
    gold.b
  );

  doc.setLineWidth(0.5);

  doc.line(
    margin,
    40,
    pageWidth - margin,
    40
  );

  /* =======================================================
     FROM / BILL TO
  ======================================================= */

  const infoTop = 51;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    grey.r,
    grey.g,
    grey.b
  );

  doc.text(
    "FROM",
    margin,
    infoTop
  );

  doc.text(
    "BILL TO",
    pageWidth / 2,
    infoTop
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);

  doc.setTextColor(
    black.r,
    black.g,
    black.b
  );

  doc.text(
    "BillSphere",
    margin,
    infoTop + 8
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    darkGrey.r,
    darkGrey.g,
    darkGrey.b
  );

  doc.text(
    "Billing OS",
    margin,
    infoTop + 14
  );

  doc.text(
    "Digital Billing & Subscription Platform",
    margin,
    infoTop + 19
  );

  /* CUSTOMER */

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);

  doc.setTextColor(
    black.r,
    black.g,
    black.b
  );

  doc.text(
    getCustomerName(invoice),
    pageWidth / 2,
    infoTop + 8
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    darkGrey.r,
    darkGrey.g,
    darkGrey.b
  );

  if (invoice.customer_email) {
    doc.text(
      invoice.customer_email,
      pageWidth / 2,
      infoTop + 14
    );
  } else {
    doc.text(
      "Registered BillSphere Customer",
      pageWidth / 2,
      infoTop + 14
    );
  }

  if (invoice.customer_address) {
    const addressLines =
      doc.splitTextToSize(
        invoice.customer_address,
        pageWidth / 2 - margin - 8
      );

    doc.text(
      addressLines,
      pageWidth / 2,
      infoTop + 20
    );
  }

  /* =======================================================
     INVOICE META
  ======================================================= */

  const metaTop = 84;

  doc.setFillColor(
    veryLightGrey.r,
    veryLightGrey.g,
    veryLightGrey.b
  );

  doc.roundedRect(
    margin,
    metaTop,
    pageWidth - margin * 2,
    28,
    2,
    2,
    "F"
  );

  const metaWidth =
    (pageWidth - margin * 2) / 3;

  drawInvoiceMeta(
    doc,
    "INVOICE DATE",
    formatLongDate(invoice.created_at),
    margin + 6,
    metaTop + 8
  );

  drawInvoiceMeta(
    doc,
    "DUE DATE",
    formatLongDate(invoice.due_date),
    margin + metaWidth + 6,
    metaTop + 8
  );

  drawInvoiceMeta(
    doc,
    "STATUS",
    status.toUpperCase(),
    margin + metaWidth * 2 + 6,
    metaTop + 8,
    status === "paid"
  );

  /* =======================================================
     ITEM TABLE
  ======================================================= */

  const tableTop = 125;

  doc.setTextColor(
    grey.r,
    grey.g,
    grey.b
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(8);

  doc.text(
    "DESCRIPTION",
    margin,
    tableTop
  );

  doc.text(
    "QTY",
    pageWidth - 93,
    tableTop,
    {
      align: "right",
    }
  );

  doc.text(
    "RATE",
    pageWidth - 59,
    tableTop,
    {
      align: "right",
    }
  );

  doc.text(
    "AMOUNT",
    pageWidth - margin,
    tableTop,
    {
      align: "right",
    }
  );

  doc.setDrawColor(
    lightGrey.r,
    lightGrey.g,
    lightGrey.b
  );

  doc.setLineWidth(0.35);

  doc.line(
    margin,
    tableTop + 4,
    pageWidth - margin,
    tableTop + 4
  );

  /* ITEM ROW */

  const itemY = tableTop + 16;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10);

  doc.setTextColor(
    black.r,
    black.g,
    black.b
  );

  doc.text(
    getPlanName(invoice),
    margin,
    itemY
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    grey.r,
    grey.g,
    grey.b
  );

  doc.text(
    getBillingCycle(invoice),
    margin,
    itemY + 6
  );

  doc.setTextColor(
    darkGrey.r,
    darkGrey.g,
    darkGrey.b
  );

  doc.text(
    "1",
    pageWidth - 93,
    itemY,
    {
      align: "right",
    }
  );

  doc.text(
    formatMoney(subtotal, currency),
    pageWidth - 59,
    itemY,
    {
      align: "right",
    }
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    formatMoney(subtotal, currency),
    pageWidth - margin,
    itemY,
    {
      align: "right",
    }
  );

  doc.setDrawColor(
    lightGrey.r,
    lightGrey.g,
    lightGrey.b
  );

  doc.line(
    margin,
    itemY + 14,
    pageWidth - margin,
    itemY + 14
  );

  /* =======================================================
     TOTALS
  ======================================================= */

  const totalsTop = itemY + 30;

  const totalsLabelX =
    pageWidth - 82;

  const totalsValueX =
    pageWidth - margin;

  drawTotalLine(
    doc,
    "Subtotal",
    formatMoney(subtotal, currency),
    totalsLabelX,
    totalsValueX,
    totalsTop
  );

  drawTotalLine(
    doc,
    "Tax",
    formatMoney(tax, currency),
    totalsLabelX,
    totalsValueX,
    totalsTop + 8
  );

  doc.setFillColor(
    black.r,
    black.g,
    black.b
  );

  doc.roundedRect(
    pageWidth - 88,
    totalsTop + 16,
    70,
    15,
    2,
    2,
    "F"
  );

  doc.setTextColor(
    255,
    255,
    255
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(9);

  doc.text(
    "TOTAL",
    pageWidth - 82,
    totalsTop + 25
  );

  doc.setTextColor(
    255,
    255,
    255
  );

  doc.setFontSize(12);

  doc.text(
    formatMoney(total, currency),
    totalsValueX - 2,
    totalsTop + 25,
    {
      align: "right",
    }
  );

  /* =======================================================
     PAYMENT INFORMATION
  ======================================================= */

  const paymentTop = 190;

  doc.setTextColor(
    gold.r,
    gold.g,
    gold.b
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(9);

  doc.text(
    "PAYMENT INFORMATION",
    margin,
    paymentTop
  );

  doc.setDrawColor(
    lightGrey.r,
    lightGrey.g,
    lightGrey.b
  );

  doc.line(
    margin,
    paymentTop + 4,
    pageWidth - margin,
    paymentTop + 4
  );

  drawPaymentField(
    doc,
    "Payment Status",
    status.toUpperCase(),
    margin,
    paymentTop + 15
  );

  drawPaymentField(
    doc,
    "Payment Method",
    invoice.payment_method || "BillSphere Payment",
    margin + 62,
    paymentTop + 15
  );

  drawPaymentField(
    doc,
    "Transaction ID",
    invoice.transaction_id || "Recorded with invoice",
    margin + 124,
    paymentTop + 15
  );

  /* =======================================================
     NOTES
  ======================================================= */

  const noteTop = 225;

  doc.setTextColor(
    black.r,
    black.g,
    black.b
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(9);

  doc.text(
    "Thank you for choosing BillSphere.",
    margin,
    noteTop
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    grey.r,
    grey.g,
    grey.b
  );

  const note =
    status === "paid"
      ? "This invoice confirms the billing transaction recorded for your BillSphere subscription."
      : "This invoice reflects the current billing record associated with your BillSphere subscription.";

  const noteLines =
    doc.splitTextToSize(
      note,
      pageWidth - margin * 2
    );

  doc.text(
    noteLines,
    margin,
    noteTop + 7
  );

  /* =======================================================
     FOOTER
  ======================================================= */

  const footerY =
    pageHeight - 25;

  doc.setDrawColor(
    lightGrey.r,
    lightGrey.g,
    lightGrey.b
  );

  doc.line(
    margin,
    footerY - 7,
    pageWidth - margin,
    footerY - 7
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    black.r,
    black.g,
    black.b
  );

  doc.text(
    "BILLSPHERE",
    margin,
    footerY
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7);

  doc.setTextColor(
    grey.r,
    grey.g,
    grey.b
  );

  doc.text(
    "Billing OS • Computer-generated invoice",
    margin,
    footerY + 6
  );

  doc.text(
    invoiceNumber,
    pageWidth - margin,
    footerY,
    {
      align: "right",
    }
  );

  doc.setTextColor(
    gold.r,
    gold.g,
    gold.b
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.text(
    "Thank you.",
    pageWidth - margin,
    footerY + 6,
    {
      align: "right",
    }
  );

  /* =======================================================
     SAVE
  ======================================================= */

  const safeInvoiceNumber =
    invoiceNumber
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "_");

  doc.save(
    `BillSphere_${safeInvoiceNumber}_Invoice.pdf`
  );
}


/* =========================================================
   PDF HELPERS
========================================================= */

function drawInvoiceMeta(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  positive = false
) {
  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(7);

  doc.setTextColor(
    120,
    120,
    120
  );

  doc.text(
    label,
    x,
    y
  );

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(9);

  doc.setTextColor(
    positive ? 35 : 35,
    positive ? 125 : 35,
    positive ? 80 : 35
  );

  doc.text(
    value,
    x,
    y + 8
  );
}

function drawTotalLine(
  doc: jsPDF,
  label: string,
  value: string,
  labelX: number,
  valueX: number,
  y: number
) {
  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    100,
    100,
    100
  );

  doc.text(
    label,
    labelX,
    y
  );

  doc.setTextColor(
    50,
    50,
    50
  );

  doc.text(
    value,
    valueX,
    y,
    {
      align: "right",
    }
  );
}

function drawPaymentField(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number
) {
  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(7);

  doc.setTextColor(
    125,
    125,
    125
  );

  doc.text(
    label.toUpperCase(),
    x,
    y
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8);

  doc.setTextColor(
    45,
    45,
    45
  );

  doc.text(
    value,
    x,
    y + 7
  );
}


/* =========================================================
   INVOICE PAGE
========================================================= */

function Invoices() {
  const [statusFilter, setStatusFilter] =
    useState("All Status");

  const [dateFilter, setDateFilter] =
    useState("All Dates");

  const [search, setSearch] =
    useState("");

  const [invoices, setInvoices] =
    useState<InvoiceRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedInvoice, setSelectedInvoice] =
    useState<InvoiceRecord | null>(null);

  useEffect(() => {
    let mounted = true;

    getMyInvoices()
      .then((data) => {
        if (mounted) {
          setInvoices(
            data as InvoiceRecord[]
          );

          setError("");
        }
      })
      .catch((requestError: unknown) => {
        if (mounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load invoices."
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredInvoices = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    const normalizedStatus =
      statusFilter.toLowerCase();

    return invoices.filter((invoice) => {
      const invoiceStatus =
        (invoice.status || "").toLowerCase();

      const matchesStatus =
        statusFilter === "All Status" ||
        invoiceStatus === normalizedStatus;

      const invoiceNumber =
        getInvoiceNumber(invoice).toLowerCase();

      const description =
        (invoice.description || "").toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        invoiceNumber.includes(
          normalizedSearch
        ) ||
        description.includes(
          normalizedSearch
        );

      return (
        matchesStatus &&
        matchesSearch &&
        isInDateFilter(
          invoice.created_at,
          dateFilter
        )
      );
    });
  }, [
    dateFilter,
    invoices,
    search,
    statusFilter,
  ]);

  const paidCount = invoices.filter(
    (invoice) =>
      getStatus(invoice) === "paid"
  ).length;

  const outstandingCount =
    invoices.filter(
      (invoice) =>
        !["paid", "void"].includes(
          getStatus(invoice)
        )
    ).length;

  return (
    <div className="min-h-[calc(100vh-72px)] text-white">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <section className="mb-7">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2">

              <FileText
                size={14}
                className="text-[#D6B36A]"
              />

              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D6B36A]/70">
                Billing
              </p>

            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              My Invoices
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
              View your billing history, payment
              status, tax details and downloadable
              invoices.
            </p>

          </div>

        </div>

      </section>


      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <section className="grid gap-4 md:grid-cols-3">

        <SummaryCard
          label="Total Invoices"
          value={
            loading
              ? "-"
              : String(invoices.length)
          }
          description="Your complete billing history"
          icon={<FileText size={18} />}
        />

        <SummaryCard
          label="Paid"
          value={
            loading
              ? "-"
              : String(paidCount)
          }
          description="Invoices marked as paid"
          icon={<CheckCircle2 size={18} />}
          positive
        />

        <SummaryCard
          label="Outstanding"
          value={
            loading
              ? "-"
              : String(outstandingCount)
          }
          description="Invoices awaiting payment"
          icon={<FileText size={18} />}
        />

      </section>


      {/* =====================================================
          INVOICE HISTORY
      ===================================================== */}

      <section className="mt-7">

        <div className="mb-4">

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D6B36A]/70">
            Invoice History
          </p>

          <h2 className="mt-1 text-lg font-semibold text-white">
            Your invoices
          </h2>

          <p className="mt-1 text-xs text-white/35">
            View your invoices, payment status and
            billing details.
          </p>

        </div>


        {/* FILTER PANEL */}

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

            <div className="relative w-full xl:max-w-[300px]">

              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
              />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search invoice..."
                className="h-10 w-full rounded-xl border border-white/[0.07] bg-black/20 pl-9 pr-9 text-xs text-white outline-none placeholder:text-white/20 focus:border-[#D6B36A]/30"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}

            </div>


            <div className="flex flex-wrap gap-2">

              <FilterSelect
                icon={<Filter size={13} />}
                value={statusFilter}
                options={[
                  "All Status",
                  "Paid",
                  "Pending",
                  "Failed",
                  "Overdue",
                  "Void",
                ]}
                onChange={setStatusFilter}
              />

              <FilterSelect
                icon={<CalendarDays size={13} />}
                value={dateFilter}
                options={[
                  "All Dates",
                  "This Month",
                  "Last 3 Months",
                  "This Year",
                ]}
                onChange={setDateFilter}
              />

            </div>

          </div>

        </div>


        {/* ===================================================
            TABLE
        =================================================== */}

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.015]">

          <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-white/[0.06] px-5 py-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25 lg:grid">

            <span>Invoice</span>
            <span>Date</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Due Date</span>

            <span className="text-right">
              Actions
            </span>

          </div>


          {loading ? (

            <div className="flex min-h-[330px] items-center justify-center px-6 py-12 text-center">

              <p className="text-xs text-white/35">
                Loading invoices...
              </p>

            </div>

          ) : error ? (

            <div className="flex min-h-[330px] items-center justify-center px-6 py-12 text-center">

              <p className="max-w-md text-xs leading-5 text-red-300/70">
                {error}
              </p>

            </div>

          ) : filteredInvoices.length === 0 ? (

            <EmptyInvoiceState />

          ) : (

            <div className="divide-y divide-white/[0.06]">

              {filteredInvoices.map(
                (invoice) => (

                  <InvoiceRow
                    key={invoice.id}
                    invoice={invoice}
                    onView={() =>
                      setSelectedInvoice(
                        invoice
                      )
                    }
                    onDownload={() =>
                      downloadInvoice(
                        invoice
                      )
                    }
                  />

                )
              )}

            </div>

          )}

        </div>


        {/* ===================================================
            PAGINATION
        =================================================== */}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <p className="text-[11px] text-white/30">
              {filteredInvoices.length} results
            </p>

            <PageSizeSelect />

          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              disabled
              className="flex items-center gap-1 rounded-lg border border-white/[0.06] px-3 py-2 text-[11px] text-white/20 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
              Prev
            </button>

            <span className="px-2 text-[11px] text-white/30">
              Page 1 of 1
            </span>

            <button
              type="button"
              disabled
              className="flex items-center gap-1 rounded-lg border border-white/[0.06] px-3 py-2 text-[11px] text-white/20 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={14} />
            </button>

          </div>

        </div>

      </section>


      {/* =====================================================
          INVOICE VIEW MODAL
      ===================================================== */}

      {selectedInvoice && (

        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() =>
            setSelectedInvoice(null)
          }
          onDownload={() =>
            downloadInvoice(
              selectedInvoice
            )
          }
        />

      )}

    </div>
  );
}


/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  description,
  icon,
  positive = false,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            {label}
          </p>

          <p
            className={`mt-3 text-2xl font-semibold ${
              positive
                ? "text-emerald-300"
                : "text-white"
            }`}
          >
            {value}
          </p>

        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D6B36A]/15 bg-[#D6B36A]/5 text-[#D6B36A]">
          {icon}
        </div>

      </div>

      <p className="mt-4 text-[11px] text-white/30">
        {description}
      </p>

    </div>
  );
}


/* =========================================================
   FILTER SELECT
========================================================= */

function FilterSelect({
  icon,
  value,
  options,
  onChange,
}: {
  icon: React.ReactNode;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">

      <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-white/30">
        {icon}
      </div>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="h-10 appearance-none rounded-xl border border-white/[0.07] bg-[#0D0D0D] pl-9 pr-9 text-xs text-white/60 outline-none focus:border-[#D6B36A]/30"
      >

        {options.map((option) => (
          <option
            key={option}
            value={option}
            className="bg-[#0D0D0D] text-white"
          >
            {option}
          </option>
        ))}

      </select>

      <ChevronDown
        size={13}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/25"
      />

    </div>
  );
}


/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyInvoiceState() {
  return (
    <div className="flex min-h-[330px] flex-col items-center justify-center px-6 py-12 text-center">

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D6B36A]/15 bg-[#D6B36A]/5">

        <FileText
          size={23}
          className="text-[#D6B36A]/70"
        />

      </div>

      <h3 className="mt-5 text-sm font-semibold text-white">
        No invoices yet
      </h3>

      <p className="mt-2 max-w-md text-xs leading-5 text-white/30">
        Your invoices will appear here once
        billing activity generates an invoice
        for your account.
      </p>

    </div>
  );
}


/* =========================================================
   INVOICE ROW
========================================================= */

function InvoiceRow({
  invoice,
  onView,
  onDownload,
}: {
  invoice: InvoiceRecord;
  onView: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] lg:items-center">

      <div>

        <p className="text-xs font-semibold text-white">
          {getInvoiceNumber(invoice)}
        </p>

        <p className="mt-1 text-[10px] text-white/30">
          {invoice.description ||
            "Subscription"}
        </p>

      </div>

      <div className="text-xs text-white/45">
        {formatDate(invoice.created_at)}
      </div>

      <div className="text-sm font-semibold text-white">
        {formatMoney(
          invoice.total_amount ??
            invoice.amount,
          invoice.currency ||
            "INR"
        )}
      </div>

      <div>
        <StatusBadge
          status={
            invoice.status ||
            "unknown"
          }
        />
      </div>

      <div className="text-xs text-white/45">
        {formatDate(invoice.due_date)}
      </div>

      <div className="flex justify-start gap-2 lg:justify-end">

        {/* VIEW */}

        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[10px] font-medium text-white/45 transition hover:border-[#D6B36A]/20 hover:bg-[#D6B36A]/5 hover:text-[#D6B36A]"
        >
          <Eye size={13} />
          View
        </button>

        {/* DOWNLOAD */}

        <button
          type="button"
          onClick={onDownload}
          title="Download invoice"
          className="inline-flex items-center justify-center rounded-lg border border-[#D6B36A]/15 bg-[#D6B36A]/5 p-2 text-[#D6B36A] transition hover:bg-[#D6B36A]/10"
        >
          <Download size={14} />
        </button>

      </div>

    </div>
  );
}


/* =========================================================
   MOBILE + DESKTOP INVOICE MODAL
========================================================= */

function InvoiceModal({
  invoice,
  onClose,
  onDownload,
}: {
  invoice: InvoiceRecord;
  onClose: () => void;
  onDownload: () => void;
}) {
  const status = getStatus(invoice);

  const total = getInvoiceAmount(
    invoice
  );

  const currency =
    invoice.currency || "INR";

  const subtotal = Number(
    invoice.subtotal ?? total
  );

  const tax = Number(
    invoice.tax_amount ?? 0
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6">

      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101010] shadow-2xl">

        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">

          <div>

            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#D6B36A]">
              BillSphere
            </p>

            <h3 className="mt-1 text-lg font-semibold text-white">
              Invoice Preview
            </h3>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/30 transition hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>

        </div>


        {/* SCROLLABLE PREVIEW */}

        <div className="overflow-y-auto p-4 sm:p-6">

          <div className="rounded-xl border border-black/10 bg-white p-5 text-black shadow-xl sm:p-7">

            {/* INVOICE HEADER */}

            <div className="flex items-start justify-between border-b border-black/10 pb-5">

              <div>

                <p className="text-xl font-black tracking-tight">
                  BILLSPHERE
                </p>

                <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.25em] text-black/40">
                  Billing OS
                </p>

              </div>

              <div className="text-right">

                <p className="text-xl font-bold tracking-tight">
                  INVOICE
                </p>

                <p className="mt-1 text-[10px] text-black/45">
                  {getInvoiceNumber(
                    invoice
                  )}
                </p>

              </div>

            </div>


            {/* CUSTOMER + DATES */}

            <div className="mt-6 grid grid-cols-2 gap-6">

              <div>

                <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-black/40">
                  Bill To
                </p>

                <p className="mt-2 text-sm font-bold">
                  {getCustomerName(
                    invoice
                  )}
                </p>

                {invoice.customer_email && (
                  <p className="mt-1 text-[10px] text-black/50">
                    {invoice.customer_email}
                  </p>
                )}

                {invoice.customer_address && (
                  <p className="mt-1 text-[10px] leading-4 text-black/50">
                    {invoice.customer_address}
                  </p>
                )}

              </div>

              <div className="text-right">

                <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-black/40">
                  Invoice Date
                </p>

                <p className="mt-2 text-xs font-semibold">
                  {formatLongDate(
                    invoice.created_at
                  )}
                </p>

                <p className="mt-4 text-[8px] font-bold uppercase tracking-[0.18em] text-black/40">
                  Due Date
                </p>

                <p className="mt-2 text-xs font-semibold">
                  {formatLongDate(
                    invoice.due_date
                  )}
                </p>

              </div>

            </div>


            {/* STATUS */}

            <div className="mt-6 flex items-center justify-between rounded-lg bg-black/[0.035] px-4 py-3">

              <div className="flex items-center gap-2">

                <CheckCircle2
                  size={15}
                  className={
                    status === "paid"
                      ? "text-emerald-600"
                      : "text-[#B8913F]"
                  }
                />

                <span className="text-[9px] font-bold uppercase tracking-[0.12em]">
                  Payment Status
                </span>

              </div>

              <span
                className={`text-[10px] font-bold uppercase ${
                  status === "paid"
                    ? "text-emerald-600"
                    : status === "failed" ||
                        status ===
                          "overdue"
                      ? "text-red-600"
                      : "text-[#A27D34]"
                }`}
              >
                {status}
              </span>

            </div>


            {/* ITEMS */}

            <div className="mt-6">

              <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-black/10 pb-3 text-[8px] font-bold uppercase tracking-[0.12em] text-black/40">

                <span>
                  Description
                </span>

                <span>
                  Qty
                </span>

                <span>
                  Amount
                </span>

              </div>

              <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-black/10 py-4">

                <div>

                  <p className="text-xs font-bold">
                    {getPlanName(
                      invoice
                    )}
                  </p>

                  <p className="mt-1 text-[9px] text-black/45">
                    {getBillingCycle(
                      invoice
                    )}
                  </p>

                </div>

                <p className="text-xs">
                  1
                </p>

                <p className="text-xs font-semibold">
                  {formatMoney(
                    subtotal,
                    currency
                  )}
                </p>

              </div>

            </div>


            {/* TOTAL */}

            <div className="mt-5 ml-auto w-full max-w-[250px]">

              <div className="flex justify-between py-1.5 text-[10px] text-black/55">

                <span>
                  Subtotal
                </span>

                <span>
                  {formatMoney(
                    subtotal,
                    currency
                  )}
                </span>

              </div>

              <div className="flex justify-between py-1.5 text-[10px] text-black/55">

                <span>
                  Tax
                </span>

                <span>
                  {formatMoney(
                    tax,
                    currency
                  )}
                </span>

              </div>

              <div className="mt-2 flex items-center justify-between border-t-2 border-black pt-3">

                <span className="text-xs font-bold">
                  Total
                </span>

                <span className="text-base font-black">
                  {formatMoney(
                    total,
                    currency
                  )}
                </span>

              </div>

            </div>


            {/* PAYMENT INFO */}

            <div className="mt-7 border-t border-black/10 pt-5">

              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-black/40">
                Payment Information
              </p>

              <div className="mt-3 grid grid-cols-2 gap-4">

                <InvoicePreviewField
                  label="Payment Method"
                  value={
                    invoice.payment_method ||
                    "BillSphere Payment"
                  }
                />

                <InvoicePreviewField
                  label="Transaction ID"
                  value={
                    invoice.transaction_id ||
                    "Recorded with invoice"
                  }
                />

              </div>

            </div>


            {/* FOOTER */}

            <div className="mt-8 border-t border-black/10 pt-5 text-center">

              <p className="text-[10px] font-semibold">
                Thank you for choosing BillSphere.
              </p>

              <p className="mt-1 text-[8px] text-black/40">
                This is a computer-generated invoice.
              </p>

            </div>

          </div>

        </div>


        {/* ACTIONS */}

        <div className="flex gap-3 border-t border-white/[0.07] px-5 py-4 sm:px-6">

          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/[0.08] py-3 text-xs font-medium text-white/50 transition hover:bg-white/[0.03] hover:text-white"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onDownload}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#D6B36A] py-3 text-xs font-semibold text-black transition hover:bg-[#E7CB8B]"
          >
            <Download size={15} />
            Download Invoice
          </button>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   INVOICE PREVIEW FIELD
========================================================= */

function InvoicePreviewField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-black/35">
        {label}
      </p>

      <p className="mt-1 break-all text-[10px] font-medium text-black/70">
        {value}
      </p>

    </div>
  );
}


/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status.toLowerCase();

  let classes =
    "border-white/10 bg-white/5 text-white/45";

  if (normalized === "paid") {
    classes =
      "border-emerald-400/15 bg-emerald-400/5 text-emerald-300";
  }

  if (normalized === "pending") {
    classes =
      "border-[#D6B36A]/20 bg-[#D6B36A]/5 text-[#E7CB8B]";
  }

  if (
    normalized === "failed" ||
    normalized === "overdue"
  ) {
    classes =
      "border-red-400/15 bg-red-400/5 text-red-300";
  }

  if (normalized === "void") {
    classes =
      "border-white/10 bg-white/5 text-white/35";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${classes}`}
    >

      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {status}

    </span>
  );
}


/* =========================================================
   PAGE SIZE
========================================================= */

function PageSizeSelect() {
  return (
    <div className="relative">

      <select
        defaultValue="5"
        className="h-8 appearance-none rounded-lg border border-white/[0.06] bg-[#0D0D0D] px-3 pr-7 text-[10px] text-white/40 outline-none"
      >

        <option value="5">
          5 / page
        </option>

        <option value="10">
          10 / page
        </option>

        <option value="25">
          25 / page
        </option>

        <option value="50">
          50 / page
        </option>

      </select>

      <ChevronDown
        size={11}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/20"
      />

    </div>
  );
}


export default Invoices;