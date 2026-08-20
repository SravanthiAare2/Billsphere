import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useNavigate } from "react-router-dom";

import "./Plans.css";

import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock3,
  FileText,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";

import { useToast } from "../components/ToastProvider";

// ============================================================
// API
// ============================================================

const API_URL = "http://127.0.0.1:8000/api/v1";

// ============================================================
// APPROVED BILLSPHERE PLATFORM CATALOG
// ============================================================
//
// IMPORTANT:
// The backend may contain many more platforms.
//
// BillSphere customer UI intentionally exposes ONLY these
// 53 approved platforms.
//
// We do NOT delete or modify any other backend/database plans.
// We simply filter the customer-facing platform selector.
//

const APPROVED_PLATFORMS = [
  // ----------------------------------------------------------
  // CLOUD / SOFTWARE / BUSINESS
  // ----------------------------------------------------------

  "Adobe",
  "Adobe Creative Cloud",
  "Amazon Web Services",
  "Alibaba Cloud",
  "Apple App Store",
  "Google Play Store",
  "Google Cloud",
  "Microsoft Store",
  "Salesforce",
  "HubSpot",
  "Shopify",
  "Shopify Plus",
  "Squarespace Commerce",
  "Webflow Ecommerce",
  "WooCommerce",

  // ----------------------------------------------------------
  // MAJOR MARKETPLACES
  // ----------------------------------------------------------

  "Amazon",
  "Amazon Business",
  "Amazon Marketplace",
  "AliExpress",
  "eBay",
  "Etsy",
  "Flipkart",
  "Meesho",
  "Myntra",
  "Walmart",
  "Walmart Marketplace",
  "Mercado Libre",
  "Shopee",
  "Lazada",
  "Rakuten",
  "Temu",
  "Taobao",
  "Tmall",
  "Tokopedia",

  // ----------------------------------------------------------
  // RETAIL / FASHION
  // ----------------------------------------------------------

  "Nike",
  "H&M",
  "ASOS",
  "SHEIN",
  "IKEA",
  "Best Buy",
  "Costco",
  "Target",
  "Macy's",

  // ----------------------------------------------------------
  // ENTERTAINMENT / GAMING
  // ----------------------------------------------------------

  "Netflix",
  "Spotify",
  "Epic Games Store",
  "Roblox Marketplace",

  // ----------------------------------------------------------
  // FOOD / DELIVERY
  // ----------------------------------------------------------

  "Swiggy",
  "Uber Eats",
  "Zomato",

  // ----------------------------------------------------------
  // SOCIAL COMMERCE
  // ----------------------------------------------------------

  "Instagram Shop",
  "Facebook Marketplace",
  "TikTok Shop",
] as const;

// ============================================================
// TYPES
// ============================================================

interface BackendPlan {
  id: number;

  platform?: string | null;
  platform_name?: string | null;

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
  active?: boolean;

  created_at?: string | null;
  updated_at?: string | null;
}

interface PlansApiResponse {
  total?: number;
  page?: number;
  page_size?: number;
  plans?: BackendPlan[];
  items?: BackendPlan[];
}

// ============================================================
// HUMAN READABLE FEATURE LABELS
// ============================================================

const FEATURE_LABELS: Record<string, string> = {
  subscription_management: "Subscription Management",
  basic_billing: "Basic Billing",
  advanced_billing: "Advanced Billing",
  invoice_generation: "Invoice Generation",
  email_notifications: "Email Notifications",
  payment_tracking: "Payment Tracking",
  automated_renewals: "Automated Renewals",
  payment_retries: "Payment Retries",
  billing_reports: "Billing Reports",
  analytics: "Analytics",
  advanced_analytics: "Advanced Analytics",
  proration: "Proration",
  tax_management: "Tax Management",
  tax_automation: "Tax Automation",
  pdf_invoices: "PDF Invoices",
  priority_support: "Priority Support",
  customer_management: "Customer Management",
  user_management: "User Management",
  reporting: "Reporting",
  financial_reports: "Financial Reports",
  dashboard_access: "Dashboard Access",
  basic_dashboard: "Basic Dashboard",
  notifications: "Notifications",
  failed_payment_recovery: "Failed Payment Recovery",
  advanced_tax_handling: "Advanced Tax Handling",
  custom_billing_workflows: "Custom Billing Workflows",
  enterprise_administration: "Enterprise Administration",
  high_volume_billing: "High Volume Billing",
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
    return "₹0.00";
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `₹${amount.toFixed(2)}`;
  }
}

