import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Eye,
  FileText,
  Search,
  X,
  XCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import "./PaymentHistory.css";

type PaymentStatus =
  | "Successful"
  | "Pending"
  | "Failed"
  | "Refunded";

type StatusFilter = "All" | PaymentStatus;

interface PaymentRecord {
  id: string;
  planName: string;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  transactionId: string;
  status: PaymentStatus;
  billingCycle: string;
}

const samplePayments: PaymentRecord[] = [
  {
    id: "BS-PAY-10001",
    planName: "Premium",
    amount: 4999,
    currency: "INR",
    paymentDate: "20 Aug 2026",
    paymentMethod: "Mock Payment",
    transactionId: "TXN-BS-8F29A1",
    status: "Successful",
    billingCycle: "Monthly",
  },
  {
    id: "BS-PAY-10000",
    planName: "Standard",
    amount: 1499,
    currency: "INR",
    paymentDate: "20 Jul 2026",
    paymentMethod: "Mock Payment",
    transactionId: "TXN-BS-71C82B",
    status: "Successful",
    billingCycle: "Monthly",
  },
];

function PaymentHistory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");

  const [selectedPayment, setSelectedPayment] =
    useState<PaymentRecord | null>(null);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return samplePayments.filter((payment) => {
      const matchesSearch =
        !query ||
        payment.planName.toLowerCase().includes(query) ||
        payment.transactionId.toLowerCase().includes(query) ||
        payment.id.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        payment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const totalPayments = samplePayments.length;

  const pendingPayments = samplePayments.filter(
    (payment) => payment.status === "Pending"
  ).length;

  const failedPayments = samplePayments.filter(
    (payment) => payment.status === "Failed"
  ).length;

  const totalPaid = samplePayments
    .filter((payment) => payment.status === "Successful")
    .reduce((total, payment) => total + payment.amount, 0);

  const formatCurrency = (
    amount: number,
    currency: string
  ) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  /* =====================================================
     REAL PROFESSIONAL PAYMENT RECEIPT PDF
  ===================================================== */

  const downloadReceipt = (payment: PaymentRecord) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const left = 18;
    const right = pageWidth - 18;
    const contentWidth = right - left;

    const gold = {
      r: 190,
      g: 150,
      b: 65,
    };

    const black = {
      r: 20,
      g: 20,
      b: 20,
    };

    const darkGrey = {
      r: 65,
      g: 65,
      b: 65,
    };

    const grey = {
      r: 105,
      g: 105,
      b: 105,
    };

    const lightGrey = {
      r: 232,
      g: 232,
      b: 232,
    };

    const veryLightGrey = {
      r: 248,
      g: 248,
      b: 248,
    };

    /* =====================================================
       WHITE PAPER
    ===================================================== */

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    /* =====================================================
       TOP BRAND ACCENT
    ===================================================== */

    doc.setFillColor(
      gold.r,
      gold.g,
      gold.b
    );

    doc.rect(0, 0, pageWidth, 3, "F");

    /* =====================================================
       HEADER
    ===================================================== */

    doc.setTextColor(
      black.r,
      black.g,
      black.b
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(21);

    doc.text("BILLSPHERE", left, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    doc.setTextColor(
      grey.r,
      grey.g,
      grey.b
    );

    doc.text(
      "Billing OS",
      left,
      28
    );

    /* =====================================================
       RECEIPT TITLE
    ===================================================== */

    doc.setTextColor(
      black.r,
      black.g,
      black.b
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);

    doc.text(
      "PAYMENT RECEIPT",
      right,
      21,
      {
        align: "right",
      }
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    doc.setTextColor(
      grey.r,
      grey.g,
      grey.b
    );

    doc.text(
      "OFFICIAL PAYMENT RECORD",
      right,
      27,
      {
        align: "right",
      }
    );

    /* =====================================================
       HEADER DIVIDER
    ===================================================== */

    doc.setDrawColor(
      gold.r,
      gold.g,
      gold.b
    );

    doc.setLineWidth(0.6);

    doc.line(
      left,
      35,
      right,
      35
    );

    /* =====================================================
       RECEIPT META
    ===================================================== */

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    doc.setTextColor(
      grey.r,
      grey.g,
      grey.b
    );

    doc.text(
      "Receipt Number",
      left,
      45
    );

    doc.text(
      "Payment Date",
      right - 60,
      45
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);

    doc.setTextColor(
      black.r,
      black.g,
      black.b
    );

    doc.text(
      payment.id,
      left,
      51
    );

    doc.text(
      payment.paymentDate,
      right,
      51,
      {
        align: "right",
      }
    );

    /* =====================================================
       SUCCESS STATUS
    ===================================================== */

    let statusText = payment.status;

    if (payment.status === "Successful") {
      statusText = "PAYMENT SUCCESSFUL";
    }

    doc.setFillColor(
      payment.status === "Successful"
        ? 230
        : 245,
      payment.status === "Successful"
        ? 247
        : 240,
      payment.status === "Successful"
        ? 235
        : 220
    );

    doc.roundedRect(
      left,
      60,
      48,
      9,
      2,
      2,
      "F"
    );

    doc.setTextColor(
      payment.status === "Successful"
        ? 25
        : 120,
      payment.status === "Successful"
        ? 110
        : 90,
      payment.status === "Successful"
        ? 65
        : 30
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);

    doc.text(
      payment.status === "Successful"
        ? "✓  PAYMENT SUCCESSFUL"
        : statusText.toUpperCase(),
      left + 4,
      66
    );

    /* =====================================================
       AMOUNT PAID
    ===================================================== */

    doc.setTextColor(
      grey.r,
      grey.g,
      grey.b
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    doc.text(
      "TOTAL AMOUNT PAID",
      right,
      62,
      {
        align: "right",
      }
    );

    doc.setTextColor(
      black.r,
      black.g,
      black.b
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);

    doc.text(
      formatCurrency(
        payment.amount,
        payment.currency
      ),
      right,
      70,
      {
        align: "right",
      }
    );

    /* =====================================================
       CUSTOMER INFORMATION
    ===================================================== */

    let y = 86;

    doc.setTextColor(
      gold.r,
      gold.g,
      gold.b
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);

    doc.text(
      "CUSTOMER INFORMATION",
      left,
      y
    );

    doc.setDrawColor(
      lightGrey.r,
      lightGrey.g,
      lightGrey.b
    );

    doc.setLineWidth(0.3);

    doc.line(
      left,
      y + 4,
      right,
      y + 4
    );

    y += 14;

    doc.setTextColor(
      grey.r,
      grey.g,
      grey.b
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    doc.text(
      "CUSTOMER NAME",
      left,
      y
    );

    doc.text(
      "ACCOUNT TYPE",
      right - 65,
      y
    );

    y += 6;

    doc.setTextColor(
      black.r,
      black.g,
      black.b
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    doc.text(
      "Sravanthi",
      left,
      y
    );

    doc.text(
      "BillSphere Customer",
      right,
      y,
      {
        align: "right",
      }
    );

    /* =====================================================
       PAYMENT DETAILS
    ===================================================== */

    y += 20;

    doc.setTextColor(
      gold.r,
      gold.g,
      gold.b
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);

    doc.text(
      "PAYMENT DETAILS",
      left,
      y
    );

    doc.setDrawColor(
      lightGrey.r,
      lightGrey.g,
      lightGrey.b
    );

    doc.line(
      left,
      y + 4,
      right,
      y + 4
    );

    /* =====================================================
       DETAILS TABLE
    ===================================================== */

    y += 13;

    const tableTop = y;
    const rowHeight = 14;

    doc.setFillColor(
      veryLightGrey.r,
      veryLightGrey.g,
      veryLightGrey.b
    );

    doc.rect(
      left,
      tableTop,
      contentWidth,
      rowHeight,
      "F"
    );

    doc.setFillColor(255, 255, 255);

    doc.rect(
      left,
      tableTop + rowHeight,
      contentWidth,
      rowHeight,
      "F"
    );

    doc.setFillColor(
      veryLightGrey.r,
      veryLightGrey.g,
      veryLightGrey.b
    );

    doc.rect(
      left,
      tableTop + rowHeight * 2,
      contentWidth,
      rowHeight,
      "F"
    );

    doc.setDrawColor(
      lightGrey.r,
      lightGrey.g,
      lightGrey.b
    );

    doc.setLineWidth(0.25);

    doc.rect(
      left,
      tableTop,
      contentWidth,
      rowHeight * 3
    );

    doc.line(
      left,
      tableTop + rowHeight,
      right,
      tableTop + rowHeight
    );

    doc.line(
      left,
      tableTop + rowHeight * 2,
      right,
      tableTop + rowHeight * 2
    );

    const columnOne = left + 5;
    const columnTwo = left + 55;
    const columnThree = left + 110;

    const drawTableLabel = (
      label: string,
      x: number,
      rowY: number
    ) => {
      doc.setTextColor(
        grey.r,
        grey.g,
        grey.b
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(7);

      doc.text(
        label.toUpperCase(),
        x,
        rowY
      );
    };

    const drawTableValue = (
      value: string,
      x: number,
      rowY: number
    ) => {
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
        value,
        x,
        rowY + 7
      );
    };

    drawTableLabel(
      "Plan",
      columnOne,
      tableTop + 5
    );

    drawTableLabel(
      "Billing Cycle",
      columnTwo,
      tableTop + 5
    );

    drawTableLabel(
      "Payment Method",
      columnThree,
      tableTop + 5
    );

    drawTableValue(
      payment.planName,
      columnOne,
      tableTop + 5
    );

    drawTableValue(
      payment.billingCycle,
      columnTwo,
      tableTop + 5
    );

    drawTableValue(
      payment.paymentMethod,
      columnThree,
      tableTop + 5
    );

    drawTableLabel(
      "Transaction ID",
      columnOne,
      tableTop + rowHeight + 5
    );

    drawTableLabel(
      "Payment ID",
      columnTwo,
      tableTop + rowHeight + 5
    );

    drawTableLabel(
      "Currency",
      columnThree,
      tableTop + rowHeight + 5
    );

    drawTableValue(
      payment.transactionId,
      columnOne,
      tableTop + rowHeight + 5
    );

    drawTableValue(
      payment.id,
      columnTwo,
      tableTop + rowHeight + 5
    );

    drawTableValue(
      payment.currency,
      columnThree,
      tableTop + rowHeight + 5
    );

    drawTableLabel(
      "Payment Status",
      columnOne,
      tableTop + rowHeight * 2 + 5
    );

    drawTableLabel(
      "Amount",
      columnTwo,
      tableTop + rowHeight * 2 + 5
    );

    drawTableLabel(
      "Record Type",
      columnThree,
      tableTop + rowHeight * 2 + 5
    );

    drawTableValue(
      payment.status,
      columnOne,
      tableTop + rowHeight * 2 + 5
    );

    drawTableValue(
      formatCurrency(
        payment.amount,
        payment.currency
      ),
      columnTwo,
      tableTop + rowHeight * 2 + 5
    );

    drawTableValue(
      "Subscription Payment",
      columnThree,
      tableTop + rowHeight * 2 + 5
    );

    /* =====================================================
       AMOUNT SUMMARY
    ===================================================== */

    y = tableTop + rowHeight * 3 + 20;

    const summaryWidth = 78;
    const summaryX = right - summaryWidth;

    doc.setTextColor(
      grey.r,
      grey.g,
      grey.b
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(8);

    doc.text(
      "Payment Amount",
      summaryX,
      y
    );

    doc.setTextColor(
      black.r,
      black.g,
      black.b
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      formatCurrency(
        payment.amount,
        payment.currency
      ),
      right,
      y,
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
      summaryX,
      y + 4,
      right,
      y + 4
    );

    y += 11;

    doc.setTextColor(
      black.r,
      black.g,
      black.b
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(11);

    doc.text(
      "TOTAL PAID",
      summaryX,
      y
    );

    doc.setTextColor(
      gold.r,
      gold.g,
      gold.b
    );

    doc.setFontSize(14);

    doc.text(
      formatCurrency(
        payment.amount,
        payment.currency
      ),
      right,
      y,
      {
        align: "right",
      }
    );

    /* =====================================================
       CONFIRMATION BOX
    ===================================================== */

    y += 22;

    doc.setFillColor(
      248,
      250,
      248
    );

    doc.roundedRect(
      left,
      y,
      contentWidth,
      27,
      2,
      2,
      "F"
    );

    doc.setDrawColor(
      210,
      225,
      215
    );

    doc.roundedRect(
      left,
      y,
      contentWidth,
      27,
      2,
      2
    );

    doc.setTextColor(
      40,
      100,
      65
    );

    doc.setFont(
      "helvetica",
      "bold"
    );

    doc.setFontSize(9);

    doc.text(
      payment.status === "Successful"
        ? "Payment successfully received"
        : `Payment status: ${payment.status}`,
      left + 7,
      y + 9
    );

    doc.setTextColor(
      grey.r,
      grey.g,
      grey.b
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7.5);

    const confirmation =
      payment.status === "Successful"
        ? "This receipt confirms that the payment shown above was successfully processed and recorded."
        : "This document records the payment status shown above.";

    const confirmationLines =
      doc.splitTextToSize(
        confirmation,
        contentWidth - 14
      );

    doc.text(
      confirmationLines,
      left + 7,
      y + 16
    );

    /* =====================================================
       FOOTER
    ===================================================== */

    const footerY = pageHeight - 25;

    doc.setDrawColor(
      lightGrey.r,
      lightGrey.g,
      lightGrey.b
    );

    doc.line(
      left,
      footerY - 8,
      right,
      footerY - 8
    );

    doc.setTextColor(
      grey.r,
      grey.g,
      grey.b
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.setFontSize(7);

    doc.text(
      "Thank you for choosing BillSphere.",
      left,
      footerY
    );

    doc.text(
      "This is a computer-generated payment receipt.",
      left,
      footerY + 5
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
      "BILLSPHERE",
      right,
      footerY,
      {
        align: "right",
      }
    );

    doc.setTextColor(
      grey.r,
      grey.g,
      grey.b
    );

    doc.setFont(
      "helvetica",
      "normal"
    );

    doc.text(
      "Billing OS",
      right,
      footerY + 5,
      {
        align: "right",
      }
    );

    /* =====================================================
       FILE NAME
    ===================================================== */

    const customerName = "Sravanthi"
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "_");

    const planName = payment.planName
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "_");

    const fileName =
      `${customerName}_BillSphere_${planName}_Payment_Receipt.pdf`;

    doc.save(fileName);
  };

  const statusIcon = (
    status: PaymentStatus
  ) => {
    if (status === "Successful") {
      return <CheckCircle2 size={15} />;
    }

    if (status === "Pending") {
      return <Clock3 size={15} />;
    }

    if (status === "Failed") {
      return <XCircle size={15} />;
    }

    return <FileText size={15} />;
  };

  const statusClass = (
    status: PaymentStatus
  ) => {
    if (status === "Successful") {
      return "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300";
    }

    if (status === "Pending") {
      return "border-amber-400/15 bg-amber-400/[0.07] text-amber-300";
    }

    if (status === "Failed") {
      return "border-red-400/15 bg-red-400/[0.07] text-red-300";
    }

    return "border-white/10 bg-white/[0.04] text-white/50";
  };

  return (
    <div className="min-h-[calc(100vh-72px)] text-white">

      {/* HEADER */}

      <div className="mb-7">

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">

          <div>

            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#D6B36A]">
              <CreditCard size={13} />
              Payments
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Payment History
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
              View your complete payment history, transaction
              details, subscription payments, and payment
              status in one place.
            </p>

          </div>

          <div className="flex items-center gap-2 text-xs text-white/35">
            <CalendarDays size={14} />
            <span>All payment activity</span>
          </div>

        </div>

      </div>

      {/* SUMMARY */}

      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
          title="Total Payments"
          value={String(totalPayments)}
          subtitle="All transactions"
          icon={<CreditCard size={18} />}
          iconClass="text-[#D6B36A]"
        />

        <SummaryCard
          title="Total Paid"
          value={formatCurrency(totalPaid, "INR")}
          subtitle="Successful payments"
          icon={<CheckCircle2 size={18} />}
          iconClass="text-emerald-300"
        />

        <SummaryCard
          title="Pending"
          value={String(pendingPayments)}
          subtitle="Awaiting confirmation"
          icon={<Clock3 size={18} />}
          iconClass="text-amber-300"
        />

        <SummaryCard
          title="Failed"
          value={String(failedPayments)}
          subtitle="Unsuccessful payments"
          icon={<XCircle size={18} />}
          iconClass="text-red-300"
        />

      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0D0D0D]">

        <div className="border-b border-white/[0.06] p-5">

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

            <div>

              <h2 className="text-sm font-semibold text-white">
                Payment Transactions
              </h2>

              <p className="mt-1 text-xs text-white/30">
                Your subscription payment records
              </p>

            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              <div className="relative">

                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search plan or transaction..."
                  className="h-10 w-full rounded-xl border border-white/[0.08] bg-black/30 pl-9 pr-4 text-xs text-white outline-none placeholder:text-white/20 transition focus:border-[#D6B36A]/30 sm:w-[250px]"
                />

              </div>

              <div className="relative">

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as StatusFilter
                    )
                  }
                  className="h-10 appearance-none rounded-xl border border-white/[0.08] bg-black/30 pl-3 pr-9 text-xs text-white/60 outline-none focus:border-[#D6B36A]/30"
                >

                  <option value="All">
                    All Status
                  </option>

                  <option value="Successful">
                    Successful
                  </option>

                  <option value="Pending">
                    Pending
                  </option>

                  <option value="Failed">
                    Failed
                  </option>

                  <option value="Refunded">
                    Refunded
                  </option>

                </select>

                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/25"
                />

              </div>

            </div>

          </div>

        </div>

        <div className="hidden overflow-x-auto lg:block">

          <table className="w-full">

            <thead>

              <tr className="border-b border-white/[0.05] text-left">

                <TableHeader>
                  Plan
                </TableHeader>

                <TableHeader>
                  Amount
                </TableHeader>

                <TableHeader>
                  Date
                </TableHeader>

                <TableHeader>
                  Transaction ID
                </TableHeader>

                <TableHeader>
                  Status
                </TableHeader>

                <TableHeader right>
                  Receipt
                </TableHeader>

              </tr>

            </thead>

            <tbody>

              {filteredPayments.length === 0 ? (

                <tr>

                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center"
                  >

                    <CreditCard
                      size={24}
                      className="mx-auto text-white/20"
                    />

                    <p className="mt-3 text-sm text-white/50">
                      No payments found
                    </p>

                  </td>

                </tr>

              ) : (

                filteredPayments.map((payment) => (

                  <tr
                    key={payment.id}
                    className="border-b border-white/[0.04] transition hover:bg-white/[0.018]"
                  >

                    <td className="px-5 py-5">

                      <div className="flex items-center gap-3">

                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D6B36A]/15 bg-[#D6B36A]/[0.06]">

                          <FileText
                            size={17}
                            className="text-[#D6B36A]"
                          />

                        </div>

                        <div>

                          <p className="text-sm font-medium text-white">
                            {payment.planName}
                          </p>

                          <p className="mt-1 text-[10px] text-white/25">
                            {payment.billingCycle}
                          </p>

                        </div>

                      </div>

                    </td>

                    <td className="px-5 py-5">

                      <p className="text-sm font-semibold text-white">
                        {formatCurrency(
                          payment.amount,
                          payment.currency
                        )}
                      </p>

                      <p className="mt-1 text-[10px] text-white/25">
                        {payment.paymentMethod}
                      </p>

                    </td>

                    <td className="px-5 py-5">

                      <p className="text-xs text-white/65">
                        {payment.paymentDate}
                      </p>

                    </td>

                    <td className="px-5 py-5">

                      <p className="font-mono text-[10px] text-white/40">
                        {payment.transactionId}
                      </p>

                    </td>

                    <td className="px-5 py-5">

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-medium ${statusClass(
                          payment.status
                        )}`}
                      >

                        {statusIcon(payment.status)}

                        {payment.status}

                      </span>

                    </td>

                    <td className="px-5 py-5">

                      <div className="flex justify-end gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPayment(payment)
                          }
                          className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[10px] font-medium text-white/55 transition hover:border-[#D6B36A]/20 hover:bg-[#D6B36A]/[0.05] hover:text-[#E7CB8B]"
                        >

                          <Eye size={14} />

                          View

                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            downloadReceipt(payment)
                          }
                          className="rounded-lg border border-[#D6B36A]/15 bg-[#D6B36A]/[0.06] p-2 text-[#D6B36A] transition hover:bg-[#D6B36A]/10"
                          title="Download receipt"
                        >

                          <ArrowDownToLine size={14} />

                        </button>

                      </div>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

        {/* MOBILE */}

        <div className="divide-y divide-white/[0.05] lg:hidden">

          {filteredPayments.map((payment) => (

            <div
              key={payment.id}
              className="p-5"
            >

              <div className="flex items-start justify-between gap-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D6B36A]/15 bg-[#D6B36A]/[0.06]">

                    <FileText
                      size={17}
                      className="text-[#D6B36A]"
                    />

                  </div>

                  <div>

                    <p className="text-sm font-medium text-white">
                      {payment.planName}
                    </p>

                    <p className="mt-1 text-[10px] text-white/30">
                      {payment.paymentDate}
                    </p>

                  </div>

                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] ${statusClass(
                    payment.status
                  )}`}
                >

                  {statusIcon(payment.status)}

                  {payment.status}

                </span>

              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">

                <div>

                  <p className="text-[9px] uppercase tracking-wider text-white/20">
                    Amount
                  </p>

                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatCurrency(
                      payment.amount,
                      payment.currency
                    )}
                  </p>

                </div>

                <div>

                  <p className="text-[9px] uppercase tracking-wider text-white/20">
                    Transaction
                  </p>

                  <p className="mt-1 truncate font-mono text-[10px] text-white/40">
                    {payment.transactionId}
                  </p>

                </div>

              </div>

              <div className="mt-5 flex gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setSelectedPayment(payment)
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] py-2.5 text-xs text-white/55"
                >

                  <Eye size={14} />

                  View Receipt

                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadReceipt(payment)
                  }
                  className="flex items-center justify-center rounded-xl border border-[#D6B36A]/15 bg-[#D6B36A]/[0.06] px-4 text-[#D6B36A]"
                >

                  <ArrowDownToLine size={15} />

                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

      {/* RECEIPT MODAL */}

      {selectedPayment && (

        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">

          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#101010] shadow-2xl">

            <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">

              <div>

                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#D6B36A]">
                  BillSphere
                </p>

                <h3 className="mt-1 text-lg font-semibold text-white">
                  Payment Receipt
                </h3>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedPayment(null)
                }
                className="rounded-lg p-2 text-white/30 transition hover:bg-white/5 hover:text-white"
              >

                <X size={18} />

              </button>

            </div>

            <div className="p-6">

              <div className="rounded-2xl border border-[#D6B36A]/15 bg-[#D6B36A]/[0.025] p-5">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-[10px] font-bold tracking-[0.2em] text-white">
                      BILLSPHERE
                    </p>

                    <p className="mt-1 text-[8px] uppercase tracking-[0.22em] text-white/25">
                      Billing OS
                    </p>

                  </div>

                  <CheckCircle2
                    size={25}
                    className="text-emerald-300"
                  />

                </div>

                <div className="my-5 h-px bg-white/[0.07]" />

                <div className="grid grid-cols-2 gap-5">

                  <ReceiptField
                    label="Plan"
                    value={selectedPayment.planName}
                  />

                  <ReceiptField
                    label="Amount"
                    value={formatCurrency(
                      selectedPayment.amount,
                      selectedPayment.currency
                    )}
                  />

                  <ReceiptField
                    label="Payment Date"
                    value={selectedPayment.paymentDate}
                  />

                  <ReceiptField
                    label="Billing Cycle"
                    value={selectedPayment.billingCycle}
                  />

                  <ReceiptField
                    label="Payment Method"
                    value={selectedPayment.paymentMethod}
                  />

                  <ReceiptField
                    label="Status"
                    value={selectedPayment.status}
                  />

                </div>

                <div className="my-5 h-px bg-white/[0.07]" />

                <ReceiptField
                  label="Transaction ID"
                  value={selectedPayment.transactionId}
                />

                <div className="mt-6 flex items-end justify-between">

                  <div>

                    <p className="text-[9px] text-white/20">
                      Authorized by
                    </p>

                    <p className="mt-1 text-xs font-medium text-white/60">
                      BillSphere Controller
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="font-serif text-lg italic text-[#D6B36A]">
                      BillSphere
                    </p>

                    <p className="text-[8px] uppercase tracking-wider text-white/20">
                      Authorized Signature
                    </p>

                  </div>

                </div>

              </div>

            </div>

            <div className="flex gap-3 border-t border-white/[0.07] px-6 py-5">

              <button
                type="button"
                onClick={() =>
                  setSelectedPayment(null)
                }
                className="flex-1 rounded-xl border border-white/[0.08] py-3 text-xs font-medium text-white/50 transition hover:bg-white/[0.03] hover:text-white"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() =>
                  downloadReceipt(selectedPayment)
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#D6B36A] py-3 text-xs font-semibold text-black transition hover:bg-[#E7CB8B]"
              >

                <ArrowDownToLine size={15} />

                Download Receipt

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0D0D0D] p-5">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            {title}
          </p>

          <p className="mt-3 text-2xl font-semibold text-white">
            {value}
          </p>

          <p className="mt-1 text-xs text-white/30">
            {subtitle}
          </p>

        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5">

          <span className={iconClass}>
            {icon}
          </span>

        </div>

      </div>

    </div>
  );
}

/* =========================================================
   TABLE HEADER
========================================================= */

function TableHeader({
  children,
  right = false,
}: {
  children: ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`px-5 py-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25 ${
        right ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}

/* =========================================================
   RECEIPT FIELD
========================================================= */

function ReceiptField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>

      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/20">
        {label}
      </p>

      <p className="mt-1.5 break-words text-xs font-medium text-white/65">
        {value}
      </p>

    </div>
  );
}

export default PaymentHistory;