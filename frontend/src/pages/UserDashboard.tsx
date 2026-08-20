import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
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
  Sparkles,
  User,
  Wallet,
  X,
  XCircle,
  Clock3,
  History,
} from "lucide-react";

import {
  getMySubscriptions,
  getPlan,
  getMyInvoices,
  getMyPayments,
  getCurrentUser,
  cancelSubscription,
  renewSubscription,
  extendSubscription,
  convertTrialToPaid,
} from "../services/api";

import { useToast } from "../components/ToastProvider";

interface Subscription {
  id: number;
  plan_id: number;
  plan_name?: string | null;
  billing_interval?: string | null;
  billing_cycle?: string | null;
  price?: number | null;
  status: string;
  trial_ends_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  next_billing_date?: string | null;
  cancel_at_period_end: boolean;
  start_date?: string | null;
}

function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "₹0.00";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function shortDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function UserDashboard() {
  const { notify } = useToast();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  // =====================================================
  // CURRENT USER
  // =====================================================

  const [userName, setUserName] = useState("Customer");

  async function loadCurrentUser() {
    try {
      const user = await getCurrentUser();

      const firstName =
        typeof user?.first_name === "string"
          ? user.first_name.trim()
          : "";

      const lastName =
        typeof user?.last_name === "string"
          ? user.last_name.trim()
          : "";

      const displayName =
        firstName ||
        lastName ||
        "Customer";

      setUserName(displayName);
    } catch {
      setUserName("Customer");
    }
  }

  // =====================================================
  // LOAD CUSTOMER BILLING DATA
  // =====================================================

  async function loadSubscriptions() {
    setLoading(true);

    try {
      const [data, invoiceData, paymentData] = await Promise.all([
        getMySubscriptions(),
        getMyInvoices(),
        getMyPayments(),
      ]);

      const subscriptionItems: Subscription[] = Array.isArray(data)
        ? data
        : data
        ? [data]
        : [];

      let checkoutIdentity: {
        subscription_id?: number;
        plan_id?: number;
      } = {};

      try {
        checkoutIdentity = JSON.parse(
          localStorage.getItem(
            "billsphere_last_successful_checkout"
          ) || "{}"
        );
      } catch {
        checkoutIdentity = {};
      }

      const matchedCheckout = subscriptionItems.find(
        (subscription) =>
          subscription.id === checkoutIdentity.subscription_id &&
          subscription.plan_id === checkoutIdentity.plan_id &&
          ["active", "trial", "past_due"].includes(
            subscription.status
          )
      );

      const currentItem =
        matchedCheckout ||
        subscriptionItems
          .filter((subscription) =>
            ["active", "trial", "past_due"].includes(
              subscription.status
            )
          )
          .sort((left, right) => {
            const leftDate = new Date(
              left.start_date ||
                left.current_period_start ||
                0
            ).getTime();

            const rightDate = new Date(
              right.start_date ||
                right.current_period_start ||
                0
            ).getTime();

            return rightDate - leftDate || right.id - left.id;
          })[0] ||
        subscriptionItems[0];

      const plan = currentItem
        ? await getPlan(currentItem.plan_id)
        : null;

      setSubscriptions(
        subscriptionItems.map((subscription) => ({
          ...subscription,
          plan_name:
            plan &&
            subscription.plan_id === currentItem?.plan_id
              ? plan.name
              : undefined,
          price:
            plan &&
            subscription.plan_id === currentItem?.plan_id
              ? plan.price
              : undefined,
          billing_interval:
            plan &&
            subscription.plan_id === currentItem?.plan_id
              ? plan.billing_cycle
              : subscription.billing_cycle,
        }))
      );

      setInvoices(
        Array.isArray(invoiceData)
          ? invoiceData
          : invoiceData
          ? [invoiceData]
          : []
      );

      setPayments(
        Array.isArray(paymentData)
          ? paymentData
          : paymentData
          ? [paymentData]
          : []
      );
    } catch (error: any) {
      notify({
        title: "Subscription load failed",
        description:
          error?.message ||
          "Unable to fetch your current subscription status.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCurrentUser();
    loadSubscriptions();
  }, []);

  // =====================================================
  // CURRENT SUBSCRIPTION
  // =====================================================

  const currentSubscription = useMemo(() => {
    return (
      subscriptions.find(
        (sub) =>
          sub.status === "active" ||
          sub.status === "trial" ||
          sub.status === "past_due"
      ) || null
    );
  }, [subscriptions]);

  const activeSubscriptions = useMemo(() => {
    return subscriptions.filter(
      (sub) =>
        sub.status === "active" ||
        sub.status === "trial"
    );
  }, [subscriptions]);

  const subscriptionStatus =
    currentSubscription?.status || "inactive";

  const planPrice = Number(
    currentSubscription?.price || 0
  );

  const currentInvoice = useMemo(
    () =>
      invoices.find(
        (invoice) =>
          invoice.subscription_id ===
          currentSubscription?.id
      ) ||
      invoices[0] ||
      null,
    [invoices, currentSubscription]
  );

  const currentPayment = useMemo(
    () =>
      payments.find(
        (payment) =>
          payment.invoice_id === currentInvoice?.id
      ) ||
      payments[0] ||
      null,
    [payments, currentInvoice]
  );

  const nextBill =
    currentSubscription?.next_billing_date ||
    currentSubscription?.current_period_end;

  // =====================================================
  // SUBSCRIPTION ACTION
  // =====================================================

  async function runAction(
    id: number,
    action: () => Promise<any>,
    successMessage: string
  ) {
    setActionId(id);

    try {
      await action();

      notify({
        title: "Success",
        description: successMessage,
        variant: "success",
      });

      await loadSubscriptions();
    } catch (error: any) {
      notify({
        title: "Action failed",
        description:
          error?.message ||
          "Something went wrong. Please try again.",
        variant: "error",
      });
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* =====================================================
          LUXURY BILLSPHERE STYLES
      ===================================================== */}

      <style>
        {`
          .bs-gold {
            color: #D6B36A;
          }

          .bs-panel {
            background:
              linear-gradient(
                145deg,
                rgba(255,255,255,0.045),
                rgba(255,255,255,0.015)
              );

            border: 1px solid rgba(214,179,106,0.16);

            box-shadow:
              0 18px 55px rgba(0,0,0,0.35),
              inset 0 1px 0 rgba(255,255,255,0.025);

            transition:
              border-color .25s ease,
              transform .25s ease,
              box-shadow .25s ease;
          }

          .bs-panel:hover {
            border-color: rgba(214,179,106,0.30);

            box-shadow:
              0 20px 65px rgba(0,0,0,0.45),
              inset 0 1px 0 rgba(255,255,255,0.035);
          }

          .bs-gold-button {
            background:
              linear-gradient(
                135deg,
                #E7CB8B,
                #B8904B
              );

            color: #090909;

            box-shadow:
              0 8px 28px rgba(214,179,106,0.16);

            transition:
              transform .2s ease,
              filter .2s ease;
          }

          .bs-gold-button:hover {
            filter: brightness(1.07);
            transform: translateY(-1px);
          }

          .bs-sidebar-item {
            transition:
              background .2s ease,
              color .2s ease;
          }

          .bs-sidebar-item:hover {
            background: rgba(214,179,106,0.07);
            color: #E7CB8B;
          }

          .bs-sidebar-active {
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

          .bs-scroll::-webkit-scrollbar {
            width: 5px;
          }

          .bs-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .bs-scroll::-webkit-scrollbar-thumb {
            background: rgba(214,179,106,0.25);
            border-radius: 20px;
          }

          .bs-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(214,179,106,0.4);
          }
        `}
      </style>

      {/* =====================================================
          TOP HEADER
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

                <span className="text-lg font-black tracking-tight bs-gold">
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

          {/* USER */}

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
                  className="bs-gold"
                />

              </div>

              <div className="hidden text-left sm:block">

                <p className="text-sm font-medium text-white">
                  {userName}
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

        <Sidebar />

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

            <Sidebar
              onNavigate={() => setMobileMenu(false)}
            />

          </aside>

        </div>
      )}

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="ml-0 min-h-screen pt-[72px] lg:ml-[235px]">

        <div className="mx-auto max-w-[1550px] px-5 py-7 md:px-8 lg:px-10">

          {/* =================================================
              WELCOME
          ================================================= */}

          <section className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">

            <div>

              <div className="mb-2 flex items-center gap-2">

                <Sparkles
                  size={14}
                  className="bs-gold"
                />

                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D6B36A]/70">
                  Customer Overview
                </p>

              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Hello {userName}, welcome back 👋
              </h1>

              <p className="mt-2 text-sm text-white/45">
                Here's what's happening with your billing today.
              </p>

            </div>

            <Link
              to="/customer/plans"
              className="bs-gold-button inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em]"
            >
              Explore Plans
              <ArrowRight size={15} />
            </Link>

          </section>

          {/* =================================================
              STAT CARDS
          ================================================= */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <StatCard
              label="Current Plan"
              value={
                currentSubscription?.plan_name ||
                "No Plan"
              }
              sub={
                currentSubscription
                  ? `${money(
                      currentSubscription.price
                    )} / ${
                      currentSubscription.billing_interval ||
                      "month"
                    }`
                  : "Choose a plan to get started"
              }
              icon={<Package size={18} />}
              gold
            />

            <StatCard
              label="Next Bill"
              value={
                currentSubscription
                  ? money(
                      currentInvoice?.total_amount ??
                        planPrice
                    )
                  : "—"
              }
              sub={
                currentSubscription
                  ? formatDate(nextBill)
                  : "No upcoming bill"
              }
              icon={<CalendarDays size={18} />}
            />

            <StatCard
              label="Billing"
              value={
                currentPayment
                  ? money(currentPayment.amount)
                  : "₹0.00"
              }
              sub={
                currentPayment
                  ? `${currentPayment.status} payment${
                      currentInvoice?.invoice_number
                        ? ` • ${currentInvoice.invoice_number}`
                        : ""
                    }`
                  : "No billing yet"
              }
              icon={<Wallet size={18} />}
            />

            <StatCard
              label="Subscription"
              value={subscriptionStatus.replace(
                "_",
                " "
              )}
              sub={
                activeSubscriptions.length > 0
                  ? "Subscription in good standing"
                  : "No active subscription"
              }
              icon={
                subscriptionStatus === "active" ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <XCircle size={18} />
                )
              }
              status={subscriptionStatus}
            />

          </section>

          {/* =================================================
              SUBSCRIPTION + QUICK ACTIONS
          ================================================= */}

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">

            <SubscriptionPanel
              subscription={currentSubscription}
              loading={loading}
              busy={
                currentSubscription
                  ? actionId === currentSubscription.id
                  : false
              }
              onExtend={() => {
                if (!currentSubscription) return;

                runAction(
                  currentSubscription.id,
                  () =>
                    extendSubscription(
                      currentSubscription.id
                    ),
                  `${currentSubscription.plan_name} extended by one billing cycle.`
                );
              }}
              onCancelPeriodEnd={() => {
                if (!currentSubscription) return;

                runAction(
                  currentSubscription.id,
                  () =>
                    cancelSubscription(
                      currentSubscription.id,
                      "Cancel at period end"
                    ),
                  `${currentSubscription.plan_name} will cancel at the end of the billing period.`
                );
              }}
              onCancelImmediate={() => {
                if (!currentSubscription) return;

                runAction(
                  currentSubscription.id,
                  () =>
                    cancelSubscription(
                      currentSubscription.id,
                      "Immediate cancellation"
                    ),
                  `${currentSubscription.plan_name} cancelled immediately.`
                );
              }}
              onRenew={() => {
                if (!currentSubscription) return;

                runAction(
                  currentSubscription.id,
                  () =>
                    renewSubscription(
                      currentSubscription.id
                    ),
                  `${currentSubscription.plan_name} renewed successfully.`
                );
              }}
              onConvertTrial={() => {
                if (!currentSubscription) return;

                runAction(
                  currentSubscription.id,
                  () =>
                    convertTrialToPaid(
                      currentSubscription.id
                    ),
                  `${currentSubscription.plan_name} is now a paid subscription.`
                );
              }}
            />

            <QuickActions />

          </section>

          {/* =================================================
              BILLING OVERVIEW
          ================================================= */}

          <section className="mt-5">

            <div className="mb-3 flex items-center justify-between">

              <div>

                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D6B36A]/70">
                  Billing Overview
                </p>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  Spending & activity
                </h2>

              </div>

              <Link
                to="/customer/invoices"
                className="flex items-center gap-1 text-xs text-white/40 hover:text-[#D6B36A]"
              >
                View invoices
                <ChevronRight size={14} />
              </Link>

            </div>

            <div className="bs-panel rounded-2xl p-5 md:p-6">

              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">

                <div>

                  <p className="text-xs text-white/35">
                    Current billing period
                  </p>

                  <p className="mt-1 text-xl font-semibold text-white">

                    {currentSubscription
                      ? `${shortDate(
                          currentSubscription.current_period_start
                        )} — ${shortDate(
                          currentSubscription.current_period_end
                        )}`
                      : "No active billing period"}

                  </p>

                </div>

                <div className="text-left md:text-right">

                  <p className="text-xs text-white/35">
                    Recurring amount
                  </p>

                  <p className="mt-1 text-xl font-semibold bs-gold">

                    {currentSubscription
                      ? money(
                          currentSubscription.price
                        )
                      : "₹0.00"}

                  </p>

                </div>

              </div>

              {/* GRAPH */}

              <div className="mt-7">

                <div className="flex h-[150px] items-end gap-2 md:gap-3">

                  {[
                    35,
                    48,
                    42,
                    61,
                    52,
                    72,
                    66,
                    81,
                    70,
                    90,
                    76,
                    96,
                  ].map((height, index) => (

                    <div
                      key={index}
                      className="group flex h-full flex-1 items-end"
                    >

                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-[#806533]/30 to-[#D6B36A]/70 transition-all group-hover:from-[#806533]/50 group-hover:to-[#E7CB8B]"
                        style={{
                          height: `${height}%`,
                        }}
                      />

                    </div>

                  ))}

                </div>

                <div className="mt-3 flex justify-between text-[10px] text-white/25">

                  {[
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                  ].map((month) => (
                    <span key={month}>
                      {month}
                    </span>
                  ))}

                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              RECENT ACTIVITY
          ================================================= */}

          <section className="mt-8">

            <div className="mb-3 flex items-center justify-between">

              <div>

                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D6B36A]/70">
                  Recent Billing Activity
                </p>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  Latest account events
                </h2>

              </div>

              <Link
                to="/customer/invoices"
                className="flex items-center gap-1 text-xs text-white/40 hover:text-[#D6B36A]"
              >
                View all
                <ChevronRight size={14} />
              </Link>

            </div>

            <div className="bs-panel divide-y divide-white/[0.06] overflow-hidden rounded-2xl">

              <ActivityRow
                icon={<CheckCircle2 size={17} />}
                title="Subscription status"
                detail={
                  currentSubscription
                    ? `${currentSubscription.plan_name || "Plan"} • ${currentSubscription.status}`
                    : "No active subscription"
                }
                time={
                  currentSubscription?.current_period_start
                    ? shortDate(
                        currentSubscription.current_period_start
                      )
                    : "—"
                }
                positive={
                  currentSubscription?.status ===
                  "active"
                }
              />

              <ActivityRow
                icon={<Receipt size={17} />}
                title="Billing cycle"
                detail={
                  currentSubscription
                    ? `Next billing ${formatDate(
                        currentSubscription.current_period_end
                      )}`
                    : "No billing cycle"
                }
                time="Upcoming"
              />

              <ActivityRow
                icon={<RefreshCw size={17} />}
                title="Account billing"
                detail={
                  currentSubscription
                    ? money(currentSubscription.price)
                    : "₹0.00"
                }
                time="Current"
              />

            </div>

          </section>

          {/* =================================================
              RECENT INVOICES
          ================================================= */}

          <section className="mt-8 pb-10">

            <div className="mb-3 flex items-center justify-between">

              <div>

                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D6B36A]/70">
                  Recent Invoices
                </p>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  Your latest invoices
                </h2>

              </div>

              <Link
                to="/customer/invoices"
                className="flex items-center gap-1 text-xs text-white/40 hover:text-[#D6B36A]"
              >
                View all invoices
                <ChevronRight size={14} />
              </Link>

            </div>

            <div className="bs-panel overflow-hidden rounded-2xl">

              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">

                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#D6B36A]/15 bg-[#D6B36A]/5">

                  <Receipt
                    size={20}
                    className="bs-gold"
                  />

                </div>

                <p className="mt-4 text-sm font-medium text-white">
                  Invoice centre
                </p>

                <p className="mt-1 max-w-md text-xs leading-5 text-white/35">
                  Your generated invoices can be viewed,
                  downloaded and managed from the invoices
                  section.
                </p>

                <Link
                  to="/customer/invoices"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#D6B36A]/20 px-4 py-2 text-xs font-semibold text-[#D6B36A] transition hover:bg-[#D6B36A]/10"
                >
                  Open Invoices
                  <ArrowRight size={14} />
                </Link>

              </div>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  sub,
  icon,
  gold = false,
  status,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  gold?: boolean;
  status?: string;
}) {
  const isGood = status === "active";

  return (
    <div className="bs-panel rounded-2xl p-5">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            {label}
          </p>

          <p
            className={`mt-3 text-xl font-semibold capitalize ${
              gold
                ? "text-[#E7CB8B]"
                : "text-white"
            }`}
          >
            {value}
          </p>

        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
            gold
              ? "border-[#D6B36A]/20 bg-[#D6B36A]/10 text-[#D6B36A]"
              : "border-white/[0.07] bg-white/[0.03] text-white/45"
          }`}
        >
          {icon}
        </div>

      </div>

      <div className="mt-4 flex items-center gap-2">

        {status && (
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isGood
                ? "bg-emerald-400"
                : "bg-[#D6B36A]"
            }`}
          />
        )}

        <p className="text-[11px] text-white/35">
          {sub}
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   SUBSCRIPTION PANEL
========================================================= */

