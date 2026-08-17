const API_URL = "http://127.0.0.1:8000";

// ---- Register ----
// Your backend expects JSON: { email, password, role }
export async function registerUser(data: { email: string; password: string; role: string }) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || "Registration failed");
  }

  return result;
}

// ---- Login ----
// Your backend uses OAuth2PasswordRequestForm, which requires
// form-urlencoded data with fields named "username" and "password"
// (even though "username" here is actually the email).
export async function loginUser(data: { email: string; password: string }) {
  const formData = new URLSearchParams();
  formData.append("username", data.email);
  formData.append("password", data.password);

  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || "Login failed");
  }

  return result; // { access_token, token_type }
}

// ---- Helper: build auth header from stored token ----
function authHeaders() {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ---- Plans ----
export async function getPlans() {
  const response = await fetch(`${API_URL}/plans/`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to load plans");
  return response.json();
}

// ---- Subscriptions ----
export async function subscribeToPlan(planId: number) {
  const response = await fetch(`${API_URL}/subscriptions/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ plan_id: planId }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || "Subscription failed");
  }

  return result;
}

export async function getMySubscriptions() {
  const response = await fetch(`${API_URL}/subscriptions/me`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to load subscriptions");
  return response.json();
}

// ---- Current user (used to decide which dashboard to show) ----
export async function getCurrentUser() {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to load current user");
  return response.json();
}

// ---- Admin: subscription stats ----
export async function getSubscriptionStats() {
  const response = await fetch(`${API_URL}/subscriptions/stats`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to load subscription stats");
  return response.json();
}

export async function cancelSubscription(id: number, immediate: boolean) {
  const response = await fetch(`${API_URL}/subscriptions/${id}/cancel`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ immediate }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || "Failed to cancel subscription");
  return result;
}

export async function renewSubscription(id: number) {
  const response = await fetch(`${API_URL}/subscriptions/${id}/renew`, {
    method: "POST",
    headers: authHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || "Failed to renew subscription");
  return result;
}

export async function getUpcomingRenewals(days = 7) {
  const response = await fetch(`${API_URL}/schedule/renewals?days=${days}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to load upcoming renewals");
  return response.json();
}

export async function getPastDue() {
  const response = await fetch(`${API_URL}/schedule/past-due`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to load past due subscriptions");
  return response.json();
}

// ---- Admin: create plan ----
export async function createPlan(data: { name: string; price: number; billing_interval: string; trial_period_days?: number }) {
  const response = await fetch(`${API_URL}/plans/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || "Failed to create plan");
  return result;
}
