import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import { useEffect } from "react";

// ======================================================
// PAGES
// ======================================================

import DemoDashboard from "./pages/DemoDashboard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PlanDetails from "./pages/PlanDetails";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";

import Customers from "./pages/Customers";
import Invoices from "./pages/Invoices";
import Plans from "./pages/Plans";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";

import MyPlan from "./pages/MyPlan";

import ForgotPassword from "./pages/ForgotPassword";
import SetPassword from "./pages/SetPassword";

// ======================================================
// LAYOUTS
// ======================================================

import DashboardLayout from "./layouts/DashboardLayout";
import CustomerLayout from "./layouts/CustomerLayout";

// ======================================================
// APP CONTENT
// ======================================================

function AppContent() {
  const location = useLocation();

  // ====================================================
  // THEME
  // ====================================================

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    const shouldUseDark =
      savedTheme === "dark" ||
      (!savedTheme && prefersDark);

    document.documentElement.classList.toggle(
      "dark",
      shouldUseDark
    );

    document.documentElement.style.colorScheme =
      shouldUseDark ? "dark" : "light";
  }, [location.pathname]);

  return (
    <Routes>

      {/* ==================================================
          LANDING
      ================================================== */}

      <Route
        path="/"
        element={<Landing />}
      />

      {/* ==================================================
          AUTHENTICATION
      ================================================== */}

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/set-password"
        element={<SetPassword />}
      />

      {/* ==================================================
          PUBLIC DEMO
      ================================================== */}

      <Route
        path="/demo-dashboard"
        element={<DemoDashboard />}
      />

      {/* ==================================================
          CUSTOMER DASHBOARD
          
          UserDashboard contains its own:
          - Navbar
          - Sidebar
          - Main content
      ================================================== */}

      <Route
        path="/customer/dashboard"
        element={<UserDashboard />}
      />

      {/* ==================================================
          CUSTOMER AREA
          
          CustomerLayout provides:
          - Customer navbar
          - Customer sidebar
          - Main content area
          
          Customer pages:
          - My Plan
          - Plans
      ================================================== */}

      <Route element={<CustomerLayout />}>

        {/* -------------------------------
            CUSTOMER MY PLAN
        -------------------------------- */}

        <Route
          path="/customer/subscriptions"
          element={<MyPlan />}
        />

        {/* -------------------------------
            CUSTOMER PLANS
        -------------------------------- */}

        <Route
          path="/customer/plans"
          element={<Plans />}
        />

        <Route
    path="/customer/plans/:planId"
    element={<PlanDetails />}
  />

      </Route>

      {/* ==================================================
          ADMIN DASHBOARD
      ================================================== */}

      <Route
        path="/admin/dashboard"
        element={<AdminDashboard />}
      />

      {/* ==================================================
          ADMIN / APPLICATION PAGES
          
          These continue using the existing
          DashboardLayout.
      ================================================== */}

      <Route element={<DashboardLayout />}>

        {/* CUSTOMERS */}

        <Route
          path="/customers"
          element={<Customers />}
        />

        {/* ADMIN PLANS */}

        

        {/* INVOICES */}

        <Route
          path="/invoices"
          element={<Invoices />}
        />

        {/* SETTINGS */}

        <Route
          path="/settings"
          element={<Settings />}
        />

        {/* PROFILE */}

        <Route
          path="/profile"
          element={<Profile />}
        />

      </Route>

      {/* ==================================================
          LEGACY ADMIN USERS
      ================================================== */}

      <Route
        path="/admin/users"
        element={<UserDashboard />}
      />

    </Routes>
  );
}

// ======================================================
// APP
// ======================================================

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;