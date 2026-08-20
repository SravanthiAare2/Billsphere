import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  History,
  Package,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";

import CustomerShell from "../components/CustomerShell";
import {
  cancelSubscription,
  convertTrialToPaid,
  extendSubscription,
  getMySubscriptions,
  renewSubscription,
} from "../assets/services/api";
import { useToast } from "../components/ToastProvider";

interface Subscription {
  id: number;
  plan_id: number;
  plan_name: string | null;
  billing_interval: string | null;
  price: number | null;
  status: "active" | "trial" | "pending" | "past_due" | "cancelled";
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  [key: string]: unknown;
}

type ModalMode = "period_end" | "immediate" | null;

function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) return "₹0.00";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function date(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function interval(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function subscriptionCode(id: number) {
  return `SUB-${String(id).padStart(6, "0")}`;
}

function statusLabel(status: Subscription["status"]) {
  return status.replace("_", " ");
}

function StatusPill({ status }: { status: Subscription["status"] }) {
  const styles: Record<Subscription["status"], string> = {
    active: "border-emerald-400/15 bg-emerald-400/5 text-emerald-300",
    trial: "border-[#D6B36A]/20 bg-[#D6B36A]/5 text-[#E7CB8B]",
    pending: "border-white/10 bg-white/5 text-white/55",
    past_due: "border-red-400/15 bg-red-400/5 text-red-300",
    cancelled: "border-red-400/10 bg-red-400/5 text-red-300/75",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel(status)}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className="text-[#D6B36A]/75">{icon}</span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D6B36A]/70">
          {eyebrow}
        </p>
      </div>
      <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <p className="text-[10px] uppercase tracking-[0.15em] text-white/25">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function TimelineItem({
  state,
  title,
  detail,
}: {
  state: "done" | "current" | "future";
  title: string;
  detail: string;
}) {
  const done = state === "done";
  const current = state === "current";

  return (
    <div className="relative flex gap-3">
      <div
        className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
          done
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
            : current
            ? "border-[#D6B36A]/30 bg-[#D6B36A]/10 text-[#E7CB8B]"
            : "border-white/10 bg-white/[0.03] text-white/25"
        }`}
      >
        {done ? <Check size={13} /> : current ? <Clock3 size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </div>

      <div className="pb-6">
        <p className={`text-sm font-medium ${current ? "text-[#E7CB8B]" : "text-white"}`}>
          {title}
        </p>
        <p className="mt-1 text-xs text-white/35">{detail}</p>
      </div>
    </div>
  );
}

function ConfirmModal({
  mode,
  subscription,
  busy,
  onClose,
  onConfirm,
}: {
  mode: ModalMode;
  subscription: Subscription | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!mode || !subscription) return null;

  const immediate = mode === "immediate";
  const planName = subscription.plan_name || `Plan #${subscription.plan_id}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close confirmation"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-title"
        className="relative w-full max-w-md rounded-2xl border border-[#D6B36A]/20 bg-[#101010] p-6 shadow-[0_30px_100px_rgba(0,0,0,.7)]"
      >
        <button
          type="button"
          aria-label="Close"
          disabled={busy}
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-white/35 hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          <X size={17} />
        </button>

        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
          immediate
            ? "border-red-400/15 bg-red-400/5 text-red-300"
            : "border-[#D6B36A]/20 bg-[#D6B36A]/5 text-[#E7CB8B]"
        }`}>
          {immediate ? <XCircle size={20} /> : <CalendarDays size={20} />}
        </div>

        <h3 id="cancel-title" className="mt-5 text-xl font-semibold text-white">
          {immediate ? "Cancel Immediately?" : "Cancel Subscription?"}
        </h3>

        <p className="mt-2 text-sm leading-6 text-white/45">
          {immediate
            ? `Your ${planName} subscription will be cancelled immediately. You may lose access to the current plan.`
            : `Are you sure you want to cancel your ${planName}? You can continue using your subscription until ${date(subscription.current_period_end)}.`}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs font-semibold text-white/55 hover:border-white/15 hover:text-white disabled:opacity-40"
          >
            {immediate ? "Go Back" : "Keep My Plan"}
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-400/15 disabled:opacity-40"
          >
            {busy ? "Cancelling..." : immediate ? "Cancel Now" : "Cancel Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomerSubscriptions() {
  const { notify } = useToast();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<ModalMode>(null);

  async function loadSubscriptions() {
    setLoading(true);
    setError("");

    try {
      const result = await getMySubscriptions();

      const normalized = Array.isArray(result)
        ? result
        : result
        ? [result]
        : [];

      setSubscriptions(normalized as Subscription[]);
    } catch (err: any) {
      const message =
        err?.message || "Unable to fetch your subscription information.";

      setError(message);

      notify({
        title: "Subscription load failed",
        description: message,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const currentSubscription = useMemo(() => {
    return (
      subscriptions.find((sub) =>
        ["active", "trial", "past_due"].includes(sub.status)
      ) || null
    );
  }, [subscriptions]);

  const history = useMemo(() => {
    if (!currentSubscription) return subscriptions;
    return subscriptions.filter((sub) => sub.id !== currentSubscription.id);
  }, [subscriptions, currentSubscription]);

  const price = Number(currentSubscription?.price ?? 0);
  const isActive = currentSubscription?.status === "active";
  const isTrial = currentSubscription?.status === "trial";
  const isPastDue = currentSubscription?.status === "past_due";

  async function executeAction(
    action: () => Promise<any>,
    success: string,
    closeModal = false
  ) {
    setBusy(true);

    try {
      await action();

      notify({
        title: "Success",
        description: success,
        variant: "success",
      });

      if (closeModal) setModal(null);
      await loadSubscriptions();
    } catch (err: any) {
      notify({
        title: "Action failed",
        description: err?.message || "Something went wrong. Please try again.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  function confirmCancel() {
    if (!currentSubscription) return;

    executeAction(
      () => cancelSubscription(currentSubscription.id, modal === "immediate"),
      modal === "immediate"
        ? `${currentSubscription.plan_name || "Subscription"} cancelled immediately.`
        : `${currentSubscription.plan_name || "Subscription"} will cancel at the end of the current billing period.`,
      true
    );
  }

  return (
    <CustomerShell>
      <div className="space-y-6 pb-10">
        <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={14} className="bs-gold" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#D6B36A]/70">
                Subscription Management
              </p>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              MY PLAN
            </h1>

            <p className="mt-2 text-sm text-white/45">
              Manage your current subscription, billing cycle, and plan status.
            </p>
          </div>

          <Link
            to="/plans"
            className="bs-gold-button inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em]"
          >
            Change Plan
            <ArrowRight size={15} />
          </Link>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-400/15 bg-red-400/5 p-4">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 shrink-0 text-red-300" size={18} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-200">
                  We couldn't load your subscription
                </p>
                <p className="mt-1 text-xs leading-5 text-red-200/60">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={loadSubscriptions}
                disabled={loading}
                className="rounded-lg border border-red-300/15 px-3 py-2 text-[11px] font-semibold text-red-200 hover:bg-red-300/5 disabled:opacity-40"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Current plan hero */}
        <section className="bs-panel overflow-hidden rounded-2xl">
          {loading ? (
            <div className="animate-pulse p-6 md:p-7">
              <div className="h-3 w-28 rounded bg-white/5" />
              <div className="mt-4 h-8 w-48 rounded bg-white/5" />
              <div className="mt-3 h-4 w-72 max-w-full rounded bg-white/5" />
              <div className="mt-8 grid gap-3 md:grid-cols-3">
                <div className="h-20 rounded-xl bg-white/5" />
                <div className="h-20 rounded-xl bg-white/5" />
                <div className="h-20 rounded-xl bg-white/5" />
              </div>
            </div>
          ) : !currentSubscription ? (
            <div className="p-8 text-center md:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D6B36A]/15 bg-[#D6B36A]/5">
                <Package size={24} className="text-[#D6B36A]" />
              </div>
              <p className="mt-5 text-base font-semibold text-white">
                No current subscription
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">
                Choose a plan to start your BillSphere subscription. Your plan,
                billing cycle, and renewal details will appear here.
              </p>
              <Link
                to="/plans"
                className="bs-gold-button mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold"
              >
                Choose a Plan
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <>
              <div className="border-b border-white/[0.06] p-6 md:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D6B36A]/70">
                        Current Plan
                      </p>
                      <StatusPill status={currentSubscription.status} />
                    </div>

                    <h2 className="mt-3 text-2xl font-semibold text-white md:text-3xl">
                      {currentSubscription.plan_name ||
                        `Plan #${currentSubscription.plan_id}`}
                    </h2>

                    <p className="mt-2 text-xl font-semibold text-[#E7CB8B]">
                      {money(price)}
                      <span className="ml-1 text-xs font-medium text-white/35">
                        / {interval(currentSubscription.billing_interval).toLowerCase()}
                      </span>
                    </p>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">
                      {isPastDue
                        ? "Your subscription needs attention before the next billing cycle."
                        : currentSubscription.cancel_at_period_end
                        ? "Your subscription is active until the end of the current billing period and is scheduled to cancel."
                        : "Your subscription is active and will automatically renew at the end of your current billing period."}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      to="/plans"
                      className="rounded-xl border border-[#D6B36A]/20 px-4 py-2.5 text-xs font-semibold text-[#E7CB8B] hover:bg-[#D6B36A]/5"
                    >
                      Change Plan
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 p-6 md:grid-cols-3 md:p-7">
                <InfoCell
                  label="Started"
                  value={date(currentSubscription.current_period_start)}
                />
                <InfoCell
                  label="Current period"
                  value={`${date(currentSubscription.current_period_start)} – ${date(
                    currentSubscription.current_period_end
                  )}`}
                />
                <InfoCell
                  label="Next billing"
                  value={date(currentSubscription.current_period_end)}
                />
              </div>
            </>
          )}
        </section>

        {currentSubscription && (
          <>
            {/* Status + billing */}
            <section className="grid gap-5 lg:grid-cols-2">
              <div className="bs-panel rounded-2xl p-6">
                <SectionTitle
                  eyebrow="Subscription Status"
                  title="Plan and renewal details"
                  icon={<ShieldCheck size={16} />}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCell label="Status" value={statusLabel(currentSubscription.status)} />
                  <InfoCell
                    label="Billing"
                    value={interval(currentSubscription.billing_interval)}
                  />
                  <InfoCell
                    label="Subscription ID"
                    value={subscriptionCode(currentSubscription.id)}
                  />
                  <InfoCell
                    label="Auto-renew"
                    value={
                      currentSubscription.cancel_at_period_end
                        ? "Disabled"
                        : isActive || isTrial
                        ? "Enabled"
                        : "—"
                    }
                  />
                  <InfoCell
                    label="Period start"
                    value={date(currentSubscription.current_period_start)}
                  />
                  <InfoCell
                    label="Period end"
                    value={date(currentSubscription.current_period_end)}
                  />
                </div>
              </div>

              <div className="bs-panel rounded-2xl p-6">
                <SectionTitle
                  eyebrow="Billing Information"
                  title="Current billing values"
                  icon={<CreditCard size={16} />}
                />

                <div className="space-y-3">
                  <BillingRow label="Plan price" value={money(price)} />
                  <BillingRow
                    label="Billing interval"
                    value={interval(currentSubscription.billing_interval)}
                  />
                  <BillingRow label="Tax" value="—" mutedNote="Not provided by current subscription API" />
                  <BillingRow label="Next charge" value={money(price)} />
                  <BillingRow label="Currency" value="INR" />
                </div>
              </div>
            </section>

            {/* Timeline */}
            <section className="bs-panel rounded-2xl p-6">
              <SectionTitle
                eyebrow="Billing Timeline"
                title="Your subscription journey"
                icon={<History size={16} />}
              />

              <div className="relative max-w-3xl">
                {isTrial ? (
                  <>
                    <TimelineItem
                      state="done"
                      title="Trial started"
                      detail={date(currentSubscription.current_period_start)}
                    />
                    <TimelineItem
                      state="current"
                      title="Trial currently active"
                      detail={`Trial ends ${date(currentSubscription.trial_ends_at)}`}
                    />
                    <TimelineItem
                      state="future"
                      title="Trial ends"
                      detail={date(currentSubscription.trial_ends_at)}
                    />
                    <TimelineItem
                      state="future"
                      title="Paid subscription begins"
                      detail="Convert the trial to a paid plan to continue."
                    />
                  </>
                ) : (
                  <>
                    <TimelineItem
                      state="done"
                      title="Subscription started"
                      detail={date(currentSubscription.current_period_start)}
                    />
                    <TimelineItem
                      state="current"
                      title="Current billing period"
                      detail={`${date(currentSubscription.current_period_start)} – ${date(
                        currentSubscription.current_period_end
                      )}`}
                    />
                    <TimelineItem
                      state={isPastDue ? "current" : "future"}
                      title="Next renewal"
                      detail={date(currentSubscription.current_period_end)}
                    />
                    <TimelineItem
                      state="future"
                      title="Future billing cycle"
                      detail={
                        currentSubscription.cancel_at_period_end
                          ? "Subscription is scheduled to end."
                          : "Will begin after successful renewal."
                      }
                    />
                  </>
                )}
              </div>
            </section>

            {/* Features */}
            <section className="bs-panel rounded-2xl p-6">
              <SectionTitle
                eyebrow="Plan Features"
                title="What's included"
                icon={<Sparkles size={16} />}
              />

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  "Unlimited invoices",
                  "Automated billing",
                  "Payment tracking",
                  "PDF invoices",
                  "Billing history",
                  "Customer support",
                ].map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3"
                  >
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-300" />
                    <span className="text-xs text-white/60">{feature}</span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[10px] text-white/25">
                Feature values are presentation-ready and can be replaced by
                backend plan feature data when that field becomes available.
              </p>
            </section>

            {/* Actions */}
            <section className="bs-panel rounded-2xl p-6">
              <SectionTitle
                eyebrow="Billing Actions"
                title="Manage your subscription"
                icon={<RefreshCw size={16} />}
              />

              <div className="flex flex-wrap gap-2">
                {isActive && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      executeAction(
                        () => extendSubscription(currentSubscription.id),
                        `${currentSubscription.plan_name || "Subscription"} extended by one billing cycle.`
                      )
                    }
                    className="bs-gold-button rounded-xl px-4 py-2.5 text-xs font-bold disabled:opacity-40"
                  >
                    {busy ? "Processing..." : "Extend Subscription"}
                  </button>
                )}

                {isTrial && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      executeAction(
                        () => convertTrialToPaid(currentSubscription.id),
                        `${currentSubscription.plan_name || "Subscription"} is now a paid subscription.`
                      )
                    }
                    className="bs-gold-button rounded-xl px-4 py-2.5 text-xs font-bold disabled:opacity-40"
                  >
                    {busy ? "Processing..." : "Continue to Paid Plan"}
                  </button>
                )}

                {isPastDue && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      executeAction(
                        () => renewSubscription(currentSubscription.id),
                        `${currentSubscription.plan_name || "Subscription"} renewed successfully.`
                      )
                    }
                    className="bs-gold-button rounded-xl px-4 py-2.5 text-xs font-bold disabled:opacity-40"
                  >
                    {busy ? "Renewing..." : "Renew Now"}
                  </button>
                )}

                {isPastDue && (
                  <Link
                    to="/payments"
                    className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs font-semibold text-white/55 hover:border-[#D6B36A]/20 hover:text-[#E7CB8B]"
                  >
                    Update Payment
                  </Link>
                )}

                {(isActive || isTrial) && !currentSubscription.cancel_at_period_end && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setModal("period_end")}
                    className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs font-semibold text-white/55 hover:border-[#D6B36A]/20 hover:text-[#E7CB8B] disabled:opacity-40"
                  >
                    Cancel at Period End
                  </button>
                )}

                {(isActive || isTrial) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setModal("immediate")}
                    className="rounded-xl border border-red-400/15 px-4 py-2.5 text-xs font-semibold text-red-300/75 hover:bg-red-400/5 disabled:opacity-40"
                  >
                    Cancel Immediately
                  </button>
                )}

                <Link
                  to="/plans"
                  className="rounded-xl border border-[#D6B36A]/20 px-4 py-2.5 text-xs font-semibold text-[#E7CB8B] hover:bg-[#D6B36A]/5"
                >
                  Change Plan
                </Link>
              </div>
            </section>
          </>
        )}

        {/* History */}
        <section>
          <SectionTitle
            eyebrow="Subscription History"
            title="Previous subscription activity"
            icon={<History size={16} />}
          />

          <div className="bs-panel overflow-hidden rounded-2xl">
            {loading ? (
              <div className="space-y-3 p-5">
                <div className="h-12 animate-pulse rounded-xl bg-white/5" />
                <div className="h-12 animate-pulse rounded-xl bg-white/5" />
              </div>
            ) : history.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <History size={22} className="mx-auto text-white/20" />
                <p className="mt-3 text-sm font-medium text-white">
                  No subscription history available.
                </p>
                <p className="mt-1 text-xs text-white/30">
                  Previous subscription records will appear here when returned by the backend.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.16em] text-white/25">
                      <th className="px-5 py-4 font-semibold">Plan</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Start Date</th>
                      <th className="px-5 py-4 font-semibold">End Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {history.map((sub) => (
                      <tr key={sub.id} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D6B36A]/10 bg-[#D6B36A]/5">
                              <Package size={14} className="text-[#D6B36A]" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white">
                                {sub.plan_name || `Plan #${sub.plan_id}`}
                              </p>
                              <p className="mt-0.5 text-[10px] text-white/25">
                                {subscriptionCode(sub.id)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <StatusPill status={sub.status} />
                        </td>
                        <td className="px-5 py-4 text-xs text-white/45">
                          {date(sub.current_period_start)}
                        </td>
                        <td className="px-5 py-4 text-xs text-white/45">
                          {sub.status === "cancelled"
                            ? date(sub.current_period_end)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Small footer navigation */}
        <section className="flex flex-col justify-between gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.015] p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D6B36A]/10 bg-[#D6B36A]/5">
              <CalendarDays size={15} className="text-[#D6B36A]" />
            </div>
            <div>
              <p className="text-xs font-medium text-white">Need a different plan?</p>
              <p className="text-[10px] text-white/30">
                Compare available plans and billing intervals.
              </p>
            </div>
          </div>

          <Link
            to="/plans"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#E7CB8B] hover:text-white"
          >
            View Plans
            <ChevronRight size={14} />
          </Link>
        </section>
      </div>

      <ConfirmModal
        mode={modal}
        subscription={currentSubscription}
        busy={busy}
        onClose={() => setModal(null)}
        onConfirm={confirmCancel}
      />
    </CustomerShell>
  );
}

function BillingRow({
  label,
  value,
  mutedNote,
}: {
  label: string;
  value: string;
  mutedNote?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-3 last:border-0 last:pb-0">
      <div>
        <p className="text-xs text-white/40">{label}</p>
        {mutedNote && <p className="mt-0.5 text-[9px] text-white/20">{mutedNote}</p>}
      </div>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
