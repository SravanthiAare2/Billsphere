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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = localStorage.getItem("access_token");

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
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

// ---- Customers ----
export async function getCustomers() {
  const response = await fetch(`${API_URL}/customers/`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to load customers");
  return response.json();
}

export async function createCustomer(data: { name: string; email: string; billing_country: string }) {
  const response = await fetch(`${API_URL}/customers/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || "Failed to create customer");
  return result;
}

export async function deleteCustomer(id: number) {
  const response = await fetch(`${API_URL}/customers/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete customer");
  return true;
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
// ---- Admin: plan management ----
export async function getAdminPlans(filters?: { status?: string; billing_interval?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.billing_interval) params.append("billing_interval", filters.billing_interval);
  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await fetch(`${API_URL}/plans/admin${query}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to load plans");
  return response.json();
}

export async function updatePlan(
  id: number,
  data: Partial<{ name: string; price: number; billing_interval: string; trial_period_days: number }>
) {
  const response = await fetch(`${API_URL}/plans/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || "Failed to update plan");
  return result;
}

export async function setPlanStatus(id: number, status: "active" | "inactive") {
  const response = await fetch(`${API_URL}/plans/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || "Failed to update plan status");
  return result;
}

export async function deletePlan(id: number) {
  const response = await fetch(`${API_URL}/plans/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || "Failed to delete plan");
  return result;
}

// ---- Admin: customers with plan/payment info ----
export async function getCustomersAdmin(filters?: { payment_status?: string; platform?: string; plan_type?: string }) {
  const params = new URLSearchParams();
  if (filters?.payment_status) params.append("payment_status", filters.payment_status);
  if (filters?.platform) params.append("platform", filters.platform);
  if (filters?.plan_type) params.append("plan_type", filters.plan_type);
  const query = params.toString() ? `?${params.toString()}` : "";

  const response = await fetch(`${API_URL}/customers/admin${query}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to load customers");
  return response.json();
}

// ---- Set password (from invite link) ----
export async function setPassword(token: string, newPassword: string) {
  const response = await fetch(`${API_URL}/auth/set-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || "Could not set password");
  return result; // { access_token, token_type }
}
export async function extendSubscription(id: number) {
  const response = await fetch(`${API_URL}/subscriptions/${id}/extend`, {
    method: "POST",
    headers: authHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || "Failed to extend subscription");
  return result;
}

export async function convertTrialToPaid(id: number) {
  const response = await fetch(`${API_URL}/subscriptions/${id}/convert-trial`, {
    method: "POST",
    headers: authHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail || "Failed to convert trial");
  return result;
}
export async function subscribeToPlan(planId: number, options?: { skip_trial?: boolean }) {
  const response = await fetch(`${API_URL}/subscriptions/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ plan_id: planId, skip_trial: options?.skip_trial ?? false }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.detail || "Subscription failed");
  }

  return result;
}