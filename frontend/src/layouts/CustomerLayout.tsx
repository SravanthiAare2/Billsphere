import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import {
  Bell,
  CreditCard,
  Gauge,
  Headset,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreVertical,
  Package,
  Receipt,
  RefreshCw,
  Settings,
  ShieldCheck,
  User,
  Wallet,
  X,
  History,
} from "lucide-react";

function CustomerLayout() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* =====================================================
          CUSTOMER LAYOUT STYLES
      ===================================================== */}

      <style>
        {`
          .customer-gold {
            color: #D6B36A;
          }

          .customer-sidebar-item {
            transition:
              background .2s ease,
              color .2s ease,
              border-color .2s ease;
          }

          .customer-sidebar-item:hover {
            background: rgba(214,179,106,0.07);
            color: #E7CB8B;
          }

          .customer-sidebar-active {
            background:
              linear-gradient(
                90deg,
                rgba(214,179,106,0.14),
                rgba(214,179,106,0.025)
              );

            color: #E7CB8B;

            border-right:
              2px solid #D6B36A;
          }

          .customer-scroll::-webkit-scrollbar {
            width: 5px;
          }

          .customer-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .customer-scroll::-webkit-scrollbar-thumb {
            background: rgba(214,179,106,0.25);
            border-radius: 20px;
          }

          .customer-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(214,179,106,0.4);
          }
        `}
      </style>

      {/* =====================================================
          TOP NAVBAR
      ===================================================== */}

      <header className="fixed inset-x-0 top-0 z-50 h-[72px] border-b border-white/[0.06] bg-[#090909]/95 backdrop-blur-xl">

        <div className="flex h-full items-center justify-between px-5 lg:px-7">

          {/* BRAND */}

          <div className="flex items-center gap-4">

            <button
              type="button"
              onClick={() => setMobileMenu(true)}
              className="rounded-xl p-2 text-white/60 transition hover:bg-white/5 lg:hidden"
            >
              <Menu size={22} />
            </button>

            <Link
              to="/customer/dashboard"
              className="flex items-center gap-3"
            >

              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D6B36A]/30 bg-[#D6B36A]/10">

                <span className="text-lg font-black tracking-tight customer-gold">
                  BS
                </span>

              </div>

              <div className="hidden sm:block">

                <p className="text-[15px] font-bold tracking-[0.18em] text-white">
                  BILLSPHERE
                </p>

                <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-white/35">
                  Billing OS
                </p>

              </div>

            </Link>

          </div>

          {/* USER AREA */}

          <div className="flex items-center gap-3">

            <button
              type="button"
              className="relative rounded-xl p-2.5 text-white/55 transition hover:bg-white/5 hover:text-white"
            >
              <Bell size={19} />

              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#D6B36A]" />
            </button>

            <div className="hidden h-8 w-px bg-white/10 sm:block" />

            <button
              type="button"
              className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-white/5"
            >

              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D6B36A]/30 bg-[#D6B36A]/10">

                <User
                  size={16}
                  className="customer-gold"
                />

              </div>

              <div className="hidden text-left sm:block">

                <p className="text-sm font-medium text-white">
                  Sravanthi
                </p>

                <p className="text-[10px] text-white/35">
                  Customer
                </p>

              </div>

              <MoreVertical
                size={17}
                className="hidden text-white/30 sm:block"
              />

            </button>

          </div>

        </div>

      </header>

      {/* =====================================================
          DESKTOP SIDEBAR
      ===================================================== */}

      <aside className="fixed bottom-0 left-0 top-[72px] z-40 hidden w-[235px] border-r border-white/[0.06] bg-[#0A0A0A] lg:block">

        <CustomerSidebar />

      </aside>

      {/* =====================================================
          MOBILE SIDEBAR
      ===================================================== */}

      {mobileMenu && (

        <div className="fixed inset-0 z-[100] lg:hidden">

          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileMenu(false)}
          />

          <aside className="absolute bottom-0 left-0 top-0 w-[280px] border-r border-white/10 bg-[#0A0A0A]">

            <div className="flex h-[72px] items-center justify-between border-b border-white/[0.06] px-5">

              <div>

                <p className="font-bold tracking-[0.18em] text-white">
                  BILLSPHERE
                </p>

                <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                  Billing OS
                </p>

              </div>

              <button
                type="button"
                onClick={() => setMobileMenu(false)}
                className="rounded-lg p-2 text-white/50 transition hover:bg-white/5 hover:text-white"
              >
                <X size={20} />
              </button>

            </div>

            <CustomerSidebar
              onNavigate={() => setMobileMenu(false)}
            />

          </aside>

        </div>

      )}

      {/* =====================================================
          CUSTOMER CONTENT
      ===================================================== */}

      <main className="ml-0 min-h-screen pt-[72px] lg:ml-[235px]">

        <div className="w-full px-5 py-7 md:px-8 lg:px-10">

          <Outlet />

        </div>

      </main>

    </div>
  );
}

