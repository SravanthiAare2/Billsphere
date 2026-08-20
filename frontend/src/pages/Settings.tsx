
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Download,
  Globe2,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  Mail,
  Moon,
  Palette,
  Receipt,
  Save,
  ShieldCheck,
  Smartphone,
  Sun,
  User,
  X,
  Zap,
} from "lucide-react";
import "./Settings.css";

type SettingsSection =
  | "account"
  | "appearance"
  | "notifications"
  | "billing"
  | "subscription"
  | "invoices"
  | "security"
  | "privacy"
  | "regional"
  | "connections"
  | "support"
  | "danger";

type ThemeMode = "dark" | "light" | "system";

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function Settings() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("account");

  const [savedMessage, setSavedMessage] = useState("");

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("theme");

    if (saved === "light") {
      return "light";
    }

    if (saved === "dark") {
      return "dark";
    }

    return "system";
  });

  const [compactMode, setCompactMode] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const [notifications, setNotifications] = useState({
    successfulPaymentEmail: true,
    successfulPaymentDashboard: true,

    failedPaymentEmail: true,
    failedPaymentDashboard: true,

    pendingPaymentEmail: true,
    pendingPaymentDashboard: true,

    paymentRetryEmail: true,
    paymentRetryDashboard: true,

    refundEmail: true,
    refundDashboard: true,

    invoiceEmail: true,
    invoiceDashboard: true,

    invoiceDueEmail: true,
    invoiceDueDashboard: true,

    overdueEmail: true,
    overdueDashboard: true,

    renewalEmail: true,
    renewalDashboard: true,

    loginEmail: true,
    loginDashboard: true,

    securityEmail: true,
    securityDashboard: true,
  });

  const [billingSettings, setBillingSettings] = useState({
    automaticPayments: true,
    paymentConfirmation: true,
    billingReminders: true,
  });

  const [subscriptionSettings, setSubscriptionSettings] = useState({
    autoRenewal: true,
    renewalReminder: true,
  });

  const [invoiceSettings, setInvoiceSettings] = useState({
    invoiceEmail: true,
    invoiceReminders: true,
    showTaxDetails: true,
    showPaymentDetails: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactor: false,
    loginAlerts: true,
    suspiciousActivity: true,
  });

  const [emailSettings, setEmailSettings] = useState({
    paymentReceipts: true,
    invoiceEmails: true,
    paymentFailures: true,
    renewalReminders: true,
    subscriptionUpdates: true,
    productUpdates: false,
  });

  const [profile, setProfile] = useState({
    name: "Sravanthi",
    email: "",
    phone: "",
    company: "",
    country: "India",
  });

  const [regional, setRegional] = useState({
    language: "English",
    country: "India",
    currency: "INR",
    timezone: "Asia/Kolkata",
    dateFormat: "DD MMM YYYY",
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;

    let actualTheme = mode;

    if (mode === "system") {
      actualTheme = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
        ? "dark"
        : "light";
    }

    root.classList.toggle("dark", actualTheme === "dark");
    root.classList.toggle("light", actualTheme === "light");

    root.style.colorScheme = actualTheme;

    localStorage.setItem("theme", mode);
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode);
    applyTheme(mode);
    showSavedMessage("Appearance updated");
  };

  const showSavedMessage = (message: string) => {
    setSavedMessage(message);

    window.setTimeout(() => {
      setSavedMessage("");
    }, 2500);
  };

  const updateNotification = (
    key: keyof typeof notifications,
    value: boolean
  ) => {
    setNotifications((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateBilling = (
    key: keyof typeof billingSettings,
    value: boolean
  ) => {
    setBillingSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateSubscription = (
    key: keyof typeof subscriptionSettings,
    value: boolean
  ) => {
    setSubscriptionSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateInvoice = (
    key: keyof typeof invoiceSettings,
    value: boolean
  ) => {
    setInvoiceSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateSecurity = (
    key: keyof typeof securitySettings,
    value: boolean
  ) => {
    setSecuritySettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateEmail = (
    key: keyof typeof emailSettings,
    value: boolean
  ) => {
    setEmailSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const sectionItems: {
    id: SettingsSection;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "account",
      label: "Account",
      description: "Profile information",
      icon: <User size={16} />,
    },
    {
      id: "appearance",
      label: "Appearance",
      description: "Theme and display",
      icon: <Palette size={16} />,
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Alerts and updates",
      icon: <Bell size={16} />,
    },
    {
      id: "billing",
      label: "Billing & Payments",
      description: "Payment preferences",
      icon: <CreditCard size={16} />,
    },
    {
      id: "subscription",
      label: "Subscription",
      description: "Renewal preferences",
      icon: <Zap size={16} />,
    },
    {
      id: "invoices",
      label: "Invoice Preferences",
      description: "Invoice settings",
      icon: <Receipt size={16} />,
    },
    {
      id: "security",
      label: "Security",
      description: "Password and access",
      icon: <ShieldCheck size={16} />,
    },
    {
      id: "privacy",
      label: "Privacy & Data",
      description: "Your account data",
      icon: <Lock size={16} />,
    },
    {
      id: "regional",
      label: "Regional",
      description: "Language and timezone",
      icon: <Globe2 size={16} />,
    },
    {
      id: "connections",
      label: "Connected Services",
      description: "External accounts",
      icon: <Laptop size={16} />,
    },
    {
      id: "support",
      label: "Help & Support",
      description: "Get assistance",
      icon: <CircleHelp size={16} />,
    },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case "account":
        return (
          <SettingsCard
            eyebrow="ACCOUNT"
            title="Profile Information"
            description="Manage the information associated with your BillSphere account."
          >
            <div className="settings-profile">
              <div className="profile-avatar">
                <span>S</span>
              </div>

              <div>
                <h3>Sravanthi</h3>
                <p>BillSphere Customer</p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => showSavedMessage("Profile photo action opened")}
                >
                  Change Photo
                </button>
              </div>
            </div>

            <div className="settings-divider" />

            <div className="settings-form-grid">
              <InputField
                label="Full Name"
                value={profile.name}
                onChange={(value) =>
                  setProfile((previous) => ({
                    ...previous,
                    name: value,
                  }))
                }
              />

              <InputField
                label="Email Address"
                value={profile.email}
                placeholder="Your registered email"
                onChange={(value) =>
                  setProfile((previous) => ({
                    ...previous,
                    email: value,
                  }))
                }
              />

              <InputField
                label="Phone Number"
                value={profile.phone}
                placeholder="Add phone number"
                onChange={(value) =>
                  setProfile((previous) => ({
                    ...previous,
                    phone: value,
                  }))
                }
              />

              <InputField
                label="Company / Organization"
                value={profile.company}
                placeholder="Optional"
                onChange={(value) =>
                  setProfile((previous) => ({
                    ...previous,
                    company: value,
                  }))
                }
              />
            </div>

            <div className="settings-actions">
              <button
                type="button"
                className="gold-button"
                onClick={() => showSavedMessage("Profile changes saved")}
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>
          </SettingsCard>
        );

      case "appearance":
        return (
          <>
            <SettingsCard
              eyebrow="APPEARANCE"
              title="Theme & Display"
              description="Customize how BillSphere looks on your device."
            >
              <div className="theme-grid">
                <ThemeOption
                  icon={<Moon size={19} />}
                  title="Dark"
                  description="Matte black BillSphere interface"
                  active={theme === "dark"}
                  onClick={() => handleThemeChange("dark")}
                />

                <ThemeOption
                  icon={<Sun size={19} />}
                  title="Light"
                  description="Light interface for daytime use"
                  active={theme === "light"}
                  onClick={() => handleThemeChange("light")}
                />

                <ThemeOption
                  icon={<Laptop size={19} />}
                  title="System"
                  description="Follow your device preference"
                  active={theme === "system"}
                  onClick={() => handleThemeChange("system")}
                />
              </div>

              <div className="settings-divider" />

              <SettingRow
                title="Compact Dashboard"
                description="Use a more compact spacing throughout the dashboard."
              >
                <Toggle
                  checked={compactMode}
                  onChange={setCompactMode}
                />
              </SettingRow>

              <SettingRow
                title="Reduce Motion"
                description="Reduce animations and visual movement."
              >
                <Toggle
                  checked={reduceMotion}
                  onChange={setReduceMotion}
                />
              </SettingRow>
            </SettingsCard>
          </>
        );

      case "notifications":
        return (
          <>
            <SettingsCard
              eyebrow="NOTIFICATIONS"
              title="Notification Preferences"
              description="Choose which billing and payment events appear in your dashboard and email."
            >
              <NotificationGroup title="Payment Notifications">
                <NotificationRow
                  title="Successful Payment"
                  description="When a payment is successfully processed."
                  email={notifications.successfulPaymentEmail}
                  dashboard={notifications.successfulPaymentDashboard}
                  onEmailChange={(value) =>
                    updateNotification(
                      "successfulPaymentEmail",
                      value
                    )
                  }
                  onDashboardChange={(value) =>
                    updateNotification(
                      "successfulPaymentDashboard",
                      value
                    )
                  }
                />

                <NotificationRow
                  title="Failed Payment"
                  description="When a payment attempt fails."
                  email={notifications.failedPaymentEmail}
                  dashboard={notifications.failedPaymentDashboard}
                  onEmailChange={(value) =>
                    updateNotification("failedPaymentEmail", value)
                  }
                  onDashboardChange={(value) =>
                    updateNotification(
                      "failedPaymentDashboard",
                      value
                    )
                  }
                />

                <NotificationRow
                  title="Pending Payment"
                  description="When a payment is awaiting confirmation."
                  email={notifications.pendingPaymentEmail}
                  dashboard={notifications.pendingPaymentDashboard}
                  onEmailChange={(value) =>
                    updateNotification("pendingPaymentEmail", value)
                  }
                  onDashboardChange={(value) =>
                    updateNotification(
                      "pendingPaymentDashboard",
                      value
                    )
                  }
                />

                <NotificationRow
                  title="Payment Retry"
                  description="When BillSphere retries a failed payment."
                  email={notifications.paymentRetryEmail}
                  dashboard={notifications.paymentRetryDashboard}
                  onEmailChange={(value) =>
                    updateNotification("paymentRetryEmail", value)
                  }
                  onDashboardChange={(value) =>
                    updateNotification(
                      "paymentRetryDashboard",
                      value
                    )
                  }
                />

                <NotificationRow
                  title="Refund Processed"
                  description="When a payment refund is recorded."
                  email={notifications.refundEmail}
                  dashboard={notifications.refundDashboard}
                  onEmailChange={(value) =>
                    updateNotification("refundEmail", value)
                  }
                  onDashboardChange={(value) =>
                    updateNotification("refundDashboard", value)
                  }
                />
              </NotificationGroup>

              <NotificationGroup title="Billing Notifications">
                <NotificationRow
                  title="Invoice Generated"
                  description="When a new invoice is created."
                  email={notifications.invoiceEmail}
                  dashboard={notifications.invoiceDashboard}
                  onEmailChange={(value) =>
                    updateNotification("invoiceEmail", value)
                  }
                  onDashboardChange={(value) =>
                    updateNotification("invoiceDashboard", value)
                  }
                />

                <NotificationRow
                  title="Invoice Due"
                  description="Reminder before an invoice reaches its due date."
                  email={notifications.invoiceDueEmail}
                  dashboard={notifications.invoiceDueDashboard}
                  onEmailChange={(value) =>
                    updateNotification("invoiceDueEmail", value)
                  }
                  onDashboardChange={(value) =>
                    updateNotification(
                      "invoiceDueDashboard",
                      value
                    )
                  }
                />

                <NotificationRow
                  title="Overdue Invoice"
                  description="When an invoice passes its due date."
                  email={notifications.overdueEmail}
                  dashboard={notifications.overdueDashboard}
                  onEmailChange={(value) =>
                    updateNotification("overdueEmail", value)
                  }
                  onDashboardChange={(value) =>
                    updateNotification(
                      "overdueDashboard",
                      value
                    )
                  }
                />

                <NotificationRow
                  title="Subscription Renewal"
                  description="Reminder about an upcoming renewal."
                  email={notifications.renewalEmail}
                  dashboard={notifications.renewalDashboard}
                  onEmailChange={(value) =>
                    updateNotification("renewalEmail", value)
                  }
                  onDashboardChange={(value) =>
                    updateNotification(
                      "renewalDashboard",
                      value
                    )
                  }
                />
              </NotificationGroup>

              <NotificationGroup title="Security Notifications">
                <NotificationRow
                  title="Login Alert"
                  description="When your account is accessed from a new device."
                  email={notifications.loginEmail}
                  dashboard={notifications.loginDashboard}
                  onEmailChange={(value) =>
                    updateNotification("loginEmail", value)
                  }
                  onDashboardChange={(value) =>
                    updateNotification(
                      "loginDashboard",
                      value
                    )
                  }
                />

                <NotificationRow
                  title="Security Changes"
                  description="Password and account security changes."
                  email={notifications.securityEmail}
                  dashboard={notifications.securityDashboard}
                  onEmailChange={(value) =>
                    updateNotification("securityEmail", value)
                  }
                  onDashboardChange={(value) =>
                    updateNotification(
                      "securityDashboard",
                      value
                    )
                  }
                />
              </NotificationGroup>

              <div className="settings-actions">
                <button
                  type="button"
                  className="gold-button"
                  onClick={() =>
                    showSavedMessage(
                      "Notification preferences saved"
                    )
                  }
                >
                  <Save size={14} />
                  Save Notification Settings
                </button>
              </div>
            </SettingsCard>
          </>
        );

      case "billing":
        return (
          <SettingsCard
            eyebrow="BILLING & PAYMENTS"
            title="Billing Preferences"
            description="Control how BillSphere handles your subscription payments."
          >
            <SettingRow
              title="Automatic Payments"
              description="Automatically process future subscription payments."
            >
              <Toggle
                checked={billingSettings.automaticPayments}
                onChange={(value) =>
                  updateBilling("automaticPayments", value)
                }
              />
            </SettingRow>

            <SettingRow
              title="Payment Confirmation"
              description="Show a dashboard confirmation after successful payments."
            >
              <Toggle
                checked={billingSettings.paymentConfirmation}
                onChange={(value) =>
                  updateBilling("paymentConfirmation", value)
                }
              />
            </SettingRow>

            <SettingRow
              title="Billing Reminders"
              description="Receive reminders about upcoming and outstanding payments."
            >
              <Toggle
                checked={billingSettings.billingReminders}
                onChange={(value) =>
                  updateBilling("billingReminders", value)
                }
              />
            </SettingRow>

            <div className="settings-divider" />

            <div className="settings-form-grid">
              <SelectField
                label="Default Currency"
                value={regional.currency}
                options={["INR", "USD", "EUR", "GBP"]}
                onChange={(value) =>
                  setRegional((previous) => ({
                    ...previous,
                    currency: value,
                  }))
                }
              />

              <SelectField
                label="Billing Country"
                value={regional.country}
                options={["India", "United States", "United Kingdom", "Other"]}
                onChange={(value) =>
                  setRegional((previous) => ({
                    ...previous,
                    country: value,
                  }))
                }
              />
            </div>

            <div className="settings-actions">
              <button
                type="button"
                className="gold-button"
                onClick={() =>
                  showSavedMessage("Billing preferences saved")
                }
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>
          </SettingsCard>
        );

      case "subscription":
        return (
          <SettingsCard
            eyebrow="SUBSCRIPTION"
            title="Subscription Preferences"
            description="Control how your active BillSphere subscription behaves."
          >
            <div className="subscription-summary">
              <div className="subscription-icon">
                <Zap size={20} />
              </div>

              <div>
                <p className="subscription-label">CURRENT PLAN</p>
                <h3>Active BillSphere Subscription</h3>
                <p>Manage your plan from My Plan.</p>
              </div>
            </div>

            <div className="settings-divider" />

            <SettingRow
              title="Auto Renewal"
              description="Automatically renew your subscription when the billing cycle ends."
            >
              <Toggle
                checked={subscriptionSettings.autoRenewal}
                onChange={(value) =>
                  updateSubscription("autoRenewal", value)
                }
              />
            </SettingRow>

            <SettingRow
              title="Renewal Reminder"
              description="Notify you before your subscription renews."
            >
              <Toggle
                checked={subscriptionSettings.renewalReminder}
                onChange={(value) =>
                  updateSubscription("renewalReminder", value)
                }
              />
            </SettingRow>

            <div className="settings-actions">
              <button
                type="button"
                className="gold-button"
                onClick={() =>
                  showSavedMessage("Subscription preferences saved")
                }
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>
          </SettingsCard>
        );

      case "invoices":
        return (
          <SettingsCard
            eyebrow="INVOICE PREFERENCES"
            title="Invoice Settings"
            description="Customize how your BillSphere invoices are delivered and displayed."
          >
            <SettingRow
              title="Invoice Email"
              description="Receive newly generated invoices by email."
            >
              <Toggle
                checked={invoiceSettings.invoiceEmail}
                onChange={(value) =>
                  updateInvoice("invoiceEmail", value)
                }
              />
            </SettingRow>

            <SettingRow
              title="Invoice Reminders"
              description="Receive reminders for upcoming and outstanding invoices."
            >
              <Toggle
                checked={invoiceSettings.invoiceReminders}
                onChange={(value) =>
                  updateInvoice("invoiceReminders", value)
                }
              />
            </SettingRow>

            <SettingRow
              title="Show Tax Details"
              description="Include applicable tax information in invoice views."
            >
              <Toggle
                checked={invoiceSettings.showTaxDetails}
                onChange={(value) =>
                  updateInvoice("showTaxDetails", value)
                }
              />
            </SettingRow>

            <SettingRow
              title="Show Payment Details"
              description="Display payment and transaction information on invoices."
            >
              <Toggle
                checked={invoiceSettings.showPaymentDetails}
                onChange={(value) =>
                  updateInvoice("showPaymentDetails", value)
                }
              />
            </SettingRow>

            <div className="settings-actions">
              <button
                type="button"
                className="gold-button"
                onClick={() =>
                  showSavedMessage("Invoice preferences saved")
                }
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>
          </SettingsCard>
        );

      case "security":
        return (
          <>
            <SettingsCard
              eyebrow="SECURITY"
              title="Account Security"
              description="Protect your BillSphere account and billing information."
            >
              <SettingRow
                title="Two-Factor Authentication"
                description="Add another verification step when signing in."
              >
                <Toggle
                  checked={securitySettings.twoFactor}
                  onChange={(value) =>
                    updateSecurity("twoFactor", value)
                  }
                />
              </SettingRow>

              <SettingRow
                title="Login Alerts"
                description="Receive an alert whenever a new login is detected."
              >
                <Toggle
                  checked={securitySettings.loginAlerts}
                  onChange={(value) =>
                    updateSecurity("loginAlerts", value)
                  }
                />
              </SettingRow>

              <SettingRow
                title="Suspicious Activity Alerts"
                description="Get notified when unusual account activity is detected."
              >
                <Toggle
                  checked={securitySettings.suspiciousActivity}
                  onChange={(value) =>
                    updateSecurity("suspiciousActivity", value)
                  }
                />
              </SettingRow>

              <div className="settings-divider" />

              <ActionRow
                icon={<KeyRound size={17} />}
                title="Change Password"
                description="Update your BillSphere account password."
                action="Change"
                onClick={() =>
                  showSavedMessage(
                    "Password change flow can be connected here"
                  )
                }
              />

              <ActionRow
                icon={<LogOut size={17} />}
                title="Logout From All Devices"
                description="End all active BillSphere sessions."
                action="Logout All"
                onClick={() =>
                  showSavedMessage("All active sessions cleared")
                }
              />
            </SettingsCard>

            <SettingsCard
              eyebrow="ACTIVE SESSIONS"
              title="Recent Devices"
              description="Devices that recently accessed your BillSphere account."
            >
              <SessionRow
                icon={<Laptop size={18} />}
                device="Windows Desktop"
                location="Current session"
                active
              />

              <SessionRow
                icon={<Smartphone size={18} />}
                device="Mobile Device"
                location="Recently active"
              />
            </SettingsCard>
          </>
        );

      case "privacy":
        return (
          <>
            <SettingsCard
              eyebrow="PRIVACY & DATA"
              title="Your Data"
              description="Access and manage the information associated with your BillSphere account."
            >
              <ActionRow
                icon={<Download size={17} />}
                title="Download My Data"
                description="Request a copy of your BillSphere account information."
                action="Request"
                onClick={() =>
                  showSavedMessage(
                    "Data export request submitted"
                  )
                }
              />

              <ActionRow
                icon={<Receipt size={17} />}
                title="Export Billing History"
                description="Download your invoices and billing records."
                action="Export"
                onClick={() =>
                  showSavedMessage(
                    "Billing export request submitted"
                  )
                }
              />

              <ActionRow
                icon={<CreditCard size={17} />}
                title="Export Payment History"
                description="Download your payment and transaction records."
                action="Export"
                onClick={() =>
                  showSavedMessage(
                    "Payment export request submitted"
                  )
                }
              />
            </SettingsCard>

            <SettingsCard
              eyebrow="EMAIL"
              title="Email Preferences"
              description="Choose the billing emails you want to receive."
            >
              <SettingRow
                title="Payment Receipts"
                description="Receive receipts after successful payments."
              >
                <Toggle
                  checked={emailSettings.paymentReceipts}
                  onChange={(value) =>
                    updateEmail("paymentReceipts", value)
                  }
                />
              </SettingRow>

              <SettingRow
                title="Invoice Emails"
                description="Receive newly generated invoices by email."
              >
                <Toggle
                  checked={emailSettings.invoiceEmails}
                  onChange={(value) =>
                    updateEmail("invoiceEmails", value)
                  }
                />
              </SettingRow>

              <SettingRow
                title="Payment Failure Emails"
                description="Receive alerts when payment processing fails."
              >
                <Toggle
                  checked={emailSettings.paymentFailures}
                  onChange={(value) =>
                    updateEmail("paymentFailures", value)
                  }
                />
              </SettingRow>

              <SettingRow
                title="Renewal Reminders"
                description="Receive reminders before subscription renewal."
              >
                <Toggle
                  checked={emailSettings.renewalReminders}
                  onChange={(value) =>
                    updateEmail("renewalReminders", value)
                  }
                />
              </SettingRow>

              <SettingRow
                title="Product Updates"
                description="Receive occasional BillSphere product announcements."
              >
                <Toggle
                  checked={emailSettings.productUpdates}
                  onChange={(value) =>
                    updateEmail("productUpdates", value)
                  }
                />
              </SettingRow>
            </SettingsCard>
          </>
        );

      case "regional":
        return (
          <SettingsCard
            eyebrow="REGIONAL PREFERENCES"
            title="Language, Currency & Time"
            description="Choose the regional preferences used throughout BillSphere."
          >
            <div className="settings-form-grid">
              <SelectField
                label="Language"
                value={regional.language}
                options={["English"]}
                onChange={(value) =>
                  setRegional((previous) => ({
                    ...previous,
                    language: value,
                  }))
                }
              />

              <SelectField
                label="Country"
                value={regional.country}
                options={[
                  "India",
                  "United States",
                  "United Kingdom",
                  "Other",
                ]}
                onChange={(value) =>
                  setRegional((previous) => ({
                    ...previous,
                    country: value,
                  }))
                }
              />

              <SelectField
                label="Currency"
                value={regional.currency}
                options={["INR", "USD", "EUR", "GBP"]}
                onChange={(value) =>
                  setRegional((previous) => ({
                    ...previous,
                    currency: value,
                  }))
                }
              />

              <SelectField
                label="Date Format"
                value={regional.dateFormat}
                options={[
                  "DD MMM YYYY",
                  "DD/MM/YYYY",
                  "MM/DD/YYYY",
                  "YYYY-MM-DD",
                ]}
                onChange={(value) =>
                  setRegional((previous) => ({
                    ...previous,
                    dateFormat: value,
                  }))
                }
              />

              <div className="form-field full-width">
                <label>Time Zone</label>

                <select
                  value={regional.timezone}
                  onChange={(event) =>
                    setRegional((previous) => ({
                      ...previous,
                      timezone: event.target.value,
                    }))
                  }
                >
                  <option value="Asia/Kolkata">
                    Asia/Kolkata — India
                  </option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">
                    America/New_York
                  </option>
                  <option value="Europe/London">
                    Europe/London
                  </option>
                </select>
              </div>
            </div>

            <div className="settings-actions">
              <button
                type="button"
                className="gold-button"
                onClick={() =>
                  showSavedMessage("Regional preferences saved")
                }
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>
          </SettingsCard>
        );

      case "connections":
        return (
          <SettingsCard
            eyebrow="CONNECTED SERVICES"
            title="Connected Accounts"
            description="Manage external services connected to your BillSphere account."
          >
            <ConnectionRow
              icon={<Mail size={18} />}
              title="Email Account"
              description="Used for billing and payment notifications."
              status="Connected"
              action="Manage"
            />

            <ConnectionRow
              icon={<Globe2 size={18} />}
              title="Google Account"
              description="Use Google authentication to access BillSphere."
              status="Available"
              action="Connect"
            />

            <ConnectionRow
              icon={<CreditCard size={18} />}
              title="Payment Provider"
              description="Payment processing connection for subscriptions."
              status="Managed by BillSphere"
              action="View"
            />
          </SettingsCard>
        );

      case "support":
        return (
          <SettingsCard
            eyebrow="SUPPORT"
            title="Help & Support"
            description="Get assistance with payments, invoices, subscriptions and your account."
          >
            <SupportCard
              icon={<CircleHelp size={19} />}
              title="Help Center"
              description="Find answers to common BillSphere questions."
              button="Open Help Center"
              onClick={() =>
                showSavedMessage("Help Center opened")
              }
            />

            <SupportCard
              icon={<Mail size={19} />}
              title="Contact Support"
              description="Send a support request about your account or billing."
              button="Contact Support"
              onClick={() =>
                showSavedMessage("Support request opened")
              }
            />

            <SupportCard
              icon={<CreditCard size={19} />}
              title="Payment Issue"
              description="Report a failed, pending or incorrect payment."
              button="Report Issue"
              onClick={() =>
                showSavedMessage("Payment support opened")
              }
            />
          </SettingsCard>
        );

      case "danger":
        return (
          <SettingsCard
            eyebrow="DANGER ZONE"
            title="Account Actions"
            description="These actions can affect your BillSphere account and billing data."
            danger
          >
            <div className="danger-box">
              <div>
                <h3>Cancel Subscription</h3>
                <p>
                  Stop automatic renewal of your current subscription.
                </p>
              </div>

              <button
                type="button"
                className="danger-outline-button"
                onClick={() =>
                  showSavedMessage(
                    "Subscription cancellation flow opened"
                  )
                }
              >
                Cancel Subscription
              </button>
            </div>

            <div className="danger-box destructive">
              <div>
                <h3>Delete Account</h3>
                <p>
                  Permanently remove your BillSphere account and
                  associated customer data.
                </p>
              </div>

              <button
                type="button"
                className="danger-button"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Account
              </button>
            </div>
          </SettingsCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="settings-page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="settings-page-header">
        <div>
          <div className="settings-eyebrow">
            <ShieldCheck size={14} />
            ACCOUNT SETTINGS
          </div>

          <h1>Settings</h1>

          <p>
            Manage your BillSphere account, preferences,
            notifications and security.
          </p>
        </div>
      </div>

      {/* =====================================================
          SETTINGS CONTENT
      ===================================================== */}

      <div className="settings-layout">

        {/* LEFT NAVIGATION */}

        <aside className="settings-sidebar">

          <div className="settings-sidebar-title">
            SETTINGS
          </div>

          <nav>
            {sectionItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`settings-nav-item ${
                  activeSection === item.id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveSection(item.id)
                }
              >
                <span className="settings-nav-icon">
                  {item.icon}
                </span>

                <span className="settings-nav-content">
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>

                <ChevronRight
                  size={14}
                  className="settings-nav-arrow"
                />
              </button>
            ))}

            <div className="settings-nav-divider" />

            <button
              type="button"
              className={`settings-nav-item danger-nav ${
                activeSection === "danger"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveSection("danger")
              }
            >
              <span className="settings-nav-icon">
                <AlertTriangle size={16} />
              </span>

              <span className="settings-nav-content">
                <strong>Danger Zone</strong>
                <small>Destructive actions</small>
              </span>

              <ChevronRight
                size={14}
                className="settings-nav-arrow"
              />
            </button>
          </nav>
        </aside>

        {/* RIGHT CONTENT */}

        <main className="settings-content">
          {renderSection()}
        </main>
      </div>

      {/* =====================================================
          SAVED TOAST
      ===================================================== */}

      {savedMessage && (
        <div className="settings-toast">
          <span>
            <Check size={15} />
          </span>
          {savedMessage}
        </div>
      )}

      {/* =====================================================
          DELETE MODAL
      ===================================================== */}

      {showDeleteModal && (
        <div className="settings-modal-backdrop">
          <div className="settings-modal">

            <button
              type="button"
              className="modal-close"
              onClick={() =>
                setShowDeleteModal(false)
              }
            >
              <X size={18} />
            </button>

            <div className="modal-danger-icon">
              <AlertTriangle size={22} />
            </div>

            <h2>Delete your account?</h2>

            <p>
              This action is permanent. Your BillSphere
              account and associated data may no longer
              be recoverable.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setShowDeleteModal(false)
                }
              >
                Keep Account
              </button>

              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  setShowDeleteModal(false);
                  showSavedMessage(
                    "Account deletion requires backend confirmation"
                  );
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SETTINGS CARD
========================================================= */

function SettingsCard({
  eyebrow,
  title,
  description,
  children,
  danger = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={`settings-card ${
        danger ? "danger-card" : ""
      }`}
    >
      <div className="settings-card-header">
        <div>
          <span className="card-eyebrow">
            {eyebrow}
          </span>

          <h2>{title}</h2>

          <p>{description}</p>
        </div>
      </div>

      <div className="settings-card-body">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   SETTING ROW
========================================================= */

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="setting-row">
      <div className="setting-row-text">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div className="setting-row-control">
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   TOGGLE
========================================================= */

function Toggle({
  checked,
  onChange,
  disabled = false,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`settings-toggle ${
        checked ? "checked" : ""
      }`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

/* =========================================================
   INPUT
========================================================= */

function InputField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="form-field">
      <label>{label}</label>

      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
}

/* =========================================================
   SELECT
========================================================= */

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="form-field">
      <label>{label}</label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

/* =========================================================
   THEME OPTION
========================================================= */

function ThemeOption({
  icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`theme-option ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      <div className="theme-option-icon">
        {icon}
      </div>

      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <span
        className={`theme-radio ${
          active ? "selected" : ""
        }`}
      >
        {active && <Check size={11} />}
      </span>
    </button>
  );
}

/* =========================================================
   NOTIFICATION GROUP
========================================================= */

function NotificationGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="notification-group">
      <div className="notification-group-header">
        <h3>{title}</h3>

        <div className="notification-columns">
          <span>Email</span>
          <span>Dashboard</span>
        </div>
      </div>

      {children}
    </div>
  );
}

/* =========================================================
   NOTIFICATION ROW
========================================================= */

function NotificationRow({
  title,
  description,
  email,
  dashboard,
  onEmailChange,
  onDashboardChange,
}: {
  title: string;
  description: string;
  email: boolean;
  dashboard: boolean;
  onEmailChange: (value: boolean) => void;
  onDashboardChange: (value: boolean) => void;
}) {
  return (
    <div className="notification-row">
      <div>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>

      <div className="notification-controls">
        <Toggle
          checked={email}
          onChange={onEmailChange}
        />

        <Toggle
          checked={dashboard}
          onChange={onDashboardChange}
        />
      </div>
    </div>
  );
}

/* =========================================================
   ACTION ROW
========================================================= */

function ActionRow({
  icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="action-row">
      <div className="action-icon">
        {icon}
      </div>

      <div className="action-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <button
        type="button"
        className="secondary-button"
        onClick={onClick}
      >
        {action}
      </button>
    </div>
  );
}

/* =========================================================
   SESSION ROW
========================================================= */

function SessionRow({
  icon,
  device,
  location,
  active = false,
}: {
  icon: React.ReactNode;
  device: string;
  location: string;
  active?: boolean;
}) {
  return (
    <div className="session-row">
      <div className="session-icon">
        {icon}
      </div>

      <div>
        <h3>{device}</h3>
        <p>{location}</p>
      </div>

      {active && (
        <span className="current-session">
          Current
        </span>
      )}
    </div>
  );
}

/* =========================================================
   CONNECTION ROW
========================================================= */

function ConnectionRow({
  icon,
  title,
  description,
  status,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: string;
  action: string;
}) {
  return (
    <div className="connection-row">
      <div className="connection-icon">
        {icon}
      </div>

      <div className="connection-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div className="connection-status">
        <span>{status}</span>

        <button
          type="button"
          className="secondary-button"
        >
          {action}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   SUPPORT CARD
========================================================= */

function SupportCard({
  icon,
  title,
  description,
  button,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  button: string;
  onClick: () => void;
}) {
  return (
    <div className="support-card">
      <div className="support-icon">
        {icon}
      </div>

      <div className="support-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <button
        type="button"
        className="secondary-button"
        onClick={onClick}
      >
        {button}
      </button>
    </div>
  );
}

export default Settings;
