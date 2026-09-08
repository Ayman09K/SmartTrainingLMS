import { Navigate } from "react-router-dom";
import { BiDashboardPage } from "../../components/bi/BiDashboardPage";
import { useAuth } from "../../features/auth/AuthContext";

export function TrainerStatisticsPage() {
  const { user } = useAuth();

  if (user?.role !== "FORMATEUR") {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return (
    <BiDashboardPage scope="trainer" />
  );
}