/* =========================================================
   CUSTOMER SIDEBAR
========================================================= */

function CustomerSidebar({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {

  const location = useLocation();

  const items = [
    {
      label: "Dashboard",
      path: "/customer/dashboard",
      icon: <LayoutDashboard size={17} />,
    },

    {
      label: "My Plan",
      path: "/customer/subscriptions",
      icon: <CreditCard size={17} />,
    },

    {
      label: "Plans",
      path: "/customer/plans",
      icon: <Package size={17} />,
    },

    {
      label: "Invoices",
      path: "/customer/invoices",
      icon: <Receipt size={17} />,
    },

    {
      label: "Payments",
      path: "/customer/payments",
      icon: <Wallet size={17} />,
    },

    {
      label: "Payment History",
      path: "/customer/payment-history",
      icon: <History size={17} />,
    },

    {
      label: "Billing",
      path: "/customer/billing",
      icon: <RefreshCw size={17} />,
    },

    {
      label: "Usage",
      path: "/customer/usage",
      icon: <Gauge size={17} />,
    },

    {
      label: "Notifications",
      path: "/customer/notifications",
      icon: <Bell size={17} />,
    },

    {
      label: "Settings",
      path: "/customer/settings",
      icon: <Settings size={17} />,
    },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="customer-scroll flex h-full flex-col overflow-y-auto px-3 py-5">

      {/* =====================================================
          MAIN NAVIGATION
      ===================================================== */}

      <nav className="space-y-1">

        {items.map((item) => {

          const active = isActive(item.path);

          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={onNavigate}
              className={`customer-sidebar-item flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium ${
                active
                  ? "customer-sidebar-active"
                  : "text-white/50"
              }`}
            >

              <span className="flex shrink-0 items-center justify-center">
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>

            </Link>
          );

        })}

      </nav>

      {/* =====================================================
          SUPPORT SECTION
      ===================================================== */}

      <div className="my-5 h-px bg-white/[0.06]" />

      <div className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/20">
        Support
      </div>

      {/* =====================================================
          HELP & SUPPORT
      ===================================================== */}

      <Link
        to="/customer/help"
        onClick={onNavigate}
        className={`customer-sidebar-item flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium ${
          isActive("/customer/help")
            ? "customer-sidebar-active"
            : "text-white/50"
        }`}
      >

        <ShieldCheck
          size={17}
          className="shrink-0"
        />

        <span>
          Help & Support
        </span>

      </Link>

      {/* =====================================================
          ADMIN SUPPORT
      ===================================================== */}

      <Link
        to="/customer/admin-support"
        onClick={onNavigate}
        className={`customer-sidebar-item mt-1 flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium ${
          isActive("/customer/admin-support")
            ? "customer-sidebar-active"
            : "text-white/50"
        }`}
      >

        <Headset
          size={17}
          className="shrink-0"
        />

        <span>
          Admin Support
        </span>

      </Link>

      {/* =====================================================
          DIVIDER BEFORE ACCOUNT ACTIONS
      ===================================================== */}

      <div className="my-5 h-px bg-white/[0.06]" />

      {/* =====================================================
          LOGOUT
      ===================================================== */}

      <button
        type="button"
        className="customer-sidebar-item flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium text-white/45 hover:text-red-300"
        onClick={() => {

          localStorage.removeItem("token");
          localStorage.removeItem("access_token");

          window.location.href = "/login";

        }}
      >

        <LogOut
          size={17}
          className="shrink-0"
        />

        <span>
          Logout
        </span>

      </button>

      {/* =====================================================
          SECURITY CARD
      ===================================================== */}

      <div className="mt-5 rounded-xl border border-[#D6B36A]/10 bg-[#D6B36A]/[0.03] p-3.5">

        <div className="flex items-center gap-2">

          <ShieldCheck
            size={14}
            className="customer-gold"
          />

          <span className="text-[10px] font-medium text-white/50">
            Secure by design
          </span>

        </div>

        <p className="mt-2 text-[9px] leading-4 text-white/25">
          Your billing information is protected with
          secure authentication and encrypted
          connections.
        </p>

      </div>

      {/* Bottom spacing */}

      <div className="h-4 shrink-0" />

    </div>
  );
}

export default CustomerLayout;