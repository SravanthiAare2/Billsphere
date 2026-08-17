import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  FileText,
  Loader2,
  Lock,
  MapPin,
  Receipt,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

import { useToast } from "../components/ToastProvider";
import "./PlanDetails.css";

const API_URL = "http://127.0.0.1:8000/api/v1";

interface Plan {
  id: number;
  name?: string | null;
  description?: string | null;
  price?: number | string | null;
  amount?: number | string | null;
  currency?: string | null;

  billing_interval?: string | null;
  billing_cycle?: string | null;
  interval?: string | null;

  trial_days?: number | null;
  trial_period_days?: number | null;

  features?: string[] | Record<string, any> | null;

  platform?: string | null;
  platform_name?: string | null;

  tax_included?: boolean | null;

  max_customers?: number | null;
  customer_limit?: number | null;

  max_invoices?: number | null;
  invoice_limit?: number | null;
}

interface UserData {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

function money(
  value: number | string | null | undefined,
  currency = "INR"
) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "₹0.00";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function normalizeFeatures(
  features: Plan["features"]
): string[] {
  if (!features) return [];

  if (Array.isArray(features)) {
    return features.map(String);
  }

  if (typeof features === "object") {
    return Object.entries(features)
      .filter(([, value]) => Boolean(value))
      .map(([key]) =>
        key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
          )
      );
  }

  return [];
}

function getPrice(plan: Plan) {
  return Number(plan.price ?? plan.amount ?? 0);
}

function getInterval(plan: Plan) {
  return (
    plan.billing_interval ||
    plan.billing_cycle ||
    plan.interval ||
    "monthly"
  );
}

function getTrial(plan: Plan) {
  return (
    plan.trial_days ??
    plan.trial_period_days ??
    0
  );
}

async function getPlan(
  planId: number
): Promise<Plan> {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  const response = await fetch(
    `${API_URL}/plans/plans/${planId}`,
    {
      headers: {
        Accept: "application/json",
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        "Unable to load plan"
    );
  }

  return data;
}

async function getCurrentUser(): Promise<UserData> {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

  if (!token) {
    throw new Error(
      "Please login before subscribing."
    );
  }

  const response = await fetch(
    `${API_URL}/auth/me`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        "Unable to load your account"
    );
  }

  return data;
}

