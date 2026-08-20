
import { FormEvent, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  HelpCircle,
  Mail,
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Ticket,
  X,
} from "lucide-react";

import "./HelpSupport.css";

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  description: string;
  createdAt: string;
  updatedAt: string;
}

const INITIAL_TICKETS: SupportTicket[] = [];

const CATEGORIES = [
  "Payment Issue",
  "Invoice Issue",
  "Subscription",
  "Account & Login",
  "Technical Issue",
  "Billing",
  "Refund",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const FAQS = [
  {
    question: "My payment was successful but my plan is not active. What should I do?",
    answer:
      "First check your Payment History and My Plan pages. If the payment is marked successful but the subscription has not updated, raise a Payment Issue ticket and include your payment reference or invoice number.",
  },
  {
    question: "I did not receive my payment confirmation email.",
    answer:
      "Check your spam or promotions folder first. Your important billing notifications are also available inside the BillSphere Notifications page. If the notification is missing there as well, raise a support ticket.",
  },
  {
    question: "Where can I download my invoice?",
    answer:
      "Open Billing → My Invoices. Each invoice contains an option to view or download the invoice document.",
  },
  {
    question: "How can I check my payment status?",
    answer:
      "Open Payments or Payment History from the customer sidebar. You can review successful, pending, failed and other payment states there.",
  },
  {
    question: "I want to report a billing problem.",
    answer:
      "Choose Billing or Payment Issue when creating a support ticket. Include the invoice number, payment reference and a short explanation of the problem whenever possible.",
  },
];

function generateTicketId() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BS-${new Date().getFullYear()}-${random}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function HelpSupport() {
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Payment Issue");
  const [priority, setPriority] = useState("Medium");
  const [description, setDescription] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketFilter, setTicketFilter] = useState("All");

  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [submittedTicket, setSubmittedTicket] =
    useState<SupportTicket | null>(null);

  const filteredTickets = useMemo(() => {
    const normalizedSearch = ticketSearch.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesStatus =
        ticketFilter === "All" || ticket.status === ticketFilter;

      const matchesSearch =
        !normalizedSearch ||
        ticket.id.toLowerCase().includes(normalizedSearch) ||
        ticket.subject.toLowerCase().includes(normalizedSearch) ||
        ticket.category.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [ticketFilter, ticketSearch, tickets]);

  function resetTicketForm() {
    setSubject("");
    setCategory("Payment Issue");
    setPriority("Medium");
    setDescription("");
    setAttachmentName("");
  }

  function handleTicketSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!subject.trim() || !description.trim()) {
      return;
    }

    const now = new Date().toISOString();

    const newTicket: SupportTicket = {
      id: generateTicketId(),
      subject: subject.trim(),
      category,
      priority,
      status: "Open",
      description: description.trim(),
      createdAt: now,
      updatedAt: now,
    };

    setTickets((current) => [newTicket, ...current]);
    setSubmittedTicket(newTicket);
    resetTicketForm();
    setShowTicketForm(false);
  }

  return (
    <div className="help-support-page">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="help-header">
        <div>
          <div className="help-eyebrow">
            <HelpCircle size={14} />
            <span>Support Center</span>
          </div>

          <h1>Help &amp; Support</h1>

          <p>
            Get help with payments, billing, subscriptions, invoices and
            anything else related to your BillSphere account.
          </p>
        </div>

        <button
          type="button"
          className="raise-ticket-button"
          onClick={() => {
            setSubmittedTicket(null);
            setShowTicketForm(true);
          }}
        >
          <Plus size={16} />
          Raise a Ticket
        </button>
      </section>

      {/* =====================================================
          SUPPORT QUICK CARDS
      ===================================================== */}

      <section className="support-quick-grid">
        <button
          type="button"
          className="support-quick-card"
          onClick={() => setShowTicketForm(true)}
        >
          <div className="quick-icon gold">
            <Ticket size={19} />
          </div>

          <div>
            <h3>Raise a Ticket</h3>
            <p>Report a payment, billing or account issue.</p>
          </div>

          <ChevronRight size={17} className="quick-arrow" />
        </button>

        <a
          href="mailto:support@billsphere.com"
          className="support-quick-card"
        >
          <div className="quick-icon">
            <Mail size={19} />
          </div>

          <div>
            <h3>Email Support</h3>
            <p>Reach the BillSphere support team.</p>
          </div>

          <ChevronRight size={17} className="quick-arrow" />
        </a>

        <div className="support-quick-card">
          <div className="quick-icon">
            <MessageCircle size={19} />
          </div>

          <div>
            <h3>Support Response</h3>
            <p>We will respond through your registered email.</p>
          </div>

          <ShieldCheck size={17} className="quick-arrow" />
        </div>
      </section>

      {/* =====================================================
          SUCCESS MESSAGE
      ===================================================== */}

      {submittedTicket && (
        <section className="ticket-success">
          <div className="success-icon">
            <CheckCircle2 size={20} />
          </div>

          <div className="success-content">
            <h3>Support ticket created successfully</h3>

            <p>
              Your ticket{" "}
              <strong>{submittedTicket.id}</strong> has been created.
              BillSphere support can review it and respond to your registered
              email.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSubmittedTicket(null)}
            aria-label="Close success message"
          >
            <X size={16} />
          </button>
        </section>
      )}

      {/* =====================================================
          TICKET FORM
      ===================================================== */}

      {showTicketForm && (
        <section className="ticket-form-section">
          <div className="section-heading">
            <div>
              <span className="section-label">Support Request</span>
              <h2>Raise a Support Ticket</h2>
              <p>
                Tell us what happened and our support team can investigate the
                issue.
              </p>
            </div>

            <button
              type="button"
              className="close-form-button"
              onClick={() => {
                resetTicketForm();
                setShowTicketForm(false);
              }}
            >
              <X size={17} />
            </button>
          </div>

          <form onSubmit={handleTicketSubmit}>
            <div className="form-grid">
              {/* SUBJECT */}

              <div className="form-field full">
                <label htmlFor="support-subject">
                  Subject <span>*</span>
                </label>

                <input
                  id="support-subject"
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Briefly describe your issue"
                  required
                />
              </div>

              {/* CATEGORY */}

              <div className="form-field">
                <label htmlFor="support-category">Category</label>

                <div className="select-wrapper">
                  <select
                    id="support-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>

                  <ChevronDown size={15} />
                </div>
              </div>

              {/* PRIORITY */}

              <div className="form-field">
                <label htmlFor="support-priority">Priority</label>

                <div className="select-wrapper">
                  <select
                    id="support-priority"
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                  >
                    {PRIORITIES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>

                  <ChevronDown size={15} />
                </div>
              </div>

              {/* EMAIL */}

              <div className="form-field full">
                <label htmlFor="support-email">Registered Email</label>

                <div className="input-with-icon">
                  <Mail size={15} />

                  <input
                    id="support-email"
                    type="email"
                    value="Customer registered email"
                    readOnly
                  />
                </div>

                <small>
                  Support replies will be sent to the email associated with
                  your BillSphere account.
                </small>
              </div>

              {/* DESCRIPTION */}

              <div className="form-field full">
                <label htmlFor="support-description">
                  Describe the issue <span>*</span>
                </label>

                <textarea
                  id="support-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Explain what happened, what you expected, and any relevant invoice or payment details..."
                  rows={7}
                  required
                />

                <small>
                  Do not include passwords, OTPs, card numbers or other
                  sensitive credentials.
                </small>
              </div>

              {/* ATTACHMENT */}

              <div className="form-field full">
                <label>Attachment</label>

                <label className="attachment-box">
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf,.txt"
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      setAttachmentName(file ? file.name : "");
                    }}
                  />

                  <Paperclip size={17} />

                  <div>
                    <strong>
                      {attachmentName || "Attach a screenshot or document"}
                    </strong>

                    <span>
                      PNG, JPG, PDF or TXT · Optional
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-footer">
              <p>
                <ShieldCheck size={14} />
                Your support request is associated with your BillSphere
                account.
              </p>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    resetTicketForm();
                    setShowTicketForm(false);
                  }}
                >
                  Cancel
                </button>

                <button type="submit" className="submit-ticket-button">
                  <Send size={15} />
                  Submit Ticket
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      {/* =====================================================
          MY SUPPORT TICKETS
      ===================================================== */}

      <section className="tickets-section">
        <div className="section-heading">
          <div>
            <span className="section-label">Support History</span>
            <h2>My Support Tickets</h2>
            <p>
              Track your previous support requests and their current status.
            </p>
          </div>
        </div>

        <div className="ticket-toolbar">
          <div className="ticket-search">
            <Search size={15} />

            <input
              type="text"
              value={ticketSearch}
              onChange={(event) => setTicketSearch(event.target.value)}
              placeholder="Search tickets..."
            />

            {ticketSearch && (
              <button
                type="button"
                onClick={() => setTicketSearch("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="ticket-filter">
            <Filter size={14} />

            <select
              value={ticketFilter}
              onChange={(event) => setTicketFilter(event.target.value)}
            >
              <option value="All">All Tickets</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            <ChevronDown size={13} />
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="empty-tickets">
            <div className="empty-ticket-icon">
              <Ticket size={22} />
            </div>

            <h3>No support tickets</h3>

            <p>
              You haven't raised any support tickets yet. If you need help,
              create a ticket and we'll take it from there.
            </p>

            <button
              type="button"
              onClick={() => setShowTicketForm(true)}
            >
              <Plus size={14} />
              Raise Your First Ticket
            </button>
          </div>
        ) : (
          <div className="tickets-table">
            <div className="tickets-table-header">
              <span>Ticket</span>
              <span>Category</span>
              <span>Priority</span>
              <span>Status</span>
              <span>Created</span>
              <span>Updated</span>
              <span />
            </div>

            {filteredTickets.map((ticket) => (
              <div className="ticket-row" key={ticket.id}>
                <div className="ticket-main">
                  <div className="ticket-symbol">
                    <Ticket size={15} />
                  </div>

                  <div>
                    <strong>{ticket.id}</strong>
                    <p>{ticket.subject}</p>
                  </div>
                </div>

                <div className="ticket-category">
                  {ticket.category}
                </div>

                <div>
                  <PriorityBadge priority={ticket.priority} />
                </div>

                <div>
                  <TicketStatus status={ticket.status} />
                </div>

                <div className="ticket-date">
                  {formatDate(ticket.createdAt)}
                </div>

                <div className="ticket-date">
                  {formatDate(ticket.updatedAt)}
                </div>

                <button
                  type="button"
                  className="ticket-view-button"
                  title="View ticket"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          FAQ
      ===================================================== */}

      <section className="faq-section">
        <div className="section-heading">
          <div>
            <span className="section-label">Quick Help</span>
            <h2>Frequently Asked Questions</h2>
            <p>
              Find quick answers before raising a support ticket.
            </p>
          </div>
        </div>

        <div className="faq-list">
          {FAQS.map((faq, index) => {
            const isOpen = expandedFaq === index;

            return (
              <div
                className={`faq-item ${isOpen ? "open" : ""}`}
                key={faq.question}
              >
                <button
                  type="button"
                  className="faq-question"
                  onClick={() =>
                    setExpandedFaq(isOpen ? null : index)
                  }
                >
                  <span>
                    <HelpCircle size={16} />
                    {faq.question}
                  </span>

                  <ChevronDown
                    size={16}
                    className="faq-chevron"
                  />
                </button>

                {isOpen && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================
          SUPPORT FOOTER
      ===================================================== */}

      <section className="support-footer">
        <div className="support-footer-icon">
          <Clock3 size={18} />
        </div>

        <div>
          <h3>Need more help?</h3>

          <p>
            Raise a support ticket or contact BillSphere support at{" "}
            <a href="mailto:support@billsphere.com">
              support@billsphere.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

/* =========================================================
   PRIORITY BADGE
========================================================= */

function PriorityBadge({
  priority,
}: {
  priority: string;
}) {
  const normalized = priority.toLowerCase();

  let className = "priority-medium";

  if (normalized === "low") {
    className = "priority-low";
  }

  if (normalized === "high") {
    className = "priority-high";
  }

  if (normalized === "urgent") {
    className = "priority-urgent";
  }

  return (
    <span className={`priority-badge ${className}`}>
      {priority}
    </span>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function TicketStatus({
  status,
}: {
  status: SupportTicket["status"];
}) {
  const normalized = status.toLowerCase().replace(" ", "-");

  return (
    <span className={`ticket-status status-${normalized}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

export default HelpSupport;