import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CalendarClock,
  Check,
  ChevronDown,
  CircleCheck,
  CreditCard,
  FileText,
  Layers3,
  Menu,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";

import { Link } from "react-router-dom";
import { useState } from "react";

const features = [
  {
    icon: Brain,
    title: "AI Subscription Intelligence",
    description:
      "Understand recurring spending, identify unusual costs, and surface opportunities to optimize your subscriptions.",
    large: true,
  },
  {
    icon: CreditCard,
    title: "Automated Billing",
    description:
      "Handle recurring charges, payments, billing cycles, and renewals from one system.",
  },
  {
    icon: BarChart3,
    title: "Smart Analytics",
    description:
      "See revenue, subscription activity, payment performance, and billing trends clearly.",
  },
  {
    icon: CalendarClock,
    title: "Renewal Management",
    description:
      "Track upcoming billing dates and subscription lifecycle events before they become a problem.",
  },
  {
    icon: FileText,
    title: "Invoice Automation",
    description:
      "Create and manage professional invoices throughout the customer billing lifecycle.",
  },
  {
    icon: Layers3,
    title: "One Unified Platform",
    description:
      "Customers, plans, subscriptions, invoices, and payments in one connected workspace.",
    large: true,
  },
];

const pricingPlans = [
  {
    name: "Basic",
    price: "₹499",
    period: "/month",
    description: "A simple starting point for subscription billing.",
    features: [
      "Core billing tools",
      "Subscription management",
      "Customer management",
      "Invoice management",
      "Email support",
    ],
  },
  {
    name: "Standard",
    price: "₹1,499",
    period: "/month",
    description: "For growing teams that need more control.",
    features: [
      "Everything in Basic",
      "Advanced billing workflows",
      "Payment tracking",
      "Billing analytics",
      "Priority support",
    ],
  },
  {
    name: "Premium",
    price: "₹4,999",
    period: "/month",
    description: "The complete billing experience for scaling businesses.",
    popular: true,
    features: [
      "Everything in Standard",
      "AI-powered insights",
      "Advanced analytics",
      "Automated payment recovery",
      "Premium support",
    ],
  },
];

const faqs = [
  {
    question: "What is BillSphere?",
    answer:
      "BillSphere is a SaaS billing platform designed to help businesses manage customers, plans, subscriptions, invoices, payments, renewals, and billing analytics from one place.",
  },
  {
    question: "Can I manage recurring subscriptions?",
    answer:
      "Yes. BillSphere is built around subscription lifecycle management, including billing cycles, renewals, activation, cancellation, pausing, and payment-related workflows.",
  },
  {
    question: "Does BillSphere generate invoices?",
    answer:
      "Yes. BillSphere includes invoice management as part of its billing workflow, allowing businesses to create and track invoices associated with subscriptions and payments.",
  },
  {
    question: "Can I track failed payments?",
    answer:
      "Yes. Payment tracking and recovery workflows are part of the platform, helping businesses monitor unsuccessful payments and their subsequent billing activity.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Trial availability can depend on the plan configuration. You can create an account and explore the available subscription options from the platform.",
  },
];

function handleCardMove(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();

  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

  e.currentTarget.style.setProperty("--mx", `${x}%`);
  e.currentTarget.style.setProperty("--my", `${y}%`);
}

