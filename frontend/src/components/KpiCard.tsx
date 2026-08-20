import type { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string;
  caption: string;
  delta?: string;
  icon?: ReactNode;
}

function KpiCard({ title, value, caption, delta, icon }: KpiCardProps) {
  return (
    <div className="kpi-card panel rounded-[24px] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-4 text-3xl font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
        {icon && <div className="kpi-icon">{icon}</div>}
      </div>
      <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span>{caption}</span>
        {delta ? <span className="text-slate-700 dark:text-slate-200">{delta}</span> : null}
      </div>
    </div>
  );
}

export default KpiCard;
