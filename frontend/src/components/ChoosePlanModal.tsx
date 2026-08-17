import { useState } from "react";
import { X, Sparkles, CreditCard, CheckCircle2, Loader2 } from "lucide-react";
import { subscribeToPlan } from "../assets/services/api";

interface Plan {
  id: number;
  name: string;
  price: number;
  billing_interval: string;
  trial_period_days: number;
}

interface Props {
  plan: Plan;
  onClose: () => void;
  onSuccess: (planName: string) => void;
}

type Step = "choose" | "trial-confirm" | "payment" | "processing" | "success";
type ResultType = "trial" | "paid" | "pending";

function trialEndDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString();
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function ChoosePlanModal({ plan, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("choose");
  const [resultType, setResultType] = useState<ResultType>("paid");
  const [error, setError] = useState("");

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const hasTrial = plan.trial_period_days > 0;

  async function activateTrial() {
    setStep("processing");
    setError("");
    try {
      const created = await subscribeToPlan(plan.id, { skip_trial: false });
      setResultType(created.status === "pending" ? "pending" : "trial");
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Could not start trial.");
      setStep("trial-confirm");
    }
  }

  function validatePaymentForm(): string | null {
    const digits = cardNumber.replace(/\s/g, "");
    if (digits.length !== 16) return "Card number must be 16 digits.";
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return "Expiry must be in MM/YY format.";
    if (cvv.length !== 3) return "CVV must be 3 digits.";
    if (!cardName.trim()) return "Name on card is required.";
    return null;
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validatePaymentForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep("processing");
    // Simulated processing delay — no real payment gateway is wired up yet.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    try {
      const created = await subscribeToPlan(plan.id, { skip_trial: true });
      setResultType(created.status === "pending" ? "pending" : "paid");
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Payment could not be completed.");
      setStep("payment");
    }
  }

  function handleDone() {
    onSuccess(plan.name);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-slate-200/70 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{plan.billing_interval}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{plan.name}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {step === "choose" && (
          <div className="space-y-3">
            <button
              onClick={() => hasTrial && setStep("trial-confirm")}
              disabled={!hasTrial}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                hasTrial
                  ? "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-50 dark:border-slate-700 dark:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Sparkles size={16} className="text-emerald-600" />
                Start Free Trial
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {hasTrial ? `${plan.trial_period_days} days free, no charge today.` : "This plan doesn't offer a trial."}
              </p>
            </button>

            <button
              onClick={() => setStep("payment")}
              className="w-full rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-left transition hover:bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10"
            >
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <CreditCard size={16} className="text-blue-600" />
                Continue to Pay
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                ${plan.price} billed {plan.billing_interval === "yearly" ? "yearly" : "monthly"}, starting now.
              </p>
            </button>
          </div>
        )}

        {step === "trial-confirm" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm dark:border-slate-700/70 dark:bg-slate-950/50">
              <p className="text-slate-600 dark:text-slate-400">You're starting a free trial of</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{plan.name}</p>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                {plan.trial_period_days} days free — trial ends <strong>{trialEndDate(plan.trial_period_days)}</strong>
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("choose")} className="btn-ghost flex-1">Back</button>
              <button onClick={activateTrial} className="btn-primary flex-1">Activate Trial</button>
            </div>
          </div>
        )}

        {step === "payment" && (
          <form onSubmit={submitPayment} className="space-y-4">
            <input
              type="text"
              placeholder="Name on card"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              className="input-field"
            />
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              className="input-field"
              inputMode="numeric"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                className="input-field"
                inputMode="numeric"
              />
              <input
                type="text"
                placeholder="CVV"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                className="input-field"
                inputMode="numeric"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep("choose")} className="btn-ghost flex-1">Back</button>
              <button type="submit" className="btn-primary flex-1">Pay ${plan.price}</button>
            </div>
          </form>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Processing...</p>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="rounded-full bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-500/10">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {resultType === "pending" ? "Plan Queued" : resultType === "trial" ? "Trial Activated" : "Payment Successful"}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {resultType === "pending"
                ? `${plan.name} is queued — it'll start automatically once your current plan on this platform ends.`
                : resultType === "trial"
                ? `Your ${plan.trial_period_days}-day trial of ${plan.name} has started.`
                : `${plan.name} is now active on your account.`}
            </p>
            <button onClick={handleDone} className="btn-primary mt-2 w-full">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}