function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050503] text-[#f7f2e2]">

      {/* ============================================================
          BACKGROUND
      ============================================================ */}

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-[-20%] top-[-15%] h-[650px] w-[650px] rounded-full bg-[#8fae4a]/10 blur-[140px]" />
        <div className="absolute right-[-15%] top-[5%] h-[600px] w-[600px] rounded-full bg-[#b8895a]/10 blur-[150px]" />
        <div className="absolute bottom-[-15%] left-[30%] h-[600px] w-[600px] rounded-full bg-[#5a6b28]/10 blur-[160px]" />
      </div>

      {/* ============================================================
          NAVBAR
      ============================================================ */}

      <nav className="relative z-50 mx-auto flex w-[92%] max-w-7xl items-center justify-between py-6">

        <Link
          to="/"
          className="flex items-center gap-3"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4af37]/40 bg-white/[0.04] text-sm font-black text-[#e8d9a0] shadow-[0_0_30px_rgba(212,175,55,0.08)]">
            BS
          </div>

          <div>
            <div className="text-lg font-black tracking-tight">
              Bill<span className="text-[#d4af37]">Sphere</span>
            </div>

            <div className="hidden text-[9px] uppercase tracking-[0.28em] text-[#777365] sm:block">
              Intelligent Billing
            </div>
          </div>
        </Link>

        {/* Desktop navigation */}

        <div className="hidden items-center gap-9 md:flex">

          <a
            href="#product"
            className="text-sm text-[#a6a290] transition hover:text-[#f7f2e2]"
          >
            Product
          </a>

          <a
            href="#features"
            className="text-sm text-[#a6a290] transition hover:text-[#f7f2e2]"
          >
            Features
          </a>

          <a
            href="#pricing"
            className="text-sm text-[#a6a290] transition hover:text-[#f7f2e2]"
          >
            Pricing
          </a>

          <a
            href="#faq"
            className="text-sm text-[#a6a290] transition hover:text-[#f7f2e2]"
          >
            FAQ
          </a>

        </div>

        {/* Desktop actions */}

        <div className="hidden items-center gap-3 md:flex">

          {/* LOGIN */}

          <Link
            to="/login"
            className="rounded-full border border-white/10 bg-[#0c0c09] px-5 py-2.5 text-sm font-semibold text-[#f7f2e2] transition hover:border-[#d4af37]/30 hover:bg-[#15130d] hover:text-white"
          >
            Log in
          </Link>

          {/* GET STARTED */}

          <Link
            to="/register"
            className="group inline-flex items-center gap-2 rounded-full border border-[#d4af37]/60 bg-[#6f5720] px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_35px_rgba(212,175,55,0.15)] transition hover:-translate-y-0.5 hover:bg-[#8a6c28] hover:shadow-[0_0_45px_rgba(212,175,55,0.25)]"
          >
            Get started

            <ArrowRight
              size={15}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>

        </div>

        {/* Mobile menu button */}

        <button
          type="button"
          className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 md:hidden"
          onClick={() => setMobileMenuOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

      </nav>

      {/* Mobile navigation */}

      {mobileMenuOpen && (
        <div className="relative z-40 mx-auto w-[92%] max-w-7xl md:hidden">

          <div className="rounded-2xl border border-white/10 bg-[#0c0c09]/95 p-5 shadow-2xl backdrop-blur-xl">

            <div className="flex flex-col gap-2">

              <a
                href="#product"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm text-[#cfc9b4] hover:bg-white/[0.05]"
              >
                Product
              </a>

              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm text-[#cfc9b4] hover:bg-white/[0.05]"
              >
                Features
              </a>

              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm text-[#cfc9b4] hover:bg-white/[0.05]"
              >
                Pricing
              </a>

              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm text-[#cfc9b4] hover:bg-white/[0.05]"
              >
                FAQ
              </a>

              <div className="my-2 h-px bg-white/10" />

              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl border border-white/10 bg-[#0c0c09] px-4 py-3 text-sm font-semibold text-[#f7f2e2]"
              >
                Log in
              </Link>

              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl border border-[#d4af37]/60 bg-[#6f5720] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#8a6c28]"
              >
                Get started
              </Link>

            </div>

          </div>

        </div>
      )}

      {/* ============================================================
          HERO
      ============================================================ */}

      <main className="relative z-10">

        <section
          id="product"
          className="mx-auto grid w-[92%] max-w-7xl items-center gap-16 pb-24 pt-20 lg:grid-cols-[0.9fr_1.1fr] lg:pt-28"
        >

          {/* Hero copy */}

          <div>

            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/[0.06] px-4 py-2 text-xs font-semibold text-[#e8d9a0]">

              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8fae4a] opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8fae4a]" />
              </span>

              Intelligent billing infrastructure

            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl xl:text-[78px]">

              Billing that

              <br />

              <span className="bg-gradient-to-r from-[#f7f2e2] via-[#e8d9a0] to-[#d4af37] bg-clip-text text-transparent">
                thinks ahead.
              </span>

            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-[#a6a290] sm:text-lg">
              BillSphere brings subscriptions, recurring billing, invoices,
              payments, renewals, and analytics together in one intelligent
              platform built for modern businesses.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">

              {/* START WITH BILLSPHERE */}

              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-[#d4af37]/60 bg-[#6f5720] px-7 py-3.5 text-sm font-bold text-white shadow-[0_0_50px_rgba(212,175,55,0.15)] transition hover:-translate-y-1 hover:bg-[#8a6c28] hover:shadow-[0_0_55px_rgba(212,175,55,0.25)]"
              >
                Start with BillSphere

                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              {/* EXPLORE DASHBOARD */}

              <Link
                to="/demo-dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#17130a] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(212,175,55,0.08)] backdrop-blur-xl transition hover:border-[#d4af37]/60 hover:bg-[#241c0d] hover:text-[#f7f2e2]"
              >
                <Play size={15} fill="currentColor" />

                Explore Dashboard
              </Link>

            </div>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-[#777365]">

              <span className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-[#8fae4a]" />
                Secure architecture
              </span>

              <span className="flex items-center gap-2">
                <Zap size={15} className="text-[#d4af37]" />
                Automated workflows
              </span>

              <span className="flex items-center gap-2">
                <CircleCheck size={15} className="text-[#8fae4a]" />
                Built for scale
              </span>

            </div>

          </div>

          {/* Hero dashboard */}

          <div
            id="product-preview"
            className="relative"
          >

            <div className="absolute -inset-10 rounded-full bg-[#b8895a]/10 blur-[100px]" />

            <div className="relative rounded-[30px] border border-white/10 bg-[#0b0b08]/90 p-2 shadow-[0_35px_100px_rgba(0,0,0,0.75)] backdrop-blur-2xl">

              <div className="rounded-[24px] border border-white/[0.07] bg-[#11110d] p-5 sm:p-6">

                {/* Dashboard header */}

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-[10px] uppercase tracking-[0.22em] text-[#777365]">
                      Billing overview
                    </p>

                    <h3 className="mt-2 text-lg font-bold">
                      Good morning, Admin
                    </h3>

                  </div>

                  <div className="hidden rounded-full border border-[#8fae4a]/20 bg-[#8fae4a]/[0.08] px-3 py-1.5 text-[10px] font-semibold text-[#aeca6b] sm:block">
                    LIVE
                  </div>

                </div>

                {/* Main metric */}

                <div className="mt-6 rounded-2xl border border-[#d4af37]/10 bg-gradient-to-br from-[#191811] to-[#0b0b08] p-5">

                  <div className="flex items-end justify-between">

                    <div>

                      <p className="text-xs text-[#777365]">
                        Recurring revenue
                      </p>

                      <p className="mt-2 text-3xl font-black tracking-tight">
                        ₹2,48,590
                      </p>

                      <p className="mt-2 text-xs text-[#8fae4a]">
                        +12.8% compared to last period
                      </p>

                    </div>

                    <div className="rounded-xl bg-[#d4af37]/10 p-3">

                      <BarChart3
                        size={22}
                        className="text-[#d4af37]"
                      />

                    </div>

                  </div>

                  {/* Fake analytics line */}

                  <div className="relative mt-7 h-24 overflow-hidden">

                    <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.05]" />

                    <svg
                      viewBox="0 0 600 120"
                      className="h-full w-full"
                      preserveAspectRatio="none"
                    >

                      <defs>

                        <linearGradient
                          id="billSphereChart"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#8fae4a" />
                          <stop offset="50%" stopColor="#d4af37" />
                          <stop offset="100%" stopColor="#e8d9a0" />
                        </linearGradient>

                      </defs>

                      <path
                        d="M0 100 C50 92 65 75 110 82 C150 88 170 55 210 64 C250 73 270 42 310 49 C350 56 365 66 405 42 C445 18 460 37 500 28 C540 18 555 12 600 4"
                        fill="none"
                        stroke="url(#billSphereChart)"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />

                    </svg>

                  </div>

                </div>

                {/* Mini cards */}

                <div className="mt-4 grid grid-cols-2 gap-4">

                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">

                    <div className="flex items-center justify-between">

                      <span className="text-[10px] uppercase tracking-wider text-[#777365]">
                        Active plans
                      </span>

                      <Layers3
                        size={15}
                        className="text-[#b8895a]"
                      />

                    </div>

                    <p className="mt-3 text-2xl font-black">
                      128
                    </p>

                    <p className="mt-1 text-[10px] text-[#8fae4a]">
                      +8 this month
                    </p>

                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">

                    <div className="flex items-center justify-between">

                      <span className="text-[10px] uppercase tracking-wider text-[#777365]">
                        Upcoming
                      </span>

                      <CalendarClock
                        size={15}
                        className="text-[#d4af37]"
                      />

                    </div>

                    <p className="mt-3 text-2xl font-black">
                      24
                    </p>

                    <p className="mt-1 text-[10px] text-[#a6a290]">
                      renewals this week
                    </p>

                  </div>

                </div>

                {/* Subscription activity */}

                <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">

                  <div className="mb-4 flex items-center justify-between">

                    <span className="text-xs font-semibold">
                      Recent billing activity
                    </span>

                    <span className="text-[10px] text-[#777365]">
                      View all
                    </span>

                  </div>

                  {[
                    ["Acme Technologies", "Premium", "₹4,999"],
                    ["Nova Labs", "Standard", "₹1,499"],
                    ["Vertex Studio", "Basic", "₹499"],
                  ].map(([company, plan, amount]) => (

                    <div
                      key={company}
                      className="flex items-center justify-between border-t border-white/[0.05] py-3 first:border-t-0"
                    >

                      <div className="flex items-center gap-3">

                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#e8d9a0] to-[#8fae4a] text-[9px] font-black text-[#090906]">
                          {company.slice(0, 2).toUpperCase()}
                        </div>

                        <div>

                          <p className="text-xs font-semibold">
                            {company}
                          </p>

                          <p className="text-[10px] text-[#777365]">
                            {plan} plan
                          </p>

                        </div>

                      </div>

                      <span className="text-xs font-bold text-[#e8d9a0]">
                        {amount}
                      </span>

                    </div>

                  ))}

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ============================================================
            LOGO / TRUST STRIP
        ============================================================ */}

        <section className="border-y border-white/[0.06] bg-white/[0.015]">

          <div className="mx-auto flex w-[92%] max-w-7xl flex-col items-center justify-between gap-6 py-8 md:flex-row">

            <p className="text-center text-xs uppercase tracking-[0.2em] text-[#666257] md:text-left">
              Built for teams that take billing seriously
            </p>

            <div className="flex flex-wrap justify-center gap-3">

              {[
                "Finance",
                "Operations",
                "SaaS",
                "Subscriptions",
                "Growth",
              ].map((item) => (

                <span
                  key={item}
                  className="rounded-full border border-white/[0.07] bg-white/[0.025] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#8c887a]"
                >
                  {item}
                </span>

              ))}

            </div>

          </div>

        </section>

        {/* ============================================================
            FEATURES
        ============================================================ */}

        <section
          id="features"
          className="mx-auto w-[92%] max-w-7xl py-28"
        >

          <div className="max-w-2xl">

            <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/[0.05] px-4 py-2 text-xs font-semibold text-[#e8d9a0]">
              <Sparkles size={14} />
              Everything connected
            </div>

            <h2 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
              Your entire billing
              <br />
              <span className="text-[#a6a290]">
                operation, in one place.
              </span>
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-[#777365]">
              Stop jumping between spreadsheets, payment records, invoices,
              and disconnected systems. BillSphere brings the complete billing
              lifecycle together.
            </p>

          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">

            {features.map((feature) => {

              const Icon = feature.icon;

              return (

                <div
                  key={feature.title}
                  onMouseMove={handleCardMove}
                  className={`group relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-gradient-to-br from-[#12120e] to-[#080806] p-7 shadow-[0_25px_70px_rgba(0,0,0,0.45)] transition duration-500 hover:-translate-y-1 hover:border-[#d4af37]/25 ${
                    feature.large ? "md:col-span-2" : ""
                  }`}
                >

                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(300px circle at var(--mx,50%) var(--my,50%), rgba(212,175,55,0.09), transparent 65%)",
                    }}
                  />

                  <div className="relative">

                    <div className="flex items-start justify-between">

                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d4af37]/15 bg-[#d4af37]/[0.06]">

                        <Icon
                          size={22}
                          className="text-[#e8d9a0]"
                        />

                      </div>

                      <ArrowUpRight
                        size={18}
                        className="text-[#4e4b43] transition group-hover:text-[#d4af37]"
                      />

                    </div>

                    <h3 className="mt-8 text-xl font-bold">
                      {feature.title}
                    </h3>

                    <p className="mt-3 max-w-xl text-sm leading-7 text-[#777365]">
                      {feature.description}
                    </p>

                  </div>

                </div>

              );

            })}

          </div>

        </section>

        {/* ============================================================
            PRODUCT SHOWCASE
        ============================================================ */}

        <section className="mx-auto w-[92%] max-w-7xl pb-28">

          <div className="relative overflow-hidden rounded-[36px] border border-white/[0.08] bg-[#0c0c09]">

            <div className="absolute right-[-15%] top-[-40%] h-[500px] w-[500px] rounded-full bg-[#b8895a]/10 blur-[120px]" />

            <div className="relative grid items-center gap-12 p-7 sm:p-10 lg:grid-cols-2 lg:p-14">

              <div>

                <div className="inline-flex items-center gap-2 rounded-full border border-[#8fae4a]/20 bg-[#8fae4a]/[0.05] px-4 py-2 text-xs font-semibold text-[#aeca6b]">
                  <BarChart3 size={14} />
                  Built around your billing data
                </div>

                <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">
                  See the whole picture.
                  <br />

                  <span className="text-[#8f8a7c]">
                    Make better decisions.
                  </span>
                </h2>

                <p className="mt-5 max-w-lg text-sm leading-7 text-[#777365]">
                  From subscription activity to payments and invoices,
                  BillSphere turns billing data into a clear operational
                  picture.
                </p>

                <div className="mt-8 space-y-4">

                  {[
                    "Centralized subscription lifecycle",
                    "Real-time payment visibility",
                    "Automated invoice workflows",
                    "Actionable billing analytics",
                  ].map((item) => (

                    <div
                      key={item}
                      className="flex items-center gap-3 text-sm text-[#cfc9b4]"
                    >

                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8fae4a]/10">

                        <Check
                          size={12}
                          className="text-[#aeca6b]"
                        />

                      </div>

                      {item}

                    </div>

                  ))}

                </div>

              </div>

              {/* Mini analytics UI */}

              <div className="rounded-[28px] border border-white/[0.07] bg-[#080806] p-5 shadow-2xl">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#666257]">
                      Subscription analytics
                    </p>

                    <p className="mt-2 text-xl font-black">
                      ₹86,420
                    </p>

                  </div>

                  <span className="rounded-full bg-[#8fae4a]/10 px-3 py-1 text-[10px] font-bold text-[#aeca6b]">
                    +18.4%
                  </span>

                </div>

                <div className="mt-8 flex h-36 items-end gap-2">

                  {[34, 47, 40, 58, 52, 68, 62, 77, 70, 88, 79, 96].map(
                    (height, index) => (

                      <div
                        key={index}
                        className="flex-1 rounded-t-md bg-gradient-to-t from-[#5a6b28] via-[#b8895a] to-[#e8d9a0] opacity-80 transition hover:opacity-100"
                        style={{ height: `${height}%` }}
                      />

                    )
                  )}

                </div>

                <div className="mt-5 flex justify-between text-[9px] uppercase tracking-wider text-[#555249]">
                  <span>Jan</span>
                  <span>Mar</span>
                  <span>May</span>
                  <span>Jul</span>
                  <span>Sep</span>
                  <span>Nov</span>
                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ============================================================
            HOW IT WORKS
        ============================================================ */}

        <section className="border-y border-white/[0.06] bg-white/[0.012]">

          <div className="mx-auto w-[92%] max-w-7xl py-28">

            <div className="text-center">

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-[#a6a290]">
                <Zap size={14} className="text-[#d4af37]" />
                Simple by design
              </div>

              <h2 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
                From setup to billing,
                <br />

                <span className="text-[#8f8a7c]">
                  without the chaos.
                </span>
              </h2>

            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-4">

              {[
                {
                  number: "01",
                  title: "Connect",
                  description:
                    "Set up your customers, plans, and billing configuration.",
                },
                {
                  number: "02",
                  title: "Configure",
                  description:
                    "Define subscription plans, billing cycles, and pricing.",
                },
                {
                  number: "03",
                  title: "Automate",
                  description:
                    "Let BillSphere handle recurring billing and invoice workflows.",
                },
                {
                  number: "04",
                  title: "Optimize",
                  description:
                    "Use analytics and insights to make smarter billing decisions.",
                },
              ].map((step) => (

                <div
                  key={step.number}
                  className="relative rounded-[26px] border border-white/[0.07] bg-[#0b0b08] p-7"
                >

                  <span className="text-xs font-black tracking-[0.2em] text-[#d4af37]">
                    {step.number}
                  </span>

                  <h3 className="mt-6 text-xl font-bold">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#777365]">
                    {step.description}
                  </p>

                </div>

              ))}

            </div>

          </div>

        </section>

        {/* ============================================================
            PRICING
        ============================================================ */}

        <section
          id="pricing"
          className="mx-auto w-[92%] max-w-7xl py-28"
        >

          <div className="mx-auto max-w-2xl text-center">

            <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/[0.05] px-4 py-2 text-xs font-semibold text-[#e8d9a0]">
              <CreditCard size={14} />
              Simple pricing
            </div>

            <h2 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl">
              Choose your level
              <br />

              <span className="text-[#858073]">
                of billing intelligence.
              </span>
            </h2>

            <p className="mt-5 text-sm leading-7 text-[#777365]">
              Start with the essentials and move up as your billing operation
              grows.
            </p>

          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">

            {pricingPlans.map((plan) => (

              <div
                key={plan.name}
                className={`relative flex flex-col overflow-hidden rounded-[30px] border p-7 ${
                  plan.popular
                    ? "border-[#d4af37]/45 bg-gradient-to-b from-[#19170f] to-[#0b0b08] shadow-[0_30px_90px_rgba(184,137,90,0.12)]"
                    : "border-white/[0.07] bg-[#0d0d09]"
                }`}
              >

                {plan.popular && (

                  <div className="absolute right-5 top-5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#e8d9a0]">
                    Most popular
                  </div>

                )}

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035]">

                  {plan.popular ? (
                    <Sparkles
                      size={20}
                      className="text-[#d4af37]"
                    />
                  ) : (
                    <CreditCard
                      size={20}
                      className="text-[#a6a290]"
                    />
                  )}

                </div>

                <h3 className="mt-7 text-xl font-bold">
                  {plan.name}
                </h3>

                <p className="mt-2 min-h-[48px] text-sm leading-6 text-[#777365]">
                  {plan.description}
                </p>

                <div className="mt-7 flex items-end gap-1">

                  <span className="text-4xl font-black tracking-tight">
                    {plan.price}
                  </span>

                  <span className="pb-1 text-xs text-[#777365]">
                    {plan.period}
                  </span>

                </div>

                <div className="my-7 h-px bg-white/[0.07]" />

                <div className="space-y-4">

                  {plan.features.map((feature) => (

                    <div
                      key={feature}
                      className="flex items-start gap-3 text-sm text-[#cfc9b4]"
                    >

                      <Check
                        size={16}
                        className="mt-0.5 shrink-0 text-[#8fae4a]"
                      />

                      <span>{feature}</span>

                    </div>

                  ))}

                </div>

                <Link
                  to="/register"
                  className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition ${
                    plan.popular
                      ? "border border-[#d4af37]/60 bg-[#6f5720] text-white hover:bg-[#8a6c28]"
                      : "border border-white/10 bg-[#15130d] text-[#f7f2e2] hover:border-[#d4af37]/40 hover:bg-[#241c0d]"
                  }`}
                >
                  Get started
                  <ArrowRight size={15} />
                </Link>

              </div>

            ))}

          </div>

        </section>

        {/* ============================================================
            FAQ
        ============================================================ */}

        <section
          id="faq"
          className="mx-auto w-[92%] max-w-4xl py-20"
        >

          <div className="text-center">

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-[#a6a290]">
              Questions, answered
            </div>

            <h2 className="mt-6 text-4xl font-black tracking-tight">
              Frequently asked
            </h2>

          </div>

          <div className="mt-12 overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#0b0b08]">

            {faqs.map((faq, index) => {

              const isOpen = openFaq === index;

              return (

                <div
                  key={faq.question}
                  className="border-b border-white/[0.06] last:border-b-0"
                >

                  <button
                    type="button"
                    onClick={() =>
                      setOpenFaq(isOpen ? null : index)
                    }
                    className="flex w-full items-center justify-between gap-6 px-6 py-6 text-left transition hover:bg-white/[0.02] sm:px-8"
                  >

                    <span className="text-sm font-semibold text-[#e5dfcf] sm:text-base">
                      {faq.question}
                    </span>

                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-[#777365] transition-transform duration-300 ${
                        isOpen
                          ? "rotate-180 text-[#d4af37]"
                          : ""
                      }`}
                    />

                  </button>

                  <div
                    className={`grid transition-all duration-300 ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >

                    <div className="overflow-hidden">

                      <p className="px-6 pb-6 text-sm leading-7 text-[#777365] sm:px-8">
                        {faq.answer}
                      </p>

                    </div>

                  </div>

                </div>

              );

            })}

          </div>

        </section>

        {/* ============================================================
            FINAL CTA
        ============================================================ */}

        <section className="mx-auto w-[92%] max-w-6xl py-28">

          <div className="relative overflow-hidden rounded-[40px] border border-[#d4af37]/20 bg-gradient-to-br from-[#17150d] via-[#0d0d09] to-[#11120b] px-6 py-16 text-center sm:px-12">

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d4af37]/10 blur-[100px]" />

            <div className="relative">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/10">

                <Sparkles
                  size={25}
                  className="text-[#e8d9a0]"
                />

              </div>

              <h2 className="mx-auto mt-7 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">

                Make billing feel

                <br />

                <span className="bg-gradient-to-r from-[#f7f2e2] via-[#e8d9a0] to-[#d4af37] bg-clip-text text-transparent">
                  effortless.
                </span>

              </h2>

              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#777365] sm:text-base">
                Bring your billing operation into one intelligent workspace
                and build a system that scales with your business.
              </p>

              <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">

                {/* CTA START */}

                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center gap-2 rounded-full border border-[#d4af37]/60 bg-[#6f5720] px-7 py-3.5 text-sm font-bold text-white shadow-[0_0_40px_rgba(212,175,55,0.12)] transition hover:-translate-y-1 hover:bg-[#8a6c28]"
                >
                  Start with BillSphere

                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-1"
                  />

                </Link>

                {/* CTA LOGIN */}

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-[#0c0c09] px-7 py-3.5 text-sm font-semibold text-white transition hover:border-[#d4af37]/40 hover:bg-[#17130a]"
                >
                  Log in
                </Link>

              </div>

            </div>

          </div>

        </section>

      </main>

      {/* ============================================================
          FOOTER
      ============================================================ */}

      <footer className="border-t border-white/[0.06]">

        <div className="mx-auto flex w-[92%] max-w-7xl flex-col gap-8 py-10 sm:flex-row sm:items-center sm:justify-between">

          <Link
            to="/"
            className="flex items-center gap-3"
          >

            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d4af37]/30 text-xs font-black text-[#e8d9a0]">
              BS
            </div>

            <div>

              <p className="text-sm font-bold">
                Bill<span className="text-[#d4af37]">Sphere</span>
              </p>

              <p className="text-[9px] uppercase tracking-[0.2em] text-[#555249]">
                Intelligent Billing
              </p>

            </div>

          </Link>

          <div className="flex flex-wrap gap-6 text-xs text-[#666257]">

            <a
              href="#product"
              className="transition hover:text-[#d8d3c3]"
            >
              Product
            </a>

            <a
              href="#features"
              className="transition hover:text-[#d8d3c3]"
            >
              Features
            </a>

            <a
              href="#pricing"
              className="transition hover:text-[#d8d3c3]"
            >
              Pricing
            </a>

            <a
              href="#faq"
              className="transition hover:text-[#d8d3c3]"
            >
              FAQ
            </a>

          </div>

          <p className="text-xs text-[#555249]">
            © {new Date().getFullYear()} BillSphere. All rights reserved.
          </p>

        </div>

      </footer>

    </div>
  );
}

export default Landing;