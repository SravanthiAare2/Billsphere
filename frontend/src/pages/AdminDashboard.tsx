import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Crown,
  CreditCard,
  Download,
  FileText,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

type Section =
  | "overview"
  | "subscriptions"
  | "invoices"
  | "payments"
  | "customers"
  | "plans"
  | "refunds"
  | "analytics"
  | "audit"
  | "settings";

type ToastType = "success" | "error";

interface Toast {
  type: ToastType;
  message: string;
}

interface Plan {
  id: number;
  name: string;
  platform?: string;
  description?: string;
  price?: number | string;
  amount?: number | string;
  currency?: string;
  billing_cycle?: string;
  billing_interval?: string;
  interval?: string;
  trial_days?: number;
  is_active?: boolean;
  status?: string;
}

interface Customer {
  id: number;
  name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  status?: string;
  created_at?: string;
}

interface Subscription {
  id: number;
  customer_id?: number;
  plan_id?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  current_period_start?: string;
  current_period_end?: string;
  created_at?: string;
}

interface Invoice {
  id: number;
  invoice_number?: string;
  customer_id?: number;
  plan_id?: number;
  subscription_id?: number;
  status?: string;
  amount?: number | string;
  subtotal?: number | string;
  total?: number | string;
  tax?: number | string;
  due_date?: string;
  issue_date?: string;
  created_at?: string;
}

interface Payment {
  id: number;
  invoice_id?: number;
  customer_id?: number;
  amount?: number | string;
  currency?: string;
  status?: string;
  payment_method?: string;
  transaction_id?: string;
  created_at?: string;
  paid_at?: string;
}

const navigationItems: {
  id: Section;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "overview",
    label: "Overview",
    icon: <LayoutDashboard size={16} />,
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    icon: <RefreshCw size={16} />,
  },
  {
    id: "invoices",
    label: "Invoices",
    icon: <Receipt size={16} />,
  },
  {
    id: "payments",
    label: "Payments",
    icon: <CreditCard size={16} />,
  },
  {
    id: "customers",
    label: "Customers",
    icon: <Users size={16} />,
  },
  {
    id: "plans",
    label: "Plans",
    icon: <Package size={16} />,
  },
  {
    id: "refunds",
    label: "Refunds",
    icon: <Wallet size={16} />,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: <BarChart3 size={16} />,
  },
  {
    id: "audit",
    label: "Audit Logs",
    icon: <ShieldCheck size={16} />,
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings size={16} />,
  },
];

