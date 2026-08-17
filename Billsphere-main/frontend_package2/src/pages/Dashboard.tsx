import { useEffect, useState } from "react";
import { getCurrentUser } from "../assets/services/api";
import UserDashboard from "./UserDashboard";
import AdminDashboard from "./AdminDashboard";

function Dashboard() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then((user) => setRole(user.role))
      .catch(() => setError("Could not verify your account. Please log in again."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-gray-500">Loading dashboard...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3">{error}</div>
    );
  }

  return role === "admin" ? <AdminDashboard /> : <UserDashboard />;
}

export default Dashboard;
