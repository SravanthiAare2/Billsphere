import type { ReactNode } from "react";

interface StatusBadgeProps {
  variant: "success" | "warning" | "danger" | "info" | "neutral";
  children: ReactNode;
}

const badgeStyles: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-700/70 dark:text-slate-300",
};

function StatusBadge({ variant, children }: StatusBadgeProps) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeStyles[variant]}`}>{children}</span>;
}

export default StatusBadge;
