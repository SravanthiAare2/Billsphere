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
  Check,
  Clock3,
  CreditCard,
  FileText,
  Loader2,
  Package,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  CalendarDays,
  AlertCircle,
} from "lucide-react";

import { useToast } from "../components/ToastProvider";

import "./PlanDetails.css";

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

  created_at?: string | null;

  updated_at?: string | null;
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
// HELPERS
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
// BILLING CYCLE
// ============================================================

function normalizeBillingCycle(
  value?: string | null
) {
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
        humanizeFeature(
          String(feature)
        )
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
          typeof value ===
          "boolean"
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
// API RESPONSE NORMALIZATION
// ============================================================

function extractPlan(
  data: any
): BackendPlan | null {
  if (!data) {
    return null;
  }

  if (
    data.id &&
    typeof data.id === "number"
  ) {
    return data;
  }

  if (
    data.plan &&
    typeof data.plan === "object"
  ) {
    return data.plan;
  }

  if (
    Array.isArray(data.plans) &&
    data.plans.length > 0
  ) {
    return data.plans[0];
  }

  if (
    Array.isArray(data.items) &&
    data.items.length > 0
  ) {
    return data.items[0];
  }

  return null;
}

// ============================================================
// COMPONENT
// ============================================================

export default function PlanDetails() {
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

  const [continueLoading, setContinueLoading] =
    useState(false);

  // ==========================================================
  // FETCH PLAN
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

      setLoading(true);

      setError("");

      try {
        const token =
          localStorage.getItem(
            "access_token"
          ) ||
          localStorage.getItem(
            "token"
          );

        /*
         * First try the direct plan endpoint.
         */

        let response =
          await fetch(
            `${API_URL}/plans/${planId}`,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",

                ...(token
                  ? {
                      Authorization:
                        `Bearer ${token}`,
                    }
                  : {}),
              },
            }
          );

        /*
         * Some BillSphere backend versions
         * expose plans through the collection
         * endpoint instead.
         *
         * If direct lookup is unavailable,
         * retrieve the plan from the collection.
         */

        if (!response.ok) {
          response =
            await fetch(
              `${API_URL}/plans?page=1&page_size=1000`,
              {
                method: "GET",

                headers: {
                  Accept:
                    "application/json",

                  ...(token
                    ? {
                        Authorization:
                          `Bearer ${token}`,
                      }
                    : {}),
                },
              }
            );
        }

        if (!response.ok) {
          let message =
            "Unable to load plan details.";

          try {
            const data =
              await response.json();

            message =
              data?.detail ||
              data?.message ||
              message;
          } catch {
            // Keep default.
          }

          throw new Error(
            message
          );
        }

        const data =
          await response.json();

        let foundPlan =
          extractPlan(data);

        /*
         * If collection response was returned,
         * locate exact plan ID.
         */

        if (
          !foundPlan &&
          Array.isArray(
            data?.plans
          )
        ) {
          foundPlan =
            data.plans.find(
              (item: BackendPlan) =>
                String(item.id) ===
                String(planId)
            ) || null;
        }

        if (
          !foundPlan &&
          Array.isArray(
            data?.items
          )
        ) {
          foundPlan =
            data.items.find(
              (item: BackendPlan) =>
                String(item.id) ===
                String(planId)
            ) || null;
        }

        if (!foundPlan) {
          throw new Error(
            "The selected plan could not be found."
          );
        }

        setPlan(foundPlan);
      } catch (err: any) {
        const message =
          err?.message ||
          "Unable to load plan details.";

        setError(message);

        notify({
          title:
            "Plan details unavailable",
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

  const price =
    Number(
      plan?.price ?? 0
    );

  const currency =
    plan?.currency ||
    "INR";

  const trialDays =
    plan?.trial_days ?? 0;

  // ==========================================================
  // CONTINUE
  // ==========================================================

  function handleContinue() {
    if (!plan) {
      return;
    }

    setContinueLoading(true);

    /*
     * NEXT BILLSPHERE STEP:
     *
     * Plan Details
     *       ↓
     * Customer / Billing Confirmation
     *       ↓
     * Payment
     *       ↓
     * Subscription creation
     *
     * For now this route moves to the
     * confirmation page placeholder.
     */

    navigate(
      `/customer/plans/${plan.id}/confirm`
    );
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="plan-details-page">

        <div className="plan-details-loading">

          <div className="details-loading-ring" />

          <h2>
            Loading plan details...
          </h2>

          <p>
            BillSphere is retrieving the
            selected plan from the backend.
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
      <div className="plan-details-page">

        <div className="plan-details-error">

          <div className="error-icon">
            <AlertCircle size={25} />
          </div>

          <h2>
            Plan details unavailable
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
            className="back-to-plans-button"
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
    <div className="plan-details-page">

      {/* ======================================================
          TOP HEADER
      ====================================================== */}

      <header className="details-topbar">

        <button
          type="button"
          className="back-button"
          onClick={() =>
            navigate(
              "/customer/plans"
            )
          }
        >
          <ArrowLeft size={16} />

          Back to Plans
        </button>

        <div className="details-brand">
          BILLSPHERE
        </div>

        <div className="secure-label">
          <ShieldCheck size={14} />

          Secure Checkout
        </div>

      </header>

      {/* ======================================================
          PROGRESS
      ====================================================== */}

      <section className="checkout-progress">

        <div className="progress-step active">

          <span>
            01
          </span>

          <div>
            <strong>
              Plan Details
            </strong>

            <small>
              Review selection
            </small>
          </div>

        </div>

        <div className="progress-line" />

        <div className="progress-step">

          <span>
            02
          </span>

          <div>
            <strong>
              Confirmation
            </strong>

            <small>
              Billing details
            </small>
          </div>

        </div>

        <div className="progress-line" />

        <div className="progress-step">

          <span>
            03
          </span>

          <div>
            <strong>
              Payment
            </strong>

            <small>
              Complete payment
            </small>
          </div>

        </div>

        <div className="progress-line" />

        <div className="progress-step">

          <span>
            04
          </span>

          <div>
            <strong>
              Active
            </strong>

            <small>
              Subscription starts
            </small>
          </div>

        </div>

      </section>

      {/* ======================================================
          HERO
      ====================================================== */}

      <main className="details-container">

        <section className="details-hero">

          <div className="details-eyebrow">
            BILLSPHERE PLAN REVIEW
          </div>

          <h1>
            Review your{" "}
            <span>
              subscription
            </span>
          </h1>

          <p>
            You selected the plan below.
            Review the pricing, trial period,
            billing frequency and included
            features before continuing.
          </p>

        </section>

        {/* ====================================================
            MAIN GRID
        ==================================================== */}

        <section className="details-main-grid">

          {/* ==================================================
              LEFT
          ================================================== */}

          <div className="details-left">

            {/* PLAN SUMMARY */}

            <article className="selected-plan-card">

              <div className="selected-plan-top">

                <div className="selected-plan-icon">
                  <Package size={22} />
                </div>

                <div>

                  <div className="selected-plan-platform">
                    {plan.platform ||
                      "BillSphere Platform"}
                  </div>

                  <h2>
                    {plan.name ||
                      "Subscription Plan"}
                  </h2>

                </div>

                {(
                  plan.name ||
                  ""
                )
                  .toLowerCase() ===
                  "premium" && (

                  <div className="premium-label">
                    <Sparkles size={12} />

                    PREMIUM
                  </div>

                )}

              </div>

              <p className="selected-plan-description">
                {plan.description ||
                  "A BillSphere subscription plan designed for your billing needs."}
              </p>

              <div className="selected-plan-price">

                <span className="details-price">
                  {money(
                    price,
                    currency
                  )}
                </span>

                <span className="details-period">
                  /{" "}
                  {billingCycle ===
                  "yearly"
                    ? "year"
                    : "month"}
                </span>

              </div>

              {trialDays > 0 && (

                <div className="trial-highlight">

                  <div className="trial-highlight-icon">
                    <Clock3 size={17} />
                  </div>

                  <div>

                    <strong>
                      {trialDays}-day free trial
                    </strong>

                    <p>
                      You can start using this
                      plan during the trial
                      period before regular
                      billing begins.
                    </p>

                  </div>

                </div>

              )}

            </article>

            {/* FEATURES */}

            <article className="details-section-card">

              <div className="section-heading">

                <div className="section-heading-icon">
                  <Check size={17} />
                </div>

                <div>

                  <h3>
                    What's included
                  </h3>

                  <p>
                    Features available with
                    this subscription.
                  </p>

                </div>

              </div>

              <div className="details-feature-grid">

                {features.length > 0 ? (

                  features.map(
                    (
                      feature,
                      index
                    ) => (

                      <div
                        className="details-feature"
                        key={`${plan.id}-${index}`}
                      >

                        <span className="feature-check">
                          <Check size={11} />
                        </span>

                        <span>
                          {feature}
                        </span>

                      </div>

                    )
                  )

                ) : (

                  <div className="details-feature">

                    <span className="feature-check">
                      <Check size={11} />
                    </span>

                    Plan features will be
                    available after activation.

                  </div>

                )}

              </div>

            </article>

            {/* LIMITS */}

            <article className="details-section-card">

              <div className="section-heading">

                <div className="section-heading-icon">
                  <Users size={17} />
                </div>

                <div>

                  <h3>
                    Usage limits
                  </h3>

                  <p>
                    Limits included in your
                    selected plan.
                  </p>

                </div>

              </div>

              <div className="limits-grid">

                {customerLimit !==
                  null && (

                  <LimitCard
                    icon={
                      <Users size={17} />
                    }
                    label="Customers"
                    value={String(
                      customerLimit
                    )}
                  />

                )}

                {invoiceLimit !==
                  null && (

                  <LimitCard
                    icon={
                      <FileText
                        size={17}
                      />
                    }
                    label="Invoices"
                    value={String(
                      invoiceLimit
                    )}
                  />

                )}

                {userLimit !==
                  null && (

                  <LimitCard
                    icon={
                      <Users size={17} />
                    }
                    label="Users"
                    value={String(
                      userLimit
                    )}
                  />

                )}

                {subscriptionLimit !==
                  null && (

                  <LimitCard
                    icon={
                      <RefreshIcon />
                    }
                    label="Subscriptions"
                    value={String(
                      subscriptionLimit
                    )}
                  />

                )}

              </div>

            </article>

            {/* BILLING INFO */}

            <article className="details-section-card">

              <div className="section-heading">

                <div className="section-heading-icon">
                  <CalendarDays
                    size={17}
                  />
                </div>

                <div>

                  <h3>
                    Billing information
                  </h3>

                  <p>
                    How this plan will be
                    billed.
                  </p>

                </div>

              </div>

              <div className="billing-information-grid">

                <InfoRow
                  label="Billing frequency"
                  value={
                    billingCycle ===
                    "yearly"
                      ? "Yearly"
                      : "Monthly"
                  }
                />

                <InfoRow
                  label="Trial period"
                  value={
                    trialDays > 0
                      ? `${trialDays} days`
                      : "No free trial"
                  }
                />

                <InfoRow
                  label="Currency"
                  value={
                    currency
                  }
                />

                <InfoRow
                  label="Plan status"
                  value={
                    plan.is_active ===
                    false
                      ? "Inactive"
                      : "Active"
                  }
                  success={
                    plan.is_active !==
                    false
                  }
                />

              </div>

            </article>

          </div>

          {/* ==================================================
              RIGHT SUMMARY
          ================================================== */}

          <aside className="checkout-summary">

            <div className="summary-label">
              ORDER SUMMARY
            </div>

            <h2>
              Your subscription
            </h2>

            <div className="summary-plan">

              <div className="summary-plan-icon">
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

            <div className="summary-row">

              <span>
                Plan
              </span>

              <strong>
                {plan.name}
              </strong>

            </div>

            <div className="summary-row">

              <span>
                Billing
              </span>

              <strong>
                {billingCycle ===
                "yearly"
                  ? "Yearly"
                  : "Monthly"}
              </strong>

            </div>

            <div className="summary-row">

              <span>
                Subscription price
              </span>

              <strong>
                {money(
                  price,
                  currency
                )}
              </strong>

            </div>

            <div className="summary-row">

              <span>
                Free trial
              </span>

              <strong className="trial-text">
                {trialDays > 0
                  ? `${trialDays} days`
                  : "None"}
              </strong>

            </div>

            <div className="summary-divider" />

            <div className="summary-total">

              <div>

                <span>
                  {trialDays > 0
                    ? "After trial"
                    : "Recurring price"}
                </span>

                <small>
                  Taxes calculated during
                  confirmation
                </small>

              </div>

              <strong>
                {money(
                  price,
                  currency
                )}
              </strong>

            </div>

            {/* CONTINUE */}

            <button
              type="button"
              className="continue-button"
              onClick={
                handleContinue
              }
              disabled={
                continueLoading
              }
            >

              {continueLoading ? (

                <>
                  <Loader2
                    size={17}
                    className="spin"
                  />

                  Opening confirmation...
                </>

              ) : (

                <>
                  Continue to Confirmation

                  <ArrowRight
                    size={17}
                  />
                </>

              )}

            </button>

            <button
              type="button"
              className="change-plan-link"
              onClick={() =>
                navigate(
                  "/customer/plans"
                )
              }
            >
              Change plan
            </button>

            {/* SECURITY */}

            <div className="summary-security">

              <ShieldCheck size={17} />

              <div>

                <strong>
                  Secure by design
                </strong>

                <p>
                  Your billing information
                  will be protected with secure
                  authentication.
                </p>

              </div>

            </div>

            {/* PAYMENT NOTE */}

            <div className="payment-note">

              <CreditCard size={15} />

              <span>
                Payment will be requested
                only after you confirm your
                billing information.
              </span>

            </div>

          </aside>

        </section>

        {/* ====================================================
            FINAL NOTICE
        ==================================================== */}

        <section className="details-notice">

          <Receipt size={18} />

          <div>

            <strong>
              Before you continue
            </strong>

            <p>
              The next step will ask you to
              confirm your customer information,
              billing cycle and applicable taxes.
              Your subscription will not become
              active until payment is successfully
              completed.
            </p>

          </div>

        </section>

      </main>

    </div>
  );
}

// ============================================================
// LIMIT CARD
// ============================================================

function LimitCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="limit-card">

      <div className="limit-card-icon">
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
// INFO ROW
// ============================================================

function InfoRow({
  label,
  value,
  success = false,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className="info-row">

      <span>
        {label}
      </span>

      <strong
        className={
          success
            ? "success-value"
            : ""
        }
      >
        {value}
      </strong>

    </div>
  );
}

// ============================================================
// REFRESH ICON
// ============================================================

function RefreshIcon() {
  return (
    <svg
      width="17"
      height="17"
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