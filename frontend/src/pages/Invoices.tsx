import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Search,
  X,
} from "lucide-react";

function Invoices() {
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [search, setSearch] = useState("");

  /*
   * IMPORTANT
   * --------------------------------------------------------
   * No fake invoice data is used here.
   *
   * Real invoices will be connected to the backend later.
   * Until then, the table shows an empty state.
   */

  const invoices: any[] = [];

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
              View your billing history, payment status, tax details
              and downloadable invoices.
            </p>

          </div>

        </div>

      </section>


      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <section className="grid gap-4 md:grid-cols-3">

        {/* TOTAL INVOICES */}

        <SummaryCard
          label="Total Invoices"
          value="—"
          description="Your complete billing history"
          icon={<FileText size={18} />}
        />

        {/* PAID */}

        <SummaryCard
          label="Paid"
          value="—"
          description="Paid invoices will appear here"
          icon={<FileText size={18} />}
          positive
        />

        {/* OUTSTANDING */}

        <SummaryCard
          label="Outstanding"
          value="—"
          description="No invoice data available yet"
          icon={<FileText size={18} />}
        />

      </section>


      {/* =====================================================
          INVOICE HISTORY
      ===================================================== */}

      <section className="mt-7">

        {/* SECTION HEADER */}

        <div className="mb-4">

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D6B36A]/70">
            Invoice History
          </p>

          <h2 className="mt-1 text-lg font-semibold text-white">
            Your invoices
          </h2>

          <p className="mt-1 text-xs text-white/35">
            View your invoices, payment status and billing details.
          </p>

        </div>


        {/* ===================================================
            FILTER PANEL
        =================================================== */}

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

            {/* SEARCH */}

            <div className="relative w-full xl:max-w-[300px]">

              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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


            {/* FILTERS */}

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

          {/* TABLE HEADER */}

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


          {/* =================================================
              EMPTY STATE

              No fake invoices.
          ================================================= */}

          {invoices.length === 0 ? (

            <EmptyInvoiceState />

          ) : (

            <div className="divide-y divide-white/[0.06]">

              {invoices.map((invoice) => (

                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                />

              ))}

            </div>

          )}

        </div>


        {/* ===================================================
            PAGINATION
        =================================================== */}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <p className="text-[11px] text-white/30">
              {invoices.length} results
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
        onChange={(e) => onChange(e.target.value)}
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
   EMPTY INVOICE STATE
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
        Your invoices will appear here once billing activity
        generates an invoice for your account.
      </p>

    </div>
  );
}


/* =========================================================
   INVOICE ROW
========================================================= */

function InvoiceRow({
  invoice,
}: {
  invoice: any;
}) {
  return (
    <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] lg:items-center">

      <div>

        <p className="text-xs font-semibold text-white">
          {invoice.invoice_number}
        </p>

        <p className="mt-1 text-[10px] text-white/30">
          {invoice.description || "Subscription"}
        </p>

      </div>

      <div className="text-xs text-white/45">
        {invoice.issue_date}
      </div>

      <div className="text-sm font-semibold text-white">
        {invoice.amount}
      </div>

      <div>
        <StatusBadge status={invoice.status} />
      </div>

      <div className="text-xs text-white/45">
        {invoice.due_date}
      </div>

      <div className="flex justify-start lg:justify-end">

        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] px-3 py-2 text-[10px] font-medium text-white/45 transition hover:border-[#D6B36A]/20 hover:text-[#D6B36A]"
        >
          <Download size={13} />
          Download
        </button>

      </div>

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
  const normalized = status.toLowerCase();

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
        <option value="5">5 / page</option>
        <option value="10">10 / page</option>
        <option value="25">25 / page</option>
        <option value="50">50 / page</option>
      </select>

      <ChevronDown
        size={11}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/20"
      />

    </div>
  );
}


export default Invoices;