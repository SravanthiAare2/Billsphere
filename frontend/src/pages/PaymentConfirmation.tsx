import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

import {
  getPaymentConfirmation,
  submitPaymentConfirmation,
  type PaymentConfirmationResult,
} from "../services/api";

function money(value: number | string, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value));
}

function PaymentConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";

  const [details, setDetails] =
    useState<PaymentConfirmationResult | null>(null);

  const [result, setResult] =
    useState<PaymentConfirmationResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("This payment confirmation link is missing its token.");
      setLoading(false);
      return;
    }

    getPaymentConfirmation(token)
      .then(setDetails)
      .catch((requestError: unknown) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "This payment confirmation link is invalid or expired."
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function decide(decision: "confirm" | "reject") {
    setSubmitting(true);
    setError("");

    try {
      const confirmation = await submitPaymentConfirmation(
        token,
        decision
      );

      setResult(confirmation);

      if (decision === "confirm") {
        localStorage.setItem(
          "billsphere_last_successful_checkout",
          JSON.stringify({
            subscription_id: confirmation.subscription_id,
            plan_id: confirmation.plan_id,
          })
        );
      }
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Payment confirmation failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const current = result || details;

  const confirmed = result?.result === "confirmed";
  const rejected = result?.result === "rejected";

  // ==========================================================
  // BACK / GO BACK
  //
  // Returns the customer to the existing payment/email-sent
  // page (Payment.tsx) inside the same BillSphere application,
  // carrying the confirmation outcome so that page can show
  // the "Payment has been successful" state instead of
  // re-loading the checkout form.
  // ==========================================================
  function goBackToPayment() {
    navigate("/customer/payments", {
      replace: true,
      state: {
        confirmed,
        rejected,
        planId: current?.plan_id,
        planName: current?.plan_name,
        amount: current?.amount,
        currency: current?.currency,
      },
    });
  }

  return (
    <div className="text-white">
      <main className="mx-auto max-w-2xl rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 shadow-2xl sm:p-10">
        <div className="mb-8">
          <p className="text-[9px] uppercase tracking-[0.24em] text-white/35">
            Payment confirmation
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-white/45">
            Loading payment details...
          </p>
        ) : error ? (
          <div className="space-y-5">
            <XCircle className="text-red-300" size={38} />

            <h1 className="text-2xl font-semibold">
              Confirmation unavailable
            </h1>

            <p className="text-sm leading-6 text-white/45">
              {error}
            </p>

            <Link
              className="inline-flex rounded-xl border border-white/10 px-4 py-2 text-sm text-white/65"
              to="/customer/plans"
            >
              Back to Plans
            </Link>
          </div>
        ) : current ? (
          <div className="space-y-6">
            <div>
              {confirmed ? (
                <CheckCircle2
                  className="text-emerald-300"
                  size={40}
                />
              ) : rejected ? (
                <XCircle
                  className="text-red-300"
                  size={40}
                />
              ) : (
                <ShieldCheck
                  className="text-[#D6B36A]"
                  size={40}
                />
              )}

              <h1 className="mt-5 text-2xl font-semibold">
                {confirmed
                  ? "Payment Successful"
                  : rejected
                  ? "Payment Rejected"
                  : "Confirm Payment"}
              </h1>

              <p className="mt-2 text-sm leading-6 text-white/45">
                {confirmed
                  ? "Your payment was completed and your subscription is active."
                  : rejected
                  ? "The payment was rejected and the subscription was not activated."
                  : "Review the payment details and choose whether to proceed."}
              </p>
            </div>

            <div className="grid gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-4 text-sm sm:grid-cols-2">
              <Detail
                label="Plan"
                value={current.plan_name}
              />

              <Detail
                label="Billing"
                value={current.billing_cycle}
              />

              <Detail
                label="Amount"
                value={money(
                  current.amount,
                  current.currency
                )}
              />

              <Detail
                label="Payment"
                value={current.payment_status}
              />

              <Detail
                label="Invoice"
                value={`${current.invoice_id} - ${current.invoice_status}`}
              />

              <Detail
                label="Subscription"
                value={current.subscription_status}
              />
            </div>

            {!result && (
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  disabled={submitting}
                  onClick={() => decide("confirm")}
                  className="flex-1 rounded-xl bg-[#D6B36A] px-4 py-3 text-sm font-bold text-black disabled:opacity-50"
                >
                  {submitting
                    ? "PROCESSING..."
                    : "YES - CONFIRM PAYMENT"}
                </button>

                <button
                  disabled={submitting}
                  onClick={() => decide("reject")}
                  className="flex-1 rounded-xl border border-red-300/30 px-4 py-3 text-sm font-bold text-red-200 disabled:opacity-50"
                >
                  NO - REJECT PAYMENT
                </button>
              </div>
            )}

            {confirmed && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={goBackToPayment}
                  className="rounded-xl bg-[#D6B36A] px-4 py-3 text-sm font-bold text-black"
                >
                  Back
                </button>

                <Link
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/65"
                  to="/customer/dashboard"
                >
                  Go to Dashboard
                </Link>

                <Link
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/65"
                  to="/customer/invoices"
                >
                  View Invoice
                </Link>

                <Link
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/65"
                  to="/customer/subscriptions"
                >
                  View My Plan
                </Link>
              </div>
            )}

            {rejected && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={goBackToPayment}
                  className="rounded-xl bg-[#D6B36A] px-4 py-3 text-sm font-bold text-black"
                >
                  Back
                </button>

                <Link
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/65"
                  to="/customer/plans"
                >
                  Try Again
                </Link>

                <Link
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/65"
                  to="/customer/dashboard"
                >
                  Go to Dashboard
                </Link>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
        {label}
      </p>

      <p className="mt-1 font-semibold capitalize text-white/80">
        {value}
      </p>
    </div>
  );
}

export default PaymentConfirmation;