function SubscriptionPanel({
  subscription,
  loading,
  busy,
  onExtend,
  onCancelPeriodEnd,
  onCancelImmediate,
  onRenew,
  onConvertTrial,
}: {
  subscription: Subscription | null;
  loading: boolean;
  busy: boolean;
  onExtend: () => void;
  onCancelPeriodEnd: () => void;
  onCancelImmediate: () => void;
  onRenew: () => void;
  onConvertTrial: () => void;
}) {
  return (
    <div className="bs-panel rounded-2xl p-6">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D6B36A]/70">
            Current Subscription
          </p>

          <h2 className="mt-1 text-lg font-semibold text-white">
            Your active billing plan
          </h2>

        </div>

        <CreditCard
          size={20}
          className="text-[#D6B36A]/60"
        />

      </div>

      {loading ? (
        <div className="mt-7 space-y-4">

          <div className="h-5 w-40 animate-pulse rounded bg-white/5" />

          <div className="h-20 animate-pulse rounded-xl bg-white/5" />

          <div className="h-10 animate-pulse rounded-xl bg-white/5" />

        </div>
      ) : !subscription ? (

        <div className="mt-7 rounded-xl border border-dashed border-[#D6B36A]/20 bg-[#D6B36A]/[0.03] p-7 text-center">

          <Package
            size={28}
            className="mx-auto text-[#D6B36A]/60"
          />

          <p className="mt-4 text-sm font-semibold text-white">
            No active plan
          </p>

          <p className="mt-1 text-xs text-white/35">
            Choose a billing plan to start using BillSphere.
          </p>

          <Link
            to="/customer/plans"
            className="bs-gold-button mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold"
          >
            Explore Plans
            <ArrowRight size={14} />
          </Link>

        </div>

      ) : (

        <>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            <div>

              <p className="text-xs uppercase tracking-[0.18em] text-white/30">
                {subscription.billing_interval || "Billing"}
              </p>

              <h3 className="mt-1 text-2xl font-semibold text-white">
                {subscription.plan_name ||
                  `Plan #${subscription.plan_id}`}
              </h3>

              <p className="mt-1 text-sm text-[#D6B36A]">
                {money(subscription.price)}
              </p>

            </div>

            <StatusPill
              status={subscription.status}
            />

          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">

            <InfoBox
              label="Started"
              value={formatDate(
                subscription.current_period_start
              )}
            />

            <InfoBox
              label="Next billing"
              value={formatDate(
                subscription.current_period_end
              )}
            />

          </div>

          {subscription.cancel_at_period_end && (
            <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
              This subscription is scheduled to cancel at
              the end of the current billing period.
            </div>
          )}

          {subscription.status === "trial" && (
            <div className="mt-4 rounded-xl border border-[#D6B36A]/15 bg-[#D6B36A]/5 px-4 py-3">

              <div className="flex items-center gap-2">

                <Clock3
                  size={14}
                  className="text-[#D6B36A]"
                />

                <p className="text-xs text-[#E7CB8B]">
                  Trial subscription
                </p>

              </div>

              <p className="mt-1 text-[11px] text-white/35">
                Trial ends{" "}
                {formatDate(
                  subscription.trial_ends_at
                )}
              </p>

            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">

            {subscription.status === "trial" && (
              <button
                type="button"
                onClick={onConvertTrial}
                disabled={busy}
                className="bs-gold-button rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
              >
                {busy
                  ? "Processing..."
                  : "Continue to Pay"}
              </button>
            )}

            {subscription.status === "past_due" && (
              <button
                type="button"
                onClick={onRenew}
                disabled={busy}
                className="bs-gold-button rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
              >
                {busy
                  ? "Renewing..."
                  : "Renew Now"}
              </button>
            )}

            {subscription.status === "active" && (
              <button
                type="button"
                onClick={onExtend}
                disabled={busy}
                className="bs-gold-button rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
              >
                {busy
                  ? "Processing..."
                  : "Extend"}
              </button>
            )}

            {subscription.status === "active" &&
              !subscription.cancel_at_period_end && (
                <button
                  type="button"
                  onClick={onCancelPeriodEnd}
                  disabled={busy}
                  className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-medium text-white/50 hover:border-[#D6B36A]/20 hover:text-[#D6B36A] disabled:opacity-50"
                >
                  Cancel at period end
                </button>
              )}

            {(subscription.status === "active" ||
              subscription.status === "trial") && (
              <button
                type="button"
                onClick={onCancelImmediate}
                disabled={busy}
                className="rounded-xl border border-red-400/10 px-4 py-2 text-xs font-medium text-red-300/70 hover:bg-red-400/5 disabled:opacity-50"
              >
                Cancel immediately
              </button>
            )}

          </div>

        </>
      )}

    </div>
  );
}

/* =========================================================
   QUICK ACTIONS
========================================================= */

function QuickActions() {
  const actions = [
    {
      label: "Change Plan",
      description: "Upgrade or switch your plan",
      icon: <Package size={16} />,
      path: "/customer/plans",
    },
    {
      label: "View Invoices",
      description: "Open your billing documents",
      icon: <Receipt size={16} />,
      path: "/customer/invoices",
    },
    {
      label: "Payment Methods",
      description: "Manage your payment options",
      icon: <CreditCard size={16} />,
      path: "/customer/payments",
    },
    {
      label: "Billing Settings",
      description: "Manage account billing",
      icon: <Settings size={16} />,
      path: "/customer/settings",
    },
  ];

  return (
    <div className="bs-panel rounded-2xl p-6">

      <div>

        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D6B36A]/70">
          Quick Actions
        </p>

        <h2 className="mt-1 text-lg font-semibold text-white">
          Manage your account
        </h2>

      </div>

      <div className="mt-5 space-y-2">

        {actions.map((action) => (

          <Link
            key={action.label}
            to={action.path}
            className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] p-3 transition hover:border-[#D6B36A]/20 hover:bg-[#D6B36A]/5"
          >

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D6B36A]/15 bg-[#D6B36A]/5 text-[#D6B36A]">
              {action.icon}
            </div>

            <div className="min-w-0 flex-1">

              <p className="text-xs font-semibold text-white">
                {action.label}
              </p>

              <p className="mt-0.5 truncate text-[10px] text-white/30">
                {action.description}
              </p>

            </div>

            <ChevronRight
              size={15}
              className="text-white/20 transition group-hover:translate-x-0.5 group-hover:text-[#D6B36A]"
            />

          </Link>

        ))}

      </div>

    </div>
  );
}

/* =========================================================
   INFO BOX
========================================================= */

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">

      <p className="text-[10px] uppercase tracking-[0.15em] text-white/25">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium text-white">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   STATUS
========================================================= */

function StatusPill({
  status,
}: {
  status: string;
}) {
  const normalized = status.toLowerCase();

  let classes =
    "border-white/10 bg-white/5 text-white/50";

  if (normalized === "active") {
    classes =
      "border-emerald-400/15 bg-emerald-400/5 text-emerald-300";
  }

  if (normalized === "trial") {
    classes =
      "border-[#D6B36A]/20 bg-[#D6B36A]/5 text-[#E7CB8B]";
  }

  if (normalized === "past_due") {
    classes =
      "border-red-400/15 bg-red-400/5 text-red-300";
  }

  if (normalized === "cancelled") {
    classes =
      "border-red-400/10 bg-red-400/5 text-red-300/70";
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${classes}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace("_", " ")}
    </span>
  );
}

