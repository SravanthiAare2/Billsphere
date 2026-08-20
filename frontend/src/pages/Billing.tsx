
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  Info,
  Mail,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";

import "./Billing.css";

interface BillingInfo {
  customerName: string;
  email: string;
  planName: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  nextBillingAmount: number;
  currency: string;
  paymentMethod: string;
  paymentMethodLast4: string;
  autoRenew: boolean;
  billingEmail: string;
  taxName: string;
  taxId: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface BillingActivity {
  id: string;
  title: string;
  description: string;
  date: string;
  amount?: number;
  status: "Paid" | "Pending" | "Info";
}

const initialBillingInfo: BillingInfo = {
  customerName: "Sravanthi",
  email: "sravanthi@example.com",
  planName: "Premium",
  billingCycle: "Monthly",
  currentPeriodStart: "20 Aug 2026",
  currentPeriodEnd: "19 Sep 2026",
  nextBillingDate: "20 Sep 2026",
  nextBillingAmount: 4999,
  currency: "INR",
  paymentMethod: "Mock Payment",
  paymentMethodLast4: "4242",
  autoRenew: true,
  billingEmail: "sravanthi@example.com",
  taxName: "GST",
  taxId: "Not provided",
  addressLine1: "Billing address not provided",
  city: "Hyderabad",
  state: "Telangana",
  postalCode: "500000",
  country: "India",
};

const billingActivities: BillingActivity[] = [
  {
    id: "BA-001",
    title: "Subscription renewed",
    description: "Premium monthly subscription",
    date: "20 Aug 2026",
    amount: 4999,
    status: "Paid",
  },
  {
    id: "BA-002",
    title: "Invoice generated",
    description: "Subscription invoice created",
    date: "20 Aug 2026",
    amount: 4999,
    status: "Info",
  },
  {
    id: "BA-003",
    title: "Payment method verified",
    description: "Default payment method confirmed",
    date: "20 Aug 2026",
    status: "Info",
  },
];

function formatMoney(
  amount: number,
  currency = "INR"
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function Billing() {
  const [billingInfo, setBillingInfo] =
    useState<BillingInfo>(initialBillingInfo);

  const [autoRenew, setAutoRenew] =
    useState(initialBillingInfo.autoRenew);

  const [showAddressEditor, setShowAddressEditor] =
    useState(false);

  const [showPaymentDetails, setShowPaymentDetails] =
    useState(false);

  const [savedMessage, setSavedMessage] =
    useState("");

  const [address, setAddress] = useState({
    addressLine1: initialBillingInfo.addressLine1,
    city: initialBillingInfo.city,
    state: initialBillingInfo.state,
    postalCode: initialBillingInfo.postalCode,
    country: initialBillingInfo.country,
  });

  useEffect(() => {
    setAutoRenew(billingInfo.autoRenew);
  }, [billingInfo.autoRenew]);

  const currentPeriodProgress = useMemo(() => {
    return 35;
  }, []);

  const handleAutoRenewChange = () => {
    const nextValue = !autoRenew;

    setAutoRenew(nextValue);

    setBillingInfo((previous) => ({
      ...previous,
      autoRenew: nextValue,
    }));

    setSavedMessage(
      nextValue
        ? "Auto-renewal enabled."
        : "Auto-renewal disabled."
    );

    window.setTimeout(() => {
      setSavedMessage("");
    }, 3000);
  };

  const saveAddress = () => {
    setBillingInfo((previous) => ({
      ...previous,
      ...address,
    }));

    setShowAddressEditor(false);
    setSavedMessage("Billing address updated.");

    window.setTimeout(() => {
      setSavedMessage("");
    }, 3000);
  };

  return (
    <div className="billing-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="billing-header">

        <div>

          <div className="billing-eyebrow">
            <Wallet size={14} />
            Billing
          </div>

          <h1>
            Billing & Payments
          </h1>

          <p>
            Manage your subscription billing, payment method,
            billing details and renewal preferences.
          </p>

        </div>

        <div className="billing-security">
          <ShieldCheck size={15} />
          <span>Secure billing</span>
        </div>

      </section>


      {/* =====================================================
          SUCCESS MESSAGE
      ===================================================== */}

      {savedMessage && (
        <div className="billing-success-message">

          <CheckCircle2 size={16} />

          <span>
            {savedMessage}
          </span>

        </div>
      )}


      {/* =====================================================
          CURRENT BILLING OVERVIEW
      ===================================================== */}

      <section className="billing-overview-grid">

        {/* CURRENT PLAN */}

        <div className="billing-card billing-plan-card">

          <div className="billing-card-header">

            <div>

              <span className="billing-label">
                CURRENT PLAN
              </span>

              <h2>
                {billingInfo.planName}
              </h2>

            </div>

            <div className="billing-plan-icon">
              <Receipt size={19} />
            </div>

          </div>

          <div className="billing-plan-price">

            <strong>
              {formatMoney(
                billingInfo.nextBillingAmount,
                billingInfo.currency
              )}
            </strong>

            <span>
              / {billingInfo.billingCycle.toLowerCase()}
            </span>

          </div>

          <div className="billing-plan-status">

            <span className="billing-status-dot" />

            Active subscription

          </div>

          <div className="billing-card-footer">

            <div>

              <span>
                Billing period
              </span>

              <strong>
                {billingInfo.currentPeriodStart}
                {" — "}
                {billingInfo.currentPeriodEnd}
              </strong>

            </div>

            <a
              href="/customer/subscriptions"
              className="billing-text-link"
            >
              View plan
              <ArrowRight size={13} />
            </a>

          </div>

        </div>


        {/* NEXT BILLING */}

        <div className="billing-card">

          <div className="billing-card-header">

            <div>

              <span className="billing-label">
                NEXT BILLING
              </span>

              <h2>
                {formatMoney(
                  billingInfo.nextBillingAmount,
                  billingInfo.currency
                )}
              </h2>

            </div>

            <div className="billing-icon-box">
              <CalendarDays size={18} />
            </div>

          </div>

          <p className="billing-muted-text">
            Your next payment is scheduled for
          </p>

          <p className="billing-date">
            {billingInfo.nextBillingDate}
          </p>

          <div className="billing-progress-wrapper">

            <div className="billing-progress-top">

              <span>
                Current billing period
              </span>

              <span>
                {currentPeriodProgress}%
              </span>

            </div>

            <div className="billing-progress-track">

              <div
                className="billing-progress-value"
                style={{
                  width: `${currentPeriodProgress}%`,
                }}
              />

            </div>

          </div>

        </div>


        {/* PAYMENT METHOD */}

        <div className="billing-card">

          <div className="billing-card-header">

            <div>

              <span className="billing-label">
                PAYMENT METHOD
              </span>

              <h2>
                {billingInfo.paymentMethod}
              </h2>

            </div>

            <div className="billing-icon-box">
              <CreditCard size={18} />
            </div>

          </div>

          <div className="billing-payment-method">

            <div className="billing-card-chip">
              <CreditCard size={17} />
            </div>

            <div>

              <p>
                Default payment method
              </p>

              <span>
                •••• {billingInfo.paymentMethodLast4}
              </span>

            </div>

          </div>

          <button
            type="button"
            className="billing-secondary-button"
            onClick={() => setShowPaymentDetails(true)}
          >
            View payment details
            <ArrowRight size={13} />
          </button>

        </div>

      </section>


      {/* =====================================================
          MAIN GRID
      ===================================================== */}

      <section className="billing-main-grid">

        {/* ===================================================
            BILLING DETAILS
        =================================================== */}

        <div className="billing-card billing-details-card">

          <div className="billing-section-header">

            <div>

              <span className="billing-label">
                BILLING DETAILS
              </span>

              <h2>
                Billing information
              </h2>

              <p>
                Information used for invoices and billing
                communications.
              </p>

            </div>

            <button
              type="button"
              className="billing-outline-button"
              onClick={() => setShowAddressEditor(true)}
            >
              Edit details
            </button>

          </div>


          <div className="billing-details-grid">

            <DetailItem
              label="Customer"
              value={billingInfo.customerName}
            />

            <DetailItem
              label="Billing email"
              value={billingInfo.billingEmail}
            />

            <DetailItem
              label="Tax type"
              value={billingInfo.taxName}
            />

            <DetailItem
              label="Tax ID"
              value={billingInfo.taxId}
            />

            <DetailItem
              label="Address"
              value={billingInfo.addressLine1}
            />

            <DetailItem
              label="City"
              value={billingInfo.city}
            />

            <DetailItem
              label="State"
              value={billingInfo.state}
            />

            <DetailItem
              label="Postal code"
              value={billingInfo.postalCode}
            />

          </div>

        </div>


        {/* ===================================================
            AUTO RENEWAL
        =================================================== */}

        <div className="billing-card billing-renewal-card">

          <div className="billing-section-header">

            <div>

              <span className="billing-label">
                SUBSCRIPTION
              </span>

              <h2>
                Auto-renewal
              </h2>

            </div>

            <div className="billing-icon-box">
              <RefreshCw size={18} />
            </div>

          </div>

          <div className="billing-renewal-content">

            <div>

              <p className="billing-renewal-title">
                Automatically renew subscription
              </p>

              <p className="billing-muted-text">
                Your Premium plan will automatically renew
                on {billingInfo.nextBillingDate}.
              </p>

            </div>

            <button
              type="button"
              aria-label="Toggle auto renewal"
              className={`billing-toggle ${
                autoRenew
                  ? "billing-toggle-active"
                  : ""
              }`}
              onClick={handleAutoRenewChange}
            >

              <span />

            </button>

          </div>

          <div className="billing-info-note">

            <Info size={14} />

            <span>
              You can turn off auto-renewal at any time.
              Your current subscription remains active until
              the end of the billing period.
            </span>

          </div>

        </div>

      </section>


      {/* =====================================================
          BILLING ACTIVITY
      ===================================================== */}

      <section className="billing-card billing-activity-card">

        <div className="billing-section-header">

          <div>

            <span className="billing-label">
              BILLING ACTIVITY
            </span>

            <h2>
              Recent billing activity
            </h2>

            <p>
              A quick overview of your recent billing events.
            </p>

          </div>

          <div className="billing-activity-links">

            <a href="/customer/invoices">
              View invoices
              <ArrowRight size={13} />
            </a>

            <a href="/customer/payment-history">
              Payment history
              <ArrowRight size={13} />
            </a>

          </div>

        </div>


        <div className="billing-activity-list">

          {billingActivities.map((activity) => (

            <div
              key={activity.id}
              className="billing-activity-row"
            >

              <div className="billing-activity-icon">
                {activity.status === "Paid" ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <FileText size={16} />
                )}
              </div>

              <div className="billing-activity-content">

                <strong>
                  {activity.title}
                </strong>

                <span>
                  {activity.description}
                </span>

              </div>

              <div className="billing-activity-date">
                {activity.date}
              </div>

              {activity.amount !== undefined && (
                <div className="billing-activity-amount">
                  {formatMoney(
                    activity.amount,
                    billingInfo.currency
                  )}
                </div>
              )}

              <div
                className={`billing-activity-status billing-activity-status-${activity.status.toLowerCase()}`}
              >
                {activity.status}
              </div>

            </div>

          ))}

        </div>

      </section>


      {/* =====================================================
          QUICK ACCESS
      ===================================================== */}

      <section className="billing-quick-grid">

        <QuickAccessCard
          icon={<FileText size={18} />}
          title="Invoices"
          description="View and download your billing invoices."
          href="/customer/invoices"
        />

        <QuickAccessCard
          icon={<CreditCard size={18} />}
          title="Payment History"
          description="Review successful, pending and failed payments."
          href="/customer/payment-history"
        />

        <QuickAccessCard
          icon={<Mail size={18} />}
          title="Billing Notifications"
          description="Manage billing-related email notifications."
          href="/customer/notifications"
        />

      </section>


      {/* =====================================================
          ADDRESS MODAL
      ===================================================== */}

      {showAddressEditor && (
        <div className="billing-modal-backdrop">

          <div className="billing-modal">

            <div className="billing-modal-header">

              <div>

                <span className="billing-label">
                  BILLING DETAILS
                </span>

                <h2>
                  Edit billing information
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddressEditor(false)
                }
              >
                <X size={18} />
              </button>

            </div>


            <div className="billing-modal-body">

              <div className="billing-form-group">

                <label>
                  Billing address
                </label>

                <input
                  value={address.addressLine1}
                  onChange={(e) =>
                    setAddress({
                      ...address,
                      addressLine1: e.target.value,
                    })
                  }
                />

              </div>

              <div className="billing-form-grid">

                <div className="billing-form-group">

                  <label>
                    City
                  </label>

                  <input
                    value={address.city}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        city: e.target.value,
                      })
                    }
                  />

