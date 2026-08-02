import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, CheckCircle, Clock, XCircle } from "lucide-react";
import { getMySubscriptions, cancelSubscription, renewSubscription } from "../assets/services/api";

interface Subscription {
  id: number;
  plan_id: number;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

const statusStyles: Record<string, { color: string; icon: JSX.Element; label: string }> = {
  active: { color: "text-green-600 bg-green-50", icon: <CheckCircle size={20} />, label: "Active" },
  trial: { color: "text-blue-600 bg-blue-50", icon: <Clock size={20} />, label: "Trial" },
  past_due: { color: "text-amber-600 bg-amber-50", icon: <Clock size={20} />, label: "Past Due" },
  cancelled: { color: "text-red-600 bg-red-50", icon: <XCircle size={20} />, label: "Cancelled" },
};

function UserDashboard() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  function load() {
    setLoading(true);
    getMySubscriptions()
      .then(setSubscriptions)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const activeSub = subscriptions.find((s) => s.status === "active" || s.status === "trial" || s.status === "past_due");

  async function handleCancel(immediate: boolean) {
    if (!activeSub) return;
    setActionLoading(true);
    setMessage("");
    try {
      await cancelSubscription(activeSub.id, immediate);
      setMessage(
        immediate
          ? "Subscription cancelled immediately."
          : "Subscription will cancel at the end of the current period."
      );
      load();
    } catch (err: any) {
      setMessage(err.message || "Could not cancel subscription");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRenew() {
    if (!activeSub) return;
    setActionLoading(true);
    setMessage("");
    try {
      await renewSubscription(activeSub.id);
      setMessage("Subscription renewed for a fresh billing period.");
      load();
    } catch (err: any) {
      setMessage(err.message || "Could not renew subscription");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
          Welcome back 👋
        </h1>
        <p className="mt-3 text-gray-500 dark:text-gray-400">
          Here's the current status of your subscription.
        </p>
      </div>

      {loading && <p className="text-gray-500">Loading your subscription...</p>}

      {!loading && !activeSub && (
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-3xl p-10 text-center shadow">
          <CreditCard size={40} className="mx-auto text-blue-600 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            You don't have an active plan yet
          </h2>
          <p className="text-gray-500 mt-2 mb-6">
            Subscribe to a plan to unlock billing features.
          </p>
          <Link
            to="/plans"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition"
          >
            View Plans
          </Link>
        </div>
      )}

      {!loading && activeSub && (
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-3xl p-8 shadow">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Current Plan</p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                Plan #{activeSub.plan_id}
              </h2>
            </div>

            <span
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm ${
                statusStyles[activeSub.status]?.color || "text-gray-600 bg-gray-100"
              }`}
            >
              {statusStyles[activeSub.status]?.icon}
              {statusStyles[activeSub.status]?.label || activeSub.status}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <div>
              <p className="text-gray-500 text-sm">Current period start</p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {new Date(activeSub.current_period_start).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Current period end</p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {new Date(activeSub.current_period_end).toLocaleDateString()}
              </p>
            </div>
          </div>

          {activeSub.cancel_at_period_end && (
            <div className="mt-6 bg-amber-50 text-amber-700 text-sm rounded-xl px-4 py-3">
              This subscription is scheduled to cancel at the end of the current period.
            </div>
          )}

          {message && (
            <div className="mt-6 bg-blue-50 text-blue-700 text-sm rounded-xl px-4 py-3">
              {message}
            </div>
          )}

          <div className="flex flex-wrap gap-4 mt-8">
            <Link
              to="/plans"
              className="text-blue-600 font-semibold hover:underline flex items-center"
            >
              Change plan →
            </Link>

            {activeSub.status !== "cancelled" && !activeSub.cancel_at_period_end && (
              <button
                onClick={() => handleCancel(false)}
                disabled={actionLoading}
                className="ml-auto bg-amber-100 text-amber-700 px-5 py-2 rounded-xl hover:bg-amber-200 disabled:opacity-60"
              >
                Cancel at period end
              </button>
            )}

            {activeSub.status !== "cancelled" && (
              <button
                onClick={() => handleCancel(true)}
                disabled={actionLoading}
                className="bg-red-100 text-red-700 px-5 py-2 rounded-xl hover:bg-red-200 disabled:opacity-60"
              >
                Cancel immediately
              </button>
            )}

            {(activeSub.status === "past_due" || activeSub.cancel_at_period_end) && (
              <button
                onClick={handleRenew}
                disabled={actionLoading}
                className="bg-green-100 text-green-700 px-5 py-2 rounded-xl hover:bg-green-200 disabled:opacity-60"
              >
                Renew now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;
