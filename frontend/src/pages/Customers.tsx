import { useEffect, useState } from "react";
import { Users, UserPlus, Trash2, Mail, Globe, Calendar, Filter, Download, ShieldAlert } from "lucide-react";
import * as XLSX from "xlsx";
import { getCustomersAdmin, createCustomer, deleteCustomer, getPlans } from "../assets/services/api";
import { useAuth } from "../contexts/AuthContext";
import PageHeader from "../components/PageHeader";
import Card from "../components/common/Card";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { useToast } from "../components/ToastProvider";
import AppShell from "../components/layout/AppShell";
import DataTable from "../components/table/DataTable";
import StatusBadge from "../components/StatusBadge";

interface AdminCustomer {
  id: number;
  name: string;
  email: string;
  billing_country: string;
  created_at: string;
  platform: string | null;
  plan_type: string | null;
  payment_status: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
}

interface PlanOption {
  id: number;
  name: string;
}

const emptyCustomerForm = { name: "", email: "", billing_country: "US" };

function Customers() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { notify } = useToast();

  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter states
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [planTypeFilter, setPlanTypeFilter] = useState("");

  // Available platforms for dropdown filter
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);

  // Add Customer modal / form state
  const [form, setForm] = useState(emptyCustomerForm);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadCustomers();
    loadPlatforms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStatusFilter, platformFilter, planTypeFilter]);

  async function loadCustomers() {
    try {
      setLoading(true);
      const data = await getCustomersAdmin({
        payment_status: paymentStatusFilter || undefined,
        platform: platformFilter || undefined,
        plan_type: planTypeFilter || undefined,
      });
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load customer list");
      notify({
        title: "Customer load failed",
        description: err.message,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadPlatforms() {
    try {
      const plans = await getPlans();
      const names = Array.from(new Set(plans.map((p: PlanOption) => p.name))) as string[];
      setAvailablePlatforms(names);
    } catch (err) {
      // Ignore fallback if plans cannot be loaded
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createCustomer(form);
      notify({
        title: "Customer Added & Invited",
        description: `Customer account created. An invite email was sent to ${form.email} to set their password.`,
        variant: "success",
      });
      setForm(emptyCustomerForm);
      loadCustomers();
    } catch (err: any) {
      notify({
        title: "Could not add customer",
        description: err.message,
        variant: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteCustomer(customer: AdminCustomer) {
    if (!window.confirm(`Delete customer "${customer.name}"? This removes their customer roster entry.`)) {
      return;
    }

    setDeletingId(customer.id);
    try {
      await deleteCustomer(customer.id);
      notify({
        title: "Customer Deleted",
        description: `Removed "${customer.name}" from customer roster.`,
        variant: "success",
      });
      loadCustomers();
    } catch (err: any) {
      notify({
        title: "Deletion Failed",
        description: err.message,
        variant: "error",
      });
    } finally {
      setDeletingId(null);
    }
  }

  const getBadgeVariant = (status: string): "success" | "warning" | "info" | "danger" | "neutral" => {
    switch (status) {
      case "active":
      case "paid":
        return "success";
      case "past_due":
      case "unpaid":
        return "warning";
      case "trial":
        return "info";
      case "cancelled":
        return "danger";
      default:
        return "neutral";
    }
  };

  const formatStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Paid";
      case "past_due":
        return "Unpaid";
      case "trial":
        return "Trial";
      case "cancelled":
        return "Cancelled";
      default:
        return "No Subscription";
    }
  };

  function exportToExcel() {
    const rows = customers.map((c) => ({
      ID: c.id,
      Name: c.name,
      Email: c.email,
      Country: c.billing_country,
      Platform: c.platform || "-",
      "Plan Type": c.plan_type || "-",
      Status: formatStatusLabel(c.payment_status),
      "Period End / Trial End": (c.current_period_end || c.trial_ends_at)
        ? new Date(c.current_period_end || c.trial_ends_at!).toLocaleDateString()
        : "-",
      "Created At": new Date(c.created_at).toLocaleString(),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, `billsphere-customers-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <EmptyState
          title="Access Restricted"
          description="Only administrator accounts are authorized to view and manage customer directories."
          primaryAction={{ label: "Go to Dashboard", path: "/dashboard" }}
          icon={<ShieldAlert size={24} />}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="fade-in space-y-8">
        <PageHeader
          eyebrow="CRM · Administration"
          title="Customer directory"
          description="Manage customer accounts, track subscription statuses, and dispatch invite links."
          action={
            <span className="inline-flex items-center gap-2">
              <Users size={16} />
              {customers.length} Accounts
            </span>
          }
        />

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Add New Customer Form */}
        <Card title="Add a new customer">
          <form onSubmit={handleCreateCustomer} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Sarah Connor"
                  required
                  value={form.name}
                  onChange={handleInputChange}
                  className="input-field mt-1.5"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. sarah@example.com"
                  required
                  value={form.email}
                  onChange={handleInputChange}
                  className="input-field mt-1.5"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Country Code
                </label>
                <input
                  type="text"
                  name="billing_country"
                  placeholder="e.g. US, IN, UK"
                  required
                  maxLength={5}
                  value={form.billing_country}
                  onChange={handleInputChange}
                  className="input-field mt-1.5 uppercase"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                💡 Adding a new email will automatically dispatch an invitation email with a password-set link.
              </p>
              <button
                type="submit"
                disabled={creating}
                className="btn-primary inline-flex items-center gap-2 px-6"
              >
                <UserPlus size={16} />
                {creating ? "Adding Customer..." : "Add & Send Invite"}
              </button>
            </div>
          </form>
        </Card>

        {/* Filter Controls & Customers Table */}
        <Card title="All customers">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Filter size={14} /> Filters:
            </div>

            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="input-field w-auto text-xs"
            >
              <option value="">All Payment Statuses</option>
              <option value="paid">Paid (Active)</option>
              <option value="unpaid">Unpaid (Past Due)</option>
              <option value="trial">Trial</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="input-field w-auto text-xs"
            >
              <option value="">All Platforms / Plans</option>
              {availablePlatforms.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={planTypeFilter}
              onChange={(e) => setPlanTypeFilter(e.target.value)}
              className="input-field w-auto text-xs"
            >
              <option value="">All Plan Intervals</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>

            {(paymentStatusFilter || platformFilter || planTypeFilter) && (
              <button
                onClick={() => {
                  setPaymentStatusFilter("");
                  setPlatformFilter("");
                  setPlanTypeFilter("");
                }}
                className="btn-ghost text-xs text-blue-600"
              >
                Reset Filters
              </button>
            )}

            <button
              onClick={exportToExcel}
              className="btn-ghost ml-auto inline-flex items-center gap-2 text-xs"
            >
              <Download size={14} />
              Export to Excel
            </button>
          </div>

          {loading ? (
            <Skeleton className="h-64 rounded-[24px]" />
          ) : customers.length === 0 ? (
            <EmptyState
              title="No customers found"
              description="No customer records match your current filter selection or roster."
              icon={<Users size={24} />}
            />
          ) : (
            <DataTable
              columns={[
                { key: "id", title: "ID" },
                {
                  key: "name",
                  title: "Customer",
                  render: (c: AdminCustomer) => (
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{c.name}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Mail size={12} /> {c.email}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "billing_country",
                  title: "Country",
                  render: (c: AdminCustomer) => (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                      <Globe size={12} className="text-slate-400" /> {c.billing_country}
                    </span>
                  ),
                },
                {
                  key: "platform",
                  title: "Platform",
                  render: (c: AdminCustomer) => (
                    <span className="font-medium text-slate-900 dark:text-white">
                      {c.platform || <span className="text-xs text-slate-400">None</span>}
                    </span>
                  ),
                },
                {
                  key: "plan_type",
                  title: "Billing Cycle",
                  render: (c: AdminCustomer) => (
                    <span className="capitalize text-slate-600 dark:text-slate-300">
                      {c.plan_type || "—"}
                    </span>
                  ),
                },
                {
                  key: "payment_status",
                  title: "Status",
                  render: (c: AdminCustomer) => (
                    <StatusBadge variant={getBadgeVariant(c.payment_status)}>
                      {formatStatusLabel(c.payment_status)}
                    </StatusBadge>
                  ),
                },
                {
                  key: "current_period_end",
                  title: "Renewal / Trial End",
                  render: (c: AdminCustomer) => {
                    const dateVal = c.current_period_end || c.trial_ends_at;
                    if (!dateVal) return <span className="text-xs text-slate-400">—</span>;
                    return (
                      <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                        <Calendar size={12} />
                        {new Date(dateVal).toLocaleDateString()}
                      </span>
                    );
                  },
                },
                {
                  key: "actions",
                  title: "Actions",
                  render: (c: AdminCustomer) => (
                    <button
                      onClick={() => handleDeleteCustomer(c)}
                      disabled={deletingId === c.id}
                      className="btn-ghost inline-flex items-center gap-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40"
                      title="Delete Customer"
                    >
                      <Trash2 size={14} />
                      <span className="text-xs font-semibold">Delete</span>
                    </button>
                  ),
                },
              ]}
              data={customers}
            />
          )}
        </Card>
      </div>
    </AppShell>
  );
}

export default Customers;
