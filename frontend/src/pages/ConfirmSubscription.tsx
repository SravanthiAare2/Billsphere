import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  FileText,
  Loader2,
  Package,
  Receipt,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  AlertCircle,
} from "lucide-react";

import { useToast } from "../components/ToastProvider";

import "./ConfirmSubscription.css";

// ============================================================
// API
// ============================================================

const API_URL =
  "http://127.0.0.1:8000/api/v1";

// ============================================================
// TYPES
// ============================================================

interface BackendPlan {
  id: number;

  platform?: string | null;

  name?: string | null;

  description?: string | null;

  price?: number | string | null;

  currency?: string | null;

  billing_cycle?: string | null;

  trial_days?: number | null;

  feature_entitlements?:
    | string[]
    | Record<string, unknown>
    | null;

  max_customers?: number | null;
  customer_limit?: number | null;

  max_invoices?: number | null;
  invoice_limit?: number | null;

  max_users?: number | null;
  user_limit?: number | null;

  max_subscriptions?: number | null;
  subscription_limit?: number | null;

  is_active?: boolean;
}

// ============================================================
// FEATURE LABELS
// ============================================================

const FEATURE_LABELS: Record<string, string> = {
  customer_management:
    "Customer Management",

  subscription_management:
    "Subscription Management",

  basic_billing:
    "Basic Billing",

  advanced_billing:
    "Advanced Billing",

  invoice_generation:
    "Invoice Generation",

  payment_tracking:
    "Payment Tracking",

  email_notifications:
    "Email Notifications",

  basic_dashboard:
    "Basic Dashboard",

  dashboard_access:
    "Dashboard Access",

  automated_renewals:
    "Automated Renewals",

  payment_retries:
    "Payment Retries",

  proration:
    "Proration",

  advanced_analytics:
    "Advanced Analytics",

  analytics:
    "Analytics",

  tax_automation:
    "Tax Automation",

  tax_management:
    "Tax Management",

  pdf_invoices:
    "PDF Invoices",

  priority_support:
    "Priority Support",

  failed_payment_recovery:
    "Failed Payment Recovery",

  advanced_tax_handling:
    "Advanced Tax Handling",

  custom_billing_workflows:
    "Custom Billing Workflows",

  financial_reports:
    "Financial Reports",

  enterprise_administration:
    "Enterprise Administration",

  high_volume_billing:
    "High Volume Billing",

  user_management:
    "User Management",

  reporting:
    "Reporting",

  billing_reports:
    "Billing Reports",
};

// ============================================================
// MONEY
// ============================================================

