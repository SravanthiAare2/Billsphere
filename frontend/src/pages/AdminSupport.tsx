import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Headphones,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Ticket,
  X,
} from "lucide-react";

import "./AdminSupport.css";

type TicketStatus =
  | "Open"
  | "In Progress"
  | "Waiting for Customer"
  | "Resolved"
  | "Closed";

type TicketPriority = "Low" | "Normal" | "High" | "Urgent";

type TicketCategory =
  | "Payment"
  | "Subscription"
  | "Invoice"
  | "Refund"
  | "Plan"
  | "Account"
  | "Login"
  | "Technical Issue"
  | "Other";

interface SupportTicket {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
  relatedPayment?: string;
  relatedInvoice?: string;
  adminResponse?: string;
}

const initialTickets: SupportTicket[] = [
  {
    id: "BS-1024",
    subject: "Payment deducted but subscription not updated",
    category: "Payment",
    priority: "High",
    status: "In Progress",
    description:
      "I completed my payment, but my subscription is still showing as pending.",
    createdAt: "Aug 20, 2026 • 3:12 PM",
    updatedAt: "Aug 20, 2026 • 3:28 PM",
    relatedPayment: "#27",
    relatedInvoice: "INV-20260820-000004",
    adminResponse:
      "Our support team is currently verifying your payment and subscription status.",
  },
  {
    id: "BS-1018",
    subject: "Invoice download issue",
    category: "Invoice",
    priority: "Normal",
    status: "Resolved",
    description:
      "I was unable to download my invoice from the invoices section.",
    createdAt: "Aug 18, 2026 • 11:42 AM",
    updatedAt: "Aug 18, 2026 • 1:10 PM",
    relatedInvoice: "INV-20260818-000002",
    adminResponse:
      "The invoice download issue has been fixed. You can download the invoice now.",
  },
  {
    id: "BS-1007",
    subject: "Question about Premium plan",
    category: "Plan",
    priority: "Low",
    status: "Closed",
    description:
      "I wanted to understand the features included in the Premium plan.",
    createdAt: "Aug 15, 2026 • 10:05 AM",
    updatedAt: "Aug 15, 2026 • 12:30 PM",
    adminResponse:
      "We have provided the requested information regarding the Premium plan.",
  },
];

const categories: TicketCategory[] = [
  "Payment",
  "Subscription",
  "Invoice",
  "Refund",
  "Plan",
  "Account",
  "Login",
  "Technical Issue",
  "Other",
];

const priorities: TicketPriority[] = [
  "Low",
  "Normal",
  "High",
  "Urgent",
];

const statusFilters = [
  "All",
  "Open",
  "In Progress",
  "Waiting for Customer",
  "Resolved",
  "Closed",
];

