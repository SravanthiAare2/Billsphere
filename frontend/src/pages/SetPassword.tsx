import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ArrowRight, ShieldCheck, KeyRound } from "lucide-react";
import { setPassword } from "../assets/services/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/ToastProvider";

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPasswordState] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();
  const { notify } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or missing invite token link.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await setPassword(token, password);
      // Automatically log user in with returned access token
      await login(res.access_token);
      notify({
        title: "Password Set Successfully!",
        description: "Welcome to Billsphere. You are now logged in.",
        variant: "success",
      });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to set password. Link may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-[32px] border border-slate-200/80 bg-white/90 p-8 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:p-10">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Set Your Password
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Create a password for your new Billsphere account.
          </p>
        </div>

        {!token ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            No invite token provided in URL. Please check your email link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPasswordState(e.target.value)}
                  placeholder="At least 6 characters"
                  className="input-field pl-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="input-field pl-11"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 text-base font-semibold shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                "Setting Password..."
              ) : (
                <span className="flex items-center gap-2">
                  Set Password & Log In <ArrowRight size={18} />
                </span>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck size={14} className="text-emerald-500" />
              Secure 256-bit encrypted password creation
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