export default function PlanDetails() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [plan, setPlan] =
    useState<Plan | null>(null);

  const [user, setUser] =
    useState<UserData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [step, setStep] =
    useState<1 | 2 | 3>(1);

  const [billingCycle, setBillingCycle] =
    useState<"monthly" | "yearly">(
      "monthly"
    );

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    postalCode: "",
    taxId: "",
  });

  useEffect(() => {
    async function load() {
      try {
        if (!planId) {
          throw new Error("Plan not found");
        }

        const [planData, userData] =
          await Promise.all([
            getPlan(Number(planId)),
            getCurrentUser(),
          ]);

        setPlan(planData);
        setUser(userData);

        setForm({
          firstName:
            userData.first_name || "",
          lastName:
            userData.last_name || "",
          email:
            userData.email || "",
          phone:
            userData.phone || "",
          companyName: "",
          address: "",
          city: "",
          state: "",
          country: "India",
          postalCode: "",
          taxId: "",
        });
      } catch (error: any) {
        notify({
          title: "Unable to open plan",
          description:
            error?.message ||
            "Something went wrong.",
          variant: "error",
        });

        navigate("/customer/plans");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [planId]);

  const price = useMemo(
    () => (plan ? getPrice(plan) : 0),
    [plan]
  );

  const interval = useMemo(
    () =>
      plan
        ? getInterval(plan)
        : billingCycle,
    [plan, billingCycle]
  );

  const trialDays = useMemo(
    () => (plan ? getTrial(plan) : 0),
    [plan]
  );

  const features = useMemo(
    () =>
      plan
        ? normalizeFeatures(plan.features)
        : [],
    [plan]
  );

  const taxRate = 18;

  const subtotal = price;

  const taxAmount =
    plan?.tax_included
      ? 0
      : subtotal * (taxRate / 100);

  const total =
    subtotal + taxAmount;

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateBillingDetails() {
    if (!form.firstName.trim()) {
      notify({
        title: "First name required",
        description:
          "Please enter your first name.",
        variant: "error",
      });
      return false;
    }

    if (!form.lastName.trim()) {
      notify({
        title: "Last name required",
        description:
          "Please enter your last name.",
        variant: "error",
      });
      return false;
    }

    if (!form.email.trim()) {
      notify({
        title: "Email required",
        description:
          "Please enter your billing email.",
        variant: "error",
      });
      return false;
    }

    if (!form.address.trim()) {
      notify({
        title: "Billing address required",
        description:
          "Please enter your billing address.",
        variant: "error",
      });
      return false;
    }

    if (!form.city.trim()) {
      notify({
        title: "City required",
        description:
          "Please enter your city.",
        variant: "error",
      });
      return false;
    }

    if (!form.state.trim()) {
      notify({
        title: "State required",
        description:
          "Please enter your state.",
        variant: "error",
      });
      return false;
    }

    if (!form.postalCode.trim()) {
      notify({
        title: "Postal code required",
        description:
          "Please enter your postal code.",
        variant: "error",
      });
      return false;
    }

    return true;
  }

  function continueToReview() {
    if (!validateBillingDetails()) {
      return;
    }

    setStep(3);
  }

  if (loading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D6B36A]/20 bg-[#D6B36A]/5">
            <Loader2
              size={24}
              className="animate-spin text-[#D6B36A]"
            />
          </div>

          <p className="mt-5 text-sm font-medium text-white">
            Loading plan details
          </p>

          <p className="mt-1 text-xs text-white/35">
            Preparing your subscription...
          </p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-72px)] pb-10 text-white">

      

      {/* HEADER */}

      <div className="mb-7">

        <button
          type="button"
          onClick={() =>
            navigate("/customer/plans")
          }
          className="mb-5 inline-flex items-center gap-2 text-xs text-white/35 transition hover:text-[#D6B36A]"
        >
          <ArrowLeft size={14} />
          Back to Plans
        </button>

        <div className="flex items-end justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2">
              <Sparkles
                size={14}
                className="text-[#D6B36A]"
              />

              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D6B36A]/70">
                Subscription Checkout
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              {plan.name}
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Review your plan and billing
              information before payment.
            </p>

          </div>

        </div>

      </div>

      {/* STEPS */}

      <div className="mb-7 grid grid-cols-3 gap-2">

        <Step
          number="01"
          label="Plan"
          active={step === 1}
          completed={step > 1}
        />

        <Step
          number="02"
          label="Billing Details"
          active={step === 2}
          completed={step > 2}
        />

        <Step
          number="03"
          label="Review & Pay"
          active={step === 3}
          completed={false}
        />

      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">

        {/* LEFT */}

        <div>

          {/* STEP 1 */}

          {step === 1 && (
            <section className="checkout-panel rounded-2xl p-6">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#D6B36A]/70">
                    Selected Plan
                  </p>

                  <h2 className="mt-2 text-xl font-semibold">
                    {plan.name}
                  </h2>

                  <p className="mt-2 text-xs leading-5 text-white/35">
                    {plan.description ||
                      "BillSphere subscription plan."}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D6B36A]/15 bg-[#D6B36A]/5">
                  <Receipt
                    size={19}
                    className="text-[#D6B36A]"
                  />
                </div>

              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">

                <BillingOption
                  title="Monthly"
                  price={money(
                    price,
                    plan.currency || "INR"
                  )}
                  active={
                    billingCycle === "monthly"
                  }
                  onClick={() =>
                    setBillingCycle(
                      "monthly"
                    )
                  }
                />

                <BillingOption
                  title="Yearly"
                  price={money(
                    price * 12 * 0.9,
                    plan.currency || "INR"
                  )}
                  active={
                    billingCycle === "yearly"
                  }
                  onClick={() =>
                    setBillingCycle(
                      "yearly"
                    )
                  }
                />

              </div>

              {trialDays > 0 && (
                <div className="mt-5 rounded-xl border border-[#D6B36A]/15 bg-[#D6B36A]/5 p-4">

                  <p className="text-xs font-semibold text-[#E7CB8B]">
                    {trialDays}-day free trial
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-white/35">
                    Your trial will begin when the
                    subscription is activated.
                  </p>

                </div>
              )}

              <div className="mt-7">

                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  What's included
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">

                  {features.map(
                    (feature, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2.5"
                      >
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                          <Check size={10} />
                        </span>

                        <span className="text-xs text-white/50">
                          {feature}
                        </span>
                      </div>
                    )
                  )}

                </div>

              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="checkout-button mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.08em]"
              >
                Continue to Billing
                <ArrowRight size={15} />
              </button>

            </section>
          )}

          {/* STEP 2 */}

          {step === 2 && (
            <section className="checkout-panel rounded-2xl p-6">

              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#D6B36A]/70">
                  Billing Information
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Tell us where to bill you
                </h2>

                <p className="mt-2 text-xs text-white/35">
                  These details will appear on your
                  invoice.
                </p>
              </div>

              <div className="grid gap-5">

                <div className="grid gap-4 md:grid-cols-2">

                  <Input
                    label="First Name"
                    value={form.firstName}
                    onChange={(value) =>
                      updateField(
                        "firstName",
                        value
                      )
                    }
                    required
                  />

                  <Input
                    label="Last Name"
                    value={form.lastName}
                    onChange={(value) =>
                      updateField(
                        "lastName",
                        value
                      )
                    }
                    required
                  />

                </div>

                <div className="grid gap-4 md:grid-cols-2">

                  <Input
                    label="Billing Email"
                    type="email"
                    value={form.email}
                    onChange={(value) =>
                      updateField(
                        "email",
                        value
                      )
                    }
                    required
                  />

                  <Input
                    label="Phone Number"
                    value={form.phone}
                    onChange={(value) =>
                      updateField(
                        "phone",
                        value
                      )
                    }
                  />

                </div>

                <Input
                  label="Company / Business Name"
                  value={form.companyName}
                  onChange={(value) =>
                    updateField(
                      "companyName",
                      value
                    )
                  }
                />

                <Input
                  label="Billing Address"
                  value={form.address}
                  onChange={(value) =>
                    updateField(
                      "address",
                      value
                    )
                  }
                  required
                />

                <div className="grid gap-4 md:grid-cols-3">

                  <Input
                    label="City"
                    value={form.city}
                    onChange={(value) =>
                      updateField(
                        "city",
                        value
                      )
                    }
                    required
                  />

                  <Input
                    label="State"
                    value={form.state}
                    onChange={(value) =>
                      updateField(
                        "state",
                        value
                      )
                    }
                    required
                  />

                  <Input
                    label="Postal Code"
                    value={form.postalCode}
                    onChange={(value) =>
                      updateField(
                        "postalCode",
                        value
                      )
                    }
                    required
                  />

                </div>

                <div className="grid gap-4 md:grid-cols-2">

                  <SelectInput
                    label="Country"
                    value={form.country}
                    onChange={(value) =>
                      updateField(
                        "country",
                        value
                      )
                    }
                  />

                  <Input
                    label="GST / Tax ID"
                    value={form.taxId}
                    onChange={(value) =>
                      updateField(
                        "taxId",
                        value
                      )
                    }
                  />

                </div>

              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-5 py-3 text-xs font-semibold text-white/50 transition hover:border-[#D6B36A]/20 hover:text-white"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>

                <button
                  type="button"
                  onClick={continueToReview}
                  className="checkout-button flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.08em]"
                >
                  Review Order
                  <ArrowRight size={15} />
                </button>

              </div>

            </section>
          )}

          {/* STEP 3 */}

          {step === 3 && (
            <section className="checkout-panel rounded-2xl p-6">

              <div className="mb-6">

                <p className="text-[10px] uppercase tracking-[0.2em] text-[#D6B36A]/70">
                  Final Review
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Review before payment
                </h2>

                <p className="mt-2 text-xs text-white/35">
                  Make sure everything is correct before
                  continuing to payment.
                </p>

              </div>

              <div className="space-y-4">

                <ReviewRow
                  icon={<FileText size={15} />}
                  label="Plan"
                  value={plan.name || "Subscription"}
                />

                <ReviewRow
                  icon={<User size={15} />}
                  label="Customer"
                  value={`${form.firstName} ${form.lastName}`}
                />

                <ReviewRow
                  icon={<MapPin size={15} />}
                  label="Billing location"
                  value={`${form.city}, ${form.state}`}
                />

                <ReviewRow
                  icon={<CreditCard size={15} />}
                  label="Billing cycle"
                  value={
                    billingCycle === "monthly"
                      ? "Monthly"
                      : "Yearly"
                  }
                />

              </div>

              <div className="mt-6 rounded-xl border border-[#D6B36A]/15 bg-[#D6B36A]/5 p-4">

                <div className="flex items-start gap-3">

                  <ShieldCheck
                    size={17}
                    className="mt-0.5 shrink-0 text-[#D6B36A]"
                  />

                  <div>

                    <p className="text-xs font-semibold text-[#E7CB8B]">
                      Secure checkout
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-white/35">
                      Your billing details are protected
                      and will be used to generate your
                      BillSphere invoice.
                    </p>

                  </div>

                </div>

              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-5 py-3 text-xs font-semibold text-white/50 transition hover:border-[#D6B36A]/20 hover:text-white"
                >
                  <ArrowLeft size={14} />
                  Edit Billing
                </button>

                <button
                  type="button"
                  onClick={() =>
                    notify({
                      title: "Payment flow ready",
                      description:
                        "The payment gateway will be connected to this step next.",
                      variant: "success",
                    })
                  }
                  className="checkout-button flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold uppercase tracking-[0.08em]"
                >
                  <Lock size={14} />
                  Continue to Payment
                  <ArrowRight size={15} />
                </button>

              </div>

            </section>
          )}

        </div>

        {/* RIGHT — ORDER SUMMARY */}

        <aside className="checkout-panel h-fit rounded-2xl p-6">

          <div className="flex items-center gap-2">

            <Receipt
              size={16}
              className="text-[#D6B36A]"
            />

            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D6B36A]/70">
              Order Summary
            </p>

          </div>

          <div className="mt-5">

            <p className="text-lg font-semibold text-white">
              {plan.name}
            </p>

            <p className="mt-1 text-xs text-white/35">
              {plan.platform ||
                plan.platform_name ||
                "BillSphere"}
            </p>

          </div>

          <div className="my-6 h-px bg-white/[0.06]" />

          <div className="space-y-4">

            <SummaryRow
              label="Subscription"
              value={money(
                price,
                plan.currency || "INR"
              )}
            />

            <SummaryRow
              label="Billing"
              value={
                billingCycle === "monthly"
                  ? "Monthly"
                  : "Yearly"
              }
            />

            <SummaryRow
              label="Tax"
              value={
                plan.tax_included
                  ? "Included"
                  : money(
                      taxAmount,
                      plan.currency ||
                        "INR"
                    )
              }
            />

          </div>

          <div className="my-6 h-px bg-white/[0.06]" />

          <div className="flex items-end justify-between">

            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/25">
                Total
              </p>

              <p className="mt-1 text-xs text-white/35">
                {trialDays > 0
                  ? `${trialDays}-day trial`
                  : "Due today"}
              </p>
            </div>

            <p className="text-2xl font-semibold text-[#E7CB8B]">
              {money(
                total,
                plan.currency || "INR"
              )}
            </p>

          </div>

          <div className="mt-6 rounded-xl border border-white/[0.06] bg-black/10 p-4">

            <div className="flex gap-3">

              <ShieldCheck
                size={15}
                className="mt-0.5 shrink-0 text-[#D6B36A]"
              />

              <p className="text-[10px] leading-5 text-white/30">
                Your final invoice will contain your
                subscription, billing period, tax
                information and payment status.
              </p>

            </div>

          </div>

        </aside>

      </div>

    </div>
  );
}