const AdminSupport: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets);

  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] =
    useState<SupportTicket | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [subject, setSubject] = useState("");
  const [category, setCategory] =
    useState<TicketCategory>("Payment");
  const [priority, setPriority] =
    useState<TicketPriority>("Normal");
  const [relatedInvoice, setRelatedInvoice] = useState("");
  const [relatedPayment, setRelatedPayment] = useState("");
  const [description, setDescription] = useState("");

  const [submitMessage, setSubmitMessage] = useState("");

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesSearch =
        !query ||
        ticket.id.toLowerCase().includes(query) ||
        ticket.subject.toLowerCase().includes(query) ||
        ticket.category.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        ticket.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "Open").length,
      progress: tickets.filter(
        (t) => t.status === "In Progress"
      ).length,
      resolved: tickets.filter(
        (t) => t.status === "Resolved"
      ).length,
    };
  }, [tickets]);

  const resetForm = () => {
    setSubject("");
    setCategory("Payment");
    setPriority("Normal");
    setRelatedInvoice("");
    setRelatedPayment("");
    setDescription("");
    setSubmitMessage("");
  };

  const handleCreateTicket = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!subject.trim() || !description.trim()) {
      setSubmitMessage(
        "Please enter a subject and describe your issue."
      );
      return;
    }

    const newTicket: SupportTicket = {
      id: `BS-${1025 + tickets.length}`,
      subject: subject.trim(),
      category,
      priority,
      status: "Open",
      description: description.trim(),
      createdAt: "Just now",
      updatedAt: "Just now",
      relatedInvoice: relatedInvoice.trim() || undefined,
      relatedPayment: relatedPayment.trim() || undefined,
    };

    setTickets((previous) => [newTicket, ...previous]);

    setSubmitMessage(
      `Ticket ${newTicket.id} has been successfully submitted.`
    );

    setTimeout(() => {
      setShowCreateTicket(false);
      resetForm();
    }, 1400);
  };

  const getStatusClass = (status: TicketStatus) => {
    switch (status) {
      case "Open":
        return "status-open";

      case "In Progress":
        return "status-progress";

      case "Waiting for Customer":
        return "status-waiting";

      case "Resolved":
        return "status-resolved";

      case "Closed":
        return "status-closed";

      default:
        return "";
    }
  };

  const getPriorityClass = (value: TicketPriority) => {
    switch (value) {
      case "Urgent":
        return "priority-urgent";

      case "High":
        return "priority-high";

      case "Normal":
        return "priority-normal";

      case "Low":
        return "priority-low";

      default:
        return "";
    }
  };

  return (
    <div className="admin-support-page">
      {/* ==================================================
          HEADER
      ================================================== */}

      <section className="support-header">
        <div>
          <div className="support-eyebrow">
            <ShieldCheck size={16} />
            BILLSPHERE ADMIN SUPPORT
          </div>

          <h1>How can we help?</h1>

          <p>
            Raise a ticket and our support team will review
            your issue and keep you updated.
          </p>
        </div>

        <button
          className="create-ticket-button"
          onClick={() => setShowCreateTicket(true)}
        >
          <Plus size={19} />
          Raise New Ticket
        </button>
      </section>

      {/* ==================================================
          STATS
      ================================================== */}

      <section className="support-stats">
        <div className="support-stat-card">
          <div className="stat-icon">
            <Ticket size={20} />
          </div>

          <div>
            <span>Total Tickets</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="support-stat-card">
          <div className="stat-icon">
            <AlertCircle size={20} />
          </div>

          <div>
            <span>Open</span>
            <strong>{stats.open}</strong>
          </div>
        </div>

        <div className="support-stat-card">
          <div className="stat-icon">
            <Clock3 size={20} />
          </div>

          <div>
            <span>In Progress</span>
            <strong>{stats.progress}</strong>
          </div>
        </div>

        <div className="support-stat-card">
          <div className="stat-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>Resolved</span>
            <strong>{stats.resolved}</strong>
          </div>
        </div>
      </section>

      {/* ==================================================
          TICKET SECTION
      ================================================== */}

      <section className="tickets-section">
        <div className="section-heading">
          <div>
            <h2>My Support Tickets</h2>

            <p>
              Track your support requests and admin responses.
            </p>
          </div>
        </div>

        {/* FILTER BAR */}

        <div className="ticket-toolbar">
          <div className="search-box">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
            />
          </div>

          <div className="status-filters">
            {statusFilters.map((status) => (
              <button
                key={status}
                className={
                  statusFilter === status
                    ? "active"
                    : ""
                }
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* TICKETS */}

        <div className="ticket-list">
          {filteredTickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <MessageSquare size={28} />
              </div>

              <h3>No tickets found</h3>

              <p>
                Try changing your search or create a new
                support ticket.
              </p>

              <button
                onClick={() => setShowCreateTicket(true)}
              >
                <Plus size={17} />
                Raise Ticket
              </button>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <article
                className="ticket-card"
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="ticket-card-main">
                  <div className="ticket-number">
                    {ticket.id}
                  </div>

                  <h3>{ticket.subject}</h3>

                  <p>{ticket.description}</p>

                  <div className="ticket-meta">
                    <span>{ticket.category}</span>

                    <span>•</span>

                    <span>
                      Created {ticket.createdAt}
                    </span>
                  </div>
                </div>

                <div className="ticket-card-side">
                  <span
                    className={`status-badge ${getStatusClass(
                      ticket.status
                    )}`}
                  >
                    {ticket.status}
                  </span>

                  <span
                    className={`priority-badge ${getPriorityClass(
                      ticket.priority
                    )}`}
                  >
                    {ticket.priority}
                  </span>

                  <ChevronRight size={19} />
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* ==================================================
          CREATE TICKET MODAL
      ================================================== */}

      {showCreateTicket && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowCreateTicket(false);
            resetForm();
          }}
        >
          <div
            className="create-ticket-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="modal-kicker">
                  SUPPORT REQUEST
                </span>

                <h2>Raise a New Ticket</h2>

                <p>
                  Tell us what you are experiencing and our
                  admin support team will investigate it.
                </p>
              </div>

              <button
                className="close-button"
                onClick={() => {
                  setShowCreateTicket(false);
                  resetForm();
                }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="ticket-form"
              onSubmit={handleCreateTicket}
            >
              <div className="form-group">
                <label>Subject *</label>

                <input
                  type="text"
                  placeholder="Briefly describe your issue"
                  value={subject}
                  onChange={(event) =>
                    setSubject(event.target.value)
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>

                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(
                        event.target.value as TicketCategory
                      )
                    }
                  >
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority *</label>

                  <select
                    value={priority}
                    onChange={(event) =>
                      setPriority(
                        event.target.value as TicketPriority
                      )
                    }
                  >
                    {priorities.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Related Invoice</label>

                  <div className="input-with-icon">
                    <FileText size={17} />

                    <input
                      type="text"
                      placeholder="e.g. INV-20260820-000004"
                      value={relatedInvoice}
                      onChange={(event) =>
                        setRelatedInvoice(
                          event.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Related Payment</label>

                  <div className="input-with-icon">
                    <Ticket size={17} />

                    <input
                      type="text"
                      placeholder="e.g. #27"
                      value={relatedPayment}
                      onChange={(event) =>
                        setRelatedPayment(
                          event.target.value
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>

                <textarea
                  rows={6}
                  placeholder="Describe your issue in detail..."
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                />
              </div>

              {submitMessage && (
                <div
                  className={
                    submitMessage.includes("successfully")
                      ? "form-success"
                      : "form-error"
                  }
                >
                  {submitMessage.includes(
                    "successfully"
                  ) ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <AlertCircle size={18} />
                  )}

                  {submitMessage}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    setShowCreateTicket(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-ticket-button"
                >
                  <Send size={17} />
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================
          TICKET DETAILS MODAL
      ================================================== */}

      {selectedTicket && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="ticket-details-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="modal-kicker">
                  SUPPORT TICKET
                </span>

                <h2>{selectedTicket.id}</h2>

                <p>{selectedTicket.subject}</p>
              </div>

              <button
                className="close-button"
                onClick={() => setSelectedTicket(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="details-status-row">
              <span
                className={`status-badge ${getStatusClass(
                  selectedTicket.status
                )}`}
              >
                {selectedTicket.status}
              </span>

              <span
                className={`priority-badge ${getPriorityClass(
                  selectedTicket.priority
                )}`}
              >
                {selectedTicket.priority} Priority
              </span>

              <span className="detail-category">
                {selectedTicket.category}
              </span>
            </div>

            <div className="ticket-detail-grid">
              <div>
                <span>Created</span>
                <strong>
                  {selectedTicket.createdAt}
                </strong>
              </div>

              <div>
                <span>Last Updated</span>
                <strong>
                  {selectedTicket.updatedAt}
                </strong>
              </div>

              {selectedTicket.relatedInvoice && (
                <div>
                  <span>Related Invoice</span>
                  <strong>
                    {selectedTicket.relatedInvoice}
                  </strong>
                </div>
              )}

              {selectedTicket.relatedPayment && (
                <div>
                  <span>Related Payment</span>
                  <strong>
                    {selectedTicket.relatedPayment}
                  </strong>
                </div>
              )}
            </div>

            <div className="conversation-section">
              <h3>Your Issue</h3>

              <div className="customer-message">
                <div className="message-icon">
                  <MessageSquare size={17} />
                </div>

                <p>{selectedTicket.description}</p>
              </div>

              {selectedTicket.adminResponse && (
                <>
                  <h3>Admin Support Response</h3>

                  <div className="admin-message">
                    <div className="admin-message-icon">
                      <Headphones size={17} />
                    </div>

                    <div>
                      <strong>
                        BillSphere Support Team
                      </strong>

                      <p>
                        {selectedTicket.adminResponse}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="details-footer">
              <div>
                <ShieldCheck size={16} />
                Your ticket is securely handled by
                BillSphere Support.
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSupport;