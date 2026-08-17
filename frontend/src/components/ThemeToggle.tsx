import { MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return (
    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl" />
  );

  const darkMode = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300"
      aria-label="Toggle theme"
    >
      {darkMode ? <SunMedium size={18} /> : <MoonStar size={18} />}
    </button>
  );
}

export default ThemeToggle;