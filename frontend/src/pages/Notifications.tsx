import { useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  FileCheck2,
  FileText,
  Info,
  Mail,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

import "./Notifications.css";

type NotificationCategory =
  | "Payment"
  | "Invoice"
  | "Subscription"
  | "Billing"
  | "System";

type NotificationType =
  | "payment_success"
  | "payment_failed"
  | "payment_refunded"
  | "invoice_generated"
  | "invoice_paid"
  | "invoice_overdue"
  | "subscription_activated"
  | "subscription_renewed"
  | "subscription_cancelled"
  | "renewal_reminder"
  | "billing_update"
  | "system";

interface NotificationRecord {
  id: string;
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  time: string;
  read: boolean;
  amount?: string;
  transactionId?: string;
  invoiceId?: string;
  planName?: string;
  actionLabel?: string;
  actionType?: "payment" | "invoice" | "subscription";
}

const initialNotifications: NotificationRecord[] = [
  {
    id: "NOTIF-001",
    category: "Payment",
    type: "payment_success",
    title: "Payment Successful",
    message:
      "Your payment of ₹4,999.00 for the Premium Plan was successfully processed.",
    date: "20 Aug 2026",
    time: "02:12 PM",
    read: false,
    amount: "₹4,999.00",
    transactionId: "TXN-BS-8F29A1",
    planName: "Premium",
    actionLabel: "View Payment",
    actionType: "payment",
  },
  {
    id: "NOTIF-002",
    category: "Invoice",
    type: "invoice_generated",
    title: "New Invoice Generated",
    message:
      "Invoice INV-20260820-000004 has been generated for your recent billing activity.",
    date: "20 Aug 2026",
    time: "02:05 PM",
    read: false,
    amount: "₹706.82",
    invoiceId: "INV-20260820-000004",
    actionLabel: "View Invoice",
    actionType: "invoice",
  },
  {
    id: "NOTIF-003",
    category: "Subscription",
    type: "subscription_activated",
    title: "Subscription Activated",
    message:
      "Your Premium Plan subscription is now active and ready to use.",
    date: "20 Aug 2026",
    time: "01:58 PM",
    read: true,
    planName: "Premium",
    actionLabel: "View Subscription",
    actionType: "subscription",
  },
  {
    id: "NOTIF-004",
    category: "Payment",
    type: "payment_failed",
    title: "Payment Failed",
    message:
      "Your recent payment could not be processed. Please review your payment details and try again.",
    date: "19 Aug 2026",
    time: "06:31 PM",
    read: false,
    amount: "₹1,499.00",
    transactionId: "TXN-BS-71C82B",
    planName: "Standard",
    actionLabel: "Retry Payment",
    actionType: "payment",
  },
  {
    id: "NOTIF-005",
    category: "Invoice",
    type: "invoice_paid",
    title: "Invoice Paid",
    message:
      "Invoice INV-20260819-000007 has been successfully marked as paid.",
    date: "19 Aug 2026",
    time: "04:20 PM",
    read: true,
    amount: "₹4,718.82",
    invoiceId: "INV-20260819-000007",
    actionLabel: "View Invoice",
    actionType: "invoice",
  },
  {
    id: "NOTIF-006",
    category: "Subscription",
    type: "renewal_reminder",
    title: "Upcoming Subscription Renewal",
    message:
      "Your Premium Plan is scheduled for renewal soon. Review your subscription before the next billing date.",
    date: "18 Aug 2026",
    time: "10:15 AM",
    read: true,
    amount: "₹4,999.00",
    planName: "Premium",
    actionLabel: "View Subscription",
    actionType: "subscription",
  },
  {
    id: "NOTIF-007",
    category: "Payment",
    type: "payment_refunded",
    title: "Payment Refunded",
    message:
      "A payment refund has been initiated for the transaction associated with your account.",
    date: "17 Aug 2026",
    time: "03:44 PM",
    read: true,
    amount: "₹599.00",
    transactionId: "TXN-BS-43A81C",
    actionLabel: "View Payment",
    actionType: "payment",
  },
  {
    id: "NOTIF-008",
    category: "Billing",
    type: "billing_update",
    title: "Billing Information Updated",
    message:
      "Your billing information has been successfully updated in BillSphere.",
    date: "16 Aug 2026",
    time: "11:26 AM",
    read: true,
  },
  {
    id: "NOTIF-009",
    category: "Invoice",
    type: "invoice_overdue",
    title: "Invoice Payment Reminder",
    message:
      "An invoice associated with your account is awaiting payment. Please review your billing details.",
    date: "15 Aug 2026",
    time: "09:40 AM",
    read: true,
    invoiceId: "INV-20260815-000003",
    amount: "₹234.82",
    actionLabel: "View Invoice",
    actionType: "invoice",
  },
  {
    id: "NOTIF-010",
    category: "System",
    type: "system",
    title: "Account Security",
    message:
      "Your BillSphere account continues to be protected by secure authentication and encrypted connections.",
    date: "14 Aug 2026",
    time: "08:00 AM",
    read: true,
  },
];

function Notifications() {
  const [notifications, setNotifications] =
    useState<NotificationRecord[]>(initialNotifications);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [readFilter, setReadFilter] = useState("All");
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationRecord | null>(null);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  const paymentCount = notifications.filter(
    (notification) => notification.category === "Payment"
  ).length;

  const billingCount = notifications.filter(
    (notification) =>
      notification.category === "Billing" ||
      notification.category === "Invoice"
  ).length;

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      const matchesSearch =
        !query ||
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query) ||
        notification.category.toLowerCase().includes(query) ||
        (notification.transactionId || "")
          .toLowerCase()
          .includes(query) ||
        (notification.invoiceId || "").toLowerCase().includes(query) ||
        (notification.planName || "").toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "All" ||
        notification.category === categoryFilter;

      const matchesRead =
        readFilter === "All" ||
        (readFilter === "Unread" && !notification.read) ||
        (readFilter === "Read" && notification.read);

      return matchesSearch && matchesCategory && matchesRead;
    });
  }, [
    categoryFilter,
    notifications,
    readFilter,
    search,
  ]);

  const markAsRead = (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAsUnread = (id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, read: false }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  };

  const handleNotificationClick = (
    notification: NotificationRecord
  ) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    setSelectedNotification({
      ...notification,
      read: true,
    });
  };

  return (
    <div className="notifications-page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <section className="notifications-header">

        <div className="notifications-header-left">

          <div className="notifications-eyebrow">
            <Bell size={13} />
            Notification Center
          </div>

          <h1>
            Notifications
          </h1>

          <p>
            Stay updated with payments, invoices, subscriptions,
            billing activity and important account alerts.
          </p>

        </div>

        <div className="notification-header-status">

          <div className="notification-live-dot" />

          <span>
            Live billing updates
          </span>

        </div>

      </section>


      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <section className="notification-summary-grid">

        <NotificationSummaryCard
          label="All Notifications"
          value={String(notifications.length)}
          description="Complete notification history"
          icon={<Bell size={18} />}
          iconClass="gold"
        />

        <NotificationSummaryCard
          label="Unread"
          value={String(unreadCount)}
          description="Requires your attention"
          icon={<Mail size={18} />}
          iconClass="amber"
        />

        <NotificationSummaryCard
          label="Payment Alerts"
          value={String(paymentCount)}
          description="Payment activity"
          icon={<CreditCard size={18} />}
          iconClass="green"
        />

        <NotificationSummaryCard
          label="Billing Alerts"
          value={String(billingCount)}
          description="Invoices and billing"
          icon={<FileText size={18} />}
          iconClass="purple"
        />

      </section>


      {/* =====================================================
          TOOLBAR
      ===================================================== */}

      <section className="notification-toolbar">

        <div className="notification-toolbar-heading">

          <div>
            <span className="toolbar-eyebrow">
              Activity
            </span>

            <h2>
              Your notifications
            </h2>

            <p>
              Important events from your BillSphere account.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="mark-all-button"
            >
              <CheckCircle2 size={14} />
              Mark all as read
            </button>
          )}

        </div>


        <div className="notification-filters">

          {/* SEARCH */}

          <div className="notification-search">

            <Search size={15} />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search notifications..."
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="clear-search"
              >
                <X size={13} />
              </button>
            )}

          </div>


          {/* READ FILTER */}

          <FilterSelect
            value={readFilter}
            options={[
              "All",
              "Unread",
              "Read",
            ]}
            onChange={setReadFilter}
          />


          {/* CATEGORY FILTER */}

          <FilterSelect
            value={categoryFilter}
            options={[
              "All",
              "Payment",
              "Invoice",
              "Subscription",
              "Billing",
              "System",
            ]}
            onChange={setCategoryFilter}
          />

        </div>

      </section>


      {/* =====================================================
          NOTIFICATION LIST
      ===================================================== */}

      <section className="notification-list-wrapper">

        {filteredNotifications.length === 0 ? (

          <EmptyNotificationState />

        ) : (

          <div className="notification-list">

            {filteredNotifications.map(
              (notification) => (

                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onClick={() =>
                    handleNotificationClick(notification)
                  }
                  onToggleRead={() =>
                    notification.read
                      ? markAsUnread(notification.id)
                      : markAsRead(notification.id)
                  }
                />

              )
            )}

          </div>

        )}

      </section>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="notification-footer">

        <div>
          Showing{" "}
          <strong>
            {filteredNotifications.length}
          </strong>{" "}
          of{" "}
          <strong>
            {notifications.length}
          </strong>{" "}
          notifications
        </div>

        <div className="notification-footer-security">
          <ShieldCheck size={13} />
          Secure BillSphere notification center
        </div>

      </div>


      {/* =====================================================
          NOTIFICATION DETAILS MODAL
      ===================================================== */}

      {selectedNotification && (

        <NotificationModal
          notification={selectedNotification}
          onClose={() =>
            setSelectedNotification(null)
          }
          onToggleRead={() => {
            if (selectedNotification.read) {
              markAsUnread(selectedNotification.id);
              setSelectedNotification({
                ...selectedNotification,
                read: false,
              });
            } else {
              markAsRead(selectedNotification.id);
              setSelectedNotification({
                ...selectedNotification,
                read: true,
              });
            }
          }}
        />

      )}

    </div>
  );
}


