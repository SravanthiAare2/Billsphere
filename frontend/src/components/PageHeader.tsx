import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
          {description}
        </p>
      </div>
      {action && (
        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300">
          {action}
          <ArrowRight size={16} />
        </div>
      )}
    </div>
  );
}

export default PageHeader;
