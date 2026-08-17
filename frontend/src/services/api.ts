// ============================================================
// BillSphere Frontend API Service
// Backend: FastAPI
// Base URL: http://127.0.0.1:8000/api/v1
// ============================================================

const API_URL = "http://127.0.0.1:8000/api/v1";

// ============================================================
// Types
// ============================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  role: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
  role?: string;
}

export interface Customer {
  id: number;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  tax_id?: string | null;
  owner_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerCreate {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  tax_id?: string;
}

export interface Plan {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  billing_cycle: string;
}

export interface PlanCreate {
  name: string;
  description?: string;
  price: number;
  billing_cycle: string;
}

export interface Subscription {
  id: number;
  customer_id: number;
  plan_id: number;
  billing_cycle: string;
  status: string;
  start_date: string;
  end_date: string;
  paused_at?: string | null;
  resumed_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  next_billing_date?: string | null;
  cancel_at_period_end: boolean;
  cancelled_at?: string | null;
  lifecycle_metadata?: Record<string, unknown> | null;
}

export interface SubscriptionCreate {
  customer_id: number;
  plan_id: number;
  billing_cycle: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

export interface CurrentUser {
  id?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

// ============================================================
// Generic response parser
// ============================================================

async function parseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return text || null;
}

// ============================================================
// Error extraction
// ============================================================

function getErrorMessage(result: any, fallback: string): string {
  if (!result) {
    return fallback;
  }

  if (typeof result === "string") {
    return result;
  }

  if (typeof result.detail === "string") {
    return result.detail;
  }

  if (Array.isArray(result.detail)) {
    return result.detail
      .map((item: any) => item?.msg || "Validation error")
      .join(", ");
  }

  if (typeof result.message === "string") {
    return result.message;
  }

  return fallback;
}

// ============================================================
// Authentication headers
// ============================================================

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem("access_token");

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

// ============================================================
// LOGIN
// POST /api/v1/login
// ============================================================

export async function loginUser(
  data: LoginRequest
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: data.email.trim(),
      password: data.password,
    }),
  });

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(result, "Invalid email or password")
    );
  }

  const loginResult = result as LoginResponse;

  // Save authentication immediately.
  localStorage.setItem(
    "access_token",
    loginResult.access_token
  );

  if (loginResult.refresh_token) {
    localStorage.setItem(
      "refresh_token",
      loginResult.refresh_token
    );
  }

  if (loginResult.role) {
    localStorage.setItem(
      "user_role",
      loginResult.role
    );
  }

  return loginResult;
}

// ============================================================
// REGISTER
// POST /api/v1/register
// ============================================================

export async function registerUser(
  data: RegisterRequest
) {
  const response = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email.trim(),
      phone: data.phone || null,
      password: data.password,
      role: data.role || "customer",
    }),
  });

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(result, "Registration failed")
    );
  }

  return result;
}

// ============================================================
// LOGOUT
// ============================================================

export function logoutUser() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_role");
}

// ============================================================
// GET CURRENT USER
// GET /api/v1/me
// ============================================================

export async function getCurrentUser(): Promise<CurrentUser> {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("No authentication token found");
  }

  const response = await fetch(`${API_URL}/me`, {
    method: "GET",
    headers: authHeaders(),
  });

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(result, "Failed to load current user")
    );
  }

  return result;
}

// ============================================================
// REFRESH TOKEN
// POST /api/v1/refresh
// ============================================================

export async function refreshToken(
  refresh_token?: string
) {
  const token =
    refresh_token ||
    localStorage.getItem("refresh_token");

  if (!token) {
    throw new Error("No refresh token found");
  }

  const response = await fetch(`${API_URL}/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: token,
    }),
  });

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(result, "Failed to refresh token")
    );
  }

  if (result?.access_token) {
    localStorage.setItem(
      "access_token",
      result.access_token
    );
  }

  if (result?.refresh_token) {
    localStorage.setItem(
      "refresh_token",
      result.refresh_token
    );
  }

  return result;
}

// ============================================================
// FORGOT PASSWORD
// POST /api/v1/forgot-password
// ============================================================

export async function forgotPassword(
  email: string
) {
  const response = await fetch(
    `${API_URL}/forgot-password`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
      }),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to process forgot password request"
      )
    );
  }

  return result;
}

// ============================================================
// RESET PASSWORD
// POST /api/v1/reset-password
// ============================================================

export async function resetPassword(
  data: {
    token: string;
    new_password: string;
  }
) {
  const response = await fetch(
    `${API_URL}/reset-password`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to reset password"
      )
    );
  }

  return result;
}

// ============================================================
// CUSTOMERS
// ============================================================

// GET /api/v1/customers
export async function getCustomers(): Promise<Customer[]> {
  const response = await fetch(
    `${API_URL}/customers`,
    {
      method: "GET",
      headers: authHeaders(),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to load customers"
      )
    );
  }

  return result;
}

// GET /api/v1/customers/{customer_id}
export async function getCustomer(
  customerId: number
): Promise<Customer> {
  const response = await fetch(
    `${API_URL}/customers/${customerId}`,
    {
      method: "GET",
      headers: authHeaders(),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to load customer"
      )
    );
  }

  return result;
}

// POST /api/v1/customers
export async function createCustomer(
  data: CustomerCreate
): Promise<Customer> {
  const response = await fetch(
    `${API_URL}/customers`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to create customer"
      )
    );
  }

  return result;
}

// PUT /api/v1/customers/{customer_id}
export async function updateCustomer(
  customerId: number,
  data: Partial<CustomerCreate>
): Promise<Customer> {
  const response = await fetch(
    `${API_URL}/customers/${customerId}`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to update customer"
      )
    );
  }

  return result;
}

// DELETE /api/v1/customers/{customer_id}
export async function deleteCustomer(
  customerId: number
) {
  const response = await fetch(
    `${API_URL}/customers/${customerId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to delete customer"
      )
    );
  }

  return result ?? true;
}

