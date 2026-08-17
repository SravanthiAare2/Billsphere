import { Link } from "react-router-dom";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  primaryAction?: { label: string; path: string };
  secondaryAction?: { label: string; path: string };
  icon?: ReactNode;
}

function EmptyState({ title, description, primaryAction, secondaryAction, icon }: EmptyStateProps) {
  return (
    <div className="empty-state rounded-[28px] border border-slate-200/70 bg-white/80 p-10 text-center shadow-sm dark:border-slate-700/70 dark:bg-slate-950/70">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
        {icon}
      </div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {primaryAction && (
            <Link to={primaryAction.path} className="btn-primary">
              {primaryAction.label}
            </Link>
          )}
          {secondaryAction && (
            <Link to={secondaryAction.path} className="btn-ghost">
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
