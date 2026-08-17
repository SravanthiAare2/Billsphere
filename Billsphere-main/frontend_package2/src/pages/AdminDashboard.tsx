import { useEffect, useState } from "react";
import { CheckCircle, Clock, XCircle, AlertTriangle, Plus, RefreshCcw } from "lucide-react";
import { getSubscriptionStats, createPlan, getUpcomingRenewals, getPastDue } from "../assets/services/api";

interface Stats {
  trial: number;
  active: number;
  past_due: number;
  cancelled: number;
}

const statCards = [
  { key: "active", label: "Active", icon: <CheckCircle size={24} />, color: "text-green-600 bg-green-50" },
  { key: "trial", label: "Trial", icon: <Clock size={24} />, color: "text-blue-600 bg-blue-50" },
  { key: "past_due", label: "Past Due", icon: <AlertTriangle size={24} />, color: "text-amber-600 bg-amber-50" },
  { key: "cancelled", label: "Ended", icon: <XCircle size={24} />, color: "text-red-600 bg-red-50" },
] as const;

function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ name: "", price: "", billing_interval: "monthly", trial_period_days: "0" });
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [renewals, setRenewals] = useState<any[]>([]);
  const [pastDue, setPastDue] = useState<any[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);

  function loadSchedule() {
    setScheduleLoading(true);
    Promise.all([getUpcomingRenewals(7), getPastDue()])
      .then(([renewalsData, pastDueData]) => {
        setRenewals(renewalsData);
        setPastDue(pastDueData);
      })
      .finally(() => setScheduleLoading(false));
  }

  function loadStats() {
    setLoading(true);
    getSubscriptionStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStats();
    loadSchedule();
  }, []);

  function handleChange(e: any) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleCreatePlan(e: any) {
    e.preventDefault();
    setError("");
    setMessage("");
    setCreating(true);

    try {
      await createPlan({
        name: form.name,
        price: parseFloat(form.price),
        billing_interval: form.billing_interval,
        trial_period_days: parseInt(form.trial_period_days || "0", 10),
      });
      setMessage(`Plan "${form.name}" created successfully`);
      setForm({ name: "", price: "", billing_interval: "monthly", trial_period_days: "0" });
    } catch (err: any) {
      setError(err.message || "Could not create plan");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
          Admin Dashboard 🛠️
        </h1>
        <p className="mt-3 text-gray-500 dark:text-gray-400">
          Manage plans and monitor subscription health across all customers.
        </p>
      </div>

      {/* Subscription stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-10">
        {loading && <p className="text-gray-500 col-span-4">Loading stats...</p>}

        {!loading &&
          stats &&
          statCards.map((card) => (
            <div
              key={card.key}
              className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-3xl p-6 shadow"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.color}`}>
                {card.icon}
              </div>
              <h3 className="text-gray-500 dark:text-gray-400 text-sm">{card.label}</h3>
              <h2 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">
                {stats[card.key as keyof Stats]}
              </h2>
            </div>
          ))}
      </div>

      {/* Create plan */}
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-3xl p-8 shadow">
        <div className="flex items-center gap-3 mb-6">
          <Plus className="text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create a New Plan</h2>
        </div>

        {message && (
          <div className="mb-4 bg-green-50 text-green-700 text-sm rounded-xl px-4 py-3">{message}</div>
        )}
        {error && (
          <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        <form onSubmit={handleCreatePlan} className="grid md:grid-cols-3 gap-4">
          <input
            type="text"
            name="name"
            placeholder="Plan name"
            required
            value={form.name}
            onChange={handleChange}
            className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            name="price"
            placeholder="Price"
            required
            step="0.01"
            value={form.price}
            onChange={handleChange}
            className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            name="billing_interval"
            value={form.billing_interval}
            onChange={handleChange}
            className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>

          <input
            type="number"
            name="trial_period_days"
            placeholder="Trial days (0 = no trial)"
            min="0"
            value={form.trial_period_days}
            onChange={handleChange}
            className="border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={creating}
            className="md:col-span-3 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Plan"}
          </button>
        </form>
      </div>

      {/* Renewals + Past Due */}
      <div className="grid md:grid-cols-2 gap-8 mt-10">
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-3xl p-8 shadow">
          <div className="flex items-center gap-3 mb-6">
            <RefreshCcw className="text-blue-600" size={22} />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Renewing in the next 7 days
            </h2>
          </div>

          {scheduleLoading && <p className="text-gray-500 text-sm">Loading...</p>}

          {!scheduleLoading && renewals.length === 0 && (
            <p className="text-gray-500 text-sm">No upcoming renewals.</p>
          )}

          <ul className="space-y-3">
            {renewals.map((s) => (
              <li
                key={s.id}
                className="flex justify-between text-sm border-b dark:border-slate-700 pb-2"
              >
                <span className="text-slate-700 dark:text-gray-300">
                  Subscription #{s.id} · Plan #{s.plan_id}
                </span>
                <span className="text-gray-500">
                  {new Date(s.current_period_end).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-3xl p-8 shadow">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="text-amber-600" size={22} />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Past Due Subscriptions
            </h2>
          </div>

          {scheduleLoading && <p className="text-gray-500 text-sm">Loading...</p>}

          {!scheduleLoading && pastDue.length === 0 && (
            <p className="text-gray-500 text-sm">No past due subscriptions.</p>
          )}

          <ul className="space-y-3">
            {pastDue.map((s) => (
              <li
                key={s.id}
                className="flex justify-between text-sm border-b dark:border-slate-700 pb-2"
              >
                <span className="text-slate-700 dark:text-gray-300">
                  Subscription #{s.id} · Plan #{s.plan_id}
                </span>
                <span className="text-amber-600 font-semibold">Past Due</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
