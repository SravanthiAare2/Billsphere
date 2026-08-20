import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import { useToast } from "../components/ToastProvider";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"success" | "error" | "">("");
  const { notify } = useToast();

  function resetPassword() {
    const user: any = JSON.parse(localStorage.getItem("user") || "null");

    if (!user || user.email !== email) {
      const errorMessage = "Email not found.";
      setStatus("error");
      setMessage(errorMessage);
      notify({ title: "Reset failed", description: errorMessage, variant: "error" });
      return;
    }

    if (password !== confirmPassword) {
      const errorMessage = "Passwords do not match.";
      setStatus("error");
      setMessage(errorMessage);
      notify({ title: "Reset failed", description: errorMessage, variant: "error" });
      return;
    }

    const updatedUser = {
      ...user,
      password,
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));
    const successMessage = "Password updated successfully. Redirecting to login...";
    setStatus("success");
    setMessage(successMessage);
    notify({ title: "Password reset", description: "Your password was updated successfully.", variant: "success" });
    setTimeout(() => navigate("/login"), 1200);
  }

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Security"
        title="Reset Password"
        description="Securely update your password and regain access to your billing workspace."
        action={<span className="inline-flex items-center gap-2"><ShieldCheck size={16} />Secure reset</span>}
      />

      <Card className="mx-auto max-w-md">
        <div className="space-y-5">
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Reset Password</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Enter your registered email and create a new password.</p>
          </div>

          {message && (
            <div className={`rounded-2xl px-4 py-3 text-sm ${status === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>
              {message}
            </div>
          )}

          <input
            id="forgot-password-email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Registered Email"
            className="input-field w-full"
          />
          <input
            id="forgot-password-new"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New Password"
            className="input-field w-full"
          />
          <input
            id="forgot-password-confirm"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            className="input-field w-full"
          />

          <button onClick={resetPassword} className="btn-primary w-full">Save Password</button>

          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
            <Link to="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">Back to login</Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ForgotPassword;
