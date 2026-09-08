import { Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

export function RoleBasedRedirect() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-card">Chargement de la session...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === "FORMATEUR") {
    return <Navigate to="/trainer" replace />;
  }

  return <Navigate to="/learner" replace />;
}
