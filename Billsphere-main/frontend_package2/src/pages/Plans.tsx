import { useEffect, useState } from "react";
import { getPlans, subscribeToPlan } from "../assets/services/api";

interface Plan {
  id: number;
  name: string;
  price: number;
  billing_interval: string;
  trial_period_days: number;
}

function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [subscribingId, setSubscribingId] = useState<number | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      setLoading(true);
      const data = await getPlans();
      setPlans(data);
    } catch (err: any) {
      setError(err.message || "Could not load plans");
    } finally {
      setLoading(false);
    }
  }

  async function choosePlan(plan: Plan) {
    setError("");
    setSubscribingId(plan.id);

    try {
      await subscribeToPlan(plan.id);
      setSelectedPlan(plan.name);
      alert(`${plan.name} plan activated successfully`);
    } catch (err: any) {
      setError(err.message || "Could not subscribe to this plan");
    } finally {
      setSubscribingId(null);
    }
  }

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-4xl font-bold">Choose Your Perfect Plan 💳</h1>
        <p className="text-gray-500 mt-3">
          Select a plan that fits your business needs.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {loading && <p className="text-gray-500">Loading plans...</p>}

      {!loading && plans.length === 0 && !error && (
        <p className="text-gray-500">
          No plans found yet. Create some via the API first.
        </p>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white rounded-3xl shadow p-8 border hover:shadow-xl transition"
          >
            <h2 className="text-2xl font-bold">{plan.name}</h2>

            {plan.trial_period_days > 0 && (
              <span className="inline-block mt-2 text-xs font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                {plan.trial_period_days}-day free trial
              </span>
            )}

            <h3 className="text-3xl font-bold text-blue-600 mt-4">
              ${plan.price}/{plan.billing_interval === "yearly" ? "year" : "month"}
            </h3>

            <button
              onClick={() => choosePlan(plan)}
              disabled={subscribingId === plan.id}
              className="mt-8 w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:opacity-60"
            >
              {subscribingId === plan.id ? "Subscribing..." : "Choose Plan"}
            </button>
          </div>
        ))}
      </div>

      {selectedPlan && (
        <div className="mt-10 bg-green-100 text-green-700 p-5 rounded-2xl">
          Current selected plan: <strong>{selectedPlan}</strong>
        </div>
      )}
    </div>
  );
}

export default Plans;