                </div>

                <div className="billing-form-group">

                  <label>
                    State
                  </label>

                  <input
                    value={address.state}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        state: e.target.value,
                      })
                    }
                  />

                </div>

                <div className="billing-form-group">

                  <label>
                    Postal code
                  </label>

                  <input
                    value={address.postalCode}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        postalCode: e.target.value,
                      })
                    }
                  />

                </div>

                <div className="billing-form-group">

                  <label>
                    Country
                  </label>

                  <div className="billing-select-wrapper">

                    <select
                      value={address.country}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          country: e.target.value,
                        })
                      }
                    >

                      <option value="India">
                        India
                      </option>

                      <option value="United States">
                        United States
                      </option>

                      <option value="United Kingdom">
                        United Kingdom
                      </option>

                      <option value="Australia">
                        Australia
                      </option>

                    </select>

                    <ChevronDown size={14} />

                  </div>

                </div>

              </div>

            </div>


            <div className="billing-modal-footer">

              <button
                type="button"
                className="billing-modal-cancel"
                onClick={() =>
                  setShowAddressEditor(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="billing-modal-save"
                onClick={saveAddress}
              >
                Save changes
              </button>

            </div>

          </div>

        </div>
      )}


      {/* =====================================================
          PAYMENT METHOD MODAL
      ===================================================== */}

      {showPaymentDetails && (
        <div className="billing-modal-backdrop">

          <div className="billing-modal billing-payment-modal">

            <div className="billing-modal-header">

              <div>

                <span className="billing-label">
                  PAYMENT METHOD
                </span>

                <h2>
                  Payment details
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowPaymentDetails(false)
                }
              >
                <X size={18} />
              </button>

            </div>


            <div className="billing-modal-body">

              <div className="billing-payment-preview">

                <div className="billing-payment-preview-icon">
                  <CreditCard size={22} />
                </div>

                <div>

                  <span>
                    Default payment method
                  </span>

                  <strong>
                    {billingInfo.paymentMethod}
                  </strong>

                  <p>
                    •••• •••• ••••{" "}
                    {billingInfo.paymentMethodLast4}
                  </p>

                </div>

              </div>


              <div className="billing-security-box">

                <ShieldCheck size={17} />

                <div>

                  <strong>
                    Secure payment information
                  </strong>

                  <p>
                    BillSphere does not display or store
                    sensitive payment credentials in this
                    customer-facing view.
                  </p>

                </div>

              </div>

            </div>

            <div className="billing-modal-footer">

              <button
                type="button"
                className="billing-modal-save billing-full-button"
                onClick={() =>
                  setShowPaymentDetails(false)
                }
              >
                Done
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}


/* =========================================================
   DETAIL ITEM
========================================================= */

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="billing-detail-item">

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>

    </div>
  );
}


/* =========================================================
   QUICK ACCESS
========================================================= */

function QuickAccessCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="billing-quick-card"
    >

      <div className="billing-quick-icon">
        {icon}
      </div>

      <div>

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

      </div>

      <ArrowRight
        size={15}
        className="billing-quick-arrow"
      />

    </a>
  );
}

export default Billing;
