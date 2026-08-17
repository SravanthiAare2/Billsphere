import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { getCurrentUser } from "../assets/services/api";
import UserDashboard from "./UserDashboard";
import AdminDashboard from "./AdminDashboard";
import Skeleton from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import AppShell from "../components/layout/AppShell";
import Card from "../components/common/Card";

function Dashboard() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then((user) => setRole(user.role))
      .catch(() => setError("Could not verify your account. Please refresh or log in again."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="kpi-card"><Skeleton className="h-20 rounded-[12px]" /></Card>
            <Card className="kpi-card"><Skeleton className="h-20 rounded-[12px]" /></Card>
            <Card className="kpi-card"><Skeleton className="h-20 rounded-[12px]" /></Card>
            <Card className="kpi-card"><Skeleton className="h-20 rounded-[12px]" /></Card>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="chart-card"><Skeleton className="h-[320px] rounded-[28px]" /></Card>
            <Card className="chart-card"><Skeleton className="h-[320px] rounded-[28px]" /></Card>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <EmptyState
          title="Unable to load dashboard"
          description={error}
          primaryAction={{ label: "Retry", path: "/dashboard" }}
          secondaryAction={{ label: "Sign in again", path: "/login" }}
          icon={<AlertTriangle size={24} />}
        />
      </AppShell>
    );
  }

  return (
  <AppShell>
    <div className="mb-4 flex justify-end">
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-slate-50/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300">
        {role === "admin" ? "Admin" : "Customer"}
      </span>
    </div>
    {role === "admin" ? <AdminDashboard /> : <UserDashboard />}
  </AppShell>
);
}

export default Dashboard;
