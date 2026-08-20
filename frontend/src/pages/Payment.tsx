import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Package,
  QrCode,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  Users,
  WalletCards,
  AlertCircle,
} from "lucide-react";

import { useToast } from "../components/ToastProvider";
import {
  createMockCheckout,
  getCurrentUser,
} from "../services/api";

import "./Payment.css";

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
// PAYMENT METHODS
// ============================================================

type PaymentMethod =
  | "upi"
  | "card"
  | "netbanking"
  | "wallet";

const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "upi",
    label: "UPI",
    description:
      "Pay using Google Pay, PhonePe, Paytm or another UPI app.",
    icon: <QrCode size={19} />,
  },
  {
    value: "card",
    label: "Credit / Debit Card",
    description:
      "Pay securely using your credit or debit card.",
    icon: <CreditCard size={19} />,
  },
  {
    value: "netbanking",
    label: "Net Banking",
    description:
      "Pay directly through your bank account.",
    icon: <WalletCards size={19} />,
  },
  {
    value: "wallet",
    label: "Digital Wallet",
    description:
      "Use an available supported digital wallet.",
    icon: <Smartphone size={19} />,
  },
];

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
// FIND PLAN
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
    String(data.id) ===
      String(planId)
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

export default function Payment() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const { planId: routePlanId } =
    useParams<{
      planId: string;
    }>();

  const navigationState =
    location.state as
      | {
          planId?: number | string;
          plan?: BackendPlan | null;
          // Set when returning here via the "Back" button on the
          // /payment-confirmation page (reached from the email
          // YES/NO confirmation link).
          confirmed?: boolean;
          rejected?: boolean;
          planName?: string | null;
          amount?: number | string | null;
          currency?: string | null;
        }
      | null;

  const confirmedFromEmail = navigationState?.confirmed === true;
  const rejectedFromEmail = navigationState?.rejected === true;

  const planId =
    routePlanId ||
    (navigationState?.planId != null
      ? String(navigationState.planId)
      : "");

  const { notify } =
    useToast();

  // ==========================================================
  // PLAN
  // ==========================================================

  const [plan, setPlan] =
    useState<BackendPlan | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ==========================================================
  // PAYMENT METHOD
  // ==========================================================

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState<PaymentMethod>(
    "upi"
  );

  // ==========================================================
  // UPI
  // ==========================================================

  const [upiId, setUpiId] =
    useState("");

  // ==========================================================
  // NET BANKING
  // ==========================================================

  const [bank, setBank] =
    useState("");

  // ==========================================================
  // WALLET
  // ==========================================================

  const [wallet, setWallet] =
    useState("");

  // ==========================================================
  // CUSTOMER INFORMATION
  // ==========================================================

  const [
    customerName,
    setCustomerName,
  ] = useState("");

  const [
    customerEmail,
    setCustomerEmail,
  ] = useState("");

  const [
    customerPhone,
    setCustomerPhone,
  ] = useState("");

  // ==========================================================
  // BILLING ADDRESS
  // ==========================================================

  const [
    addressLine,
    setAddressLine,
  ] = useState("");

  const [city, setCity] =
    useState("");

  const [state, setState] =
    useState("");

  const [postalCode, setPostalCode] =
    useState("");

  // ==========================================================
  // TERMS
  // ==========================================================

  const [
    agreeTerms,
    setAgreeTerms,
  ] = useState(false);

  const [
    paymentLoading,
    setPaymentLoading,
  ] = useState(false);

  // ==========================================================
  // PAYMENT SUBMITTED
  // ==========================================================

  const [paymentPending, setPaymentPending] = useState(false);

  // ==========================================================
  // LOAD PLAN
  // ==========================================================

  useEffect(() => {
    async function loadPlan() {
      if (confirmedFromEmail || rejectedFromEmail) {
        // Coming back from the email confirmation page — the
        // confirmed/rejected screen below doesn't need the plan
        // checkout form to load.
        setLoading(false);
        return;
      }

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

        try {
          const currentUser = await getCurrentUser();
          const fullName = [
            currentUser.first_name,
            currentUser.last_name,
          ]
            .filter(Boolean)
            .join(" ");

          setCustomerName((value) =>
            value || fullName || ""
          );
          setCustomerEmail((value) =>
            value || currentUser.email || ""
          );
          setCustomerPhone((value) =>
            value || currentUser.phone || ""
          );
        } catch {
          // Keep the editable fields available if the current-user lookup fails.
        }

        // ------------------------------------------------------
        // Try to prefill account information
        // ------------------------------------------------------

        const storedUser =
          localStorage.getItem(
            "user"
          );

        if (storedUser) {
          try {
            const user =
              JSON.parse(
                storedUser
              );

            setCustomerName(
              user?.name ||
                user?.full_name ||
                user?.username ||
                ""
            );

            setCustomerEmail(
              user?.email || ""
            );

            setCustomerPhone(
              user?.phone ||
                user?.phone_number ||
                ""
            );
          } catch {
            // Ignore invalid local storage.
          }
        }
      } catch (err: any) {
        const message =
          err?.message ||
          "Unable to load payment details.";

        setError(message);

        notify({
          title:
            "Payment unavailable",
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
  // DERIVED
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

  // ==========================================================
  // VALIDATION
  // ==========================================================

  function validatePayment() {
    if (!customerName.trim()) {
      notify({
        title:
          "Customer name required",
        description:
          "Please enter your full name.",
        variant: "error",
      });

      return false;
    }

    if (
      !customerEmail.trim() ||
      !customerEmail.includes("@")
    ) {
      notify({
        title:
          "Valid email required",
        description:
          "Please enter the email address where the payment confirmation should be sent.",
        variant: "error",
      });

      return false;
    }

    if (!customerPhone.trim()) {
      notify({
        title:
          "Phone number required",
        description:
          "Please enter your phone number.",
        variant: "error",
      });

      return false;
    }

    if (
      !addressLine.trim() ||
      !city.trim() ||
      !state.trim() ||
      !postalCode.trim()
    ) {
      notify({
        title:
          "Billing address incomplete",
        description:
          "Please complete your billing address.",
        variant: "error",
      });

      return false;
    }

    if (
      paymentMethod === "upi" &&
      !upiId.trim()
    ) {
      notify({
        title:
          "UPI ID required",
        description:
          "Enter your UPI ID or use the QR option.",
        variant: "error",
      });

      return false;
    }

    if (
      paymentMethod ===
        "netbanking" &&
      !bank
    ) {
      notify({
        title:
          "Bank selection required",
        description:
          "Please select your bank.",
        variant: "error",
      });

      return false;
    }

    if (
      paymentMethod ===
        "wallet" &&
      !wallet
    ) {
      notify({
        title:
          "Wallet selection required",
        description:
          "Please select a wallet.",
        variant: "error",
      });

      return false;
    }

    if (!agreeTerms) {
      notify({
        title:
          "Confirmation required",
        description:
          "Please confirm that your payment details are correct.",
        variant: "error",
      });

      return false;
    }

    return true;
  }

  // ==========================================================
  // PAY
  // ==========================================================

  async function handlePayment() {
    if (!plan) {
      return;
    }

    if (!validatePayment()) {
      return;
    }

    setPaymentLoading(true);

    try {
      const checkoutResult = await createMockCheckout(
        Number(plan.id),
        "mock_success"
      );

      notify({
        title: "Payment confirmation required",
        description: `A confirmation email was requested for ${money(
          checkoutResult.amount,
          checkoutResult.currency
        )}.`,
        variant: "success",
      });
      setPaymentPending(true);
    } catch (err: any) {
      notify({
        title:
          "Payment could not be submitted",
        description:
          err?.message ||
          "Please try again.",
        variant: "error",
      });
    } finally {
      setPaymentLoading(false);
    }
  }

  // ==========================================================
  // RETURNED FROM EMAIL CONFIRMATION
  //
  // The customer clicked YES/NO in the confirmation email,
  // then clicked "Back" on the confirmation page. Show the
  // payment page's success/rejection state instead of
  // reloading the checkout form.
  // ==========================================================

  if (confirmedFromEmail) {
    return (
      <PaymentConfirmedNotice
        planName={
          navigationState?.planName ||
          plan?.name ||
          "your plan"
        }
        amount={money(
          navigationState?.amount ?? price,
          navigationState?.currency || currency
        )}
        onGoToDashboard={() =>
          navigate("/customer/dashboard")
        }
        onViewMyPlan={() =>
          navigate("/customer/subscriptions")
        }
      />
    );
  }

  if (rejectedFromEmail) {
    return (
      <PaymentRejectedNotice
        planName={
          navigationState?.planName ||
          plan?.name ||
          "your plan"
        }
        onTryAgain={() =>
          navigate("/customer/plans")
        }
        onGoToDashboard={() =>
          navigate("/customer/dashboard")
        }
      />
    );
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="payment-page">

        <div className="payment-loading">

          <div className="payment-loading-ring" />

          <h2>
            Preparing secure payment...
          </h2>

          <p>
            BillSphere is preparing your
            payment session.
          </p>

        </div>

      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error ||
    !plan
  ) {
    return (
      <div className="payment-page">

        <div className="payment-error">

          <div className="payment-error-icon">
            <AlertCircle
              size={26}
            />
          </div>

          <h2>
            Payment unavailable
          </h2>

          <p>
            {error ||
              "Unable to prepare payment."}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/customer/plans"
              )
            }
          >
            <ArrowLeft
              size={16}
            />

            Back to Plans
          </button>

        </div>

      </div>
    );
  }

  // ==========================================================
  // PENDING PAYMENT SCREEN
  // ==========================================================

  if (paymentPending) {
    return (
      <PaymentPending
        plan={plan}
        email={customerEmail}
        amount={money(
          price,
          currency
        )}
        onBack={() =>
          navigate(
            `/customer/plans/${plan.id}/confirm`
          )
        }
      />
    );
  }

  // ==========================================================
  // MAIN PAYMENT PAGE
  // ==========================================================

  return (
    <div className="payment-page">

      {/* ======================================================
          TOP BAR
      ====================================================== */}

      <header className="payment-topbar">

        <button
          type="button"
          className="payment-back"
          onClick={() =>
            navigate(
              `/customer/plans/${plan.id}/confirm`
            )
          }
        >
          <ArrowLeft
            size={16}
          />

          Back to Confirmation
        </button>

        <div className="payment-brand">
          BILLSPHERE
        </div>

        <div className="payment-secure">
          <ShieldCheck
            size={15}
          />

          Secure Checkout
        </div>

      </header>

      {/* ======================================================
          PROGRESS
      ====================================================== */}

      <section className="payment-progress">

        <PaymentProgress
          number="01"
          title="Plan Details"
          text="Completed"
          completed
        />

        <div className="payment-progress-line completed" />

        <PaymentProgress
          number="02"
          title="Confirmation"
          text="Completed"
          completed
        />

        <div className="payment-progress-line completed" />

        <PaymentProgress
          number="03"
          title="Payment"
          text="Current step"
          active
        />

        <div className="payment-progress-line" />

        <PaymentProgress
          number="04"
          title="Active"
          text="After confirmation"
        />

      </section>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="payment-container">

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="payment-hero">

          <div className="payment-eyebrow">
            BILLSPHERE SECURE PAYMENT
          </div>

          <h1>
            Complete your{" "}
            <span>payment</span>
          </h1>

          <p>
            Choose your preferred payment
            method, provide the required
            information and submit your payment
            for secure confirmation.
          </p>

          <div className="payment-trust-row">

            <TrustItem
              icon={
                <Lock size={15} />
              }
              text="Encrypted checkout"
            />

            <TrustItem
              icon={
                <ShieldCheck size={15} />
              }
              text="Secure processing"
            />

            <TrustItem
              icon={
                <Mail size={15} />
              }
              text="Email confirmation"
            />

          </div>

        </section>

        {/* ====================================================
            PLAN MINI SUMMARY
        ==================================================== */}

        <section className="payment-plan-banner">

          <div className="payment-plan-banner-icon">
            <Package size={21} />
          </div>

          <div className="payment-plan-banner-content">

            <span>
              SUBSCRIPTION
            </span>

            <strong>
              {plan.platform} —{" "}
              {plan.name}
            </strong>

          </div>

          <div className="payment-plan-banner-price">

            <strong>
              {money(
                price,
                currency
              )}
            </strong>

            <span>
              /{" "}
              {billingCycle ===
              "yearly"
                ? "year"
                : "month"}
            </span>

          </div>

        </section>

        {/* ====================================================
            PAYMENT METHOD
        ==================================================== */}

        <section className="payment-section">

          <SectionHeader
            number="01"
            icon={
              <WalletCards
                size={19}
              />
            }
            title="Payment method"
            description="Choose how you would like to pay."
          />

          <div className="payment-method-selector">

            <label className="payment-method-label">
              Select payment method
            </label>

            <div className="payment-method-select-wrap">

              <select
                value={
                  paymentMethod
                }
                onChange={(event) =>
                  setPaymentMethod(
                    event.target
                      .value as PaymentMethod
                  )
                }
              >
                {PAYMENT_METHODS.map(
                  (method) => (
                    <option
                      value={
                        method.value
                      }
                      key={
                        method.value
                      }
                    >
                      {method.label}
                    </option>
                  )
                )}
              </select>

            </div>

          </div>

          <div className="payment-method-info">

            {
              PAYMENT_METHODS.find(
                (item) =>
                  item.value ===
                  paymentMethod
              )?.icon
            }

            <div>

              <strong>
                {
                  PAYMENT_METHODS.find(
                    (item) =>
                      item.value ===
                      paymentMethod
                  )?.label
                }
              </strong>

              <span>
                {
                  PAYMENT_METHODS.find(
                    (item) =>
                      item.value ===
                      paymentMethod
                  )?.description
                }
              </span>

            </div>

          </div>

        </section>

        {/* ====================================================
            METHOD DETAILS
        ==================================================== */}

        <section className="payment-section">

          <SectionHeader
            number="02"
            icon={
              <CreditCard
                size={19}
              />
            }
            title="Payment details"
            description="Enter the information required for your selected payment method."
          />

          {/* ==================================================
              UPI
          ================================================== */}

          {paymentMethod ===
            "upi" && (

            <div className="method-panel">

              <div className="upi-layout">

                <div className="upi-form">

                  <Field
                    label="UPI ID"
                    value={upiId}
                    onChange={setUpiId}
                    placeholder="example@upi"
                    hint="Example: yourname@oksbi"
                  />

                  <div className="upi-supported">

                    <Smartphone
                      size={16}
                    />

                    <span>
                      You can use Google Pay,
                      PhonePe, Paytm or another
                      supported UPI application.
                    </span>

                  </div>

                </div>

                <div className="qr-card">

                  <div className="qr-icon">
                    <QrCode
                      size={46}
                    />
                  </div>

                  <strong>
                    Scan to pay
                  </strong>

                  <span>
                    A payment QR will be
                    generated by the payment
                    gateway during real
                    processing.
                  </span>

                  <div className="demo-qr">
                    <div />
                    <div />
                    <div />
                    <div />
                    <div />
                    <div />
                    <div />
                    <div />
                    <div />
                  </div>

                  <small>
                    TEST MODE QR
                  </small>

                </div>

              </div>

            </div>
          )}

          {/* ==================================================
              CARD
          ================================================== */}

          {paymentMethod ===
            "card" && (

            <div className="method-panel">

              <div className="test-mode-banner">

                <Sparkles
                  size={16}
                />

                <div>

                  <strong>
                    MOCK PAYMENT MODE
                  </strong>

                  <span>
                    No card number, expiry, or CVV is collected. The
                    backend will process this checkout as mock success.
                  </span>

                </div>

              </div>

              <div className="card-security-note">

                <Lock
                  size={16}
                />

                <span>
                  A real provider can be connected later. This test flow
                  sends only a mock payment method to BillSphere.
                </span>

              </div>

            </div>
          )}

          {/* ==================================================
              NET BANKING
          ================================================== */}

          {paymentMethod ===
            "netbanking" && (

            <div className="method-panel">

              <div className="bank-grid">

                <label className="select-field">

                  <span>
                    Select your bank
                  </span>

                  <select
                    value={bank}
                    onChange={(event) =>
                      setBank(
                        event.target
                          .value
                      )
                    }
                  >

                    <option value="">
                      Choose a bank
                    </option>

                    <option value="sbi">
                      State Bank of India
                    </option>

                    <option value="hdfc">
                      HDFC Bank
                    </option>

                    <option value="icici">
                      ICICI Bank
                    </option>

                    <option value="axis">
                      Axis Bank
                    </option>

                    <option value="kotak">
                      Kotak Mahindra Bank
                    </option>

                    <option value="other">
                      Other supported bank
                    </option>

                  </select>

                </label>

              </div>

              <div className="method-info-box">

                <ShieldCheck
                  size={18}
                />

                <span>
                  You will be redirected to
                  your bank's secure
                  authentication page during
                  real payment processing.
                </span>

              </div>

            </div>
          )}

          {/* ==================================================
              WALLET
          ================================================== */}

          {paymentMethod ===
            "wallet" && (

            <div className="method-panel">

              <div className="wallet-grid">

                <WalletOption
                  value="paytm"
                  label="Paytm"
                  selected={
                    wallet === "paytm"
                  }
                  onClick={() =>
                    setWallet(
                      "paytm"
                    )
                  }
                />

                <WalletOption
                  value="phonepe"
                  label="PhonePe"
                  selected={
                    wallet ===
                    "phonepe"
                  }
                  onClick={() =>
                    setWallet(
                      "phonepe"
                    )
                  }
                />

                <WalletOption
                  value="amazonpay"
                  label="Amazon Pay"
                  selected={
                    wallet ===
                    "amazonpay"
                  }
                  onClick={() =>
                    setWallet(
                      "amazonpay"
                    )
                  }
                />

              </div>

            </div>
          )}

        </section>

        {/* ====================================================
            CUSTOMER INFORMATION
        ==================================================== */}

        <section className="payment-section">

          <SectionHeader
            number="03"
            icon={
              <User size={19} />
            }
            title="Customer information"
            description="This information is linked to your BillSphere account and payment confirmation."
          />

          <div className="form-grid">

            <Field
              label="Full name"
              value={customerName}
              onChange={
                setCustomerName
              }
              placeholder="Your full name"
              icon={
                <User size={15} />
              }
            />

            <Field
              label="Registered email"
              value={customerEmail}
              onChange={
                setCustomerEmail
              }
              placeholder="you@example.com"
              type="email"
              icon={
                <Mail size={15} />
              }
              hint="Payment confirmation will be sent here."
            />

            <Field
              label="Phone number"
              value={
                customerPhone
              }
              onChange={(value) =>
                setCustomerPhone(
                  value
                    .replace(
                      /[^\d+\-\s]/g,
                      ""
                    )
                    .slice(
                      0,
                      16
                    )
                )
              }
              placeholder="+91 98765 43210"
              icon={
                <Smartphone
                  size={15}
                />
              }
            />

          </div>

        </section>

        {/* ====================================================
            BILLING ADDRESS
        ==================================================== */}

        <section className="payment-section">

          <SectionHeader
            number="04"
            icon={
              <MapPin size={19} />
            }
            title="Billing address"
            description="Provide the billing address required for your payment and invoice."
          />

          <div className="form-grid">

            <Field
              label="Address"
              value={
                addressLine
              }
              onChange={
                setAddressLine
              }
              placeholder="Street, building, area"
              full
            />

            <Field
              label="City"
              value={city}
              onChange={setCity}
              placeholder="City"
            />

            <Field
              label="State"
              value={state}
              onChange={setState}
              placeholder="State"
            />

            <Field
              label="Postal code"
              value={
                postalCode
              }
              onChange={(value) =>
                setPostalCode(
                  value
                    .replace(
                      /\D/g,
                      ""
                    )
                    .slice(
                      0,
                      10
                    )
                )
              }
              placeholder="Postal code"
            />

          </div>

        </section>

        {/* ====================================================
            SUBSCRIPTION REVIEW
        ==================================================== */}

        <section className="payment-section">

          <SectionHeader
            number="05"
            icon={
              <Receipt size={19} />
            }
            title="Subscription review"
            description="Review what will happen after your payment is confirmed."
          />

          <div className="subscription-review">

            <ReviewItem
              icon={
                <Clock3 size={17} />
              }
              title="Free trial"
              value={
                trialDays > 0
                  ? `${trialDays} days`
                  : "No free trial"
              }
            />

            <ReviewItem
              icon={
                <RefreshCw
                  size={17}
                />
              }
              title="Billing cycle"
              value={
                billingCycle ===
                "yearly"
                  ? "Yearly"
                  : "Monthly"
              }
            />

            <ReviewItem
              icon={
                <Receipt size={17} />
              }
              title="Recurring charge"
              value={money(
                price,
                currency
              )}
            />

            {customerLimit !==
              null && (
              <ReviewItem
                icon={
                  <Users
                    size={17}
                  />
                }
                title="Customer limit"
                value={String(
                  customerLimit
                )}
              />
            )}

            {invoiceLimit !==
              null && (
              <ReviewItem
                icon={
                  <FileText
                    size={17}
                  />
                }
                title="Invoice limit"
                value={String(
                  invoiceLimit
                )}
              />
            )}

          </div>

        </section>

        {/* ====================================================
            FEATURES
        ==================================================== */}

        <section className="payment-section">

          <SectionHeader
            number="06"
            icon={
              <Sparkles
                size={19}
              />
            }
            title="Your plan features"
            description="Everything included in the subscription you selected."
          />

          <div className="payment-features">

            {features.length >
            0 ? (
              features.map(
                (
                  feature,
                  index
                ) => (
                  <div
                    className="payment-feature"
                    key={`${plan.id}-${index}`}
                  >

                    <span>
                      <Check
                        size={12}
                      />
                    </span>

                    {feature}

                  </div>
                )
              )
            ) : (
              <div className="payment-feature">

                <span>
                  <Check
                    size={12}
                  />
                </span>

                Features included
                with your selected
                plan.

              </div>
            )}

          </div>

        </section>

        {/* ====================================================
            SECURITY
        ==================================================== */}

        <section className="payment-security-section">

          <div className="security-main-icon">
            <ShieldCheck
              size={25}
            />
          </div>

          <div>

            <h3>
              Secure payment
              confirmation
            </h3>

            <p>
              After you submit this payment,
              BillSphere will send a payment
              confirmation email to your
              registered email address.
            </p>

            <div className="security-points">

              <span>
                <Check size={12} />
                Payment remains pending
              </span>

              <span>
                <Check size={12} />
                Email confirmation required
              </span>

              <span>
                <Check size={12} />
                Subscription activates only after confirmation
              </span>

            </div>

          </div>

        </section>

        {/* ====================================================
            TERMS
        ==================================================== */}

        <label className="payment-terms">

          <input
            type="checkbox"
            checked={
              agreeTerms
            }
            onChange={(event) =>
              setAgreeTerms(
                event.target
                  .checked
              )
            }
          />

          <span className="payment-custom-check">

            {agreeTerms && (
              <Check size={13} />
            )}

          </span>

          <span>

            I confirm that the payment
            information and billing details
            provided above are correct. I
            understand that the payment will
            remain pending until I confirm it
            through the email sent to my
            registered account.

          </span>

        </label>

        {/* ====================================================
            FINAL ORDER SUMMARY
        ==================================================== */}

        <section className="payment-final-summary">

          <div className="final-summary-header">

            <div>

              <span>
                FINAL ORDER SUMMARY
              </span>

              <h2>
                {plan.platform}{" "}
                {plan.name}
              </h2>

            </div>

            <div className="final-summary-icon">
              <Package
                size={22}
              />
            </div>

          </div>

          <div className="final-summary-rows">

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
              label="Free trial"
              value={
                trialDays > 0
                  ? `${trialDays} days`
                  : "None"
              }
            />

            <SummaryRow
              label="Payment method"
              value={
                PAYMENT_METHODS.find(
                  (item) =>
                    item.value ===
                    paymentMethod
                )?.label ||
                "Selected method"
              }
            />

          </div>

          <div className="final-total">

            <div>

              <span>
                {trialDays > 0
                  ? "Recurring charge after trial"
                  : "Amount"}
              </span>

              <small>
                Taxes calculated by
                BillSphere during payment
                processing.
              </small>

            </div>

            <strong>
              {money(
                price,
                currency
              )}
            </strong>

          </div>

          {/* PAY BUTTON */}

          <button
            type="button"
            className="pay-button"
            disabled={
              paymentLoading
            }
            onClick={
              handlePayment
            }
          >

            {paymentLoading ? (
              <>
                <Loader2
                  size={18}
                  className="spin"
                />

                Processing payment...
              </>
            ) : (
              <>
                <Lock
                  size={17}
                />

                Pay{" "}
                {money(
                  price,
                  currency
                )}

                <ArrowRight
                  size={18}
                />
              </>
            )}

          </button>

          <p className="pay-button-note">

            Payment will remain pending until
            you confirm it through the email
            sent to your registered account.

          </p>

        </section>

        {/* ====================================================
            WHAT HAPPENS NEXT
        ==================================================== */}

        <section className="payment-next">

          <div className="next-icon">
            <Mail size={21} />
          </div>

          <div>

            <h3>
              What happens after you click Pay?
            </h3>

            <div className="next-flow">

              <NextStep
                number="1"
                text="Payment submitted"
              />

              <NextStep
                number="2"
                text="Confirmation email sent"
              />

              <NextStep
                number="3"
                text="You click Confirm Payment"
              />

              <NextStep
                number="4"
                text="Payment becomes successful"
              />

              <NextStep
                number="5"
                text="Subscription + invoice created"
              />

              <NextStep
                number="6"
                text="Subscription becomes active"
              />

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

// ============================================================
// PAYMENT PENDING
// ============================================================

function PaymentPending({
  plan,
  email,
  amount,
  onBack,
}: {
  plan: BackendPlan;
  email: string;
  amount: string;
  onBack: () => void;
}) {
  return (
    <div className="payment-page">

      <header className="payment-topbar">

        <button
          type="button"
          className="payment-back"
          onClick={onBack}
        >
          <ArrowLeft
            size={16}
          />

          Back to Confirmation
        </button>

        <div className="payment-brand">
          BILLSPHERE
        </div>

        <div className="payment-secure">
          <ShieldCheck
            size={15}
          />

          Secure Checkout
        </div>

      </header>

      <main className="pending-container">

        <div className="pending-icon">

          <Mail
            size={32}
          />

        </div>

        <div className="pending-eyebrow">
          PAYMENT PENDING
        </div>

        <h1>
          Check your{" "}
          <span>email</span>
        </h1>

        <p className="pending-description">

          Your payment request for{" "}
          <strong>
            {plan.name}
          </strong>{" "}
          has been submitted.

        </p>

        <div className="pending-email-box">

          <Mail size={20} />

          <div>

            <span>
              Confirmation email sent to
            </span>

            <strong>
              {email ||
                "your registered email"}
            </strong>

          </div>

        </div>

        <div className="pending-amount">

          <span>
            Payment amount
          </span>

          <strong>
            {amount}
          </strong>

        </div>

        <div className="pending-steps">

          <PendingStep
            active
            number="01"
            title="Payment submitted"
            description="Your payment request has been received."
          />

          <PendingStep
            number="02"
            title="Confirm from email"
            description="Open the email and click Confirm Payment."
          />

          <PendingStep
            number="03"
            title="Payment successful"
            description="BillSphere will verify and complete the payment."
          />

          <PendingStep
            number="04"
            title="Subscription activated"
            description="Your pending subscription and invoice will be finalized automatically."
          />

        </div>

        <div className="pending-security">

          <ShieldCheck size={19} />

          <div>

            <strong>
              Your subscription is not active yet.
            </strong>

            <p>
              It will be activated only after
              successful payment confirmation.
            </p>

          </div>

        </div>

        <button
          type="button"
          className="pending-back-button"
          onClick={onBack}
        >
          <ArrowLeft
            size={16}
          />

          Return to Confirmation
        </button>

      </main>

    </div>
  );
}

// ============================================================
// PAYMENT CONFIRMED (returned from the email confirmation page)
// ============================================================

function PaymentConfirmedNotice({
  planName,
  amount,
  onGoToDashboard,
  onViewMyPlan,
}: {
  planName: string;
  amount: string;
  onGoToDashboard: () => void;
  onViewMyPlan: () => void;
}) {
  return (
    <div className="payment-page">

      <header className="payment-topbar">

        <div className="payment-brand">
          BILLSPHERE
        </div>

        <div className="payment-secure">
          <ShieldCheck size={15} />
          Secure Checkout
        </div>

      </header>

      <main className="pending-container">

        <div className="pending-icon">
          <CheckCircle2 size={32} />
        </div>

        <div className="pending-eyebrow">
          PAYMENT CONFIRMED
        </div>

        <h1>
          Payment{" "}
          <span>successful</span>
        </h1>

        <p className="pending-description">
          Your payment for{" "}
          <strong>{planName}</strong>{" "}
          has been successfully completed.
        </p>

        <div className="pending-amount">
          <span>Amount paid</span>
          <strong>{amount}</strong>
        </div>

        <div className="pending-security">
          <ShieldCheck size={19} />

          <div>
            <strong>
              Payment has been successful.
            </strong>

            <p>
              Please go back to your dashboard and check
              whether your subscription is active.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="pay-button"
          onClick={onGoToDashboard}
        >
          Go to Dashboard
        </button>

        <button
          type="button"
          className="pending-back-button"
          onClick={onViewMyPlan}
        >
          View My Plan
        </button>

      </main>

    </div>
  );
}

// ============================================================
// PAYMENT REJECTED (returned from the email confirmation page)
// ============================================================

function PaymentRejectedNotice({
  planName,
  onTryAgain,
  onGoToDashboard,
}: {
  planName: string;
  onTryAgain: () => void;
  onGoToDashboard: () => void;
}) {
  return (
    <div className="payment-page">

      <header className="payment-topbar">

        <div className="payment-brand">
          BILLSPHERE
        </div>

        <div className="payment-secure">
          <ShieldCheck size={15} />
          Secure Checkout
        </div>

      </header>

      <main className="pending-container">

        <div className="pending-icon">
          <AlertCircle size={32} />
        </div>

        <div className="pending-eyebrow">
          PAYMENT REJECTED
        </div>

        <h1>
          Payment{" "}
          <span>rejected</span>
        </h1>

        <p className="pending-description">
          The payment for <strong>{planName}</strong> was
          rejected and the subscription was not activated.
        </p>

        <button
          type="button"
          className="pay-button"
          onClick={onTryAgain}
        >
          Try Again
        </button>

        <button
          type="button"
          className="pending-back-button"
          onClick={onGoToDashboard}
        >
          Go to Dashboard
        </button>

      </main>

    </div>
  );
}

// ============================================================
// COMPONENTS
// ============================================================

function PaymentProgress({
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
      className={`payment-progress-step ${
        active
          ? "active"
          : ""
      } ${
        completed
          ? "completed"
          : ""
      }`}
    >

      <span>
        {completed ? (
          <Check
            size={13}
          />
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

function SectionHeader({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="payment-section-header">

      <div className="section-number">
        {number}
      </div>

      <div className="section-header-icon">
        {icon}
      </div>

      <div>

        <h2>
          {title}
        </h2>

        <p>
          {description}
        </p>

      </div>

    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  full = false,
  hint,
  icon,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  full?: boolean;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label
      className={`payment-field ${
        full
          ? "full-field"
          : ""
      }`}
    >

      <span className="field-label">
        {label}
      </span>

      <div className="field-input-wrap">

        {icon && (
          <span className="field-icon">
            {icon}
          </span>
        )}

        <input
          type={type}
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          placeholder={
            placeholder
          }
          maxLength={
            maxLength
          }
        />

      </div>

      {hint && (
        <small>
          {hint}
        </small>
      )}

    </label>
  );
}

function TrustItem({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="trust-item">
      {icon}
      {text}
    </span>
  );
}

function WalletOption({
  
  label,
  selected,
  onClick,
}: {
  value: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`wallet-option ${
        selected ? "selected" : ""
      }`}
      onClick={onClick}
    >
      <WalletCards size={20} />

      <span>{label}</span>

      {selected && (
        <CheckCircle2 size={18} />
      )}
    </button>
  );
}

function ReviewItem({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="review-item">
      <div className="review-icon">
        {icon}
      </div>

      <div>
        <span>{title}</span>

        <strong>{value}</strong>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="summary-row">
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

function NextStep({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <div className="next-step">
      <span>{number}</span>

      <strong>{text}</strong>
    </div>
  );
}

function PendingStep({
  number,
  title,
  description,
  active = false,
}: {
  number: string;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div
      className={`pending-step ${
        active
          ? "active"
          : ""
      }`}
    >

      <span>
        {number}
      </span>

      <div>

        <strong>
          {title}
        </strong>

        <p>
          {description}
        </p>

      </div>

    </div>
  );
}