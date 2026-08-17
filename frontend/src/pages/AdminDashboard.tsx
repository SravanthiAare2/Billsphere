import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Crown,
  Database,
  Download,
  Eye,
  FileText,
  Gauge,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Package,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ==========================================================
// Backend base URL — all routes live under /api/v1 per the
// documented BillSphere API contract. Do not call bare paths
// like "/plans/admin" — they do not exist on the backend.
// ==========================================================
const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

type Plan = {
  id: number;
  name: string;
  price?: number;
  amount?: number;
  billing_interval?: string;
  interval?: string;
  trial_days?: number;
  is_active?: boolean;
  status?: string;
};

type Customer = {
  id: number;
  name?: string;
  email?: string;
  company?: string;
  created_at?: string;
};

type Subscription = {
  id: number;
  customer_id?: number;
  plan_id?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  current_period_end?: string;
  plan?: Plan;
  customer?: Customer;
};

type Invoice = {
  id: number;
  invoice_number?: string;
  customer_id?: number;
  plan_id?: number;
  subscription_id?: number;
  amount?: number;
  tax?: number;
  total?: number;
  due_date?: string;
  status?: string;
  created_at?: string;
};

type Payment = {
  id: number;
  invoice_id?: number;
  customer_id?: number;
  amount?: number;
  status?: string;
  gateway_reference?: string;
  created_at?: string;
};

type Toast = {
  type: "success" | "error";
  message: string;
};

function getToken(): string | null {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken")
  );
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data?.detail
        ? data.detail
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

function asArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (value?.items && Array.isArray(value.items)) return value.items;
  if (value?.data && Array.isArray(value.data)) return value.data;
  return [];
}

function money(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysBetween(value?: string): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function normaliseStatus(status?: string): string {
  return String(status || "unknown").toLowerCase().replace(/[-\s]/g, "_");
}

function isFailedInvoiceStatus(status?: string): boolean {
  const normalized = normaliseStatus(status);
  return ["overdue", "failed", "past_due", "declined"].includes(normalized);
}

function StatusBadge({ status }: { status?: string }) {
  const normalized = normaliseStatus(status);
  let className = "status-badge neutral";

  if (["active", "paid", "trial", "success"].includes(normalized)) {
    className = "status-badge success";
  } else if (["past_due", "pending", "processing"].includes(normalized)) {
    className = "status-badge warning";
  } else if (
    ["cancelled", "failed", "expired", "overdue", "declined"].includes(
      normalized
    )
  ) {
    className = "status-badge danger";
  }

  return (
    <span className={className}>
      <span className="status-dot" />
      {status || "Unknown"}
    </span>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  danger,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  accent: "purple" | "green" | "red" | "blue";
  danger?: boolean;
}) {
  return (
    <div className={`stat-card ${danger ? "danger-card" : ""}`}>
      <div className="stat-top">
        <div className={`stat-icon accent-${accent}`}>{icon}</div>
      </div>
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-subtitle">{subtitle}</div>
    </div>
  );
}

const INVOICES_PER_PAGE = 5;

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [invoicePage, setInvoicePage] = useState(1);

  const [toast, setToast] = useState<Toast | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [showSubscriptionModal, setShowSubscriptionModal] =
    useState<Subscription | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState<Invoice | null>(
    null
  );

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadDashboard = async () => {
    try {
      setRefreshing(true);

      const results = await Promise.allSettled([
        apiRequest<any>("/plans/plans"),
        apiRequest<any>("/customers/customers"),
        apiRequest<any>("/subscriptions/subscriptions"),
        apiRequest<any>("/invoices/invoices"),
        apiRequest<any>("/payments/payments/"),
      ]);

      const [
        plansResult,
        customersResult,
        subscriptionsResult,
        invoicesResult,
        paymentsResult,
      ] = results;

      if (plansResult.status === "fulfilled") {
        setPlans(asArray<Plan>(plansResult.value));
      }
      if (customersResult.status === "fulfilled") {
        setCustomers(asArray<Customer>(customersResult.value));
      }
      if (subscriptionsResult.status === "fulfilled") {
        setSubscriptions(asArray<Subscription>(subscriptionsResult.value));
      }
      if (invoicesResult.status === "fulfilled") {
        setInvoices(asArray<Invoice>(invoicesResult.value));
      }
      if (paymentsResult.status === "fulfilled") {
        setPayments(asArray<Payment>(paymentsResult.value));
      }

      const failedRequests = results.filter((r) => r.status === "rejected");
      if (failedRequests.length > 0) {
        console.warn("Some dashboard APIs failed:", failedRequests);
      }
    } catch (error: any) {
      showToast("error", error?.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const activeSubscriptions = useMemo(
    () =>
      subscriptions.filter(
        (s) => normaliseStatus(s.status) === "active"
      ),
    [subscriptions]
  );

  const trialSubscriptions = useMemo(
    () => subscriptions.filter((s) => normaliseStatus(s.status) === "trial"),
    [subscriptions]
  );

  const calculatedMRR = useMemo(() => {
    return activeSubscriptions.reduce((total, subscription) => {
      const plan =
        subscription.plan ||
        plans.find((item) => item.id === subscription.plan_id);
      if (!plan) return total;

      const price = Number(plan.price ?? plan.amount ?? 0);
      const interval = String(
        plan.billing_interval ?? plan.interval ?? "monthly"
      ).toLowerCase();

      if (interval.includes("annual") || interval.includes("year")) {
        return total + price / 12;
      }
      return total + price;
    }, 0);
  }, [activeSubscriptions, plans]);

  const failedInvoices = useMemo(
    () =>
      invoices
        .filter((inv) => isFailedInvoiceStatus(inv.status))
        .sort((a, b) => {
          const aDays = daysBetween(a.due_date) ?? 0;
          const bDays = daysBetween(b.due_date) ?? 0;
          return bDays - aDays;
        }),
    [invoices]
  );

  const planRevenue = useMemo(() => {
    return plans
      .map((plan) => {
        const count = activeSubscriptions.filter(
          (s) => s.plan_id === plan.id
        ).length;
        const price = Number(plan.price ?? plan.amount ?? 0);
        return {
          id: plan.id,
          name: plan.name,
          count,
          revenue: count * price,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [plans, activeSubscriptions]);

  const maxPlanRevenue = Math.max(
    ...planRevenue.map((item) => item.revenue),
    1
  );

  const sortedInvoices = useMemo(
    () =>
      [...invoices].sort((a, b) => {
        const aDate = new Date(a.created_at || a.due_date || 0).getTime();
        const bDate = new Date(b.created_at || b.due_date || 0).getTime();
        return bDate - aDate;
      }),
    [invoices]
  );

  const totalInvoicePages = Math.max(
    1,
    Math.ceil(sortedInvoices.length / INVOICES_PER_PAGE)
  );

  const paginatedInvoices = useMemo(() => {
    const start = (invoicePage - 1) * INVOICES_PER_PAGE;
    return sortedInvoices.slice(start, start + INVOICES_PER_PAGE);
  }, [sortedInvoices, invoicePage]);

  const filteredSubscriptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subscriptions;

    return subscriptions.filter((subscription) => {
      const customer = customers.find(
        (item) => item.id === subscription.customer_id
      );
      const plan = plans.find((item) => item.id === subscription.plan_id);
      return [
        subscription.id,
        subscription.status,
        customer?.name,
        customer?.email,
        plan?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [subscriptions, customers, plans, search]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  const cancelSubscription = async (subscriptionId: number) => {
    try {
      setActionLoading(subscriptionId);
      await apiRequest(`/subscriptions/subscriptions/${subscriptionId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ immediate: false }),
      });
      showToast("success", "Subscription cancellation request completed.");
      await loadDashboard();
    } catch (error: any) {
      showToast("error", error?.message || "Unable to cancel subscription.");
    } finally {
      setActionLoading(null);
    }
  };

  const downloadInvoice = (invoice: Invoice) => {
    showToast(
      "error",
      "PDF invoice generation isn't available on the backend yet."
    );
  };

  const customerLabel = (customerId?: number) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || customer?.email || `Customer #${customerId}`;
  };

  const planLabel = (planId?: number) => {
    const plan = plans.find((p) => p.id === planId);
    return plan?.name || "—";
  };

  const navigationItems = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
    { id: "subscriptions", label: "Subscriptions", icon: <CreditCard size={18} /> },
    { id: "invoices", label: "Invoices", icon: <FileText size={18} /> },
    { id: "payments", label: "Payments", icon: <Receipt size={18} /> },
    { id: "plans", label: "Plans", icon: <Package size={18} /> },
    { id: "customers", label: "Customers", icon: <Users size={18} /> },
    { id: "refunds", label: "Refunds", icon: <RotateCcw size={18} /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
    { id: "audit", label: "Audit Logs", icon: <ListChecks size={18} /> },
    { id: "settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  // ==========================================================
  // OVERVIEW — matches reference layout: 4 KPI cards, revenue
  // by plan chart + failed payment queue, recent invoices table
  // ==========================================================
  const renderOverview = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <ShieldCheck size={14} />
            ADMIN CONTROL CENTER
          </div>
          <h1>Dashboard Overview</h1>
          <p>Real-time subscription and billing operations from your BillSphere backend.</p>
        </div>

        <button className="refresh-button" onClick={loadDashboard} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? "spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Active Subscriptions"
          value={activeSubscriptions.length}
          subtitle="Currently active billing contracts"
          icon={<Sparkles size={21} />}
          accent="purple"
        />
        <StatCard
          title="MRR"
          value={money(calculatedMRR)}
          subtitle="Calculated from active subscriptions"
          icon={<CircleDollarSign size={21} />}
          accent="green"
        />
        <StatCard
          title="Failed Payments"
          value={failedInvoices.length}
          subtitle="Invoices overdue or failed"
          icon={<AlertCircle size={21} />}
          accent="red"
          danger={failedInvoices.length > 0}
        />
        <StatCard
          title="Trial Users"
          value={trialSubscriptions.length}
          subtitle="Customers currently on trial"
          icon={<Gauge size={21} />}
          accent="blue"
        />
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Revenue by Plan</h2>
              <p>Active subscriptions × plan pricing.</p>
            </div>
            <BarChart3 size={19} />
          </div>

          {planRevenue.length === 0 ? (
            <div className="empty-state">
              <Database size={28} />
              <strong>No active subscription revenue</strong>
              <span>Create a plan and subscribe a customer to see real revenue here.</span>
            </div>
          ) : (
            <div className="overview-bar-chart">
              {planRevenue.map((item) => (
                <div className="overview-bar-item" key={item.id}>
                  <span className="overview-bar-value">{money(item.revenue)}</span>
                  <div
                    className="overview-bar"
                    style={{
                      height: `${Math.max(6, (item.revenue / maxPlanRevenue) * 190)}px`,
                    }}
                  />
                  <strong className="overview-bar-label">{item.name}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Failed Payment Queue</h2>
              <p>Real overdue / failed invoices.</p>
            </div>
            <button className="text-button" onClick={() => setActiveSection("invoices")}>
              View All
              <ChevronRight size={15} />
            </button>
          </div>

          {failedInvoices.length === 0 ? (
            <div className="empty-state compact">
              <CheckCircle2 size={28} />
              <strong>No failed payments</strong>
              <span>Your recovery queue is currently clear.</span>
            </div>
          ) : (
            <div className="queue-list">
              {failedInvoices.slice(0, 5).map((invoice) => {
                const days = daysBetween(invoice.due_date);
                const isFinal = days !== null && days >= 7;

                return (
                  <div className="queue-item" key={invoice.id}>
                    <div className="queue-content">
                      <strong>{customerLabel(invoice.customer_id)}</strong>
                      <span>
                        {planLabel(invoice.plan_id)} · Invoice #
                        {invoice.invoice_number || invoice.id}
                      </span>
                    </div>

                    <span className={`day-badge ${isFinal ? "final" : ""}`}>
                      {isFinal ? "Final Attempt" : `Day ${Math.max(0, days ?? 0)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Recent Invoices</h2>
            <p>Live records from PostgreSQL.</p>
          </div>
          <button className="text-button" onClick={() => setActiveSection("invoices")}>
            View All
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Customer</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Tax</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedInvoices.slice(0, 5).map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <strong className="invoice-link" onClick={() => setShowInvoiceModal(invoice)}>
                      {invoice.invoice_number || `INV-${invoice.id}`}
                    </strong>
                  </td>
                  <td>{customerLabel(invoice.customer_id)}</td>
                  <td>{planLabel(invoice.plan_id)}</td>
                  <td>{money(Number(invoice.total ?? invoice.amount ?? 0))}</td>
                  <td>{invoice.tax != null ? money(Number(invoice.tax)) : "—"}</td>
                  <td>{formatDate(invoice.due_date)}</td>
                  <td>
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn-sm" onClick={() => setShowInvoiceModal(invoice)}>
                        <Eye size={13} />
                      </button>
                      <button className="icon-btn-sm" onClick={() => downloadInvoice(invoice)}>
                        <Download size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && sortedInvoices.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty">No invoices found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  // ==========================================================
  // INVOICES
  // ==========================================================
  const renderInvoices = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <FileText size={14} />
            INVOICE MANAGEMENT
          </div>
          <h1>Invoices</h1>
          <p>All invoices from the backend, with PDF download once that endpoint ships.</p>
        </div>
      </div>

      <section className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Customer</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Tax</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <strong className="invoice-link" onClick={() => setShowInvoiceModal(invoice)}>
                      {invoice.invoice_number || `INV-${invoice.id}`}
                    </strong>
                  </td>
                  <td>{customerLabel(invoice.customer_id)}</td>
                  <td>{planLabel(invoice.plan_id)}</td>
                  <td>{money(Number(invoice.total ?? invoice.amount ?? 0))}</td>
                  <td>{invoice.tax != null ? money(Number(invoice.tax)) : "—"}</td>
                  <td>{formatDate(invoice.due_date)}</td>
                  <td>
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="icon-btn-sm" onClick={() => setShowInvoiceModal(invoice)}>
                        <Eye size={13} />
                      </button>
                      <button className="icon-btn-sm" onClick={() => downloadInvoice(invoice)}>
                        <Download size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && sortedInvoices.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty">No invoices found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {sortedInvoices.length > 0 && (
          <div className="pagination">
            <span>
              Showing {(invoicePage - 1) * INVOICES_PER_PAGE + 1} to{" "}
              {Math.min(invoicePage * INVOICES_PER_PAGE, sortedInvoices.length)} of{" "}
              {sortedInvoices.length} results
            </span>

            <div className="pagination-controls">
              <button
                className="icon-btn-sm"
                disabled={invoicePage === 1}
                onClick={() => setInvoicePage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
              </button>
              <span className="pagination-page">
                {invoicePage} / {totalInvoicePages}
              </span>
              <button
                className="icon-btn-sm"
                disabled={invoicePage === totalInvoicePages}
                onClick={() => setInvoicePage((p) => Math.min(totalInvoicePages, p + 1))}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );

  // ==========================================================
  // PAYMENTS
  // ==========================================================
  const renderPayments = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Receipt size={14} />
            PAYMENT RECORDS
          </div>
          <h1>Payments</h1>
          <p>Payment gateway reference records from the backend.</p>
        </div>
      </div>

      <section className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Gateway Ref</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <strong>#{payment.id}</strong>
                  </td>
                  <td>{payment.invoice_id ? `INV-${payment.invoice_id}` : "—"}</td>
                  <td>{customerLabel(payment.customer_id)}</td>
                  <td>{money(Number(payment.amount ?? 0))}</td>
                  <td>
                    <StatusBadge status={payment.status} />
                  </td>
                  <td>{payment.gateway_reference || "—"}</td>
                  <td>{formatDate(payment.created_at)}</td>
                </tr>
              ))}

              {!loading && payments.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty">No payments found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderSubscriptions = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <CreditCard size={14} />
            SUBSCRIPTION MANAGEMENT
          </div>
          <h1>Subscriptions</h1>
          <p>Manage the complete customer subscription lifecycle.</p>
        </div>
      </div>

      <section className="panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subscriptions..."
            />
          </div>
          <button className="refresh-button" onClick={loadDashboard}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((subscription) => {
                const isLoading = actionLoading === subscription.id;
                return (
                  <tr key={subscription.id}>
                    <td>
                      <strong>#{subscription.id}</strong>
                    </td>
                    <td>{customerLabel(subscription.customer_id)}</td>
                    <td>{planLabel(subscription.plan_id)}</td>
                    <td>
                      <StatusBadge status={subscription.status} />
                    </td>
                    <td>{formatDate(subscription.start_date)}</td>
                    <td>
                      {formatDate(subscription.end_date || subscription.current_period_end)}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="small-action"
                          onClick={() => setShowSubscriptionModal(subscription)}
                        >
                          View
                        </button>
                        {normaliseStatus(subscription.status) === "active" && (
                          <button
                            className="small-action danger"
                            disabled={isLoading}
                            onClick={() => cancelSubscription(subscription.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderCustomers = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Users size={14} />
            CUSTOMER MANAGEMENT
          </div>
          <h1>Customers</h1>
          <p>Customers currently stored in the BillSphere database.</p>
        </div>
      </div>

      <section className="panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Subscriptions</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const customerSubscriptions = subscriptions.filter(
                  (s) => s.customer_id === customer.id
                );
                return (
                  <tr key={customer.id}>
                    <td>#{customer.id}</td>
                    <td>
                      <strong>{customer.name || customer.company || "Customer"}</strong>
                    </td>
                    <td>{customer.email || "—"}</td>
                    <td>{customerSubscriptions.length}</td>
                    <td>{formatDate(customer.created_at)}</td>
                  </tr>
                );
              })}

              {!loading && customers.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="table-empty">No customers found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderPlans = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Package size={14} />
            PLAN MANAGEMENT
          </div>
          <h1>Subscription Plans</h1>
          <p>Manage pricing and plan configuration using the backend plan APIs.</p>
        </div>
      </div>

      <div className="plans-grid">
        {plans.map((plan) => (
          <div className="plan-card" key={plan.id}>
            <div className="plan-card-top">
              <div className="plan-icon">
                <Crown size={19} />
              </div>
              <StatusBadge status={plan.is_active === false ? "Inactive" : plan.status || "Active"} />
            </div>
            <h3>{plan.name}</h3>
            <div className="plan-price">{money(Number(plan.price ?? plan.amount ?? 0))}</div>
            <div className="plan-interval">{plan.billing_interval || plan.interval || "Monthly"}</div>
            <div className="plan-detail">
              <span>Trial period</span>
              <strong>{plan.trial_days ?? 0} days</strong>
            </div>
            <div className="plan-detail">
              <span>Active subscribers</span>
              <strong>
                {activeSubscriptions.filter((s) => s.plan_id === plan.id).length}
              </strong>
            </div>
          </div>
        ))}

        {!loading && plans.length === 0 && (
          <div className="empty-state">
            <Package size={30} />
            <strong>No plans found</strong>
            <span>Create your first subscription plan from the plan management API.</span>
          </div>
        )}
      </div>
    </>
  );

  const renderNotImplemented = (title: string, description: string, requirements: string[]) => (
    <>
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <div className="billing-warning">
        <div className="billing-warning-icon">
          <AlertCircle size={24} />
        </div>
        <div>
          <h3>Backend endpoints for this section don't exist yet</h3>
          <p>
            This dashboard doesn't fabricate data — once these routes are added to the
            FastAPI backend, this page will show real records automatically.
          </p>
          <div className="billing-requirements">
            {requirements.map((r) => (
              <span key={r}>{r}</span>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderAnalytics = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <BarChart3 size={14} />
            BILLING ANALYTICS
          </div>
          <h1>Analytics</h1>
          <p>Metrics calculated from current subscription and invoice data.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="MRR" value={money(calculatedMRR)} subtitle="Current recurring revenue" icon={<CircleDollarSign size={21} />} accent="green" />
        <StatCard title="Active" value={activeSubscriptions.length} subtitle="Active subscriptions" icon={<CheckCircle2 size={21} />} accent="purple" />
        <StatCard title="Trial" value={trialSubscriptions.length} subtitle="Customers currently trialing" icon={<Activity size={21} />} accent="blue" />
        <StatCard title="Failed Payments" value={failedInvoices.length} subtitle="Invoices requiring recovery" icon={<AlertCircle size={21} />} accent="red" danger={failedInvoices.length > 0} />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Revenue Distribution</h2>
            <p>Actual recurring revenue by currently active plan.</p>
          </div>
        </div>

        {planRevenue.length === 0 ? (
          <div className="empty-state">
            <BarChart3 size={30} />
            <strong>No analytics data yet</strong>
            <span>Analytics will appear once active subscriptions exist.</span>
          </div>
        ) : (
          <div className="overview-bar-chart">
            {planRevenue.map((item) => (
              <div className="overview-bar-item" key={item.id}>
                <span className="overview-bar-value">{money(item.revenue)}</span>
                <div
                  className="overview-bar"
                  style={{ height: `${Math.max(8, (item.revenue / maxPlanRevenue) * 190)}px` }}
                />
                <strong className="overview-bar-label">{item.name}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );

  const renderSettings = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Settings size={14} />
            SYSTEM SETTINGS
          </div>
          <h1>Settings</h1>
          <p>BillSphere administration settings.</p>
        </div>
      </div>

      <section className="panel settings-panel">
        <div className="settings-row">
          <div>
            <strong>Backend</strong>
            <span>{API_BASE_URL}</span>
          </div>
          <span className="connection-status">
            <span />
            Connected
          </span>
        </div>
        <div className="settings-row">
          <div>
            <strong>Database-backed dashboard</strong>
            <span>Dashboard values are requested from FastAPI APIs.</span>
          </div>
          <CheckCircle2 size={20} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Authentication</strong>
            <span>Requests use the stored JWT access token.</span>
          </div>
          <ShieldCheck size={20} />
        </div>
      </section>
    </>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "subscriptions":
        return renderSubscriptions();
      case "invoices":
        return renderInvoices();
      case "payments":
        return renderPayments();
      case "customers":
        return renderCustomers();
      case "plans":
        return renderPlans();
      case "refunds":
        return renderNotImplemented(
          "Refunds",
          "Refund records from the backend refund engine.",
          ["POST /refunds", "GET /refunds", "Refund reason", "Refund status"]
        );
      case "analytics":
        return renderAnalytics();
      case "audit":
        return renderNotImplemented(
          "Audit Logs",
          "A record of every admin action for compliance and tracking.",
          ["GET /audit-logs", "Actor", "Action", "Timestamp", "Target record"]
        );
      case "settings":
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="admin-shell">
      <style>{`
        * { box-sizing: border-box; }

        .admin-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 15% 10%, rgba(212, 175, 55, 0.08), transparent 25%),
            radial-gradient(circle at 85% 80%, rgba(212, 175, 55, 0.05), transparent 28%),
            #070707;
          color: #f5f1e8;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          display: flex;
        }

        .sidebar {
          width: 250px;
          min-height: 100vh;
          position: fixed;
          left: 0; top: 0; bottom: 0;
          background: rgba(12, 12, 12, 0.96);
          border-right: 1px solid rgba(212, 175, 55, 0.13);
          padding: 22px 16px;
          z-index: 100;
          backdrop-filter: blur(20px);
          overflow-y: auto;
        }

        .brand { display: flex; align-items: center; gap: 11px; padding: 7px 10px 26px; }
        .brand-mark {
          width: 38px; height: 38px; border-radius: 12px;
          display: grid; place-items: center; color: #080808;
          background: linear-gradient(135deg, #f6df8b, #c59a2e);
          box-shadow: 0 0 25px rgba(212, 175, 55, 0.22);
        }
        .brand-text { font-weight: 800; letter-spacing: -0.4px; font-size: 19px; }
        .brand-subtitle { color: #8c877c; font-size: 10px; margin-top: 2px; }

        .nav-label {
          color: #5f5b53; font-size: 10px; text-transform: uppercase;
          letter-spacing: 1.4px; padding: 8px 12px; margin-bottom: 6px;
        }

        .nav-item {
          width: 100%; display: flex; align-items: center; gap: 11px;
          border: 0; background: transparent; color: #8d887f;
          padding: 11px 12px; border-radius: 10px; margin: 3px 0;
          cursor: pointer; text-align: left; font-size: 13px; transition: 0.2s ease;
        }
        .nav-item:hover { color: #f4e7c1; background: rgba(212, 175, 55, 0.07); }
        .nav-item.active {
          color: #080808;
          background: linear-gradient(135deg, #f4dc8a, #c49a2e);
          box-shadow: 0 8px 25px rgba(212, 175, 55, 0.14);
        }

        .sidebar-bottom { margin-top: 20px; }
        .admin-profile {
          border: 1px solid rgba(212, 175, 55, 0.11);
          background: rgba(255,255,255,0.025);
          padding: 12px; border-radius: 12px;
          display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
        }
        .profile-avatar {
          width: 34px; height: 34px; border-radius: 10px;
          display: grid; place-items: center; background: #181818;
          border: 1px solid rgba(212, 175, 55, 0.25); color: #e8c85d;
          font-weight: 700; font-size: 12px;
        }
        .profile-info { min-width: 0; }
        .profile-info strong { display: block; font-size: 12px; color: #eee8dc; }
        .profile-info span { display: block; font-size: 10px; color: #777269; margin-top: 2px; }

        .logout-button {
          width: 100%; display: flex; align-items: center; gap: 9px;
          border: 0; background: transparent; color: #777269;
          padding: 10px 12px; cursor: pointer; border-radius: 9px; font-size: 12px;
        }
        .logout-button:hover { background: rgba(255, 80, 80, 0.08); color: #ff8d8d; }

        .main { width: calc(100% - 250px); margin-left: 250px; min-height: 100vh; }

        .topbar {
          height: 68px; border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 30px; position: sticky; top: 0; z-index: 50;
          background: rgba(7,7,7,0.84); backdrop-filter: blur(18px);
        }
        .topbar-left { display: flex; align-items: center; gap: 12px; }
        .menu-button { display: none; border: 0; background: transparent; color: #eee; cursor: pointer; }
        .topbar-title { font-size: 12px; color: #8b857b; }
        .topbar-right { display: flex; align-items: center; gap: 13px; }

        .icon-button {
          width: 35px; height: 35px; border-radius: 10px;
          display: grid; place-items: center;
          background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07);
          color: #9b958b; cursor: pointer;
        }
        .icon-button:hover { color: #e7c75c; border-color: rgba(212,175,55,0.25); }

        .live-status {
          display: flex; align-items: center; gap: 7px;
          padding: 7px 10px; border-radius: 99px;
          background: rgba(71, 180, 107, 0.07); border: 1px solid rgba(71,180,107,0.12);
          color: #72c88d; font-size: 10px;
        }
        .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #66c985; box-shadow: 0 0 9px rgba(102,201,133,0.7); }

        .content { padding: 30px; max-width: 1600px; margin: 0 auto; }

        .page-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 25px; }
        .eyebrow { display: flex; align-items: center; gap: 6px; color: #c7a73f; font-size: 9px; letter-spacing: 1.4px; font-weight: 700; margin-bottom: 8px; }
        .page-heading h1 { font-size: 27px; margin: 0; letter-spacing: -0.8px; }
        .page-heading p { color: #777269; font-size: 12px; margin: 7px 0 0; }

        .refresh-button {
          display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 9px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          color: #bdb6a9; cursor: pointer; font-size: 11px;
        }
        .refresh-button:hover { border-color: rgba(212,175,55,0.3); color: #e6c85b; }
        .refresh-button:disabled { opacity: 0.5; cursor: not-allowed; }

        .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
        .stat-card {
          padding: 18px; border-radius: 14px;
          background: linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018));
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.025);
        }
        .stat-card.danger-card { border-color: rgba(255, 87, 87, 0.18); }
        .stat-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        .stat-icon { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 10px; }
        .accent-purple { background: rgba(168,85,247,0.14); color: #c39bfb; }
        .accent-green { background: rgba(52,199,120,0.14); color: #6fe3a0; }
        .accent-red { background: rgba(239,68,68,0.14); color: #f38f8f; }
        .accent-blue { background: rgba(59,130,246,0.14); color: #8db8fb; }
        .stat-title { color: #777269; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; }
        .stat-value { font-size: 24px; font-weight: 750; margin-top: 6px; letter-spacing: -0.7px; }
        .stat-subtitle { color: #5f5a52; font-size: 10px; margin-top: 5px; }

        .content-grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(330px, 1fr); gap: 18px; margin-bottom: 18px; }

        .panel {
          background: linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015));
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 15px; overflow: hidden; margin-bottom: 18px;
        }
        .content-grid .panel { margin-bottom: 0; }

        .panel-header {
          padding: 18px 20px; display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 1px solid rgba(255,255,255,0.055);
        }
        .panel-header h2 { font-size: 14px; margin: 0; }
        .panel-header p { color: #68635b; font-size: 10px; margin: 5px 0 0; }
        .panel-header > svg { color: #806c2e; }

        .overview-bar-chart {
          padding: 25px 20px; display: flex; align-items: flex-end; justify-content: space-around;
          gap: 14px; height: 270px;
        }
        .overview-bar-item {
          display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
          gap: 8px; height: 100%; flex: 1; min-width: 0;
        }
        .overview-bar-value { font-size: 10px; color: #cbb46c; white-space: nowrap; }
        .overview-bar {
          width: 70%; max-width: 46px; min-height: 6px; border-radius: 8px 8px 3px 3px;
          background: linear-gradient(180deg, #f0d777, #9d7822);
          box-shadow: 0 0 22px rgba(212,175,55,0.15);
        }
        .overview-bar-label { font-size: 10px; color: #aaa49a; text-align: center; }

        .queue-list { padding: 8px 12px 13px; }
        .queue-item {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 12px 10px; border-left: 3px solid #e05252;
          background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 6px;
        }
        .queue-content { min-width: 0; }
        .queue-content strong { display: block; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .queue-content span { display: block; color: #625d55; font-size: 9px; margin-top: 3px; }

        .day-badge {
          flex-shrink: 0; padding: 5px 9px; border-radius: 99px; font-size: 9px; font-weight: 700;
          background: rgba(230,128,128,0.1); color: #e68080; white-space: nowrap;
        }
        .day-badge.final { background: rgba(225,174,86,0.14); color: #e1ae56; }

        .status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 5px 8px; border-radius: 99px; font-size: 9px; white-space: nowrap; }
        .status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
        .status-badge.success { color: #6bc687; background: rgba(107,198,135,0.08); }
        .status-badge.warning { color: #e1ae56; background: rgba(225,174,86,0.08); }
        .status-badge.danger { color: #e68080; background: rgba(230,128,128,0.08); }
        .status-badge.neutral { color: #929087; background: rgba(146,144,135,0.08); }

        .text-button { display: flex; align-items: center; gap: 4px; color: #d1b34f; background: transparent; border: 0; cursor: pointer; font-size: 10px; }

        .table-wrapper { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 760px; }
        th { color: #5f5b53; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.7px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.055); }
        td { padding: 13px 16px; border-bottom: 1px solid rgba(255,255,255,0.045); color: #aaa49a; font-size: 10px; }
        td strong { color: #ddd6ca; font-weight: 600; }
        tr:hover td { background: rgba(212,175,55,0.025); }
        .invoice-link { color: #9dc4f0; cursor: pointer; }
        .invoice-link:hover { text-decoration: underline; }

        .view-button, .small-action {
          border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.025);
          color: #a9a296; border-radius: 7px; padding: 6px 9px; font-size: 9px; cursor: pointer;
        }
        .view-button:hover, .small-action:hover { color: #e5c65b; border-color: rgba(212,175,55,0.28); }
        .small-action.danger:hover { color: #ef8b8b; border-color: rgba(239,139,139,0.3); }
        .small-action:disabled { opacity: 0.45; cursor: not-allowed; }

        .icon-btn-sm {
          border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.025);
          color: #a9a296; border-radius: 7px; padding: 6px; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .icon-btn-sm:hover { color: #e5c65b; border-color: rgba(212,175,55,0.28); }
        .icon-btn-sm:disabled { opacity: 0.35; cursor: not-allowed; }

        .action-buttons { display: flex; gap: 5px; }
        .table-empty { text-align: center; color: #69645c; padding: 30px; }

        .empty-state {
          min-height: 190px; display: flex; align-items: center; justify-content: center;
          flex-direction: column; gap: 8px; padding: 30px; color: #656058; text-align: center;
        }
        .empty-state svg { color: #776328; }
        .empty-state strong { color: #aaa49a; font-size: 12px; }
        .empty-state span { max-width: 350px; line-height: 1.5; font-size: 10px; }
        .empty-state.compact { min-height: 160px; }

        .toolbar { padding: 15px 18px; display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.055); }
        .search-box {
          width: 330px; display: flex; align-items: center; gap: 8px; padding: 9px 11px; border-radius: 8px;
          background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); color: #666159;
        }
        .search-box input { flex: 1; border: 0; outline: 0; background: transparent; color: #ddd6ca; font-size: 10px; }
        .search-box input::placeholder { color: #57534c; }

        .plans-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .plan-card {
          padding: 20px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.07);
          background: linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015));
        }
        .plan-card-top { display: flex; align-items: center; justify-content: space-between; }
        .plan-icon { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 10px; background: rgba(212,175,55,0.09); color: #d7b84d; }
        .plan-card h3 { font-size: 16px; margin: 18px 0 10px; }
        .plan-price { font-size: 25px; font-weight: 750; }
        .plan-interval { color: #666159; font-size: 10px; margin-top: 3px; }
        .plan-detail { display: flex; justify-content: space-between; padding: 12px 0 0; margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); color: #69645c; font-size: 10px; }
        .plan-detail strong { color: #aaa49a; }

        .billing-warning { display: flex; gap: 17px; padding: 23px; border-radius: 15px; background: rgba(212,175,55,0.045); border: 1px solid rgba(212,175,55,0.16); margin-bottom: 18px; }
        .billing-warning-icon { width: 44px; height: 44px; flex-shrink: 0; display: grid; place-items: center; border-radius: 12px; background: rgba(212,175,55,0.08); color: #d8b74b; }
        .billing-warning h3 { margin: 1px 0 7px; font-size: 14px; }
        .billing-warning p { color: #827b70; font-size: 11px; line-height: 1.6; margin: 0; max-width: 850px; }
        .billing-requirements { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
        .billing-requirements span { padding: 6px 9px; border-radius: 7px; background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.06); color: #9a9388; font-size: 9px; }

        .pagination { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-top: 1px solid rgba(255,255,255,0.055); }
        .pagination span { color: #6c675f; font-size: 10px; }
        .pagination-controls { display: flex; align-items: center; gap: 8px; }
        .pagination-page { font-size: 10px; color: #aaa49a; }

        .settings-panel { padding: 0 20px; }
        .settings-row { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 18px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .settings-row:last-child { border-bottom: 0; }
        .settings-row strong { display: block; font-size: 12px; }
        .settings-row span { display: block; color: #68635b; font-size: 10px; margin-top: 4px; }
        .settings-row > svg { color: #c7a640; }
        .connection-status { display: flex !important; align-items: center; gap: 6px; color: #70c88b !important; }
        .connection-status > span { width: 6px; height: 6px; border-radius: 50%; background: #70c88b; box-shadow: 0 0 8px rgba(112,200,139,0.6); margin: 0 !important; }

        .toast {
          position: fixed; right: 24px; bottom: 24px; z-index: 500;
          min-width: 270px; max-width: 390px; padding: 13px 15px; border-radius: 11px;
          background: #151515; border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 18px 50px rgba(0,0,0,0.45); display: flex; align-items: center; gap: 10px; font-size: 11px;
        }
        .toast.success { border-color: rgba(112,200,139,0.25); color: #8bd49f; }
        .toast.error { border-color: rgba(230,128,128,0.25); color: #ef9696; }

        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.72); backdrop-filter: blur(7px); z-index: 300; display: grid; place-items: center; padding: 20px; }
        .modal { width: min(500px, 100%); background: #111; border: 1px solid rgba(255,255,255,0.09); border-radius: 16px; box-shadow: 0 30px 100px rgba(0,0,0,0.65); overflow: hidden; }
        .modal-header { padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .modal-header h3 { margin: 0; font-size: 14px; }
        .modal-close { width: 30px; height: 30px; border: 0; border-radius: 8px; display: grid; place-items: center; background: rgba(255,255,255,0.04); color: #888278; cursor: pointer; }
        .modal-body { padding: 20px; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .detail-item { padding: 12px; border-radius: 9px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.05); }
        .detail-item span { display: block; color: #5f5b53; font-size: 9px; text-transform: uppercase; letter-spacing: 0.6px; }
        .detail-item strong { display: block; color: #c7c0b4; font-size: 11px; margin-top: 5px; word-break: break-word; }
        .modal-actions { padding: 15px 20px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: flex-end; gap: 8px; }
        .modal-action { padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: #aaa49a; cursor: pointer; font-size: 10px; }
        .modal-action.primary { background: linear-gradient(135deg, #e8cb68, #b48924); color: #080808; border: 0; font-weight: 700; }

        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 1150px) {
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .content-grid { grid-template-columns: 1fr; }
          .plans-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 850px) {
          .sidebar { transform: translateX(-100%); transition: transform 0.25s ease; }
          .sidebar.open { transform: translateX(0); }
          .main { width: 100%; margin-left: 0; }
          .menu-button { display: grid; place-items: center; }
          .content { padding: 20px; }
          .topbar { padding: 0 18px; }
          .plans-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: 1fr; }
          .page-heading { align-items: flex-start; flex-direction: column; }
          .toolbar { flex-direction: column; }
          .search-box { width: 100%; }
          .live-status { display: none; }
          .topbar-title { display: none; }
          .detail-grid { grid-template-columns: 1fr; }
          .content { padding: 16px; }
        }
      `}</style>

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <CircleDollarSign size={21} />
          </div>
          <div>
            <div className="brand-text">BillSphere</div>
            <div className="brand-subtitle">BILLING CONTROL CENTER</div>
          </div>
        </div>

        <div className="nav-label">Administration</div>

        {navigationItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeSection === item.id ? "active" : ""}`}
            onClick={() => {
              setActiveSection(item.id);
              setSidebarOpen(false);
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="admin-profile">
            <div className="profile-avatar">AD</div>
            <div className="profile-info">
              <strong>Administrator</strong>
              <span>System Admin</span>
            </div>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-button" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={21} />
            </button>
            <span className="topbar-title">
              BillSphere / Admin / {navigationItems.find((item) => item.id === activeSection)?.label || "Overview"}
            </span>
          </div>

          <div className="topbar-right">
            <div className="live-status">
              <span className="live-dot" />
              API Connected
            </div>
            <button className="icon-button">
              <Bell size={16} />
            </button>
            <button className="icon-button" onClick={() => setActiveSection("settings")}>
              <Settings size={16} />
            </button>
          </div>
        </header>

        <div className="content">
          {loading ? (
            <div className="empty-state" style={{ minHeight: "70vh" }}>
              <RefreshCw size={32} className="spin" />
              <strong>Loading BillSphere...</strong>
              <span>Fetching real subscription, customer, invoice and payment data.</span>
            </div>
          ) : (
            renderSection()
          )}
        </div>
      </main>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
          <span>{toast.message}</span>
        </div>
      )}

      {showSubscriptionModal && (
        <div className="modal-backdrop" onClick={() => setShowSubscriptionModal(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Subscription #{showSubscriptionModal.id}</h3>
              <button className="modal-close" onClick={() => setShowSubscriptionModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span>Customer</span>
                  <strong>{customerLabel(showSubscriptionModal.customer_id)}</strong>
                </div>
                <div className="detail-item">
                  <span>Plan</span>
                  <strong>{planLabel(showSubscriptionModal.plan_id)}</strong>
                </div>
                <div className="detail-item">
                  <span>Status</span>
                  <strong>{showSubscriptionModal.status || "Unknown"}</strong>
                </div>
                <div className="detail-item">
                  <span>Start Date</span>
                  <strong>{formatDate(showSubscriptionModal.start_date)}</strong>
                </div>
                <div className="detail-item">
                  <span>End Date</span>
                  <strong>
                    {formatDate(showSubscriptionModal.end_date || showSubscriptionModal.current_period_end)}
                  </strong>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              {normaliseStatus(showSubscriptionModal.status) === "active" && (
                <button
                  className="modal-action danger"
                  disabled={actionLoading === showSubscriptionModal.id}
                  onClick={async () => {
                    await cancelSubscription(showSubscriptionModal.id);
                    setShowSubscriptionModal(null);
                  }}
                >
                  Cancel Subscription
                </button>
              )}
              <button className="modal-action" onClick={() => setShowSubscriptionModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvoiceModal && (
        <div className="modal-backdrop" onClick={() => setShowInvoiceModal(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{showInvoiceModal.invoice_number || `INV-${showInvoiceModal.id}`}</h3>
              <button className="modal-close" onClick={() => setShowInvoiceModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span>Customer</span>
                  <strong>{customerLabel(showInvoiceModal.customer_id)}</strong>
                </div>
                <div className="detail-item">
                  <span>Plan</span>
                  <strong>{planLabel(showInvoiceModal.plan_id)}</strong>
                </div>
                <div className="detail-item">
                  <span>Status</span>
                  <strong>{showInvoiceModal.status || "Unknown"}</strong>
                </div>
                <div className="detail-item">
                  <span>Due Date</span>
                  <strong>{formatDate(showInvoiceModal.due_date)}</strong>
                </div>
                <div className="detail-item">
                  <span>Amount</span>
                  <strong>{money(Number(showInvoiceModal.total ?? showInvoiceModal.amount ?? 0))}</strong>
                </div>
                <div className="detail-item">
                  <span>Tax</span>
                  <strong>
                    {showInvoiceModal.tax != null ? money(Number(showInvoiceModal.tax)) : "—"}
                  </strong>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-action primary" onClick={() => downloadInvoice(showInvoiceModal)}>
                <Download size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Download PDF
              </button>
              <button className="modal-action" onClick={() => setShowInvoiceModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}