function normaliseStatus(value?: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status?: string }) {
  const value = normaliseStatus(status);

  let type = "neutral";

  if (
    ["active", "paid", "success", "successful", "completed"].includes(value)
  ) {
    type = "success";
  } else if (
    ["trial", "pending", "processing", "past_due"].includes(value)
  ) {
    type = "warning";
  } else if (
    ["failed", "cancelled", "canceled", "unpaid", "refunded"].includes(value)
  ) {
    type = "danger";
  }

  const label =
    status ||
    "Unknown";

  return (
    <span className={`status-badge ${type}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = "gold",
  danger = false,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  accent?: "gold" | "green" | "red" | "neutral";
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

export default function AdminDashboard() {
  const [activeSection, setActiveSection] =
    useState<Section>("overview");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [subscriptions, setSubscriptions] =
    useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [toast, setToast] = useState<Toast | null>(null);

  const [customerSearch, setCustomerSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [planSearch, setPlanSearch] = useState("");

  const [showSubscriptionModal, setShowSubscriptionModal] =
    useState<Subscription | null>(null);

  const [showInvoiceModal, setShowInvoiceModal] =
    useState<Invoice | null>(null);

  const [actionLoading, setActionLoading] = useState<number | null>(
    null
  );

  const [currentCustomerPage, setCurrentCustomerPage] = useState(1);
  const [currentInvoicePage, setCurrentInvoicePage] = useState(1);
  const [currentPaymentPage, setCurrentPaymentPage] = useState(1);
  const [currentSubscriptionPage, setCurrentSubscriptionPage] =
    useState(1);

  const pageSize = 8;

  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });

    window.setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const apiRequest = async (
    path: string,
    options: RequestInit = {}
  ) => {
    const headers = new Headers(options.headers);

    headers.set("Content-Type", "application/json");

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;

      try {
        const error = await response.json();

        if (typeof error?.detail === "string") {
          message = error.detail;
        } else if (Array.isArray(error?.detail)) {
          message = error.detail
            .map((item: any) => item?.msg)
            .filter(Boolean)
            .join(", ");
        }
      } catch {
        // Keep default message.
      }

      throw new Error(message);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  };

  const extractArray = (data: any): any[] => {
    if (Array.isArray(data)) return data;

    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.results)) return data.results;

    return [];
  };

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const results = await Promise.allSettled([
        apiRequest("/plans/plans"),
        apiRequest("/customers/customers"),
        apiRequest("/subscriptions/subscriptions"),
        apiRequest("/invoices/invoices"),
        apiRequest("/payments/payments/"),
      ]);

      const [
        plansResult,
        customersResult,
        subscriptionsResult,
        invoicesResult,
        paymentsResult,
      ] = results;

      if (plansResult.status === "fulfilled") {
        setPlans(extractArray(plansResult.value));
      }

      if (customersResult.status === "fulfilled") {
        setCustomers(extractArray(customersResult.value));
      }

      if (subscriptionsResult.status === "fulfilled") {
        setSubscriptions(extractArray(subscriptionsResult.value));
      }

      if (invoicesResult.status === "fulfilled") {
        setInvoices(extractArray(invoicesResult.value));
      }

      if (paymentsResult.status === "fulfilled") {
        setPayments(extractArray(paymentsResult.value));
      }

      const failed = results.filter(
        (result) => result.status === "rejected"
      );

      if (failed.length === results.length) {
        throw new Error(
          "Unable to connect to the BillSphere backend."
        );
      }

      if (silent) {
        showToast("success", "Dashboard data refreshed.");
      }
    } catch (error: any) {
      showToast(
        "error",
        error?.message || "Failed to load dashboard data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const activeSubscriptions = useMemo(
    () =>
      subscriptions.filter((subscription) =>
        ["active", "trialing", "trial"].includes(
          normaliseStatus(subscription.status)
        )
      ),
    [subscriptions]
  );

  const trialSubscriptions = useMemo(
    () =>
      subscriptions.filter((subscription) =>
        ["trial", "trialing"].includes(
          normaliseStatus(subscription.status)
        )
      ),
    [subscriptions]
  );

  const failedInvoices = useMemo(
    () =>
      invoices.filter((invoice) =>
        ["failed", "unpaid", "past_due", "overdue"].includes(
          normaliseStatus(invoice.status)
        )
      ),
    [invoices]
  );

  const successfulPayments = useMemo(
    () =>
      payments.filter((payment) =>
        ["paid", "success", "successful", "completed"].includes(
          normaliseStatus(payment.status)
        )
      ),
    [payments]
  );

  const calculatedMRR = useMemo(() => {
    return activeSubscriptions.reduce((total, subscription) => {
      const plan = plans.find(
        (item) => item.id === subscription.plan_id
      );

      if (!plan) return total;

      return total + Number(plan.price ?? plan.amount ?? 0);
    }, 0);
  }, [activeSubscriptions, plans]);

  const totalRevenue = useMemo(() => {
    return successfulPayments.reduce(
      (total, payment) => total + Number(payment.amount ?? 0),
      0
    );
  }, [successfulPayments]);

  const planRevenue = useMemo(() => {
    return plans
      .map((plan) => {
        const count = activeSubscriptions.filter(
          (subscription) => subscription.plan_id === plan.id
        ).length;

        return {
          id: plan.id,
          name: plan.name,
          revenue:
            count * Number(plan.price ?? plan.amount ?? 0),
        };
      })
      .filter((item) => item.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [plans, activeSubscriptions]);

  const maxPlanRevenue = Math.max(
    ...planRevenue.map((item) => item.revenue),
    1
  );

  const customerLabel = (customerId?: number) => {
    const customer = customers.find(
      (item) => item.id === customerId
    );

    if (!customer) {
      return customerId ? `Customer #${customerId}` : "Unknown";
    }

    return (
      customer.name ||
      customer.full_name ||
      customer.company_name ||
      customer.email ||
      `Customer #${customer.id}`
    );
  };

  const customerEmail = (customerId?: number) => {
    const customer = customers.find(
      (item) => item.id === customerId
    );

    return customer?.email || "—";
  };

  const planLabel = (planId?: number) => {
    const plan = plans.find((item) => item.id === planId);

    if (!plan) {
      return planId ? `Plan #${planId}` : "Unknown";
    }

    return plan.platform
      ? `${plan.platform} · ${plan.name}`
      : plan.name;
  };

  const invoiceLabel = (invoiceId?: number) => {
    const invoice = invoices.find(
      (item) => item.id === invoiceId
    );

    return (
      invoice?.invoice_number ||
      (invoiceId ? `INV-${invoiceId}` : "—")
    );
  };

  const cancelSubscription = async (subscriptionId: number) => {
    try {
      setActionLoading(subscriptionId);

      await apiRequest(
        `/subscriptions/subscriptions/${subscriptionId}`,
        {
          method: "DELETE",
        }
      );

      setSubscriptions((current) =>
        current.map((subscription) =>
          subscription.id === subscriptionId
            ? {
                ...subscription,
                status: "cancelled",
              }
            : subscription
        )
      );

      showToast(
        "success",
        "Subscription cancelled successfully."
      );
    } catch (error: any) {
      showToast(
        "error",
        error?.message || "Unable to cancel subscription."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const downloadInvoice = async (invoice: Invoice) => {
    try {
      const headers: Record<string, string> = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/invoices/${invoice.id}/pdf`,
        {
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(
          "Invoice PDF endpoint is not available."
        );
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download =
        invoice.invoice_number ||
        `invoice-${invoice.id}.pdf`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      showToast(
        "error",
        error?.message || "Unable to download invoice PDF."
      );
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");

    window.location.href = "/login";
  };

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) =>
      [
        customer.name,
        customer.full_name,
        customer.email,
        customer.phone,
        customer.company_name,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    );
  }, [customers, customerSearch]);

  const filteredSubscriptions = useMemo(() => {
    const query = subscriptionSearch.trim().toLowerCase();

    if (!query) return subscriptions;

    return subscriptions.filter((subscription) =>
      [
        subscription.id,
        subscription.customer_id,
        subscription.plan_id,
        subscription.status,
      ]
        .filter((value) => value !== undefined)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    );
  }, [subscriptions, subscriptionSearch]);

  const filteredInvoices = useMemo(() => {
    const query = invoiceSearch.trim().toLowerCase();

    if (!query) return invoices;

    return invoices.filter((invoice) =>
      [
        invoice.id,
        invoice.invoice_number,
        invoice.customer_id,
        invoice.status,
      ]
        .filter((value) => value !== undefined)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    );
  }, [invoices, invoiceSearch]);

  const filteredPayments = useMemo(() => {
    const query = paymentSearch.trim().toLowerCase();

    if (!query) return payments;

    return payments.filter((payment) =>
      [
        payment.id,
        payment.invoice_id,
        payment.customer_id,
        payment.transaction_id,
        payment.status,
      ]
        .filter((value) => value !== undefined)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    );
  }, [payments, paymentSearch]);

  const filteredPlans = useMemo(() => {
    const query = planSearch.trim().toLowerCase();

    if (!query) return plans;

    return plans.filter((plan) =>
      [
        plan.name,
        plan.platform,
        plan.description,
        plan.billing_cycle,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    );
  }, [plans, planSearch]);

  const paginate = <T,>(items: T[], page: number) => {
    const start = (page - 1) * pageSize;

    return items.slice(start, start + pageSize);
  };

  const totalPages = (length: number) =>
    Math.max(1, Math.ceil(length / pageSize));

  const renderOverview = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Gauge size={14} />
            BILLING CONTROL CENTER
          </div>

          <h1>Overview</h1>

          <p>
            Real-time visibility into your BillSphere billing
            system.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={14}
            className={refreshing ? "spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="stats-grid">
        <StatCard
          title="MRR"
          value={money(calculatedMRR)}
          subtitle="Current recurring revenue"
          icon={<CircleDollarSign size={20} />}
          accent="gold"
        />

        <StatCard
          title="Active Subscriptions"
          value={activeSubscriptions.length}
          subtitle="Currently active"
          icon={<RefreshCw size={20} />}
          accent="green"
        />

        <StatCard
          title="Customers"
          value={customers.length}
          subtitle="Registered customers"
          icon={<Users size={20} />}
          accent="neutral"
        />

        <StatCard
          title="Failed Payments"
          value={failedInvoices.length}
          subtitle="Invoices requiring recovery"
          icon={<AlertCircle size={20} />}
          accent="red"
          danger={failedInvoices.length > 0}
        />
      </div>

      <div className="stats-grid secondary-stats">
        <StatCard
          title="Total Revenue"
          value={money(totalRevenue)}
          subtitle="Successful payment volume"
          icon={<Wallet size={20} />}
          accent="gold"
        />

        <StatCard
          title="Trial Customers"
          value={trialSubscriptions.length}
          subtitle="Currently trialing"
          icon={<Clock3 size={20} />}
          accent="neutral"
        />

        <StatCard
          title="Invoices"
          value={invoices.length}
          subtitle="Total invoices"
          icon={<Receipt size={20} />}
          accent="neutral"
        />

        <StatCard
          title="Payments"
          value={payments.length}
          subtitle="Total payment records"
          icon={<CreditCard size={20} />}
          accent="green"
        />
      </div>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Revenue Distribution</h2>
              <p>
                Recurring revenue by currently active plan.
              </p>
            </div>

            <BarChart3 size={17} />
          </div>

          {planRevenue.length === 0 ? (
            <div className="empty-state">
              <BarChart3 size={30} />
              <strong>No analytics data yet</strong>
              <span>
                Revenue distribution will appear once active
                subscriptions exist.
              </span>
            </div>
          ) : (
            <div className="overview-bar-chart">
              {planRevenue.map((item) => (
                <div
                  className="overview-bar-item"
                  key={item.id}
                >
                  <span className="overview-bar-value">
                    {money(item.revenue)}
                  </span>

                  <div
                    className="overview-bar"
                    style={{
                      height: `${Math.max(
                        8,
                        (item.revenue / maxPlanRevenue) * 190
                      )}px`,
                    }}
                  />

                  <strong className="overview-bar-label">
                    {item.name}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Payment Recovery Queue</h2>
              <p>Invoices requiring attention.</p>
            </div>

            <AlertCircle size={17} />
          </div>

          {failedInvoices.length === 0 ? (
            <div className="empty-state compact">
              <CheckCircle2 size={28} />
              <strong>No failed invoices</strong>
              <span>
                Payment recovery queue is currently clear.
              </span>
            </div>
          ) : (
            <div className="queue-list">
              {failedInvoices.slice(0, 6).map((invoice) => (
                <div
                  className="queue-item"
                  key={invoice.id}
                >
                  <div className="queue-content">
                    <strong>
                      {invoice.invoice_number ||
                        `INV-${invoice.id}`}
                    </strong>

                    <span>
                      {customerLabel(invoice.customer_id)}
                    </span>
                  </div>

                  <span className="day-badge">
                    {money(
                      Number(
                        invoice.total ??
                          invoice.amount ??
                          0
                      )
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Recent Subscriptions</h2>
            <p>
              Latest subscription activity from the backend.
            </p>
          </div>

          <button
            className="text-button"
            onClick={() => setActiveSection("subscriptions")}
          >
            View all
            <ArrowRight size={13} />
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
                <th>Start Date</th>
                <th>Period End</th>
              </tr>
            </thead>

            <tbody>
              {subscriptions.slice(0, 6).map((subscription) => (
                <tr key={subscription.id}>
                  <td>
                    <strong>#{subscription.id}</strong>
                  </td>

                  <td>
                    {customerLabel(subscription.customer_id)}
                  </td>

                  <td>{planLabel(subscription.plan_id)}</td>

                  <td>
                    <StatusBadge
                      status={subscription.status}
                    />
                  </td>

                  <td>
                    {formatDate(subscription.start_date)}
                  </td>

                  <td>
                    {formatDate(
                      subscription.current_period_end ||
                        subscription.end_date
                    )}
                  </td>
                </tr>
              ))}

              {subscriptions.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="table-empty"
                  >
                    No subscriptions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderSubscriptions = () => {
    const pageItems = paginate(
      filteredSubscriptions,
      currentSubscriptionPage
    );

    const pages = totalPages(filteredSubscriptions.length);

    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <RefreshCw size={14} />
              SUBSCRIPTION MANAGEMENT
            </div>

            <h1>Subscriptions</h1>

            <p>
              Manage active, trial, cancelled and other
              subscription states.
            </p>
          </div>
        </div>

        <section className="panel">
          <div className="toolbar">
            <div className="search-box">
              <Search size={14} />

              <input
                value={subscriptionSearch}
                onChange={(event) => {
                  setSubscriptionSearch(event.target.value);
                  setCurrentSubscriptionPage(1);
                }}
                placeholder="Search subscriptions..."
              />
            </div>
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
                  <th>Period End</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {pageItems.map((subscription) => (
                  <tr key={subscription.id}>
                    <td>
                      <strong>#{subscription.id}</strong>
                    </td>

                    <td>
                      <strong>
                        {customerLabel(
                          subscription.customer_id
                        )}
                      </strong>
                    </td>

                    <td>
                      {planLabel(subscription.plan_id)}
                    </td>

                    <td>
                      <StatusBadge
                        status={subscription.status}
                      />
                    </td>

                    <td>
                      {formatDate(subscription.start_date)}
                    </td>

                    <td>
                      {formatDate(
                        subscription.current_period_end ||
                          subscription.end_date
                      )}
                    </td>

                    <td>
                      <button
                        className="view-button"
                        onClick={() =>
                          setShowSubscriptionModal(
                            subscription
                          )
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {pageItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="table-empty"
                    >
                      No subscriptions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentSubscriptionPage}
            totalPages={pages}
            totalItems={filteredSubscriptions.length}
            pageSize={pageSize}
            onPrevious={() =>
              setCurrentSubscriptionPage((page) =>
                Math.max(1, page - 1)
              )
            }
            onNext={() =>
              setCurrentSubscriptionPage((page) =>
                Math.min(pages, page + 1)
              )
            }
          />
        </section>
      </>
    );
  };

  const renderInvoices = () => {
    const pageItems = paginate(
      filteredInvoices,
      currentInvoicePage
    );

    const pages = totalPages(filteredInvoices.length);

    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <Receipt size={14} />
              INVOICE MANAGEMENT
            </div>

            <h1>Invoices</h1>

            <p>
              Monitor invoices, payment status, taxes and due
              dates.
            </p>
          </div>
        </div>

        <section className="panel">
          <div className="toolbar">
            <div className="search-box">
              <Search size={14} />

              <input
                value={invoiceSearch}
                onChange={(event) => {
                  setInvoiceSearch(event.target.value);
                  setCurrentInvoicePage(1);
                }}
                placeholder="Search invoices..."
              />
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Tax</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {pageItems.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong className="invoice-link">
                        {invoice.invoice_number ||
                          `INV-${invoice.id}`}
                      </strong>
                    </td>

                    <td>
                      {customerLabel(invoice.customer_id)}
                    </td>

                    <td>
                      {planLabel(invoice.plan_id)}
                    </td>

                    <td>
                      {money(
                        Number(
                          invoice.total ??
                            invoice.amount ??
                            0
                        )
                      )}
                    </td>

                    <td>
                      {invoice.tax != null
                        ? money(Number(invoice.tax))
                        : "—"}
                    </td>

                    <td>
                      <StatusBadge status={invoice.status} />
                    </td>

                    <td>
                      {formatDate(invoice.due_date)}
                    </td>

                    <td>
                      <button
                        className="view-button"
                        onClick={() =>
                          setShowInvoiceModal(invoice)
                        }
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {pageItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="table-empty"
                    >
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentInvoicePage}
            totalPages={pages}
            totalItems={filteredInvoices.length}
            pageSize={pageSize}
            onPrevious={() =>
              setCurrentInvoicePage((page) =>
                Math.max(1, page - 1)
              )
            }
            onNext={() =>
              setCurrentInvoicePage((page) =>
                Math.min(pages, page + 1)
              )
            }
          />
        </section>
      </>
    );
  };

  const renderPayments = () => {
    const pageItems = paginate(
      filteredPayments,
      currentPaymentPage
    );

    const pages = totalPages(filteredPayments.length);

    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <CreditCard size={14} />
              PAYMENT OPERATIONS
            </div>

            <h1>Payments</h1>

            <p>
              Track successful, pending and failed payment
              transactions.
            </p>
          </div>
        </div>

        <section className="panel">
          <div className="toolbar">
            <div className="search-box">
              <Search size={14} />

              <input
                value={paymentSearch}
                onChange={(event) => {
                  setPaymentSearch(event.target.value);
                  setCurrentPaymentPage(1);
                }}
                placeholder="Search payments..."
              />
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Invoice</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Transaction</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {pageItems.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <strong>#{payment.id}</strong>
                    </td>

                    <td>
                      {customerLabel(payment.customer_id)}
                    </td>

                    <td>
                      {invoiceLabel(payment.invoice_id)}
                    </td>

                    <td>
                      {money(Number(payment.amount ?? 0))}
                    </td>

                    <td>
                      {payment.payment_method || "—"}
                    </td>

                    <td>
                      {payment.transaction_id || "—"}
                    </td>

                    <td>
                      <StatusBadge status={payment.status} />
                    </td>

                    <td>
                      {formatDate(
                        payment.paid_at ||
                          payment.created_at
                      )}
                    </td>
                  </tr>
                ))}

                {pageItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="table-empty"
                    >
                      No payments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPaymentPage}
            totalPages={pages}
            totalItems={filteredPayments.length}
            pageSize={pageSize}
            onPrevious={() =>
              setCurrentPaymentPage((page) =>
                Math.max(1, page - 1)
              )
            }
            onNext={() =>
              setCurrentPaymentPage((page) =>
                Math.min(pages, page + 1)
              )
            }
          />
        </section>
      </>
    );
  };

  const renderCustomers = () => {
    const pageItems = paginate(
      filteredCustomers,
      currentCustomerPage
    );

    const pages = totalPages(filteredCustomers.length);

    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <Users size={14} />
              CUSTOMER MANAGEMENT
            </div>

            <h1>Customers</h1>

            <p>
              View customers and their current billing activity.
            </p>
          </div>
        </div>

        <section className="panel">
          <div className="toolbar">
            <div className="search-box">
              <Search size={14} />

              <input
                value={customerSearch}
                onChange={(event) => {
                  setCustomerSearch(event.target.value);
                  setCurrentCustomerPage(1);
                }}
                placeholder="Search customers..."
              />
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Subscriptions</th>
                  <th>Invoices</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>

              <tbody>
                {pageItems.map((customer) => {
                  const customerSubscriptions =
                    subscriptions.filter(
                      (subscription) =>
                        subscription.customer_id ===
                        customer.id
                    );

                  const customerInvoices = invoices.filter(
                    (invoice) =>
                      invoice.customer_id === customer.id
                  );

                  return (
                    <tr key={customer.id}>
                      <td>
                        <strong>#{customer.id}</strong>
                      </td>

                      <td>
                        <strong>
                          {customer.name ||
                            customer.full_name ||
                            customer.company_name ||
                            "Unnamed customer"}
                        </strong>
                      </td>

                      <td>{customer.email || "—"}</td>

                      <td>
                        {customerSubscriptions.length}
                      </td>

                      <td>
                        {customerInvoices.length}
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            customer.status || "Active"
                          }
                        />
                      </td>

                      <td>
                        {formatDate(customer.created_at)}
                      </td>
                    </tr>
                  );
                })}

                {pageItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="table-empty"
                    >
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentCustomerPage}
            totalPages={pages}
            totalItems={filteredCustomers.length}
            pageSize={pageSize}
            onPrevious={() =>
              setCurrentCustomerPage((page) =>
                Math.max(1, page - 1)
              )
            }
            onNext={() =>
              setCurrentCustomerPage((page) =>
                Math.min(pages, page + 1)
              )
            }
          />
        </section>
      </>
    );
  };

  const renderPlans = () => (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Package size={14} />
            PLAN MANAGEMENT
          </div>

          <h1>Subscription Plans</h1>

          <p>
            Manage pricing and plan configuration using the
            backend plan APIs.
          </p>
        </div>
      </div>

      <section className="panel plan-toolbar-panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={14} />

            <input
              value={planSearch}
              onChange={(event) =>
                setPlanSearch(event.target.value)
              }
              placeholder="Search plans or platforms..."
            />
          </div>
        </div>
      </section>

      <div className="plans-grid">
        {filteredPlans.map((plan) => (
          <div className="plan-card" key={plan.id}>
            <div className="plan-card-top">
              <div className="plan-icon">
                <Crown size={19} />
              </div>

              <StatusBadge
                status={
                  plan.is_active === false
                    ? "Inactive"
                    : plan.status || "Active"
                }
              />
            </div>

            <div className="plan-platform">
              {plan.platform || "BillSphere"}
            </div>

            <h3>{plan.name}</h3>

            <div className="plan-price">
              {money(
                Number(plan.price ?? plan.amount ?? 0)
              )}
            </div>

            <div className="plan-interval">
              {plan.billing_cycle ||
                plan.billing_interval ||
                plan.interval ||
                "Monthly"}
            </div>

            <div className="plan-detail">
              <span>Trial period</span>

              <strong>
                {plan.trial_days ?? 0} days
              </strong>
            </div>

            <div className="plan-detail">
              <span>Active subscribers</span>

              <strong>
                {
                  activeSubscriptions.filter(
                    (subscription) =>
                      subscription.plan_id === plan.id
                  ).length
                }
              </strong>
            </div>

            <div className="plan-detail">
              <span>Currency</span>

              <strong>
                {plan.currency || "INR"}
              </strong>
            </div>
          </div>
        ))}

        {!loading && filteredPlans.length === 0 && (
          <div className="empty-state plan-empty">
            <Package size={30} />

            <strong>No plans found</strong>

            <span>
              No plans matched your search or the backend returned
              no plans.
            </span>
          </div>
        )}
      </div>
    </>
  );

  const renderNotImplemented = (
    title: string,
    description: string,
    requirements: string[]
  ) => (
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
          <h3>
            Backend endpoints for this section don't exist yet
          </h3>

          <p>
            This dashboard doesn't fabricate data. Once the
            corresponding FastAPI routes are added, this section
            can display real records automatically.
          </p>

          <div className="billing-requirements">
            {requirements.map((requirement) => (
              <span key={requirement}>
                {requirement}
              </span>
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

          <p>
            Metrics calculated from current subscription,
            invoice and payment data.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="MRR"
          value={money(calculatedMRR)}
          subtitle="Current recurring revenue"
          icon={<CircleDollarSign size={21} />}
          accent="gold"
        />

        <StatCard
          title="Active"
          value={activeSubscriptions.length}
          subtitle="Active subscriptions"
          icon={<CheckCircle2 size={21} />}
          accent="green"
        />

        <StatCard
          title="Trial"
          value={trialSubscriptions.length}
          subtitle="Customers currently trialing"
          icon={<Activity size={21} />}
          accent="neutral"
        />

        <StatCard
          title="Failed Payments"
          value={failedInvoices.length}
          subtitle="Invoices requiring recovery"
          icon={<AlertCircle size={21} />}
          accent="red"
          danger={failedInvoices.length > 0}
        />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Revenue Distribution</h2>
            <p>
              Actual recurring revenue by currently active plan.
            </p>
          </div>

          <BarChart3 size={17} />
        </div>

        {planRevenue.length === 0 ? (
          <div className="empty-state">
            <BarChart3 size={30} />

            <strong>No analytics data yet</strong>

            <span>
              Analytics will appear once active subscriptions
              exist.
            </span>
          </div>
        ) : (
          <div className="overview-bar-chart">
            {planRevenue.map((item) => (
              <div
                className="overview-bar-item"
                key={item.id}
              >
                <span className="overview-bar-value">
                  {money(item.revenue)}
                </span>

                <div
                  className="overview-bar"
                  style={{
                    height: `${Math.max(
                      8,
                      (item.revenue / maxPlanRevenue) * 190
                    )}px`,
                  }}
                />

                <strong className="overview-bar-label">
                  {item.name}
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Billing Summary</h2>
            <p>
              Current system-level billing statistics.
            </p>
          </div>
        </div>

        <div className="analytics-summary">
          <div className="analytics-summary-card">
            <span>Successful Payments</span>
            <strong>{successfulPayments.length}</strong>
          </div>

          <div className="analytics-summary-card">
            <span>Total Payments</span>
            <strong>{payments.length}</strong>
          </div>

          <div className="analytics-summary-card">
            <span>Total Invoices</span>
            <strong>{invoices.length}</strong>
          </div>

          <div className="analytics-summary-card">
            <span>Failed Invoices</span>
            <strong>{failedInvoices.length}</strong>
          </div>
        </div>
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

          <p>
            BillSphere administration and system connection
            information.
          </p>
        </div>
      </div>

      <section className="panel settings-panel">
        <div className="settings-row">
          <div>
            <strong>Backend API</strong>
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
            <span>
              Dashboard values are requested from FastAPI APIs.
            </span>
          </div>

          <CheckCircle2 size={20} />
        </div>

        <div className="settings-row">
          <div>
            <strong>Authentication</strong>
            <span>
              Requests use the stored JWT access token.
            </span>
          </div>

          <ShieldCheck size={20} />
        </div>

        <div className="settings-row">
          <div>
            <strong>Plans loaded</strong>
            <span>
              {plans.length} plan records available.
            </span>
          </div>

          <Package size={20} />
        </div>

        <div className="settings-row">
          <div>
            <strong>Customers loaded</strong>
            <span>
              {customers.length} customer records available.
            </span>
          </div>

          <Users size={20} />
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
          [
            "POST /refunds",
            "GET /refunds",
            "Refund reason",
            "Refund status",
          ]
        );

      case "analytics":
        return renderAnalytics();

      case "audit":
        return renderNotImplemented(
          "Audit Logs",
          "A record of every admin action for compliance and tracking.",
          [
            "GET /audit-logs",
            "Actor",
            "Action",
            "Timestamp",
            "Target record",
          ]
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
        * {
          box-sizing: border-box;
        }

        .admin-shell {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 15% 10%,
              rgba(212, 175, 55, 0.08),
              transparent 25%
            ),
            radial-gradient(
              circle at 85% 80%,
              rgba(212, 175, 55, 0.05),
              transparent 28%
            ),
            #070707;
          color: #f5f1e8;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          display: flex;
        }

        .sidebar {
          width: 250px;
          min-height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          background: rgba(12, 12, 12, 0.97);
          border-right: 1px solid rgba(212, 175, 55, 0.13);
          padding: 22px 16px;
          z-index: 100;
          backdrop-filter: blur(20px);
          overflow-y: auto;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 7px 10px 26px;
        }

        .brand-mark {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: #080808;
          background: linear-gradient(
            135deg,
            #f6df8b,
            #c59a2e
          );
          box-shadow:
            0 0 25px rgba(212, 175, 55, 0.22);
        }

        .brand-text {
          font-weight: 800;
          letter-spacing: -0.4px;
          font-size: 19px;
        }

        .brand-subtitle {
          color: #8c877c;
          font-size: 10px;
          margin-top: 2px;
        }

        .nav-label {
          color: #5f5b53;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.4px;
          padding: 8px 12px;
          margin-bottom: 6px;
        }

        .nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 11px;
          border: 0;
          background: transparent;
          color: #8d887f;
          padding: 11px 12px;
          border-radius: 10px;
          margin: 3px 0;
          cursor: pointer;
          text-align: left;
          font-size: 13px;
          transition: 0.2s ease;
        }

        .nav-item:hover {
          color: #f4e7c1;
          background: rgba(212, 175, 55, 0.07);
        }

        .nav-item.active {
          color: #080808;
          background: linear-gradient(
            135deg,
            #f4dc8a,
            #c49a2e
          );
          box-shadow:
            0 8px 25px rgba(212, 175, 55, 0.14);
        }

        .sidebar-bottom {
          margin-top: 20px;
        }

        .admin-profile {
          border: 1px solid rgba(212, 175, 55, 0.11);
          background: rgba(255, 255, 255, 0.025);
          padding: 12px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .profile-avatar {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: #181818;
          border: 1px solid rgba(212, 175, 55, 0.25);
          color: #e8c85d;
          font-weight: 700;
          font-size: 12px;
        }

        .profile-info {
          min-width: 0;
        }

        .profile-info strong {
          display: block;
          font-size: 12px;
          color: #eee8dc;
        }

        .profile-info span {
          display: block;
          font-size: 10px;
          color: #777269;
          margin-top: 2px;
        }

        .logout-button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 0;
          background: transparent;
          color: #777269;
          padding: 10px 12px;
          cursor: pointer;
          border-radius: 9px;
          font-size: 12px;
        }

        .logout-button:hover {
          background: rgba(255, 80, 80, 0.08);
          color: #ff8d8d;
        }

        .main {
          width: calc(100% - 250px);
          margin-left: 250px;
          min-height: 100vh;
        }

        .topbar {
          height: 68px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 30px;
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(7, 7, 7, 0.84);
          backdrop-filter: blur(18px);
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .menu-button {
          display: none;
          border: 0;
          background: transparent;
          color: #eee;
          cursor: pointer;
        }

        .topbar-title {
          font-size: 12px;
          color: #8b857b;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .icon-button {
          width: 35px;
          height: 35px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.07);
          color: #9b958b;
          cursor: pointer;
        }

        .icon-button:hover {
          color: #e7c75c;
          border-color: rgba(212, 175, 55, 0.25);
        }

        .live-status {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          border-radius: 99px;
          background: rgba(71, 180, 107, 0.07);
          border: 1px solid rgba(71, 180, 107, 0.12);
          color: #72c88d;
          font-size: 10px;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #66c985;
          box-shadow:
            0 0 9px rgba(102, 201, 133, 0.7);
        }

        .content {
          padding: 30px;
          max-width: 1600px;
          margin: 0 auto;
        }

        .page-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 25px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #c7a73f;
          font-size: 9px;
          letter-spacing: 1.4px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .page-heading h1 {
          font-size: 27px;
          margin: 0;
          letter-spacing: -0.8px;
        }

        .page-heading p {
          color: #777269;
          font-size: 12px;
          margin: 7px 0 0;
        }

        .refresh-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #bdb6a9;
          cursor: pointer;
          font-size: 11px;
        }

        .refresh-button:hover {
          border-color: rgba(212, 175, 55, 0.3);
          color: #e6c85b;
        }

        .refresh-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(
            4,
            minmax(0, 1fr)
          );
          gap: 14px;
          margin-bottom: 18px;
        }

        .secondary-stats {
          margin-top: 2px;
        }

        .stat-card {
          padding: 18px;
          border-radius: 14px;
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.045),
            rgba(255, 255, 255, 0.018)
          );
          border: 1px solid rgba(255, 255, 255, 0.07);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.025);
        }

        .stat-card.danger-card {
          border-color: rgba(255, 87, 87, 0.18);
        }

        .stat-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .stat-icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border-radius: 10px;
        }

        .accent-gold {
          background: rgba(212, 175, 55, 0.13);
          color: #e1c35b;
        }

        .accent-green {
          background: rgba(52, 199, 120, 0.14);
          color: #6fe3a0;
        }

        .accent-red {
          background: rgba(239, 68, 68, 0.14);
          color: #f38f8f;
        }

        .accent-neutral {
          background: rgba(255, 255, 255, 0.05);
          color: #c4bdb1;
        }

        .stat-title {
          color: #777269;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 750;
          margin-top: 6px;
          letter-spacing: -0.7px;
        }

        .stat-subtitle {
          color: #5f5a52;
          font-size: 10px;
          margin-top: 5px;
        }

        .content-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.65fr)
            minmax(330px, 1fr);
          gap: 18px;
          margin-bottom: 18px;
        }

        .panel {
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.04),
            rgba(255, 255, 255, 0.015)
          );
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 15px;
          overflow: hidden;
          margin-bottom: 18px;
        }

        .panel-header {
          padding: 18px 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid rgba(255, 255, 255, 0.055);
        }

        .panel-header h2 {
          font-size: 14px;
          margin: 0;
        }

        .panel-header p {
          color: #68635b;
          font-size: 10px;
          margin: 5px 0 0;
        }

        .panel-header > svg {
          color: #806c2e;
        }

        .overview-bar-chart {
          padding: 25px 20px;
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          gap: 14px;
          height: 270px;
        }

        .overview-bar-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          height: 100%;
          flex: 1;
          min-width: 0;
        }

        .overview-bar-value {
          font-size: 10px;
          color: #cbb46c;
          white-space: nowrap;
        }

        .overview-bar {
          width: 70%;
          max-width: 46px;
          min-height: 6px;
          border-radius: 8px 8px 3px 3px;
          background: linear-gradient(
            180deg,
            #f0d777,
            #9d7822
          );
          box-shadow:
            0 0 22px rgba(212, 175, 55, 0.15);
        }

        .overview-bar-label {
          font-size: 10px;
          color: #aaa49a;
          text-align: center;
        }

        .queue-list {
          padding: 8px 12px 13px;
        }

        .queue-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 10px;
          border-left: 3px solid #b77935;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          margin-bottom: 6px;
        }

        .queue-content {
          min-width: 0;
        }

        .queue-content strong {
          display: block;
          font-size: 10px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .queue-content span {
          display: block;
          color: #625d55;
          font-size: 9px;
          margin-top: 3px;
        }

        .day-badge {
          flex-shrink: 0;
          padding: 5px 9px;
          border-radius: 99px;
          font-size: 9px;
          font-weight: 700;
          background: rgba(225, 174, 86, 0.12);
          color: #e1ae56;
          white-space: nowrap;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 8px;
          border-radius: 99px;
          font-size: 9px;
          white-space: nowrap;
        }

        .status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: currentColor;
        }

        .status-badge.success {
          color: #6bc687;
          background: rgba(107, 198, 135, 0.08);
        }

        .status-badge.warning {
          color: #e1ae56;
          background: rgba(225, 174, 86, 0.08);
        }

        .status-badge.danger {
          color: #e68080;
          background: rgba(230, 128, 128, 0.08);
        }

        .status-badge.neutral {
          color: #929087;
          background: rgba(146, 144, 135, 0.08);
        }

        .text-button {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #d1b34f;
          background: transparent;
          border: 0;
          cursor: pointer;
          font-size: 10px;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 780px;
        }

        th {
          color: #5f5b53;
          text-align: left;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.055);
        }

        td {
          padding: 13px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.045);
          color: #aaa49a;
          font-size: 10px;
        }

        td strong {
          color: #ddd6ca;
          font-weight: 600;
        }

        tr:hover td {
          background: rgba(212, 175, 55, 0.025);
        }

        .invoice-link {
          color: #d7b94f;
          cursor: pointer;
        }

        .invoice-link:hover {
          text-decoration: underline;
        }

        .view-button,
        .small-action {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.025);
          color: #a9a296;
          border-radius: 7px;
          padding: 6px 9px;
          font-size: 9px;
          cursor: pointer;
        }

        .view-button:hover,
        .small-action:hover {
          color: #e5c65b;
          border-color: rgba(212, 175, 55, 0.28);
        }

        .small-action.danger:hover {
          color: #ef8b8b;
          border-color: rgba(239, 139, 139, 0.3);
        }

        .small-action:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .action-buttons {
          display: flex;
          gap: 5px;
        }

        .table-empty {
          text-align: center;
          color: #69645c;
          padding: 30px;
        }

        .empty-state {
          min-height: 190px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 8px;
          padding: 30px;
          color: #656058;
          text-align: center;
        }

        .empty-state svg {
          color: #776328;
        }

        .empty-state strong {
          color: #aaa49a;
          font-size: 12px;
        }

        .empty-state span {
          max-width: 350px;
          line-height: 1.5;
          font-size: 10px;
        }

        .empty-state.compact {
          min-height: 160px;
        }

        .plan-empty {
          grid-column: 1 / -1;
        }

        .toolbar {
          padding: 15px 18px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.055);
        }

        .search-box {
          width: 330px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 11px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.07);
          color: #666159;
        }

        .search-box:focus-within {
          border-color: rgba(212, 175, 55, 0.28);
        }

        .search-box input {
          flex: 1;
          border: 0;
          outline: 0;
          background: transparent;
          color: #ddd6ca;
          font-size: 10px;
        }

        .search-box input::placeholder {
          color: #57534c;
        }

        .plans-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .plan-toolbar-panel {
          margin-bottom: 16px;
        }

        .plan-card {
          padding: 20px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.07);
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.04),
            rgba(255, 255, 255, 0.015)
          );
          transition:
            transform 0.2s ease,
            border-color 0.2s ease;
        }

        .plan-card:hover {
          transform: translateY(-2px);
          border-color: rgba(212, 175, 55, 0.2);
        }

        .plan-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .plan-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(212, 175, 55, 0.09);
          color: #d7b84d;
        }

        .plan-platform {
          color: #806c2e;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 18px;
        }

        .plan-card h3 {
          font-size: 16px;
          margin: 6px 0 10px;
        }

        .plan-price {
          font-size: 25px;
          font-weight: 750;
        }

        .plan-interval {
          color: #666159;
          font-size: 10px;
          margin-top: 3px;
        }

        .plan-detail {
          display: flex;
          justify-content: space-between;
          padding: 12px 0 0;
          margin-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          color: #69645c;
          font-size: 10px;
        }

        .plan-detail strong {
          color: #aaa49a;
        }

        .billing-warning {
          display: flex;
          gap: 17px;
          padding: 23px;
          border-radius: 15px;
          background: rgba(212, 175, 55, 0.045);
          border: 1px solid rgba(212, 175, 55, 0.16);
          margin-bottom: 18px;
        }

        .billing-warning-icon {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(212, 175, 55, 0.08);
          color: #d8b74b;
        }

        .billing-warning h3 {
          margin: 1px 0 7px;
          font-size: 14px;
        }

        .billing-warning p {
          color: #827b70;
          font-size: 11px;
          line-height: 1.6;
          margin: 0;
          max-width: 850px;
        }

        .billing-requirements {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 14px;
        }

        .billing-requirements span {
          padding: 6px 9px;
          border-radius: 7px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #9a9388;
          font-size: 9px;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.055);
        }

        .pagination span {
          color: #6c675f;
          font-size: 10px;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pagination-page {
          font-size: 10px;
          color: #aaa49a;
        }

        .pagination-button {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.025);
          color: #aaa49a;
          cursor: pointer;
        }

        .pagination-button:hover:not(:disabled) {
          color: #e5c65b;
          border-color: rgba(212, 175, 55, 0.28);
        }

        .pagination-button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .settings-panel {
          padding: 0 20px;
        }

        .settings-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 18px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .settings-row:last-child {
          border-bottom: 0;
        }

        .settings-row strong {
          display: block;
          font-size: 12px;
        }

        .settings-row span {
          display: block;
          color: #68635b;
          font-size: 10px;
          margin-top: 4px;
        }

        .settings-row > svg {
          color: #c7a640;
        }

        .connection-status {
          display: flex !important;
          align-items: center;
          gap: 6px;
          color: #70c88b !important;
        }

        .connection-status > span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #70c88b;
          box-shadow:
            0 0 8px rgba(112, 200, 139, 0.6);
          margin: 0 !important;
        }

        .analytics-summary {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 12px;
          padding: 18px;
        }

        .analytics-summary-card {
          padding: 18px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .analytics-summary-card span {
          display: block;
          color: #68635b;
          font-size: 10px;
        }

        .analytics-summary-card strong {
          display: block;
          font-size: 23px;
          margin-top: 7px;
          color: #ddd6ca;
        }

        .toast {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 500;
          min-width: 270px;
          max-width: 390px;
          padding: 13px 15px;
          border-radius: 11px;
          background: #151515;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow:
            0 18px 50px rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
        }

        .toast.success {
          border-color: rgba(112, 200, 139, 0.25);
          color: #8bd49f;
        }

        .toast.error {
          border-color: rgba(230, 128, 128, 0.25);
          color: #ef9696;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(7px);
          z-index: 300;
          display: grid;
          place-items: center;
          padding: 20px;
        }

        .modal {
          width: min(560px, 100%);
          background: #111;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 16px;
          box-shadow:
            0 30px 100px rgba(0, 0, 0, 0.65);
          overflow: hidden;
        }

        .modal-header {
          padding: 18px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .modal-header h3 {
          margin: 0;
          font-size: 14px;
        }

        .modal-close {
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 8px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.04);
          color: #888278;
          cursor: pointer;
        }

        .modal-body {
          padding: 20px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .detail-item {
          padding: 12px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .detail-item span {
          display: block;
          color: #5f5b53;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .detail-item strong {
          display: block;
          color: #c7c0b4;
          font-size: 11px;
          margin-top: 5px;
          word-break: break-word;
        }

        .modal-actions {
          padding: 15px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .modal-action {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: #aaa49a;
          cursor: pointer;
          font-size: 10px;
        }

        .modal-action:hover {
          border-color: rgba(212, 175, 55, 0.25);
          color: #e5c65b;
        }

        .modal-action.primary {
          background: linear-gradient(
            135deg,
            #e8cb68,
            #b48924
          );
          color: #080808;
          border: 0;
          font-weight: 700;
        }

        .modal-action.danger {
          color: #ef9292;
          border-color: rgba(239, 146, 146, 0.2);
        }

        .modal-action.danger:hover {
          background: rgba(239, 146, 146, 0.08);
        }

        .spin {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .content-grid {
            grid-template-columns: 1fr;
          }

          .plans-grid {
            grid-template-columns: 1fr 1fr;
          }

          .analytics-summary {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 850px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.25s ease;
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .main {
            width: 100%;
            margin-left: 0;
          }

          .menu-button {
            display: grid;
            place-items: center;
          }

          .content {
            padding: 20px;
          }

          .topbar {
            padding: 0 18px;
          }

          .plans-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .page-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .toolbar {
            flex-direction: column;
          }

          .search-box {
            width: 100%;
          }

          .live-status {
            display: none;
          }

          .topbar-title {
            display: none;
          }

          .detail-grid {
            grid-template-columns: 1fr;
          }

          .analytics-summary {
            grid-template-columns: 1fr;
          }

          .content {
            padding: 16px;
          }

          .pagination {
            gap: 10px;
            flex-direction: column;
            align-items: flex-start;
          }

          .toast {
            left: 16px;
            right: 16px;
            min-width: 0;
          }
        }
      `}</style>

      <aside
        className={`sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        <div className="brand">
          <div className="brand-mark">
            <CircleDollarSign size={21} />
          </div>

          <div>
            <div className="brand-text">
              BillSphere
            </div>

            <div className="brand-subtitle">
              BILLING CONTROL CENTER
            </div>
          </div>
        </div>

        <div className="nav-label">
          Administration
        </div>

        {navigationItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${
              activeSection === item.id
                ? "active"
                : ""
            }`}
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
            <div className="profile-avatar">
              AD
            </div>

            <div className="profile-info">
              <strong>Administrator</strong>
              <span>System Admin</span>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-button"
              onClick={() =>
                setSidebarOpen(!sidebarOpen)
              }
            >
              <Menu size={21} />
            </button>

            <span className="topbar-title">
              BillSphere / Admin /{" "}
              {navigationItems.find(
                (item) =>
                  item.id === activeSection
              )?.label || "Overview"}
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

            <button
              className="icon-button"
              onClick={() =>
                setActiveSection("settings")
              }
            >
              <Settings size={16} />
            </button>
          </div>
        </header>

        <div className="content">
          {loading ? (
            <div
              className="empty-state"
              style={{ minHeight: "70vh" }}
            >
              <RefreshCw
                size={32}
                className="spin"
              />

              <strong>
                Loading BillSphere...
              </strong>

              <span>
                Fetching real subscription, customer,
                invoice, plan and payment data.
              </span>
            </div>
          ) : (
            renderSection()
          )}
        </div>
      </main>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? (
            <CheckCircle2 size={17} />
          ) : (
            <XCircle size={17} />
          )}

          <span>{toast.message}</span>
        </div>
      )}

      {showSubscriptionModal && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setShowSubscriptionModal(null)
          }
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <h3>
                Subscription #
                {showSubscriptionModal.id}
              </h3>

              <button
                className="modal-close"
                onClick={() =>
                  setShowSubscriptionModal(null)
                }
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span>Customer</span>

                  <strong>
                    {customerLabel(
                      showSubscriptionModal.customer_id
                    )}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Plan</span>

                  <strong>
                    {planLabel(
                      showSubscriptionModal.plan_id
                    )}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Status</span>

                  <strong>
                    {showSubscriptionModal.status ||
                      "Unknown"}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Start Date</span>

                  <strong>
                    {formatDate(
                      showSubscriptionModal.start_date
                    )}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>End Date</span>

                  <strong>
                    {formatDate(
                      showSubscriptionModal.end_date ||
                        showSubscriptionModal.current_period_end
                    )}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Customer Email</span>

                  <strong>
                    {customerEmail(
                      showSubscriptionModal.customer_id
                    )}
                  </strong>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              {normaliseStatus(
                showSubscriptionModal.status
              ) === "active" && (
                <button
                  className="modal-action danger"
                  disabled={
                    actionLoading ===
                    showSubscriptionModal.id
                  }
                  onClick={async () => {
                    await cancelSubscription(
                      showSubscriptionModal.id
                    );

                    setShowSubscriptionModal(null);
                  }}
                >
                  {actionLoading ===
                  showSubscriptionModal.id
                    ? "Cancelling..."
                    : "Cancel Subscription"}
                </button>
              )}

              <button
                className="modal-action"
                onClick={() =>
                  setShowSubscriptionModal(null)
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvoiceModal && (
        <div
          className="modal-backdrop"
          onClick={() =>
            setShowInvoiceModal(null)
          }
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <h3>
                {showInvoiceModal.invoice_number ||
                  `INV-${showInvoiceModal.id}`}
              </h3>

              <button
                className="modal-close"
                onClick={() =>
                  setShowInvoiceModal(null)
                }
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span>Customer</span>

                  <strong>
                    {customerLabel(
                      showInvoiceModal.customer_id
                    )}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Customer Email</span>

                  <strong>
                    {customerEmail(
                      showInvoiceModal.customer_id
                    )}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Plan</span>

                  <strong>
                    {planLabel(
                      showInvoiceModal.plan_id
                    )}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Status</span>

                  <strong>
                    {showInvoiceModal.status ||
                      "Unknown"}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Issue Date</span>

                  <strong>
                    {formatDate(
                      showInvoiceModal.issue_date
                    )}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Due Date</span>

                  <strong>
                    {formatDate(
                      showInvoiceModal.due_date
                    )}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Amount</span>

                  <strong>
                    {money(
                      Number(
                        showInvoiceModal.total ??
                          showInvoiceModal.amount ??
                          0
                      )
                    )}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Tax</span>

                  <strong>
                    {showInvoiceModal.tax != null
                      ? money(
                          Number(
                            showInvoiceModal.tax
                          )
                        )
                      : "—"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="modal-action primary"
                onClick={() =>
                  downloadInvoice(
                    showInvoiceModal
                  )
                }
              >
                <Download
                  size={13}
                  style={{
                    marginRight: 6,
                    verticalAlign: "middle",
                  }}
                />
                Download PDF
              </button>

              <button
                className="modal-action"
                onClick={() =>
                  setShowInvoiceModal(null)
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const start =
    totalItems === 0
      ? 0
      : (currentPage - 1) * pageSize + 1;

  const end = Math.min(
    currentPage * pageSize,
    totalItems
  );

  return (
    <div className="pagination">
      <span>
        Showing {start}–{end} of {totalItems}
      </span>

      <div className="pagination-controls">
        <button
          className="pagination-button"
          disabled={currentPage <= 1}
          onClick={onPrevious}
        >
          <ChevronLeft size={14} />
        </button>

        <span className="pagination-page">
          Page {currentPage} of {totalPages}
        </span>

        <button
          className="pagination-button"
          disabled={currentPage >= totalPages}
          onClick={onNext}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}