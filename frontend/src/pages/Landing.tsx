import {
  ArrowRight,
  Sparkles,
  Play,
  Brain,
  CreditCard,
  ChartNoAxesCombined,
  CalendarDays,
  FileText,
  Users,
  Check,
  CalendarClock,
} from "lucide-react";

import { Link } from "react-router-dom";


const features = [
  {
    icon: <Brain size={26}/>,
    title: "AI Subscription Intelligence",
    desc: "Analyze spending, detect unused subscriptions and find smart saving opportunities.",
    big: true,
  },
  {
    icon: <CreditCard size={26}/>,
    title: "Automated Billing",
    desc: "Manage recurring payments, invoices and renewals automatically.",
  },
  {
    icon: <ChartNoAxesCombined size={26}/>,
    title: "Smart Analytics",
    desc: "Visualize subscription expenses and understand your money flow.",
  },
  {
    icon: <CalendarDays size={26}/>,
    title: "Renewal Prediction",
    desc: "Get intelligent reminders before subscriptions renew.",
  },
  {
    icon: <FileText size={26}/>,
    title: "Invoice Management",
    desc: "Create, track and organize all billing documents.",
  },
  {
    icon: <Users size={26}/>,
    title: "Unified Dashboard",
    desc: "Control all subscriptions from one powerful platform.",
    big: true,
  },
];


const plans = [
  { name:"Free", price:"₹0", desc:"Basic subscription tracking" },
  { name:"Starter", price:"₹499", desc:"For individuals" },
  { name:"Professional", price:"₹1499", desc:"AI powered insights", popular:true },
  { name:"Enterprise", price:"Custom", desc:"For businesses" },
];


const chartBars = [30, 45, 38, 55, 48, 62, 58, 72, 65, 80, 74, 90];


function handleCardMove(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  e.currentTarget.style.setProperty("--mx", `${x}%`);
  e.currentTarget.style.setProperty("--my", `${y}%`);
}


function Landing(){

return (

<div className="relative min-h-screen overflow-hidden bg-[#050503] text-[#f7f2e2]">


<div className="spotlight" />


{/* NAVBAR */}
<nav className="relative z-20 mx-auto mt-6 flex max-w-7xl w-[92%] items-center justify-between">

  <div className="flex items-center gap-2 text-lg font-bold">
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#8fae4a]/40 text-sm">
      BS
    </div>
    BillSphere
  </div>

  <div className="hidden md:flex items-center gap-8 text-sm text-[#cfc9b4]">
    <a href="#features" className="hover:text-[#e8d9a0] transition">Product</a>
    <a href="#pricing" className="hover:text-[#e8d9a0] transition">Pricing</a>
    <a href="#" className="hover:text-[#e8d9a0] transition">Customers</a>
    <a href="#" className="hover:text-[#e8d9a0] transition">Docs</a>
  </div>

  <div className="flex items-center gap-3">
    <Link to="/login" className="text-sm text-[#cfc9b4] hover:text-[#e8d9a0] transition">
      Log in
    </Link>
    <Link to="/register" className="btn-primary text-sm px-5 py-2">
      Get started
    </Link>
  </div>

</nav>


{/* HERO — split: left copy, right bento grid */}
<section className="relative z-10 mx-auto mt-16 max-w-7xl px-6 grid gap-12 lg:grid-cols-2 lg:items-center">

  {/* LEFT COLUMN */}
  <div>

    <div className="inline-flex items-center gap-2 rounded-full border border-[#8fae4a]/35 bg-[#8fae4a]/10 px-4 py-1.5 text-xs font-semibold text-[#e8d9a0]">
      <span className="live-dot" />
      LIVE — Monitoring 10,482 subscriptions
    </div>

    <h1 className="mt-8 text-5xl sm:text-6xl font-black leading-[1.05]">
      See every subscription
      <br/>
      your company
      <br/>
      <span className="gold-text">pays for.</span>
    </h1>

    <p className="mt-7 max-w-md text-lg leading-8 text-[#a6a290]">
      Connect your finance stack once. BillSphere discovers every recurring charge,
      predicts renewals, and finds wasteful spend before it hits the card.
    </p>

    <div className="mt-9 flex flex-wrap gap-4">
      <Link to="/register" className="btn-primary">
        <CalendarClock size={18}/>
        Book a 20-minute demo
      </Link>
      <Link to="/demo-dashboard" className="btn-ghost">
    <Play size={16}/>
    Explore Dashboard
</Link>
    </div>

    <div className="mt-10 flex items-center gap-4">
      <div className="avatar-stack flex">
        <div className="avatar-fallback">AK</div>
        <div className="avatar-fallback">RS</div>
        <div className="avatar-fallback">MP</div>
      </div>
      <div className="text-sm text-[#a6a290]">
        Trusted by finance & ops teams worldwide.
        <br/>
        3,950+ renewals caught before auto-charge.
      </div>
    </div>

    <div className="divider-glow mt-8" />

    <div className="mt-5 flex flex-wrap gap-6 text-xs text-[#a6a290]">
      <span>Bank-grade security · SOC2 in progress</span>
      <span>Works with Stripe, NetSuite, Gmail, Okta and more</span>
    </div>

  </div>


  {/* RIGHT COLUMN — BENTO GRID */}
  <div className="grid grid-cols-2 gap-5">

    {/* GRADIENT BLOB HERO CARD */}
    <div className="blob-card col-span-2 p-8 h-56 flex flex-col justify-center">
      <p className="relative text-2xl font-black text-black leading-tight">
        AUTOMATE
        <br/>
        BILLING
        <br/>
        AT SCALE
      </p>
    </div>

    {/* VISUAL / PRODUCT CARD */}
    <div
      onMouseMove={handleCardMove}
      className="bento-card rounded-[24px] p-6 h-64 flex flex-col justify-end"
    >
      <div className="text-[#e8d9a0]">
        <Sparkles size={22}/>
      </div>
      <p className="mt-4 font-bold">AI Insight Engine</p>
      <p className="mt-1 text-xs text-[#a6a290]">
        Predicts renewals before they hit your card.
      </p>
    </div>

    {/* GROWTH CHART CARD */}
    <div
      onMouseMove={handleCardMove}
      className="bento-card rounded-[24px] p-6 h-64 flex flex-col"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#a6a290]">GROWTH CURVE</span>
        <span className="text-[#8fae4a] font-bold">+15.4%</span>
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-xs text-[#a6a290]">Savings</span>
        <span className="text-lg font-black gold-text">₹5,842</span>
      </div>

      <div className="mt-auto flex items-end gap-1 h-20">
        {chartBars.map((h, i) => (
          <div key={i} className="chart-bar" style={{ height: `${h}%` }} />
        ))}
      </div>

      <p className="mt-4 text-sm font-bold">Optimize your financial growth.</p>
      <p className="mt-1 text-xs text-[#a6a290]">
        Understand where your money moves, and give finance a live strategy for higher returns.
      </p>
    </div>

    {/* BRAND / PLAY CARD */}
    <div className="bento-card col-span-2 rounded-[24px] p-6 flex items-center justify-between">

      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#f7f2e2] to-[#5a6b28] text-black">
          <Play size={16} fill="black"/>
        </div>
        <div>
          <p className="font-bold">BillSphere</p>
          <p className="text-xs text-[#a6a290] max-w-[220px]">
            Make your billing move like a system, not a spreadsheet.
          </p>
        </div>
      </div>

      <div className="hidden sm:flex gap-2 text-xs">
        <span className="rounded-full border border-[#8fae4a]/30 px-3 py-1 text-[#a6a290]">Finance</span>
        <span className="rounded-full border border-[#8fae4a]/30 px-3 py-1 text-[#a6a290]">Insight</span>
        <span className="rounded-full bg-[#8fae4a]/20 px-3 py-1 text-[#e8d9a0]">Analytics</span>
        <span className="rounded-full border border-[#8fae4a]/30 px-3 py-1 text-[#a6a290]">Growth</span>
      </div>

    </div>

  </div>

</section>


{/* FEATURES — BENTO GRID */}
<section id="features" className="relative z-10 mx-auto mt-28 max-w-6xl px-6">

  <div className="text-center">
    <span className="inline-flex items-center gap-2 rounded-full border border-[#8fae4a]/30 bg-[#8fae4a]/10 px-5 py-2 text-sm font-semibold text-[#e8d9a0]">
      <Sparkles size={16}/>
      Capabilities
    </span>
    <h2 className="mt-6 text-4xl font-black">Everything You Need</h2>
  </div>

  <div className="mt-12 grid gap-6 md:grid-cols-3">
    {features.map((feature) => (
      <div
        key={feature.title}
        onMouseMove={handleCardMove}
        className={`bento-card rounded-[32px] p-8 ${feature.big ? "md:col-span-2" : ""}`}
      >
        <div className="text-[#e8d9a0]">{feature.icon}</div>
        <h3 className="mt-6 text-xl font-bold">{feature.title}</h3>
        <p className="mt-3 text-[#a6a290]">{feature.desc}</p>
      </div>
    ))}
  </div>

</section>


{/* PRICING */}
<section id="pricing" className="relative z-10 mx-auto mt-28 max-w-6xl px-6">

  <div className="text-center">
    <h2 className="text-4xl font-black">Premium Plans</h2>
    <p className="mt-4 text-[#a6a290]">Choose the tier that fits how you scale.</p>
  </div>

  <div className="mt-12 grid gap-7 md:grid-cols-4">
    {plans.map((plan) => (
      <div
        key={plan.name}
        onMouseMove={handleCardMove}
        className={`bento-card relative overflow-hidden rounded-[32px] p-8 ${
          plan.popular ? "border-[#d4af37]/60 shadow-[0_0_70px_rgba(184,137,90,.3)]" : ""
        }`}
      >
        {plan.popular && <div className="ribbon">Popular</div>}

        <h3 className="text-xl font-bold">{plan.name}</h3>
        <h2 className="mt-5 text-4xl font-black gold-text">{plan.price}</h2>
        <p className="mt-3 text-[#a6a290]">{plan.desc}</p>

        <div className="divider-glow my-6" />

        <ul className="space-y-2 text-sm text-[#cfc9b4]">
          <li className="flex items-center gap-2"><Check size={14} className="text-[#8fae4a]"/> Core billing tools</li>
          <li className="flex items-center gap-2"><Check size={14} className="text-[#8fae4a]"/> Email support</li>
        </ul>
      </div>
    ))}
  </div>

</section>


{/* CTA BANNER */}
<section className="relative z-10 mx-auto mt-28 max-w-5xl px-6 pb-24">
  <div className="panel relative overflow-hidden rounded-[45px] px-10 py-16 text-center">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(184,137,90,0.22),transparent_65%)]" />
    <div className="relative">
      <h2 className="text-4xl font-black">
        Ready For A <span className="gold-text">Luxury Billing Experience?</span>
      </h2>
      <p className="mx-auto mt-5 max-w-xl text-[#a6a290]">
        Join thousands of businesses managing subscriptions the premium way.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">

  <Link
    to="/register"
    className="btn-primary inline-flex items-center"
  >
    Start Free Trial
    <ArrowRight size={18} className="ml-2" />
  </Link>

  <Link
    to="/login"
    className="inline-flex items-center rounded-full border border-white/20 px-6 py-3 text-white transition hover:border-[#d4af37] hover:bg-white/5"
  >
    Login
  </Link>

</div>
    </div>
  </div>
</section>


</div>

)

}


export default Landing;