/* =========================================================
   ACTIVITY ROW
========================================================= */

function ActivityRow({
  icon,
  title,
  detail,
  time,
  positive = false,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  time: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.025]">

      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
          positive
            ? "border-emerald-400/15 bg-emerald-400/5 text-emerald-300"
            : "border-[#D6B36A]/15 bg-[#D6B36A]/5 text-[#D6B36A]"
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">

        <p className="truncate text-sm font-medium text-white">
          {title}
        </p>

        <p className="mt-0.5 truncate text-xs text-white/35">
          {detail}
        </p>

      </div>

      <span className="shrink-0 text-[11px] text-white/25">
        {time}
      </span>

    </div>
  );
}

/* =========================================================
   CUSTOMER SIDEBAR
   THIS IS THE ONLY SIDEBAR USED BY USER DASHBOARD
========================================================= */

function Sidebar({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
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

  return (
    <div className="bs-scroll flex h-full flex-col overflow-y-auto px-3 py-5">

      {/* =====================================================
          MAIN NAVIGATION
      ===================================================== */}

      <nav className="space-y-1">

        {items.map((item) => (

          <Link
            key={item.label}
            to={item.path}
            onClick={onNavigate}
            className={`bs-sidebar-item flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium ${
              item.label === "Dashboard"
                ? "bs-sidebar-active"
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

        ))}

      </nav>

      {/* =====================================================
          SUPPORT
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
        className="bs-sidebar-item flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium text-white/50"
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
        className="bs-sidebar-item mt-1 flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium text-white/50"
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
          ACCOUNT ACTIONS
      ===================================================== */}

      <div className="my-5 h-px bg-white/[0.06]" />

      {/* =====================================================
          LOGOUT
      ===================================================== */}

      <button
        type="button"
        className="bs-sidebar-item flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-medium text-white/45 hover:text-red-300"
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
            className="bs-gold"
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

      <div className="h-4 shrink-0" />

    </div>
  );
}

export default UserDashboard;