// ============================================================
// PLATFORM
// ============================================================

function normalizePlatform(plan: BackendPlan): string {
  return (
    plan.platform ||
    plan.platform_name ||
    ""
  ).trim();
}

// ============================================================
// BILLING CYCLE
// ============================================================

function normalizeBillingCycle(
  value: string | null | undefined
): "monthly" | "yearly" | "both" | "all" {
  const normalized = (value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (
    normalized === "yearly" ||
    normalized === "annual" ||
    normalized === "annually" ||
    normalized === "year"
  ) {
    return "yearly";
  }

  if (
    normalized === "both" ||
    normalized === "all"
  ) {
    return normalized as "both" | "all";
  }

  return "monthly";
}

// ============================================================
// TRIAL
// ============================================================

function getTrialDays(plan: BackendPlan) {
  return plan.trial_days ?? 0;
}

// ============================================================
// LIMITS
// ============================================================

function getCustomerLimit(plan: BackendPlan) {
  return (
    plan.max_customers ??
    plan.customer_limit ??
    null
  );
}

function getInvoiceLimit(plan: BackendPlan) {
  return (
    plan.max_invoices ??
    plan.invoice_limit ??
    null
  );
}

function getUserLimit(plan: BackendPlan) {
  return (
    plan.max_users ??
    plan.user_limit ??
    null
  );
}

function getSubscriptionLimit(plan: BackendPlan) {
  return (
    plan.max_subscriptions ??
    plan.subscription_limit ??
    null
  );
}

// ============================================================
// FEATURE LABEL
// ============================================================

function humanizeFeature(
  feature: string
): string {
  const key = feature
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

// ============================================================
// NORMALIZE FEATURES
// ============================================================

function normalizeFeatures(
  features: BackendPlan["feature_entitlements"]
): string[] {
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
        if (typeof value === "boolean") {
          return value;
        }

        if (
          value === null ||
          value === undefined
        ) {
          return false;
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
// NORMALIZE API RESPONSE
// ============================================================

function normalizePlans(
  data: unknown
): BackendPlan[] {
  if (Array.isArray(data)) {
    return data as BackendPlan[];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const response =
    data as PlansApiResponse;

  /*
   * Current BillSphere backend response:
   *
   * {
   *   total: 783,
   *   page: 1,
   *   page_size: 10,
   *   plans: [...]
   * }
   */

  if (Array.isArray(response.plans)) {
    return response.plans;
  }

  if (Array.isArray(response.items)) {
    return response.items;
  }

  return [];
}

// ============================================================
// FETCH ONE PAGE
// ============================================================

async function fetchPlansPage(
  page: number,
  pageSize: number
): Promise<{
  plans: BackendPlan[];
  total: number;
}> {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  const url =
    `${API_URL}/plans?page=${page}&page_size=${pageSize}`;

  const response = await fetch(url, {
    method: "GET",

    headers: {
      Accept: "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
  });

  if (!response.ok) {
    let message =
      "Unable to load subscription plans.";

    try {
      const errorData =
        await response.json();

      message =
        errorData?.detail ||
        errorData?.message ||
        message;
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  const data =
    await response.json();

  const plans =
    normalizePlans(data);

  return {
    plans,

    total:
      typeof data?.total === "number"
        ? data.total
        : plans.length,
  };
}

// ============================================================
// FETCH ALL PLANS
// ============================================================

async function fetchPlans(): Promise<
  BackendPlan[]
> {
  /*
   * Backend currently supports page_size=10.
   *
   * We therefore retrieve every page.
   *
   * IMPORTANT:
   * We still fetch all backend plans because the
   * approved-platform filtering happens afterward.
   */

  const PAGE_SIZE = 10;

  const firstPage =
    await fetchPlansPage(
      1,
      PAGE_SIZE
    );

  const allPlans = [
    ...firstPage.plans,
  ];

  const total =
    firstPage.total;

  if (
    total <= firstPage.plans.length
  ) {
    return allPlans;
  }

  const totalPages =
    Math.ceil(
      total / PAGE_SIZE
    );

  /*
   * Fetch remaining pages sequentially.
   */

  for (
    let page = 2;
    page <= totalPages;
    page++
  ) {
    const result =
      await fetchPlansPage(
        page,
        PAGE_SIZE
      );

    allPlans.push(
      ...result.plans
    );
  }

  /*
   * Remove accidental duplicate
   * records by plan ID.
   */

  const uniquePlans =
    new Map<
      number,
      BackendPlan
    >();

  allPlans.forEach((plan) => {
    if (
      typeof plan.id === "number"
    ) {
      uniquePlans.set(
        plan.id,
        plan
      );
    }
  });

  return Array.from(
    uniquePlans.values()
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Plans() {
  const navigate = useNavigate();

  const { notify } =
    useToast();

  const [plans, setPlans] =
    useState<BackendPlan[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [platform, setPlatform] =
    useState("");

  const [billingCycle, setBillingCycle] =
    useState<
      "monthly" | "yearly"
    >("monthly");

  const [platformOpen, setPlatformOpen] =
    useState(false);

  const [platformSearch, setPlatformSearch] =
    useState("");

  const [selectedPlanId, setSelectedPlanId] =
    useState<number | null>(null);

  // ==========================================================
  // LOAD PLANS
  // ==========================================================

  async function loadPlans() {
    setLoading(true);

    try {
      const data =
        await fetchPlans();

      const activePlans =
        data.filter(
          (plan) =>
            plan.is_active !== false &&
            plan.active !== false
        );

      setPlans(activePlans);

      /*
       * Do not automatically select
       * a platform.
       */

      setPlatform("");

      setSelectedPlanId(null);
    } catch (error: any) {
      notify({
        title:
          "Plans could not be loaded",

        description:
          error?.message ||
          "Unable to fetch plans from BillSphere.",

        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadPlans();
  }, []);

  // ==========================================================
  // APPROVED BACKEND PLATFORMS
  // ==========================================================
  //
  // The backend may return 263 platforms.
  //
  // Only platforms present in APPROVED_PLATFORMS
  // AND present in the backend are displayed.
  //
  // This means:
  //
  // Database → 263
  // Customer UI → maximum 53
  //
  // No database records are deleted.
  //

  const backendPlatforms =
    useMemo(() => {
      const available =
        new Map<
          string,
          string
        >();

      plans.forEach((plan) => {
        const value =
          normalizePlatform(plan);

        if (!value) {
          return;
        }

        const key =
          value.toLowerCase();

        if (!available.has(key)) {
          available.set(
            key,
            value
          );
        }
      });

      /*
       * Preserve the exact approved
       * platform names and order.
       *
       * Case-insensitive matching is used
       * so backend capitalization does not
       * accidentally hide a valid platform.
       */

      return APPROVED_PLATFORMS
        .filter((approvedPlatform) =>
          available.has(
            approvedPlatform.toLowerCase()
          )
        )
        .map(
          (approvedPlatform) =>
            available.get(
              approvedPlatform.toLowerCase()
            ) || approvedPlatform
        );
    }, [plans]);

  // ==========================================================
  // SEARCH PLATFORM
  // ==========================================================

  const filteredPlatforms =
    useMemo(() => {
      const search =
        platformSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return backendPlatforms;
      }

      return backendPlatforms.filter(
        (item) =>
          item
            .toLowerCase()
            .includes(search)
      );
    }, [
      backendPlatforms,
      platformSearch,
    ]);

  // ==========================================================
  // SELECTED PLATFORM PLANS
  // ==========================================================

  const displayPlans =
    useMemo(() => {
      if (!platform) {
        return [];
      }

      const selectedPlatform =
        platform
          .trim()
          .toLowerCase();

      return plans
        .filter((plan) => {
          const planPlatform =
            normalizePlatform(plan)
              .toLowerCase();

          const cycle =
            normalizeBillingCycle(
              plan.billing_cycle
            );

          const platformMatches =
            planPlatform ===
            selectedPlatform;

          const cycleMatches =
            cycle === billingCycle ||
            cycle === "both" ||
            cycle === "all";

          /*
           * Extra safety:
           *
           * Even if a platform is manually
           * selected somehow, only one of the
           * approved 53 platforms can display
           * customer plans.
           */

          const isApproved =
            APPROVED_PLATFORMS.some(
              (approvedPlatform) =>
                approvedPlatform
                  .toLowerCase() ===
                planPlatform
            );

          return (
            isApproved &&
            platformMatches &&
            cycleMatches
          );
        })
        .sort((a, b) => {
          const order = [
            "basic",
            "standard",
            "premium",
          ];

          const aName =
            (a.name || "")
              .trim()
              .toLowerCase();

          const bName =
            (b.name || "")
              .trim()
              .toLowerCase();

          const aIndex =
            order.indexOf(aName);

          const bIndex =
            order.indexOf(bName);

          if (
            aIndex !== -1 &&
            bIndex !== -1
          ) {
            return (
              aIndex - bIndex
            );
          }

          if (
            aIndex !== -1
          ) {
            return -1;
          }

          if (
            bIndex !== -1
          ) {
            return 1;
          }

          return (
            Number(
              a.price ?? 0
            ) -
            Number(
              b.price ?? 0
            )
          );
        });
    }, [
      plans,
      platform,
      billingCycle,
    ]);

  // ==========================================================
  // SELECT PLATFORM
  // ==========================================================

  function selectPlatform(
    value: string
  ) {
    setPlatform(value);

    setPlatformOpen(false);

    setPlatformSearch("");

    setSelectedPlanId(null);
  }

  // ==========================================================
  // CHOOSE PLAN
  // ==========================================================

  function choosePlan(
    plan: BackendPlan
  ) {
    setSelectedPlanId(plan.id);

    navigate(
      `/customer/plans/${plan.id}`
    );
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="plans-page">
        <div className="plans-loading">

          <div className="loading-ring" />

          <p>
            Loading available plans...
          </p>

        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN
  // ==========================================================

  return (
    <div className="plans-page">

      {/* ====================================================
          BRAND
      ==================================================== */}

      <div className="plans-top-bar">

        <div />

        <div className="plans-brand">
          BILLSPHERE
        </div>

      </div>

      {/* ====================================================
          HERO
      ==================================================== */}

      <section className="plans-hero">

        <div className="plans-eyebrow">
          BILLSPHERE SUBSCRIPTIONS
        </div>

        <h1>
          Explore{" "}
          <span>Plans</span>
        </h1>

        <p>
          Choose a platform and find the
          right subscription plan for your
          needs. Review features, billing,
          trial benefits and pricing before
          continuing.
        </p>

      </section>

      {/* ====================================================
          WHAT HAPPENS NEXT
      ==================================================== */}

      <section className="plans-journey">

        <div className="journey-title">
          How your subscription works
        </div>

        <div className="journey-grid">

          <JourneyItem
            number="01"
            title="Choose Platform"
            description="Select the service you want to subscribe to."
          />

          <JourneyItem
            number="02"
            title="Compare Plans"
            description="Review available plans, features, price and trial."
          />

          <JourneyItem
            number="03"
            title="Review Details"
            description="Open the selected plan and verify everything before subscribing."
          />

          <JourneyItem
            number="04"
            title="Confirm & Pay"
            description="Confirm your account and billing information, then complete payment."
          />

        </div>

      </section>

      {/* ====================================================
          PLATFORM SELECTOR
      ==================================================== */}

      <section className="platform-selector-section">

        <label>
          Choose a platform
        </label>

        <div className="platform-select-wrapper">

          <button
            type="button"
            className="platform-select-button"
            onClick={() =>
              setPlatformOpen(
                (current) =>
                  !current
              )
            }
          >

            <span>
              {platform ||
                "Select a platform"}
            </span>

            <ChevronDown
              size={19}
              className={
                platformOpen
                  ? "rotate"
                  : ""
              }
            />

          </button>

          {platformOpen && (

            <div className="platform-dropdown">

              {/* SEARCH */}

              <div className="platform-search-box">

                <Search size={15} />

                <input
                  autoFocus
                  value={
                    platformSearch
                  }
                  onChange={(event) =>
                    setPlatformSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search platform..."
                />

                {platformSearch && (

                  <button
                    type="button"
                    onClick={() =>
                      setPlatformSearch("")
                    }
                  >
                    <X size={14} />
                  </button>

                )}

              </div>

              {/* PLATFORM LIST */}

              <div className="platform-dropdown-list">

                {filteredPlatforms.length ===
                0 ? (

                  <div className="platform-no-results">

                    <Search size={20} />

                    <p>
                      No platform found
                    </p>

                    <span>
                      Try another platform
                      name.
                    </span>

                  </div>

                ) : (

                  filteredPlatforms.map(
                    (item) => {

                      const isSelected =
                        platform
                          .toLowerCase() ===
                        item.toLowerCase();

                      return (

                        <button
                          type="button"
                          key={item}
                          className={
                            isSelected
                              ? "platform-option selected"
                              : "platform-option"
                          }
                          onClick={() =>
                            selectPlatform(
                              item
                            )
                          }
                        >

                          <span className="platform-option-icon">
                            {item
                              .charAt(0)
                              .toUpperCase()}
                          </span>

                          <span className="platform-option-name">
                            {item}
                          </span>

                          {isSelected && (
                            <Check
                              size={15}
                            />
                          )}

                        </button>

                      );
                    }
                  )

                )}

              </div>

              {/* FOOTER */}

              <div className="platform-dropdown-footer">

                {filteredPlatforms.length}{" "}
                platform
                {filteredPlatforms.length ===
                1
                  ? ""
                  : "s"}{" "}
                available

              </div>

            </div>

          )}

        </div>

        <p className="platform-helper">
          Select a platform to see the
          subscription plans available
          for that service.
        </p>

      </section>

      {/* ====================================================
          INITIAL STATE
      ==================================================== */}

      {!platform && (

        <section className="platform-empty">

          <div className="empty-icon">
            <Sparkles size={22} />
          </div>

          <h2>
            Choose your platform
          </h2>

          <p>
            Once you select a platform,
            BillSphere will show its
            available subscription plans
            with pricing, trial period and
            included features. You can then
            compare plans and choose the one
            you want to continue with.
          </p>

        </section>

      )}

      {/* ====================================================
          SELECTED PLATFORM
      ==================================================== */}

      {platform && (

        <section className="platform-plans">

          {/* SELECTED PLATFORM HEADER */}

          <div className="selected-platform-header">

            <div>

              <div className="platform-label">
                SELECTED PLATFORM
              </div>

              <h2>
                {platform}
              </h2>

              <p>
                Choose the subscription that
                works best for your needs.
              </p>

            </div>

            <button
              type="button"
              className="change-platform-button"
              onClick={() => {
                setPlatform("");

                setPlatformOpen(true);
              }}
            >
              ← Change Platform
            </button>

          </div>

          {/* ==================================================
              BILLING
          ================================================== */}

          <div className="billing-selector">

            <span>
              Billing frequency
            </span>

            <div className="billing-toggle">

              <button
                type="button"
                className={
                  billingCycle ===
                  "monthly"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setBillingCycle(
                    "monthly"
                  )
                }
              >
                Monthly
              </button>

              <button
                type="button"
                className={
                  billingCycle ===
                  "yearly"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setBillingCycle(
                    "yearly"
                  )
                }
              >
                Yearly
              </button>

            </div>

          </div>

          {/* ==================================================
              PLANS
          ================================================== */}

          {displayPlans.length === 0 ? (

            <div className="no-plans">

              <Package size={25} />

              <h3>
                No{" "}
                {billingCycle}{" "}
                plans available
              </h3>

              <p>
                There are currently no
                active{" "}
                {billingCycle}{" "}
                subscription plans for{" "}
                {platform}.
              </p>

              <button
                type="button"
                className="retry-button"
                onClick={loadPlans}
              >
                <RefreshCw size={14} />

                Refresh Plans
              </button>

            </div>

          ) : (

            <>

              {/* PLAN CARDS */}

              <div className="plans-grid">

                {displayPlans.map(
                  (
                    plan,
                    index
                  ) => {

                    const features =
                      normalizeFeatures(
                        plan.feature_entitlements
                      );

                    const planName =
                      (plan.name || "")
                        .trim()
                        .toLowerCase();

                    /*
                     * IMPORTANT:
                     *
                     * ONLY PREMIUM IS MOST POPULAR.
                     *
                     * Standard no longer receives
                     * the popular badge.
                     */

                    const isPopular =
                      planName ===
                      "premium";

                    const isSelected =
                      selectedPlanId ===
                      plan.id;

                    const trialDays =
                      getTrialDays(plan);

                    const customerLimit =
                      getCustomerLimit(
                        plan
                      );

                    const invoiceLimit =
                      getInvoiceLimit(
                        plan
                      );

                    const userLimit =
                      getUserLimit(
                        plan
                      );

                    const subscriptionLimit =
                      getSubscriptionLimit(
                        plan
                      );

                    const cycle =
                      normalizeBillingCycle(
                        plan.billing_cycle
                      );

                    const interval =
                      cycle === "yearly"
                        ? "year"
                        : "month";

                    return (

                      <article
                        key={plan.id}
                        className={`plan-card ${
                          index === 1
                            ? "standard-plan"
                            : ""
                        } ${
                          isPopular
                            ? "premium-plan"
                            : ""
                        }`}
                      >

                        {/* POPULAR BADGE */}

                        {isPopular && (

                          <div className="popular-badge">

                            <Zap
                              size={10}
                            />

                            MOST POPULAR

                          </div>

                        )}

                        {/* PLAN HEADER */}

                        <div className="plan-card-header">

                          <div className="plan-icon">

                            <Package
                              size={17}
                            />

                          </div>

                          <div className="plan-name">

                            {plan.name ||
                              `Plan #${plan.id}`}

                          </div>

                          <p>

                            {plan.description ||
                              `A ${platform} subscription plan powered by BillSphere.`}

                          </p>

                        </div>

                        {/* PRICE */}

                        <div className="plan-price">

                          <span className="price">

                            {money(
                              plan.price,
                              plan.currency ||
                                "INR"
                            )}

                          </span>

                          <span className="billing">

                            / {interval}

                          </span>

                        </div>

                        {/* TRIAL */}

                        {trialDays > 0 && (

                          <div className="trial-badge">

                            <Clock3
                              size={11}
                            />

                            {trialDays}
                            -day free trial

                          </div>

                        )}

                        <div className="feature-divider" />

                        {/* FEATURES */}

                        <div className="features">

                          <h4>
                            What's included
                          </h4>

                          {features.length >
                          0 ? (

                            features.map(
                              (
                                feature,
                                featureIndex
                              ) => (

                                <div
                                  className="feature"
                                  key={`${plan.id}-${featureIndex}`}
                                >

                                  <span className="check">

                                    <Check
                                      size={10}
                                    />

                                  </span>

                                  <span>
                                    {feature}
                                  </span>

                                </div>

                              )
                            )

                          ) : (

                            <div className="feature">

                              <span className="check">

                                <Check
                                  size={10}
                                />

                              </span>

                              <span>
                                Plan features
                                available after
                                selection.
                              </span>

                            </div>

                          )}

                          {/* CUSTOMER LIMIT */}

                          {customerLimit !==
                            null && (

                            <LimitRow
                              icon={
                                <Users
                                  size={12}
                                />
                              }
                              label="Customer limit"
                              value={String(
                                customerLimit
                              )}
                            />

                          )}

                          {/* INVOICE LIMIT */}

                          {invoiceLimit !==
                            null && (

                            <LimitRow
                              icon={
                                <FileText
                                  size={12}
                                />
                              }
                              label="Invoice limit"
                              value={String(
                                invoiceLimit
                              )}
                            />

                          )}

                          {/* USER LIMIT */}

                          {userLimit !==
                            null && (

                            <LimitRow
                              icon={
                                <Users
                                  size={12}
                                />
                              }
                              label="User limit"
                              value={String(
                                userLimit
                              )}
                            />

                          )}

                          {/* SUBSCRIPTION LIMIT */}

                          {subscriptionLimit !==
                            null && (

                            <LimitRow
                              icon={
                                <RefreshCw
                                  size={12}
                                />
                              }
                              label="Subscription limit"
                              value={String(
                                subscriptionLimit
                              )}
                            />

                          )}

                        </div>

                        {/* CHOOSE PLAN */}

                        <button
                          type="button"
                          className={`choose-plan-button ${
                            isPopular
                              ? "gold-button"
                              : ""
                          }`}
                          disabled={
                            isSelected
                          }
                          onClick={() =>
                            choosePlan(
                              plan
                            )
                          }
                        >

                          {isSelected ? (

                            <>

                              <Loader2
                                size={15}
                                className="spin-icon"
                              />

                              Opening...

                            </>

                          ) : (

                            <>

                              Choose Plan

                              <ArrowRight
                                size={15}
                              />

                            </>

                          )}

                        </button>

                        {/* REVIEW NOTE */}

                        <div className="review-note">

                          <ShieldCheck
                            size={11}
                          />

                          Review plan details
                          before subscribing

                        </div>

                      </article>

                    );
                  }
                )}

              </div>

              {/* ==================================================
                  SUBSCRIPTION FLOW
              ================================================== */}

              <section className="subscription-flow">

                <div className="subscription-flow-header">

                  <div>

                    <div className="flow-eyebrow">
                      YOUR SUBSCRIPTION JOURNEY
                    </div>

                    <h3>
                      What happens after
                      you choose a plan?
                    </h3>

                    <p>
                      BillSphere will take
                      you through every step
                      before your subscription
                      becomes active.
                    </p>

                  </div>

                </div>

                <div className="flow-steps">

                  <FlowStep
                    number="01"
                    title="Choose Plan"
                    text="Select the platform and plan that fits your needs."
                  />

                  <FlowStep
                    number="02"
                    title="Plan Details"
                    text="Review the real backend plan, features, price and trial."
                  />

                  <FlowStep
                    number="03"
                    title="Confirm"
                    text="Verify your customer information, billing cycle and taxes."
                  />

                  <FlowStep
                    number="04"
                    title="Payment"
                    text="Complete payment and let BillSphere create your subscription."
                  />

                  <FlowStep
                    number="05"
                    title="Active"
                    text="Your real database subscription becomes active and billing begins."
                  />

                </div>

              </section>

            </>

          )}

        </section>

      )}

    </div>
  );
}

// ============================================================
// LIMIT ROW
// ============================================================

function LimitRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="limit-row">

      <span className="limit-icon">
        {icon}
      </span>

      <span className="limit-label">
        {label}
      </span>

      <span className="limit-value">
        {value}
      </span>

    </div>
  );
}

// ============================================================
// JOURNEY ITEM
// ============================================================

function JourneyItem({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="journey-item">

      <span className="journey-number">
        {number}
      </span>

      <div>

        <h4>
          {title}
        </h4>

        <p>
          {description}
        </p>

      </div>

    </div>
  );
}

// ============================================================
// FLOW STEP
// ============================================================

function FlowStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="flow-step">

      <div className="flow-step-number">
        {number}
      </div>

      <h4>
        {title}
      </h4>

      <p>
        {text}
      </p>

    </div>
  );
}