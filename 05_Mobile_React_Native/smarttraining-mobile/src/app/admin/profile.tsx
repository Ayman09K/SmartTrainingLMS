import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../components/LoadingState";
import AdminProfileScreen from "../../screens/admin/AdminProfileScreen";
import { getConnectedUser } from "../../storage/tokenStorage";

export default function AdminProfileRoute() {
  const [authorized, setAuthorized] = useState(false);

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

        setAuthorized(true);
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

  if (!authorized) {
    return (
      <LoadingState message="Vérification de l’accès administrateur..." />
    );
  }

  return (
    <AdminProfileScreen
      onBackHome={() =>
        router.replace("/admin" as Href)
      }
      onOpenAppearance={() =>
        router.push("/admin/appearance" as Href)
      }
      onOpenPrivacy={() => router.push("/privacy" as Href)}
    />
  );
}