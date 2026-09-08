import { router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../components/LoadingState";
import AdminAccountDeletionRequestsScreen from "../../screens/admin/AdminAccountDeletionRequestsScreen";
import { getConnectedUser } from "../../storage/tokenStorage";

export default function AdminAccountDeletionRequestsRoute() {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((user) => {
        if (!active) return;

        if (!user || user.role !== "ADMIN") {
          router.replace("/");
          return;
        }

        setAuthorized(true);
      })
      .catch(() => {
        if (active) router.replace("/");
      });

    return () => {
      active = false;
    };
  }, []);

  if (!authorized) {
    return (
      <LoadingState message="Vérification de l’accès administrateur..." />
    );
  }

  return <AdminAccountDeletionRequestsScreen />;
}
