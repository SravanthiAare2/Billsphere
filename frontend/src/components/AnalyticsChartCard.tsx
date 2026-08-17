import type { ReactNode } from "react";

interface AnalyticsChartCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

function AnalyticsChartCard({ title, description, children }: AnalyticsChartCardProps) {
  return (
    <section className="chart-card panel rounded-[24px] p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="h-[320px] min-h-[260px] w-full">{children}</div>
    </section>
  );
}

export default AnalyticsChartCard;
