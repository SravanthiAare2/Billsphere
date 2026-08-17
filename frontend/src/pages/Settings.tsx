import { useEffect, useState } from "react";
import { Bell, MoonStar, Save, ShieldCheck } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import { useToast } from "../components/ToastProvider";

function Settings() {
  const user: any = JSON.parse(localStorage.getItem("user") || "{}");

  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    password: "",
  });

  const [darkMode, setDarkMode] = useState(localStorage.getItem("theme") === "dark");
  const [notifications, setNotifications] = useState(true);
  const { notify } = useToast();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
  }, [darkMode]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function saveSettings() {
    const updatedUser = {
      ...user,
      name: form.name,
      email: form.email,
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));

    if (form.password) {
      localStorage.setItem("userPassword", form.password);
    }

    notify({
      title: "Settings saved",
      description: "Your account preferences were updated successfully.",
      variant: "success",
    });
  }

  function toggleTheme() {
    const value = !darkMode;
    setDarkMode(value);
    localStorage.setItem("theme", value ? "dark" : "light");
  }

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Tune your billing workspace appearance, access, and notifications."
        action={<span className="inline-flex items-center gap-2"><ShieldCheck size={16} />Secure workspace</span>}
      />

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-600">
              <Save size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Account settings</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Update your profile information and password securely.</p>
            </div>
          </div>

          <div className="space-y-4">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full Name"
              className="input-field"
              aria-label="Full name"
            />
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="input-field"
              aria-label="Email"
            />
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="New Password"
              className="input-field"
              aria-label="New password"
            />
          </div>

          <button onClick={saveSettings} className="btn-primary">
            <Save size={18} />
            Save Settings
          </button>
        </Card>

        <Card className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-900/10 p-3 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200">
              <MoonStar size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Preferences</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Control visual and notification settings for your workspace.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/70 dark:bg-slate-950/50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Dark mode</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Switch the interface theme instantly.</p>
              </div>
              <button onClick={toggleTheme} className="btn-ghost" aria-pressed={darkMode}>
                {darkMode ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/70 dark:bg-slate-950/50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Notifications</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Receive alerts for plan changes and billing updates.</p>
              </div>
              <button
                onClick={() => {
                  setNotifications(!notifications);
                  notify({
                    title: notifications ? "Notifications muted" : "Notifications enabled",
                    description: notifications
                      ? "Billing alerts are now muted."
                      : "You will receive important billing updates.",
                    variant: notifications ? "info" : "success",
                  });
                }}
                className={`rounded-full px-3 py-2 text-sm font-medium ${notifications ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100"}`}
              >
                {notifications ? "Enabled" : "Muted"}
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-sm text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
              <Bell size={16} />
              {notifications ? "Notifications are active for important updates." : "Notifications are muted."}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Settings;
