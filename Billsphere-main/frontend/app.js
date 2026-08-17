const API_URL = "http://127.0.0.1:8000";
let token = null;

async function register() {
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const role = document.getElementById("reg-role").value;

  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role })
  });

  const data = await res.json();
  document.getElementById("reg-message").innerText = res.ok
    ? "Registered successfully! Now log in."
    : "Error: " + data.detail;
}

async function login() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  // Login endpoint expects form data, not JSON
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData
  });

  const data = await res.json();

  if (res.ok) {
    token = data.access_token;
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("dashboard-section").style.display = "block";
    loadPlans();
  } else {
    document.getElementById("login-message").innerText = "Error: " + data.detail;
  }
}

function logout() {
  token = null;
  document.getElementById("auth-section").style.display = "block";
  document.getElementById("dashboard-section").style.display = "none";
}

async function createPlan() {
  const name = document.getElementById("plan-name").value;
  const price = parseFloat(document.getElementById("plan-price").value);
  const billing_interval = document.getElementById("plan-interval").value;

  const res = await fetch(`${API_URL}/plans/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ name, price, billing_interval })
  });

  const data = await res.json();
  document.getElementById("plan-message").innerText = res.ok
    ? `Plan "${data.name}" created!`
    : "Error: " + data.detail;

  if (res.ok) loadPlans();
}

async function loadPlans() {
  const res = await fetch(`${API_URL}/plans/`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const data = await res.json();

  const list = document.getElementById("plans-list");
  list.innerHTML = "";
  data.forEach(plan => {
    const li = document.createElement("li");
    li.innerText = `${plan.name} — ₹${plan.price} / ${plan.billing_interval}`;
    list.appendChild(li);
  });
}