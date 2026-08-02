/* Modular Application Logic - Billing Automation Platform */

const API_BASE = '/auth';

// Helper for storing & retrieving JWT token
const auth = {
  getToken() {
    // 'auth_token' is set by the login page on redirect
    return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
  },
  setToken(token) {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
    }
  },
  getHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
};

// Generic API Client
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || `Request failed with status ${response.status}`);
  }
  return data;
}

// Display alert messages in specified DOM element
function showMessage(elementId, text, type = 'success') {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = text;
  el.className = `message show ${type}`;
  setTimeout(() => {
    // Optionally auto-clear success messages after 5s
    if (type === 'success') {
      // el.className = 'message';
    }
  }, 5000);
}

// Global Tab Switcher Helper
function initTabs() {
  document.querySelectorAll('.tab-switcher .tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = e.target.getAttribute('data-tab');
      document.querySelectorAll('.tab-switcher .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      
      e.target.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.style.display = 'block';
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
});
