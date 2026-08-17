import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { ChevronRight, LayoutGrid } from "lucide-react";
import Sidebar from "../components/Sidebar";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../contexts/AuthContext";
import Skeleton from "../components/Skeleton";

function DashboardLayout() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const title = location.pathname.replace("/", "").replace(/(^|\/)(.)/g, (_, __, ch) => ch.toUpperCase()) || "Dashboard";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Skeleton className="h-48 w-96 rounded-[28px]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <header className="panel flex items-center justify-between gap-4 rounded-[24px] px-4 py-4 sm:px-6">
            <div>
              <div className="section-pill">
                <LayoutGrid size={14} />
                {title}
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Premium billing operations for every customer moment.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link to="/settings" className="btn-ghost hidden sm:inline-flex">
                Open settings
                <ChevronRight size={16} />
              </Link>
            </div>
          </header>

          <div className="panel-soft rounded-[28px] p-3 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;