// ============================================================
// PLANS
// ============================================================

// GET /api/v1/plans
export async function getPlans(): Promise<Plan[]> {
  const response = await fetch(
    `${API_URL}/plans`,
    {
      method: "GET",
      headers: authHeaders(),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to load plans"
      )
    );
  }

  return result;
}

// GET /api/v1/plans/{plan_id}
export async function getPlan(
  planId: number
): Promise<Plan> {
  const response = await fetch(
    `${API_URL}/plans/${planId}`,
    {
      method: "GET",
      headers: authHeaders(),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to load plan"
      )
    );
  }

  return result;
}

// POST /api/v1/plans
export async function createPlan(
  data: PlanCreate
): Promise<Plan> {
  const response = await fetch(
    `${API_URL}/plans`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to create plan"
      )
    );
  }

  return result;
}

// PUT /api/v1/plans/{plan_id}
export async function updatePlan(
  planId: number,
  data: Partial<PlanCreate>
): Promise<Plan> {
  const response = await fetch(
    `${API_URL}/plans/${planId}`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to update plan"
      )
    );
  }

  return result;
}

// DELETE /api/v1/plans/{plan_id}
export async function deletePlan(
  planId: number
) {
  const response = await fetch(
    `${API_URL}/plans/${planId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to delete plan"
      )
    );
  }

  return result ?? true;
}

// ============================================================
// SUBSCRIPTIONS
// ============================================================

// GET /api/v1/subscriptions
export async function getSubscriptions(): Promise<
  Subscription[]
> {
  const response = await fetch(
    `${API_URL}/subscriptions`,
    {
      method: "GET",
      headers: authHeaders(),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to load subscriptions"
      )
    );
  }

  return result;
}

// GET /api/v1/subscriptions/{subscription_id}
export async function getSubscription(
  subscriptionId: number
): Promise<Subscription> {
  const response = await fetch(
    `${API_URL}/subscriptions/${subscriptionId}`,
    {
      method: "GET",
      headers: authHeaders(),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to load subscription"
      )
    );
  }

  return result;
}

// POST /api/v1/subscriptions
export async function createSubscription(
  data: SubscriptionCreate
): Promise<Subscription> {
  const response = await fetch(
    `${API_URL}/subscriptions`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to create subscription"
      )
    );
  }

  return result;
}

// PUT /api/v1/subscriptions/{subscription_id}
export async function updateSubscription(
  subscriptionId: number,
  data: Partial<SubscriptionCreate>
): Promise<Subscription> {
  const response = await fetch(
    `${API_URL}/subscriptions/${subscriptionId}`,
    {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to update subscription"
      )
    );
  }

  return result;
}

// ============================================================
// ACTIVATE SUBSCRIPTION
// POST /api/v1/subscriptions/{id}/activate
// ============================================================

export async function activateSubscription(
  subscriptionId: number
): Promise<Subscription> {
  const response = await fetch(
    `${API_URL}/subscriptions/${subscriptionId}/activate`,
    {
      method: "POST",
      headers: authHeaders(),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to activate subscription"
      )
    );
  }

  return result;
}

// ============================================================
// CANCEL SUBSCRIPTION
// POST /api/v1/subscriptions/{id}/cancel
// ============================================================

export async function cancelSubscription(
  subscriptionId: number,
  reason?: string
): Promise<Subscription> {
  const response = await fetch(
    `${API_URL}/subscriptions/${subscriptionId}/cancel`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        reason:
          reason ||
          "Cancelled by user",
      }),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to cancel subscription"
      )
    );
  }

  return result;
}

// ============================================================
// PAUSE SUBSCRIPTION
// POST /api/v1/subscriptions/{id}/pause
// ============================================================

export async function pauseSubscription(
  subscriptionId: number,
  reason?: string
): Promise<Subscription> {
  const response = await fetch(
    `${API_URL}/subscriptions/${subscriptionId}/pause`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        reason:
          reason ||
          "Paused by user",
      }),
    }
  );

  const result = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        result,
        "Failed to pause subscription"
      )
    );
  }

  return result;
}

// ============================================================
// UTILITY
// ============================================================

export function isAuthenticated(): boolean {
  return Boolean(
    localStorage.getItem("access_token")
  );
}

export function getStoredRole(): string | null {
  return localStorage.getItem("user_role");
}

export function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("refresh_token");
}

// ============================================================
// Default export
// ============================================================

export default {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
  refreshToken,
  forgotPassword,
  resetPassword,

  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,

  getPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,

  getSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,

  activateSubscription,
  cancelSubscription,
  pauseSubscription,

  isAuthenticated,
  getStoredRole,
  getAccessToken,
  getRefreshToken,
};