/* ============================================================
   STEP
============================================================ */

function Step({
  number,
  label,
  active,
  completed,
}: {
  number: string;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition ${
        active
          ? "border-[#D6B36A]/30 bg-[#D6B36A]/5"
          : completed
          ? "border-emerald-400/20 bg-emerald-400/5"
          : "border-white/[0.06] bg-white/[0.015]"
      }`}
    >
      <div className="flex items-center gap-3">

        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold ${
            active
              ? "bg-[#D6B36A]/15 text-[#E7CB8B]"
              : completed
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-white/[0.04] text-white/25"
          }`}
        >
          {completed ? (
            <Check size={14} />
          ) : (
            number
          )}
        </div>

        <span
          className={`text-xs font-medium ${
            active
              ? "text-white"
              : "text-white/35"
          }`}
        >
          {label}
        </span>

      </div>
    </div>
  );
}

/* ============================================================
   BILLING OPTION
============================================================ */

function BillingOption({
  title,
  price,
  active,
  onClick,
}: {
  title: string;
  price: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-[#D6B36A]/35 bg-[#D6B36A]/5"
          : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12]"
      }`}
    >
      <div className="flex items-center justify-between">

        <span
          className={`text-xs font-semibold ${
            active
              ? "text-[#E7CB8B]"
              : "text-white/50"
          }`}
        >
          {title}
        </span>

        <span
          className={`h-3 w-3 rounded-full border ${
            active
              ? "border-[#D6B36A] bg-[#D6B36A]"
              : "border-white/20"
          }`}
        />

      </div>

      <p className="mt-2 text-lg font-semibold text-white">
        {price}
      </p>

    </button>
  );
}

/* ============================================================
   INPUT
============================================================ */

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">

      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
        {label}
        {required && (
          <span className="ml-1 text-[#D6B36A]">
            *
          </span>
        )}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="checkout-input h-11 w-full rounded-xl px-3 text-xs text-white placeholder:text-white/20"
      />

    </label>
  );
}

/* ============================================================
   SELECT
============================================================ */

function SelectInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">

      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
        {label}
      </span>

      <div className="relative">

        <select
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className="checkout-input h-11 w-full appearance-none rounded-xl px-3 pr-9 text-xs text-white"
        >
          <option
            value="India"
            className="bg-[#111111]"
          >
            India
          </option>

          <option
            value="United States"
            className="bg-[#111111]"
          >
            United States
          </option>

          <option
            value="United Kingdom"
            className="bg-[#111111]"
          >
            United Kingdom
          </option>

          <option
            value="Canada"
            className="bg-[#111111]"
          >
            Canada
          </option>

        </select>

        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/25"
        />

      </div>

    </label>
  );
}

/* ============================================================
   REVIEW ROW
============================================================ */

function ReviewRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">

      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D6B36A]/5 text-[#D6B36A]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">

        <p className="text-[10px] uppercase tracking-[0.12em] text-white/25">
          {label}
        </p>

        <p className="mt-1 truncate text-xs font-medium text-white/65">
          {value}
        </p>

      </div>

    </div>
  );
}

/* ============================================================
   SUMMARY ROW
============================================================ */

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">

      <span className="text-xs text-white/35">
        {label}
      </span>

      <span className="text-xs font-medium text-white/65">
        {value}
      </span>

    </div>
  );
}