/* =========================================================
   SUMMARY CARD
========================================================= */

function NotificationSummaryCard({
  label,
  value,
  description,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="notification-summary-card">

      <div className="summary-card-content">

        <p className="summary-card-label">
          {label}
        </p>

        <p className="summary-card-value">
          {value}
        </p>

        <p className="summary-card-description">
          {description}
        </p>

      </div>

      <div
        className={`summary-card-icon ${iconClass}`}
      >
        {icon}
      </div>

    </div>
  );
}


/* =========================================================
   FILTER SELECT
========================================================= */

function FilterSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="notification-select-wrapper">

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="notification-select"
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

      <ChevronDown
        size={13}
        className="notification-select-icon"
      />

    </div>
  );
}


/* =========================================================
   NOTIFICATION CARD
========================================================= */

function NotificationCard({
  notification,
  onClick,
  onToggleRead,
}: {
  notification: NotificationRecord;
  onClick: () => void;
  onToggleRead: () => void;
}) {
  const visual = getNotificationVisual(
    notification.type
  );

  return (
    <article
      className={`notification-card ${
        notification.read
          ? "notification-card-read"
          : "notification-card-unread"
      }`}
    >

      {/* UNREAD INDICATOR */}

      {!notification.read && (
        <span className="notification-unread-indicator" />
      )}


      {/* ICON */}

      <div
        className={`notification-icon ${visual.className}`}
      >
        {visual.icon}
      </div>


      {/* CONTENT */}

      <button
        type="button"
        className="notification-main"
        onClick={onClick}
      >

        <div className="notification-top-row">

          <div className="notification-title-area">

            <span
              className={`notification-category ${visual.className}`}
            >
              {notification.category}
            </span>

            <h3>
              {notification.title}
            </h3>

          </div>

          <span className="notification-time">
            {notification.date} · {notification.time}
          </span>

        </div>

        <p className="notification-message">
          {notification.message}
        </p>


        {/* METADATA */}

        {(notification.amount ||
          notification.transactionId ||
          notification.invoiceId ||
          notification.planName) && (

          <div className="notification-meta">

            {notification.amount && (
              <span>
                <CircleDollarSign size={12} />
                {notification.amount}
              </span>
            )}

            {notification.planName && (
              <span>
                Plan: {notification.planName}
              </span>
            )}

            {notification.transactionId && (
              <span className="notification-mono">
                {notification.transactionId}
              </span>
            )}

            {notification.invoiceId && (
              <span className="notification-mono">
                {notification.invoiceId}
              </span>
            )}

          </div>

        )}

      </button>


      {/* ACTIONS */}

      <div className="notification-actions">

        {notification.actionLabel && (
          <button
            type="button"
            className="notification-action-button"
            onClick={onClick}
          >
            {notification.actionLabel}
          </button>
        )}

        <button
          type="button"
          className="notification-read-button"
          onClick={onToggleRead}
          title={
            notification.read
              ? "Mark as unread"
              : "Mark as read"
          }
        >
          {notification.read ? (
            <Mail size={14} />
          ) : (
            <CheckCircle2 size={14} />
          )}
        </button>

      </div>

    </article>
  );
}


/* =========================================================
   VISUAL CONFIGURATION
========================================================= */

function getNotificationVisual(
  type: NotificationType
) {
  switch (type) {
    case "payment_success":
      return {
        className: "success",
        icon: <CheckCircle2 size={19} />,
      };

    case "payment_failed":
      return {
        className: "danger",
        icon: <XCircle size={19} />,
      };

    case "payment_refunded":
      return {
        className: "gold",
        icon: <RefreshCw size={19} />,
      };

    case "invoice_generated":
      return {
        className: "invoice",
        icon: <FileText size={19} />,
      };

    case "invoice_paid":
      return {
        className: "success",
        icon: <FileCheck2 size={19} />,
      };

    case "invoice_overdue":
      return {
        className: "warning",
        icon: <AlertCircle size={19} />,
      };

    case "subscription_activated":
      return {
        className: "success",
        icon: <Sparkles size={19} />,
      };

    case "subscription_renewed":
      return {
        className: "success",
        icon: <RefreshCw size={19} />,
      };

    case "subscription_cancelled":
      return {
        className: "danger",
        icon: <XCircle size={19} />,
      };

    case "renewal_reminder":
      return {
        className: "warning",
        icon: <RefreshCw size={19} />,
      };

    case "billing_update":
      return {
        className: "gold",
        icon: <CreditCard size={19} />,
      };

    default:
      return {
        className: "system",
        icon: <Info size={19} />,
      };
  }
}


