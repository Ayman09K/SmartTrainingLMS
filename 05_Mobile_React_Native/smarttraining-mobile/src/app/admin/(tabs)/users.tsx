import { router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../../components/LoadingState";
import AdminUsersScreen from "../../../screens/admin/AdminUsersScreen";
import { getConnectedUser } from "../../../storage/tokenStorage";

export default function AdminUsersRoute() {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((user) => {
        if (!active) {
          return;
        }

        if (!user || user.role !== "ADMIN") {
          router.replace("/");
          return;
        }

        setCurrentUserId(user.userId);
      })
      .catch(() => {
        if (active) {
          router.replace("/");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (currentUserId == null) {
    return <LoadingState message="Vérification de l’accès administrateur..." />;
  }

  return <AdminUsersScreen currentUserId={currentUserId} />;
}