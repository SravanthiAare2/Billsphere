import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Settings,
  User,
  LogOut,
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";

import ThemeToggle from "./ThemeToggle";
import { useToast } from "./ToastProvider";
import { useAuth } from "../contexts/AuthContext";

function Sidebar() {
  const navigate = useNavigate();

  const { notify } = useToast();

  const {
    user,
    logout: authLogout,
  } = useAuth();

  const isAdmin = user?.role === "admin";

  const dashboardPath = isAdmin
    ? "/admin/dashboard"
    : "/customer/dashboard";

  const menuItems = [
    {
      name: "Dashboard",
      path: dashboardPath,
      icon: <LayoutDashboard size={18} />,
    },

    ...(isAdmin
      ? [
          {
            name: "Customers",
            path: "/customers",
            icon: <Users size={18} />,
          },
        ]
      : []),

    {
      name: "Invoices",
      path: "/invoices",
      icon: <FileText size={18} />,
    },

    {
      name: "Plans",
      path: "/plans",
      icon: <CreditCard size={18} />,
    },

    {
      name: "Settings",
      path: "/settings",
      icon: <Settings size={18} />,
    },
  ];

  function logout() {
    authLogout();

    notify({
      title: "Signed out",
      description:
        "You have safely logged out of the billing workspace.",
      variant: "info",
    });

    navigate("/login");
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200/70 bg-white/80 p-4 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-950/80">
      {/* ==================================================
          BRAND
      ================================================== */}

      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-sm font-bold text-white shadow-lg dark:bg-white dark:text-black">
            BS
          </div>

          <div>
            <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              BillSphere
            </p>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Billing OS
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/70">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />

          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Secure by design
          </span>
        </div>
      </div>

      {/* ==================================================
          NAVIGATION
      ================================================== */}

      <nav
        className="flex-1 space-y-2"
        aria-label="Sidebar navigation"
      >
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-black text-white shadow-lg shadow-black/20 dark:bg-white dark:text-black"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              }`
            }
          >
            {item.icon}

            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* ==================================================
          BOTTOM CONTROLS
      ================================================== */}

      <div className="space-y-3 border-t border-slate-200/70 pt-4 dark:border-slate-700/70">
        {/* Theme */}

        <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-3 dark:border-slate-700/70 dark:bg-slate-900/70">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Theme
            </p>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Switch instantly
            </p>
          </div>

          <ThemeToggle />
        </div>

        {/* Profile */}

        <button
          onClick={() => navigate("/profile")}
          className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <User size={18} />

          <span>Profile</span>
        </button>

        {/* Logout */}

        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          <LogOut size={18} />

          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;