function money(
  value: number | string | null | undefined,
  currency = "INR"
) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount}`;
  }
}

// ============================================================
// BILLING
// ============================================================

function normalizeBillingCycle(
  value?: string | null
): "monthly" | "yearly" {
  const cycle =
    (value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

  if (
    cycle === "yearly" ||
    cycle === "annual" ||
    cycle === "annually" ||
    cycle === "year"
  ) {
    return "yearly";
  }

  return "monthly";
}

// ============================================================
// FEATURES
// ============================================================

function humanizeFeature(
  feature: string
) {
  const key =
    feature
      .trim()
      .toLowerCase();

  if (FEATURE_LABELS[key]) {
    return FEATURE_LABELS[key];
  }

  return feature
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function normalizeFeatures(
  features: BackendPlan["feature_entitlements"]
) {
  if (!features) {
    return [];
  }

  if (Array.isArray(features)) {
    return features
      .map((feature) =>
        humanizeFeature(String(feature))
      )
      .filter(Boolean);
  }

  if (
    typeof features === "object" &&
    features !== null
  ) {
    return Object.entries(features)
      .filter(([, value]) => {
        if (
          typeof value === "boolean"
        ) {
          return value;
        }

        return Boolean(value);
      })
      .map(([key]) =>
        humanizeFeature(key)
      );
  }

  return [];
}

// ============================================================
// LIMIT
// ============================================================

function getLimit(
  first?: number | null,
  second?: number | null
) {
  return first ?? second ?? null;
}

// ============================================================
// PLAN EXTRACTION
// ============================================================

function findPlan(
  data: any,
  planId: string
): BackendPlan | null {
  if (!data) {
    return null;
  }

  if (
    data.id &&
    String(data.id) === String(planId)
  ) {
    return data;
  }

  if (
    data.plan &&
    typeof data.plan === "object"
  ) {
    if (
      String(data.plan.id) ===
      String(planId)
    ) {
      return data.plan;
    }
  }

  if (Array.isArray(data.plans)) {
    return (
      data.plans.find(
        (item: BackendPlan) =>
          String(item.id) ===
          String(planId)
      ) || null
    );
  }

  if (Array.isArray(data.items)) {
    return (
      data.items.find(
        (item: BackendPlan) =>
          String(item.id) ===
          String(planId)
      ) || null
    );
  }

  return null;
}

// ============================================================
// COMPONENT
// ============================================================

export default function ConfirmSubscription() {
  const navigate =
    useNavigate();

  const { planId } =
    useParams<{
      planId: string;
    }>();

  const { notify } =
    useToast();

  const [plan, setPlan] =
    useState<BackendPlan | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    confirmationLoading,
    setConfirmationLoading,
  ] = useState(false);

  const [
    agreeTerms,
    setAgreeTerms,
  ] = useState(false);

  // ==========================================================
  // LOAD PLAN
  // ==========================================================

  useEffect(() => {
    async function loadPlan() {
      if (!planId) {
        setError(
          "Plan ID is missing."
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError("");

        const token =
          localStorage.getItem(
            "access_token"
          ) ||
          localStorage.getItem(
            "token"
          );

        const headers: HeadersInit = {
          Accept:
            "application/json",

          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {}),
        };

        // ------------------------------------------------------
        // FIRST: DIRECT PLAN
        // ------------------------------------------------------

        let response =
          await fetch(
            `${API_URL}/plans/${planId}`,
            {
              method: "GET",
              headers,
            }
          );

        let data: any = null;

        if (response.ok) {
          data =
            await response.json();
        } else {
          // ----------------------------------------------------
          // FALLBACK: COLLECTION
          // ----------------------------------------------------

          response =
            await fetch(
              `${API_URL}/plans?page=1&page_size=1000`,
              {
                method: "GET",
                headers,
              }
            );

          if (!response.ok) {
            throw new Error(
              "Unable to load the selected plan."
            );
          }

          data =
            await response.json();
        }

        const selectedPlan =
          findPlan(
            data,
            planId
          );

        if (!selectedPlan) {
          throw new Error(
            "The selected plan could not be found."
          );
        }

        setPlan(selectedPlan);
      } catch (err: any) {
        const message =
          err?.message ||
          "Unable to load subscription details.";

        setError(message);

        notify({
          title:
            "Confirmation unavailable",
          description:
            message,
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    }

    loadPlan();
  }, [
    planId,
    notify,
  ]);

  // ==========================================================
  // DERIVED DATA
  // ==========================================================

  const features =
    useMemo(
      () =>
        normalizeFeatures(
          plan?.feature_entitlements
        ),
      [plan]
    );

  const billingCycle =
    normalizeBillingCycle(
      plan?.billing_cycle
    );

  const price =
    Number(
      plan?.price ?? 0
    );

  const currency =
    plan?.currency ||
    "INR";

  const trialDays =
    plan?.trial_days ?? 0;

  const customerLimit =
    getLimit(
      plan?.max_customers,
      plan?.customer_limit
    );

  const invoiceLimit =
    getLimit(
      plan?.max_invoices,
      plan?.invoice_limit
    );

  const userLimit =
    getLimit(
      plan?.max_users,
      plan?.user_limit
    );

  const subscriptionLimit =
    getLimit(
      plan?.max_subscriptions,
      plan?.subscription_limit
    );

  // ==========================================================
  // CONFIRM
  // ==========================================================

  function handleConfirm() {
    if (!plan) {
      return;
    }

    if (!agreeTerms) {
      notify({
        title:
          "Confirmation required",
        description:
          "Please confirm that you have reviewed the subscription details.",
        variant: "error",
      });

      return;
    }

    setConfirmationLoading(true);

    /*
     * IMPORTANT:
     *
     * We are NOT creating the subscription here.
     *
     * This page only confirms the selected
     * plan and moves the customer to payment.
     *
     * Subscription should be created only after
     * successful payment.
     */

    navigate(
      `/customer/plans/${plan.id}/payment`,
      {
        state: {
          planId: plan.id,
          plan,
        },
      }
    );
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="confirm-page">

        <div className="confirm-loading">

          <div className="confirm-loading-ring" />

          <h2>
            Preparing confirmation...
          </h2>

          <p>
            BillSphere is preparing your
            subscription summary.
          </p>

        </div>

      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error || !plan) {
    return (
      <div className="confirm-page">

        <div className="confirm-error">

          <div className="confirm-error-icon">
            <AlertCircle size={26} />
          </div>

          <h2>
            Confirmation unavailable
          </h2>

          <p>
            {error ||
              "The selected plan could not be loaded."}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/customer/plans"
              )
            }
          >
            <ArrowLeft size={16} />

            Back to Plans
          </button>

        </div>

      </div>
    );
  }

  // ==========================================================
  // MAIN
  // ==========================================================

  return (
    <div className="confirm-page">

      {/* ======================================================
          TOP BAR
      ====================================================== */}

      <header className="confirm-topbar">

        <button
          type="button"
          className="confirm-back"
          onClick={() =>
            navigate(
              `/customer/plans/${plan.id}`
            )
          }
        >
          <ArrowLeft size={16} />

          Back to Plan Details
        </button>

        <div className="confirm-brand">
          BILLSPHERE
        </div>

        <div className="confirm-secure">

          <ShieldCheck size={15} />

          Secure Checkout

        </div>

      </header>

      {/* ======================================================
          PROGRESS
      ====================================================== */}

      <section className="confirm-progress">

        <ProgressStep
          number="01"
          title="Plan Details"
          text="Completed"
          completed
        />

        <div className="confirm-progress-line active" />

        <ProgressStep
          number="02"
          title="Confirmation"
          text="Current step"
          active
        />

        <div className="confirm-progress-line" />

        <ProgressStep
          number="03"
          title="Payment"
          text="Next"
        />

        <div className="confirm-progress-line" />

        <ProgressStep
          number="04"
          title="Active"
          text="After payment"
        />

      </section>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="confirm-container">

        {/* HERO */}

        <section className="confirm-hero">

          <div className="confirm-eyebrow">
            BILLSPHERE SUBSCRIPTION CONFIRMATION
          </div>

          <h1>
            Confirm your{" "}
            <span>subscription</span>
          </h1>

          <p>
            You're almost there. Review your
            customer plan, billing details,
            trial period and expected charge
            before continuing to secure payment.
          </p>

        </section>

        {/* ====================================================
            GRID
        ==================================================== */}

        <section className="confirm-grid">

          {/* ==================================================
              LEFT
          ================================================== */}

          <div className="confirm-left">

            {/* SELECTED PLAN */}

            <article className="confirm-card selected-plan-confirm">

              <div className="confirm-card-heading">

                <div className="confirm-heading-icon">
                  <Package size={18} />
                </div>

                <div>

                  <div className="confirm-small-label">
                    SELECTED PLAN
                  </div>

                  <h2>
                    {plan.name}
                  </h2>

                </div>

                <div className="confirm-platform-pill">
                  {plan.platform}
                </div>

              </div>

              <p className="confirm-description">
                {plan.description ||
                  `Your selected ${plan.platform} subscription plan.`}
              </p>

              <div className="confirm-price-row">

                <div>

                  <span className="confirm-price">
                    {money(
                      price,
                      currency
                    )}
                  </span>

                  <span className="confirm-period">
                    /{" "}
                    {billingCycle ===
                    "yearly"
                      ? "year"
                      : "month"}
                  </span>

                </div>

                {trialDays > 0 && (

                  <div className="confirm-trial">

                    <Clock3 size={14} />

                    {trialDays}-day free trial

                  </div>

                )}

              </div>

            </article>

            {/* CUSTOMER INFORMATION */}

            <article className="confirm-card">

              <div className="confirm-section-heading">

                <div className="confirm-heading-icon">
                  <User size={18} />
                </div>

                <div>

                  <h3>
                    Customer information
                  </h3>

                  <p>
                    Your authenticated BillSphere
                    account will be used for this
                    subscription.
                  </p>

                </div>

              </div>

              <div className="customer-info-box">

                <div className="customer-info-icon">
                  <ShieldCheck size={18} />
                </div>

                <div>

                  <strong>
                    Account verified
                  </strong>

                  <span>
                    Your account information is
                    securely associated with this
                    subscription.
                  </span>

                </div>

              </div>

              <div className="customer-info-note">

                <Check size={14} />

                Subscription will be linked to
                your current BillSphere customer
                account.

              </div>

            </article>

            {/* BILLING DETAILS */}

            <article className="confirm-card">

              <div className="confirm-section-heading">

                <div className="confirm-heading-icon">
                  <CalendarDays size={18} />
                </div>

                <div>

                  <h3>
                    Billing & trial
                  </h3>

                  <p>
                    Review how your subscription
                    will be billed.
                  </p>

                </div>

              </div>

              <div className="billing-details-grid">

                <DetailBox
                  icon={
                    <CalendarDays
                      size={17}
                    />
                  }
                  label="Billing frequency"
                  value={
                    billingCycle ===
                    "yearly"
                      ? "Yearly"
                      : "Monthly"
                  }
                />

                <DetailBox
                  icon={
                    <Clock3 size={17} />
                  }
                  label="Trial period"
                  value={
                    trialDays > 0
                      ? `${trialDays} days`
                      : "No free trial"
                  }
                />

                <DetailBox
                  icon={
                    <CreditCard
                      size={17}
                    />
                  }
                  label="Currency"
                  value={currency}
                />

                <DetailBox
                  icon={
                    <Receipt size={17} />
                  }
                  label="Recurring charge"
                  value={money(
                    price,
                    currency
                  )}
                />

              </div>

            </article>

            {/* LIMITS */}

            <article className="confirm-card">

              <div className="confirm-section-heading">

                <div className="confirm-heading-icon">
                  <Users size={18} />
                </div>

                <div>

                  <h3>
                    Plan limits
                  </h3>

                  <p>
                    Your subscription includes
                    the following usage limits.
                  </p>

                </div>

              </div>

              <div className="confirm-limits-grid">

                {customerLimit !== null && (
                  <LimitBox
                    label="Customers"
                    value={String(
                      customerLimit
                    )}
                    icon={
                      <Users size={16} />
                    }
                  />
                )}

                {invoiceLimit !== null && (
                  <LimitBox
                    label="Invoices"
                    value={String(
                      invoiceLimit
                    )}
                    icon={
                      <FileText size={16} />
                    }
                  />
                )}

                {userLimit !== null && (
                  <LimitBox
                    label="Users"
                    value={String(
                      userLimit
                    )}
                    icon={
                      <Users size={16} />
                    }
                  />
                )}

                {subscriptionLimit !==
                  null && (
                  <LimitBox
                    label="Subscriptions"
                    value={String(
                      subscriptionLimit
                    )}
                    icon={
                      <RefreshIcon />
                    }
                  />
                )}

              </div>

            </article>

            {/* FEATURES */}

            <article className="confirm-card">

              <div className="confirm-section-heading">

                <div className="confirm-heading-icon">
                  <Sparkles size={18} />
                </div>

                <div>

                  <h3>
                    Included features
                  </h3>

                  <p>
                    Everything included with
                    this selected plan.
                  </p>

                </div>

              </div>

              <div className="confirm-features">

                {features.length > 0 ? (
                  features.map(
                    (
                      feature,
                      index
                    ) => (
                      <div
                        className="confirm-feature"
                        key={`${plan.id}-${index}`}
                      >
                        <span>
                          <Check size={11} />
                        </span>

                        {feature}
                      </div>
                    )
                  )
                ) : (
                  <div className="confirm-feature">
                    <span>
                      <Check size={11} />
                    </span>

                    Plan features included
                    with your subscription.
                  </div>
                )}

              </div>

            </article>

          </div>

          {/* ==================================================
              RIGHT SUMMARY
          ================================================== */}

          <aside className="confirm-summary">

            <div className="summary-top-label">
              FINAL REVIEW
            </div>

            <h2>
              Subscription summary
            </h2>

            <div className="summary-selected">

              <div className="summary-selected-icon">
                <Package size={18} />
              </div>

              <div>

                <strong>
                  {plan.platform}
                </strong>

                <span>
                  {plan.name}
                </span>

              </div>

            </div>

            <div className="summary-divider" />

            <SummaryRow
              label="Plan"
              value={
                plan.name ||
                "Selected Plan"
              }
            />

            <SummaryRow
              label="Billing"
              value={
                billingCycle ===
                "yearly"
                  ? "Yearly"
                  : "Monthly"
              }
            />

            <SummaryRow
              label="Trial"
              value={
                trialDays > 0
                  ? `${trialDays} days free`
                  : "No trial"
              }
            />

            <SummaryRow
              label="Recurring price"
              value={money(
                price,
                currency
              )}
            />

            <div className="summary-divider" />

            <div className="summary-charge">

              <div>

                <span>
                  {trialDays > 0
                    ? "After trial"
                    : "Recurring charge"}
                </span>

                <small>
                  Taxes may apply
                </small>

              </div>

              <strong>
                {money(
                  price,
                  currency
                )}
              </strong>

            </div>

            {/* TAX NOTICE */}

            <div className="tax-notice">

              <Receipt size={15} />

              <span>
                Applicable taxes will be
                calculated and shown before
                payment.
              </span>

            </div>

            {/* TERMS */}

            <label className="terms-check">

              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(event) =>
                  setAgreeTerms(
                    event.target.checked
                  )
                }
              />

              <span className="custom-checkbox">
                {agreeTerms && (
                  <Check size={12} />
                )}
              </span>

              <span className="terms-text">
                I have reviewed the plan,
                billing frequency, trial period
                and pricing. I understand that
                payment is required before the
                subscription becomes active.
              </span>

            </label>

            {/* CONTINUE */}

            <button
              type="button"
              className="confirm-payment-button"
              disabled={
                !agreeTerms ||
                confirmationLoading
              }
              onClick={
                handleConfirm
              }
            >

              {confirmationLoading ? (
                <>
                  <Loader2
                    size={17}
                    className="spin"
                  />

                  Opening payment...

                </>
              ) : (
                <>
                  Confirm & Continue to Payment

                  <ArrowRight size={17} />
                </>
              )}

            </button>

            <button
              type="button"
              className="back-plan-link"
              onClick={() =>
                navigate(
                  `/customer/plans/${plan.id}`
                )
              }
            >
              Review plan again
            </button>

            {/* SECURITY */}

            <div className="summary-security">

              <ShieldCheck size={18} />

              <div>

                <strong>
                  Secure checkout
                </strong>

                <p>
                  Your subscription will only
                  become active after successful
                  payment.
                </p>

              </div>

            </div>

          </aside>

        </section>

        {/* ====================================================
            FINAL PROCESS NOTICE
        ==================================================== */}

        <section className="confirmation-notice">

          <div className="notice-icon">
            <ShieldCheck size={19} />
          </div>

          <div>

            <strong>
              What happens next?
            </strong>

            <p>
              After you confirm, BillSphere
              will take you to the secure payment
              step. The subscription will be
              created and activated only after
              payment is successfully completed.
            </p>

          </div>

        </section>

      </main>

    </div>
  );
}

// ============================================================
// PROGRESS STEP
// ============================================================

function ProgressStep({
  number,
  title,
  text,
  active = false,
  completed = false,
}: {
  number: string;
  title: string;
  text: string;
  active?: boolean;
  completed?: boolean;
}) {
  return (
    <div
      className={`confirm-progress-step ${
        active
          ? "active"
          : ""
      } ${
        completed
          ? "completed"
          : ""
      }`}
    >
      <span className="progress-number">
        {completed ? (
          <Check size={14} />
        ) : (
          number
        )}
      </span>

      <div>

        <strong>
          {title}
        </strong>

        <small>
          {text}
        </small>

      </div>
    </div>
  );
}

// ============================================================
// SUMMARY ROW
// ============================================================

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="confirm-summary-row">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}

// ============================================================
// DETAIL BOX
// ============================================================

function DetailBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="confirm-detail-box">

      <div className="detail-box-icon">
        {icon}
      </div>

      <div>

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}

// ============================================================
// LIMIT BOX
// ============================================================

function LimitBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="confirm-limit-box">

      <div className="limit-box-icon">
        {icon}
      </div>

      <div>

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}

// ============================================================
// REFRESH ICON
// ============================================================

function RefreshIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}