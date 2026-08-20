import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  Gauge,
  Users,
  Zap,
} from "lucide-react";

import "./Usage.css";

type UsageStatus = "Healthy" | "Moderate" | "Near Limit";

interface UsageMetric {
  id: string;
  title: string;
  icon: React.ReactNode;
  used: number;
  limit: number;
  unit?: string;
  status: UsageStatus;
}

interface DailyUsage {
  day: string;
  usage: number;
}

interface ActivityMetric {
  label: string;
  value: number;
  previous: number;
}

const usageMetrics: UsageMetric[] = [
  {
    id: "customers",
    title: "Customers",
    icon: <Users size={19} />,
    used: 342,
    limit: 500,
    status: "Healthy",
  },
  {
    id: "invoices",
    title: "Invoices",
    icon: <FileText size={19} />,
    used: 724,
    limit: 1000,
    status: "Moderate",
  },
  {
    id: "payments",
    title: "Payments",
    icon: <CreditCard size={19} />,
    used: 418,
    limit: 500,
    status: "Near Limit",
  },
  {
    id: "api",
    title: "API Requests",
    icon: <Zap size={19} />,
    used: 8420,
    limit: 10000,
    status: "Near Limit",
  },
];

const dailyUsage: DailyUsage[] = [
  { day: "Aug 1", usage: 18 },
  { day: "Aug 3", usage: 22 },
  { day: "Aug 5", usage: 27 },
  { day: "Aug 7", usage: 31 },
  { day: "Aug 9", usage: 35 },
  { day: "Aug 11", usage: 39 },
  { day: "Aug 13", usage: 44 },
  { day: "Aug 15", usage: 51 },
  { day: "Aug 17", usage: 58 },
  { day: "Aug 19", usage: 68 },
  { day: "Aug 20", usage: 72 },
];

const activityMetrics: ActivityMetric[] = [
  {
    label: "Customers Created",
    value: 42,
    previous: 31,
  },
  {
    label: "Invoices Generated",
    value: 87,
    previous: 69,
  },
  {
    label: "Payments Processed",
    value: 64,
    previous: 48,
  },
  {
    label: "API Requests",
    value: 1260,
    previous: 980,
  },
];

const periodOptions = [
  "Current Billing Period",
  "Last Billing Period",
  "This Year",
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function getPercentage(
  used: number,
  limit: number
) {
  if (!limit) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((used / limit) * 100)
  );
}

function getRemaining(
  used: number,
  limit: number
) {
  return Math.max(0, limit - used);
}

function getStatusClass(status: UsageStatus) {
  if (status === "Healthy") {
    return "usage-status healthy";
  }

  if (status === "Moderate") {
    return "usage-status moderate";
  }

  return "usage-status near-limit";
}

function Usage() {
  const [period, setPeriod] = useState(
    "Current Billing Period"
  );

  const overallUsage = useMemo(() => {
    const totalUsed = usageMetrics.reduce(
      (sum, metric) => sum + metric.used / metric.limit,
      0
    );

    return Math.round(
      (totalUsed / usageMetrics.length) * 100
    );
  }, []);

  const averageUsage = Math.round(
    dailyUsage.reduce(
      (sum, point) => sum + point.usage,
      0
    ) / dailyUsage.length
  );

  const peakUsage = Math.max(
    ...dailyUsage.map((point) => point.usage)
  );

  return (
    <div className="usage-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="usage-header">

        <div>

          <div className="usage-eyebrow">
            <Gauge size={14} />
            Usage & Consumption
          </div>

          <h1>
            Usage Overview
          </h1>

          <p>
            Track your current plan usage, resource consumption,
            limits and billing activity in one place.
          </p>

        </div>

        <div className="usage-period">

          <div className="period-label">
            <CalendarDays size={14} />
            <span>Billing Period</span>
          </div>

          <div className="period-select-wrapper">

            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value)
              }
            >
              {periodOptions.map((option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option}
                </option>
              ))}
            </select>

            <ChevronDown size={14} />

          </div>

          <span className="period-date">
            Aug 01, 2026 — Aug 31, 2026
          </span>

        </div>

      </section>


      {/* =====================================================
          TOP SUMMARY
      ===================================================== */}

      <section className="usage-summary-grid">

        <OverallUsageCard
          percentage={overallUsage}
        />

        {usageMetrics.slice(0, 3).map((metric) => (
          <UsageSummaryCard
            key={metric.id}
            metric={metric}
          />
        ))}

      </section>


      {/* =====================================================
          MAIN USAGE GRAPH
      ===================================================== */}

      <section className="usage-card usage-overview-card">

        <div className="usage-card-header">

          <div>

            <div className="section-icon">
              <Activity size={17} />
            </div>

            <div className="section-title-wrapper">

              <h2>
                Usage Overview
              </h2>

              <p>
                Monitor how your resource consumption changes
                throughout the billing period.
              </p>

            </div>

          </div>

          <div className="graph-stat">

            <span>
              Current
            </span>

            <strong>
              {dailyUsage[dailyUsage.length - 1].usage}%
            </strong>

          </div>

        </div>

        <UsageTrendChart />

        <div className="graph-footer">

          <div>
            <span className="graph-footer-label">
              Average Usage
            </span>

            <strong>
              {averageUsage}%
            </strong>
          </div>

          <div>
            <span className="graph-footer-label">
              Peak Usage
            </span>

            <strong>
              {peakUsage}%
            </strong>
          </div>

          <div>
            <span className="graph-footer-label">
              Billing Period
            </span>

            <strong>
              20 / 31 days
            </strong>
          </div>

        </div>

      </section>


      {/* =====================================================
          RESOURCE CONSUMPTION
      ===================================================== */}

      <section className="usage-section">

        <div className="section-heading">

          <div>

            <span>
              Resource Consumption
            </span>

            <h2>
              Plan Usage
            </h2>

            <p>
              See how much of each resource your account has consumed.
            </p>

          </div>

        </div>


        <div className="resource-grid">

          {usageMetrics.map((metric) => (
            <ResourceUsageCard
              key={metric.id}
              metric={metric}
            />
          ))}

        </div>

      </section>


      {/* =====================================================
          DAILY ACTIVITY
      ===================================================== */}

      <section className="usage-card activity-card">

        <div className="usage-card-header">

          <div>

            <div className="section-icon">
              <BarChart3 size={17} />
            </div>

            <div className="section-title-wrapper">

              <h2>
                Daily Activity
              </h2>

              <p>
                Activity generated by your BillSphere account.
              </p>

            </div>

          </div>

          <div className="activity-badge">
            Live Usage
          </div>

        </div>


        <div className="activity-grid">

          {activityMetrics.map((metric) => {

            const increase =
              metric.previous > 0
                ? Math.round(
                    ((metric.value - metric.previous) /
                      metric.previous) *
                      100
                  )
                : 0;

            return (
              <div
                className="activity-item"
                key={metric.label}
              >

                <div className="activity-item-top">

                  <span>
                    {metric.label}
                  </span>

                  <Activity size={14} />

                </div>

                <strong>
                  {formatNumber(metric.value)}
                </strong>

                <div className="activity-change">

                  <ArrowUpRight size={12} />

                  {increase}% from previous period

                </div>

              </div>
            );

          })}

        </div>

      </section>


      {/* =====================================================
          PLAN LIMITS
      ===================================================== */}

      <section className="usage-card plan-limits-card">

        <div className="plan-header">

          <div>

            <span className="plan-eyebrow">
              Your Current Plan
            </span>

            <h2>
              Premium
            </h2>

            <p>
              Your current resource limits for this billing period.
            </p>

          </div>

          <div className="plan-price">

            <strong>
              ₹4,999
            </strong>

            <span>
              / month
            </span>

          </div>

        </div>


        <div className="limits-table">

          <div className="limits-table-header">

            <span>
              Resource
            </span>

            <span>
              Used
            </span>

            <span>
              Limit
            </span>

            <span>
              Remaining
            </span>

            <span>
              Usage
            </span>

          </div>


          {usageMetrics.map((metric) => {

            const percentage = getPercentage(
              metric.used,
              metric.limit
            );

            const remaining = getRemaining(
              metric.used,
              metric.limit
            );

            return (
              <div
                className="limits-row"
                key={metric.id}
              >

                <div className="limit-resource">

                  <div className="limit-icon">
                    {metric.icon}
                  </div>

                  <span>
                    {metric.title}
                  </span>

                </div>

                <span>
                  {formatNumber(metric.used)}
                </span>

                <span>
                  {formatNumber(metric.limit)}
                </span>

                <span className="remaining-value">
                  {formatNumber(remaining)}
                </span>

                <div className="limit-progress-wrapper">

                  <div className="limit-progress">

                    <div
                      className={`limit-progress-fill ${
                        percentage >= 80
                          ? "warning"
                          : ""
                      }`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    />

                  </div>

                  <span>
                    {percentage}%
                  </span>

                </div>

              </div>
            );

          })}

        </div>

      </section>


      {/* =====================================================
          USAGE ALERTS
      ===================================================== */}

      <section className="usage-section alerts-section">

        <div className="section-heading">

          <div>

            <span>
              Account Monitoring
            </span>

            <h2>
              Usage Alerts
            </h2>

            <p>
              Important notifications about your resource consumption.
            </p>

          </div>

        </div>


        <div className="alerts-list">

          <UsageAlert
            type="success"
            title="Customer usage is healthy"
            description="Your customer usage is currently within the comfortable range of your Premium plan."
          />

          <UsageAlert
            type="warning"
            title="API requests approaching limit"
            description="You have used 84.2% of your available API request allowance."
          />

          <UsageAlert
            type="warning"
            title="Payment usage is getting high"
            description="Payment activity has reached 83.6% of the current plan allowance."
          />

        </div>

      </section>


      {/* =====================================================
          FOOTER INFO
      ===================================================== */}

      <div className="usage-footer">

        <div className="usage-footer-icon">
          <CheckCircle2 size={16} />
        </div>

        <div>

          <strong>
            Usage tracking is active
          </strong>

          <p>
            BillSphere continuously monitors your billing resources
            during the current subscription period.
          </p>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   OVERALL USAGE CARD
========================================================= */

function OverallUsageCard({
  percentage,
}: {
  percentage: number;
}) {
  return (
    <div className="summary-card overall-card">

      <div className="summary-card-top">

        <div>

          <span className="summary-label">
            Overall Usage
          </span>

          <div className="overall-value">
            {percentage}
            <small>%</small>
          </div>

        </div>

        <div className="overall-ring">

          <div
            className="overall-ring-progress"
            style={{
              background: `conic-gradient(
                #D6B36A ${percentage * 3.6}deg,
                rgba(255,255,255,0.06) 0deg
              )`,
            }}
          >

            <div>
              <Gauge size={17} />
            </div>

          </div>

        </div>

      </div>

      <div className="summary-progress">

        <div
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

      <div className="summary-bottom">

        <span>
          Across all resources
        </span>

        <span className="healthy-text">
          Healthy
        </span>

      </div>

    </div>
  );
}


/* =========================================================
   USAGE SUMMARY CARD
========================================================= */

function UsageSummaryCard({
  metric,
}: {
  metric: UsageMetric;
}) {
  const percentage = getPercentage(
    metric.used,
    metric.limit
  );

  return (
    <div className="summary-card">

      <div className="summary-card-top">

        <div>

          <span className="summary-label">
            {metric.title}
          </span>

          <div className="summary-number">
            {formatNumber(metric.used)}
            <small>
              / {formatNumber(metric.limit)}
            </small>
          </div>

        </div>

        <div className="summary-icon">
          {metric.icon}
        </div>

      </div>

      <div className="summary-progress">

        <div
          className={
            percentage >= 80
              ? "warning-progress"
              : ""
          }
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

      <div className="summary-bottom">

        <span>
          {percentage}% used
        </span>

        <span className={getStatusClass(metric.status)}>
          {metric.status}
        </span>

      </div>

    </div>
  );
}


/* =========================================================
   RESOURCE USAGE CARD
========================================================= */

function ResourceUsageCard({
  metric,
}: {
  metric: UsageMetric;
}) {
  const percentage = getPercentage(
    metric.used,
    metric.limit
  );

  const remaining = getRemaining(
    metric.used,
    metric.limit
  );

  return (
    <div className="resource-card">

      <div className="resource-top">

        <div className="resource-icon">
          {metric.icon}
        </div>

        <span className={getStatusClass(metric.status)}>
          {metric.status}
        </span>

      </div>

      <h3>
        {metric.title}
      </h3>

      <div className="resource-numbers">

        <strong>
          {formatNumber(metric.used)}
        </strong>

        <span>
          / {formatNumber(metric.limit)}
        </span>

      </div>

      <div className="resource-progress">

        <div
          className={
            percentage >= 80
              ? "warning-progress"
              : ""
          }
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

      <div className="resource-footer">

        <span>
          {percentage}% used
        </span>

        <span>
          {formatNumber(remaining)} remaining
        </span>

      </div>

    </div>
  );
}


/* =========================================================
   USAGE TREND CHART
========================================================= */

function UsageTrendChart() {
  const width = 1000;
  const height = 300;

  const horizontalPadding = 45;
  const verticalPadding = 28;

  const graphWidth =
    width - horizontalPadding * 2;

  const graphHeight =
    height - verticalPadding * 2;

  const points = dailyUsage.map(
    (point, index) => {

      const x =
        horizontalPadding +
        (index /
          (dailyUsage.length - 1)) *
          graphWidth;

      const y =
        verticalPadding +
        graphHeight -
        (point.usage / 100) *
          graphHeight;

      return {
        ...point,
        x,
        y,
      };
    }
  );

  const linePath = points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const areaPath = `
    ${linePath}
    L ${points[points.length - 1].x} ${
      height - verticalPadding
    }
    L ${points[0].x} ${
      height - verticalPadding
    }
    Z
  `;

  return (
    <div className="trend-chart-wrapper">

      <div className="chart-y-labels">

        <span>100%</span>
        <span>75%</span>
        <span>50%</span>
        <span>25%</span>
        <span>0%</span>

      </div>

      <svg
        className="trend-chart"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >

        <defs>

          <linearGradient
            id="usageAreaGradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >

            <stop
              offset="0%"
              stopColor="#D6B36A"
              stopOpacity="0.22"
            />

            <stop
              offset="100%"
              stopColor="#D6B36A"
              stopOpacity="0"
            />

          </linearGradient>

          <filter
            id="usageGlow"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >

            <feGaussianBlur
              stdDeviation="4"
              result="blur"
            />

            <feMerge>

              <feMergeNode in="blur" />

              <feMergeNode in="SourceGraphic" />

            </feMerge>

          </filter>

        </defs>


        {/* GRID */}

        {[0, 25, 50, 75, 100].map(
          (value) => {

            const y =
              verticalPadding +
              graphHeight -
              (value / 100) *
                graphHeight;

            return (
              <line
                key={value}
                x1={horizontalPadding}
                y1={y}
                x2={width - horizontalPadding}
                y2={y}
                stroke="rgba(255,255,255,0.055)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
            );
          }
        )}


        {/* AREA */}

        <path
          d={areaPath}
          fill="url(#usageAreaGradient)"
        />


        {/* LINE */}

        <path
          d={linePath}
          fill="none"
          stroke="#D6B36A"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#usageGlow)"
        />


        {/* POINTS */}

        {points.map((point) => (

          <g key={point.day}>

            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#0D0D0D"
              stroke="#D6B36A"
              strokeWidth="2"
            />

            <circle
              cx={point.x}
              cy={point.y}
              r="2"
              fill="#D6B36A"
            />

          </g>

        ))}

      </svg>


      <div className="chart-x-labels">

        {dailyUsage
          .filter(
            (_, index) =>
              index === 0 ||
              index === 2 ||
              index === 4 ||
              index === 6 ||
              index === 8 ||
              index === dailyUsage.length - 1
          )
          .map((point) => (
            <span key={point.day}>
              {point.day}
            </span>
          ))}

      </div>

    </div>
  );
}


/* =========================================================
   USAGE ALERT
========================================================= */

function UsageAlert({
  type,
  title,
  description,
}: {
  type: "success" | "warning";
  title: string;
  description: string;
}) {
  return (
    <div
      className={`usage-alert ${
        type === "success"
          ? "alert-success"
          : "alert-warning"
      }`}
    >

      <div className="alert-icon">

        {type === "success" ? (
          <CheckCircle2 size={17} />
        ) : (
          <AlertTriangle size={17} />
        )}

      </div>

      <div className="alert-content">

        <strong>
          {title}
        </strong>

        <p>
          {description}
        </p>

      </div>

    </div>
  );
}

export default Usage;