/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyNotificationState() {
  return (
    <div className="notification-empty">

      <div className="notification-empty-icon">
        <Bell size={24} />
      </div>

      <h3>
        No notifications found
      </h3>

      <p>
        There are no notifications matching your current
        search or filter.
      </p>

    </div>
  );
}


/* =========================================================
   NOTIFICATION MODAL
========================================================= */

function NotificationModal({
  notification,
  onClose,
  onToggleRead,
}: {
  notification: NotificationRecord;
  onClose: () => void;
  onToggleRead: () => void;
}) {
  const visual = getNotificationVisual(
    notification.type
  );

  return (
    <div
      className="notification-modal-overlay"
      onMouseDown={onClose}
    >

      <div
        className="notification-modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >

        {/* HEADER */}

        <div className="notification-modal-header">

          <div>

            <span className="notification-modal-eyebrow">
              BillSphere Notification
            </span>

            <h2>
              {notification.title}
            </h2>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="notification-modal-close"
          >
            <X size={18} />
          </button>

        </div>


        {/* BODY */}

        <div className="notification-modal-body">

          <div
            className={`notification-modal-icon ${visual.className}`}
          >
            {visual.icon}
          </div>

          <span
            className={`notification-modal-category ${visual.className}`}
          >
            {notification.category}
          </span>

          <p className="notification-modal-message">
            {notification.message}
          </p>


          {/* DETAILS */}

          <div className="notification-modal-details">

            <ModalDetail
              label="Date"
              value={`${notification.date} · ${notification.time}`}
            />

            {notification.amount && (
              <ModalDetail
                label="Amount"
                value={notification.amount}
              />
            )}

            {notification.planName && (
              <ModalDetail
                label="Plan"
                value={notification.planName}
              />
            )}

            {notification.transactionId && (
              <ModalDetail
                label="Transaction ID"
                value={notification.transactionId}
                mono
              />
            )}

            {notification.invoiceId && (
              <ModalDetail
                label="Invoice ID"
                value={notification.invoiceId}
                mono
              />
            )}

          </div>


          {/* ACTION */}

          {notification.actionLabel && (
            <button
              type="button"
              className="notification-modal-action"
            >
              {notification.actionLabel}
            </button>
          )}

        </div>


        {/* FOOTER */}

        <div className="notification-modal-footer">

          <button
            type="button"
            onClick={onToggleRead}
            className="notification-modal-read-button"
          >
            {notification.read
              ? "Mark as unread"
              : "Mark as read"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="notification-modal-done-button"
          >
            Done
          </button>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   MODAL DETAIL
========================================================= */

function ModalDetail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="notification-modal-detail">

      <span>
        {label}
      </span>

      <strong
        className={mono ? "mono" : ""}
      >
        {value}
      </strong>

    </div>
  );
}


export default Notifications;