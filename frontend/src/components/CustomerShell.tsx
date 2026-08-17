import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  CreditCard,
  Gauge,
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
} from "lucide-react";

interface CustomerShellProps {
  children: ReactNode;
}

const navigation = [
  { label: "Dashboard", path: "/customer/dashboard", icon: <LayoutDashboard size={17} /> },
  { label: "My Plan", path: "/customer/subscriptions", icon: <CreditCard size={17} /> },
  { label: "Plans", path: "/plans", icon: <Package size={17} /> },
  { label: "Invoices", path: "/invoices", icon: <Receipt size={17} /> },
  { label: "Payments", path: "/payments", icon: <Wallet size={17} /> },
  { label: "Billing", path: "/billing", icon: <RefreshCw size={17} /> },
  { label: "Usage", path: "/usage", icon: <Gauge size={17} /> },
  { label: "Notifications", path: "/notifications", icon: <Bell size={17} /> },
  { label: "Settings", path: "/settings", icon: <Settings size={17} /> },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <div className="bs-scroll flex h-full flex-col overflow-y-auto px-3 py-5">
      <nav className="space-y-1">
        {navigation.map((item) => {
          const active = location.pathname === item.path;

          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={onNavigate}
              className={`bs-sidebar-item flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium ${
                active ? "bs-sidebar-active" : "text-white/50"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="my-5 h-px bg-white/[0.06]" />

      <div className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/20">
        Support
      </div>

      <Link
        to="/help"
        onClick={onNavigate}
        className="bs-sidebar-item flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium text-white/50"
      >
        <ShieldCheck size={17} />
        <span>Help & Support</span>
      </Link>

      <div className="mt-auto pt-6">
        <button
          type="button"
          className="bs-sidebar-item flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium text-white/45 hover:text-red-300"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("access_token");
            window.location.href = "/login";
          }}
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>

        <div className="mt-5 rounded-xl border border-[#D6B36A]/10 bg-[#D6B36A]/[0.03] p-3.5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="bs-gold" />
            <span className="text-[10px] font-medium text-white/50">
              Secure by design
            </span>
          </div>

          <p className="mt-2 text-[9px] leading-4 text-white/25">
            Your billing information is protected with secure authentication
            and encrypted connections.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CustomerShell({ children }: CustomerShellProps) {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <style>
        {`
          .bs-gold { color: #D6B36A; }

          .bs-panel {
            background: linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015));
            border: 1px solid rgba(214,179,106,0.16);
            box-shadow: 0 18px 55px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.025);
            transition: border-color .25s ease, box-shadow .25s ease;
          }

          .bs-panel:hover {
            border-color: rgba(214,179,106,0.24);
            box-shadow: 0 20px 65px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.035);
          }

          .bs-gold-button {
            background: linear-gradient(135deg, #E7CB8B, #B8904B);
            color: #090909;
            box-shadow: 0 8px 28px rgba(214,179,106,0.16);
            transition: transform .2s ease, filter .2s ease;
          }

          .bs-gold-button:hover:not(:disabled) {
            filter: brightness(1.07);
            transform: translateY(-1px);
          }

          .bs-sidebar-item { transition: background .2s ease, color .2s ease; }

          .bs-sidebar-item:hover {
            background: rgba(214,179,106,0.07);
            color: #E7CB8B;
          }

          .bs-sidebar-active {
            background: linear-gradient(90deg, rgba(214,179,106,0.14), rgba(214,179,106,0.025));
            color: #E7CB8B;
            border-right: 2px solid #D6B36A;
          }

          .bs-scroll::-webkit-scrollbar { width: 5px; }
          .bs-scroll::-webkit-scrollbar-thumb {
            background: rgba(214,179,106,0.25);
            border-radius: 20px;
          }
        `}
      </style>

      <header className="fixed inset-x-0 top-0 z-50 h-[72px] border-b border-white/[0.06] bg-[#090909]/95 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between px-5 lg:px-7">
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileMenu(true)}
              className="rounded-xl p-2 text-white/60 hover:bg-white/5 lg:hidden"
            >
              <Menu size={22} />
            </button>

            <Link to="/customer/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D6B36A]/30 bg-[#D6B36A]/10">
                <span className="text-lg font-black tracking-tight bs-gold">BS</span>
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

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="relative rounded-xl p-2.5 text-white/55 hover:bg-white/5 hover:text-white"
            >
              <Bell size={19} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#D6B36A]" />
            </button>

            <div className="hidden h-8 w-px bg-white/10 sm:block" />

            <button
              type="button"
              className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D6B36A]/30 bg-[#D6B36A]/10">
                <User size={16} className="bs-gold" />
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-white">Sravanthi</p>
                <p className="text-[10px] text-white/35">Customer</p>
              </div>

              <MoreVertical size={17} className="hidden text-white/30 sm:block" />
            </button>
          </div>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-[72px] z-40 hidden w-[235px] border-r border-white/[0.06] bg-[#0A0A0A] lg:block">
        <Sidebar />
      </aside>

      {mobileMenu && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileMenu(false)}
          />

          <aside className="absolute bottom-0 left-0 top-0 w-[280px] border-r border-white/10 bg-[#0A0A0A]">
            <div className="flex h-[72px] items-center justify-between border-b border-white/[0.06] px-5">
              <span className="font-bold tracking-[0.18em]">BILLSPHERE</span>

              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileMenu(false)}
                className="rounded-lg p-2 text-white/50 hover:bg-white/5"
              >
                <X size={20} />
              </button>
            </div>

            <Sidebar onNavigate={() => setMobileMenu(false)} />
          </aside>
        </div>
      )}

      <main className="ml-0 min-h-screen pt-[72px] lg:ml-[235px]">
        <div className="mx-auto max-w-[1550px] px-5 py-7 md:px-8 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
