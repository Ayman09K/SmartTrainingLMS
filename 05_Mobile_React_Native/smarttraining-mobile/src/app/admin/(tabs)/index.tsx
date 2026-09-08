import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../../components/LoadingState";
import AdminDashboardScreen from "../../../screens/admin/AdminDashboardScreen";
import {
  getConnectedUser,
  removeToken,
} from "../../../storage/tokenStorage";
import { ConnectedUser } from "../../../types/auth";

export default function AdminHomeRoute() {
  const [user, setUser] = useState<ConnectedUser | null>(null);

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((connectedUser) => {
        if (!active) {
          return;
        }

        if (!connectedUser || connectedUser.role !== "ADMIN") {
          router.replace("/");
          return;
        }

        setUser(connectedUser);
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

  async function handleLogout() {
    await removeToken();
    router.replace("/");
  }

  if (!user) {
    return <LoadingState message="Chargement de l’espace administrateur..." />;
  }

  return (
    <AdminDashboardScreen
      user={user}
      onLogout={() => void handleLogout()}
    />
  );
}