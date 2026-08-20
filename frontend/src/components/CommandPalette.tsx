import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Command, Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const quickActions = [
  { label: "Dashboard", path: "/dashboard", description: "Executive view and account health" },
  { label: "Customers", path: "/customers", description: "Manage subscribers and accounts" },
  { label: "Invoices", path: "/invoices", description: "Create, review, and track invoices" },
  { label: "Plans", path: "/plans", description: "Browse available billing plans" },
  { label: "Settings", path: "/settings", description: "Adjust profile and preferences" },
];

function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredActions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return quickActions;

    return quickActions.filter((action) =>
      `${action.label} ${action.description}`.toLowerCase().includes(normalized)
    );
  }, [query]);

  function runAction(path: string) {
    navigate(path);
    setOpen(false);
    setQuery("");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/55 px-4 pt-24 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200/70 bg-white/90 p-3 shadow-[0_25px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/90">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-950/70">
          <Search size={18} className="text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search dashboards, customers, invoices..."
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <div className="flex items-center gap-2 rounded-lg border border-slate-200/70 bg-white px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <Command size={14} />
            K
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {filteredActions.map((action) => (
            <button
              key={action.path}
              onClick={() => runAction(action.path)}
              className="flex w-full items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/80 dark:hover:border-slate-700 dark:hover:bg-slate-800/80"
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{action.label}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{action.description}</p>
              </div>
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Sparkles size={15} />
                <ArrowRight size={16} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
