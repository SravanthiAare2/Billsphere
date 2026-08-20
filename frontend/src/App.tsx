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

import Usage from "./pages/Usage";
import ConfirmSubscription from "./pages/ConfirmSubscription";
import DemoDashboard from "./pages/DemoDashboard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PlanDetails from "./pages/PlanDetails";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import Payment from "./pages/Payment";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import Customers from "./pages/Customers";
import Invoices from "./pages/Invoices";
import Plans from "./pages/Plans";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import PaymentHistory from "./pages/PaymentHistory";
import MyPlan from "./pages/MyPlan";
import Billing from "./pages/Billing";
import ForgotPassword from "./pages/ForgotPassword";
import SetPassword from "./pages/SetPassword";
import Notifications from "./pages/Notifications";
import HelpSupport from "./pages/HelpSupport";
import AdminSupport from "./pages/AdminSupport";

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
          CUSTOMER DASHBOARD HOME
          
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
      ================================================== */}

      <Route element={<CustomerLayout />}>

        {/* ==================================================
            CUSTOMER MY PLAN
        ================================================== */}

        <Route
          path="/customer/subscriptions"
          element={<MyPlan />}
        />

        {/* ==================================================
            CUSTOMER PLANS
        ================================================== */}

        <Route
          path="/customer/plans"
          element={<Plans />}
        />

        {/* ==================================================
            CUSTOMER PLAN DETAILS
        ================================================== */}

        <Route
          path="/customer/plans/:planId"
          element={<PlanDetails />}
        />

        {/* ==================================================
            CONFIRM SUBSCRIPTION
        ================================================== */}

        <Route
          path="/customer/plans/:planId/confirm"
          element={<ConfirmSubscription />}
        />

        {/* ==================================================
            CUSTOMER INVOICES
        ================================================== */}

        <Route
          path="/customer/invoices"
          element={<Invoices />}
        />

        {/* ==================================================
            CUSTOMER PAYMENTS
        ================================================== */}

        <Route
          path="/customer/payments"
          element={<Payment />}
        />

        {/* ==================================================
            CUSTOMER PAYMENT HISTORY
        ================================================== */}

        <Route
          path="/customer/payment-history"
          element={<PaymentHistory />}
        />

        {/* ==================================================
            CUSTOMER BILLING
        ================================================== */}

        <Route
          path="/customer/billing"
          element={<Billing />}
        />

        {/* ==================================================
            CUSTOMER USAGE
        ================================================== */}

        <Route
          path="/customer/usage"
          element={<Usage />}
        />

        {/* ==================================================
            CUSTOMER NOTIFICATIONS
        ================================================== */}

        <Route
          path="/customer/notifications"
          element={<Notifications />}
        />

        {/* ==================================================
            CUSTOMER SETTINGS
        ================================================== */}

        <Route
          path="/customer/settings"
          element={<Settings />}
        />

        {/* ==================================================
            CUSTOMER HELP & SUPPORT
        ================================================== */}

        <Route
          path="/customer/help"
          element={<HelpSupport />}
        />

        {/* ==================================================
            CUSTOMER ADMIN SUPPORT

            Customers can:
            - Raise support tickets
            - View ticket status
            - Communicate with BillSphere admin
        ================================================== */}

        <Route
          path="/customer/admin-support"
          element={<AdminSupport />}
        />

        {/* ==================================================
            CUSTOMER PLAN PAYMENT
        ================================================== */}

        <Route
          path="/customer/plans/:planId/payment"
          element={<Payment />}
        />

        {/* ==================================================
            PAYMENT EMAIL CONFIRMATION

            Opens inside the existing CustomerLayout
            so the YES / NO email confirmation flow
            remains inside the BillSphere customer shell.
        ================================================== */}

        <Route
          path="/payment-confirmation"
          element={<PaymentConfirmation />}
        />

      </Route>

      {/* ==================================================
          ADMIN DASHBOARD HOME
      ================================================== */}

      <Route
        path="/admin/dashboard"
        element={<AdminDashboard />}
      />

      {/* ==================================================
          ADMIN / APPLICATION PAGES

          These continue using DashboardLayout.
      ================================================== */}

      <Route element={<DashboardLayout />}>

        {/* ==================================================
            ADMIN CUSTOMERS
        ================================================== */}

        <Route
          path="/customers"
          element={<Customers />}
        />

        {/* ==================================================
            ADMIN INVOICES
        ================================================== */}

        <Route
          path="/invoices"
          element={<Invoices />}
        />

        {/* ==================================================
            ADMIN SETTINGS
        ================================================== */}

        <Route
          path="/settings"
          element={<Settings />}
        />

        {/* ==================================================
            ADMIN PROFILE
        ================================================== */}

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