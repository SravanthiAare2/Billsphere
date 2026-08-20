import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  RefreshCw,
  XCircle,
} from "lucide-react";

import {
  getMySubscriptions,
  cancelSubscription,
  renewSubscription,
  extendSubscription,
  convertTrialToPaid,
} from "../assets/services/api";
import { getPlan } from "../services/api";

import { useToast } from "../components/ToastProvider";

interface Subscription {
  id: number;
  plan_id: number;
  plan_name: string | null;
  billing_interval: string | null;
  price: number | null;
  status:
    | "active"
    | "trial"
    | "pending"
    | "past_due"
    | "cancelled";
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function MyPlan() {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [subscriptions, setSubscriptions] =
    useState<Subscription[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [actionId, setActionId] =
    useState<number | null>(null);

  // =========================================================
  // LOAD SUBSCRIPTIONS
  // =========================================================

  const loadSubscriptions = async () => {
    setLoading(true);

    try {
      const data = await getMySubscriptions();
      const subscriptionItems = Array.isArray(data)
        ? data
        : data?.items || [];
      let identity: { subscription_id?: number; plan_id?: number } = {};

      try {
        identity = JSON.parse(
          localStorage.getItem("billsphere_last_successful_checkout") || "{}"
        );
      } catch {
        identity = {};
      }

      const current =
        subscriptionItems.find(
          (subscription: Subscription) =>
            subscription.id === identity.subscription_id &&
            subscription.plan_id === identity.plan_id &&
            ["active", "trial", "past_due"].includes(subscription.status)
        ) ||
        subscriptionItems
          .filter((subscription: Subscription) =>
            ["active", "trial", "past_due"].includes(subscription.status)
          )
          .sort((left: Subscription, right: Subscription) => {
            const leftDate = new Date(left.current_period_start || 0).getTime();
            const rightDate = new Date(right.current_period_start || 0).getTime();
            return rightDate - leftDate || right.id - left.id;
          })[0];

      const plan = current ? await getPlan(current.plan_id) : null;

      setSubscriptions(
        subscriptionItems.map((subscription: Subscription) => ({
          ...subscription,
          plan_name: plan && subscription.id === current?.id ? plan.name : null,
          price: plan && subscription.id === current?.id ? plan.price : null,
          billing_interval:
            plan && subscription.id === current?.id
              ? plan.billing_cycle
              : subscription.billing_interval,
        }))
      );
    } catch (error: any) {
      notify({
        title: "Unable to load plan",
        description:
          error?.message ||
          "Could not fetch your subscription details.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    loadSubscriptions();
  }, []);

  // =========================================================
  // CURRENT SUBSCRIPTION
  // =========================================================

  const currentSubscription =
    subscriptions.find(
      (sub) =>
        sub.status === "active" ||
        sub.status === "trial" ||
        sub.status === "past_due" ||
        sub.status === "pending"
    ) || null;

  // =========================================================
  // RUN SUBSCRIPTION ACTION
  // =========================================================

  const runAction = async (
    id: number,
    action: () => Promise<any>,
    successMessage: string
  ) => {
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
  };

  // =========================================================
  // LOADING STATE
  // =========================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D6B36A]">
            My Plan
          </p>

          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            Your subscription
          </h1>
        </div>

        <div className="panel h-64 animate-pulse rounded-[28px]" />
      </div>
    );
  }

  // =========================================================
  // NO ACTIVE SUBSCRIPTION
  // =========================================================

  if (!currentSubscription) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D6B36A]">
            My Plan
          </p>

          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            Your subscription
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage your current billing plan and subscription.
          </p>
        </div>

        <div className="panel rounded-[28px] p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D6B36A]/10 text-[#D6B36A]">
            <CreditCard size={28} />
          </div>

          <h2 className="mt-5 text-xl font-semibold text-slate-900 dark:text-white">
            No active subscription
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            You don't currently have a subscription.
            Explore our plans and choose the one
            that works best for you.
          </p>

          {/* =================================================
              EXPLORE PLANS
          ================================================= */}

          <button
            type="button"
            onClick={() =>
              navigate("/customer/plans")
            }
            className="mt-6 inline-flex rounded-xl bg-[#D6B36A] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#E7CB8B]"
          >
            Explore Plans
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // STATUS
  // =========================================================

  const isActive =
    currentSubscription.status === "active";

  const isTrial =
    currentSubscription.status === "trial";

  const isPastDue =
    currentSubscription.status === "past_due";

  const isPending =
    currentSubscription.status === "pending";

  // =========================================================
  // MAIN PAGE
  // =========================================================

  return (
    <div className="space-y-7">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D6B36A]">
          My Plan
        </p>

        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          Subscription
        </h1>

        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          View and manage your current billing plan.
        </p>
      </div>

      {/* =====================================================
          MAIN PLAN CARD
      ===================================================== */}

      <div className="overflow-hidden rounded-[28px] border border-[#D6B36A]/20 bg-gradient-to-br from-[#15120c] via-[#0d0d0d] to-[#080808] shadow-[0_20px_70px_rgba(0,0,0,0.35)]">

        {/* =================================================
            TOP
        ================================================= */}

        <div className="flex flex-col justify-between gap-6 border-b border-white/[0.07] p-7 sm:flex-row sm:items-start">

          <div className="flex items-start gap-4">

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#D6B36A]/25 bg-[#D6B36A]/10">
              <CreditCard
                size={25}
                className="text-[#D6B36A]"
              />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D6B36A]/70">
                Current Plan
              </p>

              <h2 className="mt-1 text-2xl font-semibold text-white">
                {currentSubscription.plan_name ||
                  `Plan #${currentSubscription.plan_id}`}
              </h2>

              <p className="mt-1 text-sm text-white/40">
                {currentSubscription.billing_interval ||
                  "Billing plan"}
              </p>
            </div>

          </div>

          <StatusBadge
            status={currentSubscription.status}
          />

        </div>

        {/* =================================================
            PRICE
        ================================================= */}

        <div className="grid gap-4 border-b border-white/[0.07] p-7 sm:grid-cols-3">

          <InfoBox
            label="Plan Price"
            value={money(
              currentSubscription.price
            )}
            gold
          />

          <InfoBox
            label="Billing Interval"
            value={
              currentSubscription.billing_interval ||
              "—"
            }
          />

          <InfoBox
            label="Subscription ID"
            value={`#${currentSubscription.id}`}
          />

        </div>

        {/* =================================================
            DATES
        ================================================= */}

        <div className="grid gap-4 p-7 md:grid-cols-2">

          <DateBox
            icon={
              <CalendarDays size={18} />
            }
            label="Current Period Started"
            value={formatDate(
              currentSubscription.current_period_start
            )}
          />

          <DateBox
            icon={
              <RefreshCw size={18} />
            }
            label="Next Billing Date"
            value={formatDate(
              currentSubscription.current_period_end
            )}
          />

        </div>

        {/* =================================================
            CANCEL NOTICE
        ================================================= */}

        {currentSubscription.cancel_at_period_end && (
          <div className="mx-7 mb-7 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">

            <div className="flex items-start gap-3">

              <Clock3
                size={18}
                className="mt-0.5 shrink-0 text-amber-300"
              />

              <div>
                <p className="text-sm font-semibold text-amber-200">
                  Cancellation scheduled
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-200/60">
                  Your subscription will remain active
                  until{" "}
                  {formatDate(
                    currentSubscription.current_period_end
                  )}
                  .
                </p>
              </div>

            </div>

          </div>
        )}

        {/* =================================================
            TRIAL NOTICE
        ================================================= */}

        {isTrial && (
          <div className="mx-7 mb-7 rounded-2xl border border-[#D6B36A]/20 bg-[#D6B36A]/5 p-4">

            <div className="flex items-start gap-3">

              <Clock3
                size={18}
                className="mt-0.5 shrink-0 text-[#D6B36A]"
              />

              <div>
                <p className="text-sm font-semibold text-[#E7CB8B]">
                  You're currently on a trial
                </p>

                <p className="mt-1 text-xs leading-5 text-white/40">
                  Trial ends on{" "}
                  {formatDate(
                    currentSubscription.trial_ends_at
                  )}
                  .
                </p>
              </div>

            </div>

          </div>
        )}

        {/* =================================================
            PAST DUE
        ================================================= */}

        {isPastDue && (
          <div className="mx-7 mb-7 rounded-2xl border border-red-400/20 bg-red-400/5 p-4">

            <div className="flex items-start gap-3">

              <XCircle
                size={18}
                className="mt-0.5 shrink-0 text-red-300"
              />

              <div>
                <p className="text-sm font-semibold text-red-200">
                  Payment required
                </p>

                <p className="mt-1 text-xs leading-5 text-red-200/60">
                  Your subscription is past due.
                  Renew your plan to continue using
                  the service.
                </p>
              </div>

            </div>

          </div>
        )}

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="flex flex-wrap gap-3 border-t border-white/[0.07] p-7">

          {isPastDue && (
            <button
              disabled={
                actionId ===
                currentSubscription.id
              }
              onClick={() =>
                runAction(
                  currentSubscription.id,
                  () =>
                    renewSubscription(
                      currentSubscription.id
                    ),
                  "Your subscription has been renewed."
                )
              }
              className="rounded-xl bg-[#D6B36A] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#E7CB8B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Renew Now
            </button>
          )}

          {isTrial && (
            <button
              disabled={
                actionId ===
                currentSubscription.id
              }
              onClick={() =>
                runAction(
                  currentSubscription.id,
                  () =>
                    convertTrialToPaid(
                      currentSubscription.id
                    ),
                  "Your trial has been converted to a paid subscription."
                )
              }
              className="rounded-xl bg-[#D6B36A] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#E7CB8B] disabled:opacity-50"
            >
              Continue to Paid Plan
            </button>
          )}

          {isActive &&
            !currentSubscription.cancel_at_period_end && (
              <>
                <button
                  disabled={
                    actionId ===
                    currentSubscription.id
                  }
                  onClick={() =>
                    runAction(
                      currentSubscription.id,
                      () =>
                        extendSubscription(
                          currentSubscription.id
                        ),
                      "Your subscription has been extended by one billing cycle."
                    )
                  }
                  className="rounded-xl bg-[#D6B36A] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#E7CB8B] disabled:opacity-50"
                >
                  Extend Plan
                </button>

                <button
                  disabled={
                    actionId ===
                    currentSubscription.id
                  }
                  onClick={() =>
                    runAction(
                      currentSubscription.id,
                      () =>
                        cancelSubscription(
                          currentSubscription.id,
                          false
                        ),
                      "Your subscription will cancel at the end of the billing period."
                    )
                  }
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-white/60 transition hover:border-[#D6B36A]/30 hover:text-[#D6B36A] disabled:opacity-50"
                >
                  Cancel at Period End
                </button>

                <button
                  disabled={
                    actionId ===
                    currentSubscription.id
                  }
                  onClick={() =>
                    runAction(
                      currentSubscription.id,
                      () =>
                        cancelSubscription(
                          currentSubscription.id,
                          true
                        ),
                      "Your subscription has been cancelled immediately."
                    )
                  }
                  className="rounded-xl border border-red-400/10 px-5 py-3 text-sm font-medium text-red-300/70 transition hover:border-red-400/30 hover:text-red-300 disabled:opacity-50"
                >
                  Cancel Immediately
                </button>
              </>
            )}

          {isPending && (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-3 text-sm text-white/50">
              <Clock3 size={16} />
              Plan pending
            </div>
          )}

        </div>
      </div>

      {/* =====================================================
          PLAN BENEFITS / SECURITY
      ===================================================== */}

      <div className="grid gap-5 md:grid-cols-2">

        <div className="panel rounded-[24px] p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D6B36A]/10 text-[#D6B36A]">
              <CheckCircle2 size={19} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Subscription Benefits
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your current plan is active on BillSphere.
              </p>
            </div>

          </div>

          <div className="mt-5 space-y-3">

            <Benefit text="Automatic billing management" />

            <Benefit text="Invoice generation and history" />

            <Benefit text="Secure payment processing" />

            <Benefit text="Subscription lifecycle management" />

          </div>

        </div>

        <div className="panel rounded-[24px] p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D6B36A]/10 text-[#D6B36A]">
              <CheckCircle2 size={19} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Billing Security
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your account is protected.
              </p>
            </div>

          </div>

          <p className="mt-5 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Your subscription and billing information is
            protected through secure authentication and
            encrypted connections.
          </p>

        </div>

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
  gold = false,
}: {
  label: string;
  value: string;
  gold?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">

      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
        {label}
      </p>

      <p
        className={`mt-2 text-lg font-semibold ${
          gold
            ? "text-[#E7CB8B]"
            : "text-white"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   DATE BOX
========================================================= */

function DateBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">

      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D6B36A]/10 text-[#D6B36A]">
        {icon}
      </div>

      <div>

        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
          {label}
        </p>

        <p className="mt-1 text-sm font-semibold text-white">
          {value}
        </p>

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
  const config = {
    active: {
      label: "ACTIVE",
      className:
        "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    },

    trial: {
      label: "TRIAL",
      className:
        "border-[#D6B36A]/20 bg-[#D6B36A]/10 text-[#E7CB8B]",
    },

    pending: {
      label: "PENDING",
      className:
        "border-amber-400/20 bg-amber-400/10 text-amber-300",
    },

    past_due: {
      label: "PAST DUE",
      className:
        "border-red-400/20 bg-red-400/10 text-red-300",
    },

    cancelled: {
      label: "CANCELLED",
      className:
        "border-white/10 bg-white/5 text-white/40",
    },
  };

  const current =
    config[
      status as keyof typeof config
    ] || config.cancelled;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] ${current.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />

      {current.label}
    </span>
  );
}

/* =========================================================
   BENEFIT
========================================================= */

function Benefit({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">

      <CheckCircle2
        size={16}
        className="shrink-0 text-[#D6B36A]"
      />

      <span className="text-sm text-slate-600 dark:text-slate-300">
        {text}
      </span>

    </div>
  );
}

export default MyPlan;