import { router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../components/LoadingState";
import AdminFeedbacksScreen from "../../screens/admin/AdminFeedbacksScreen";
import { getConnectedUser } from "../../storage/tokenStorage";

export default function AdminFeedbacksRoute() {
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
    return <LoadingState message="Chargement de l’espace Feedbacks..." />;
  }

  return <AdminFeedbacksScreen />;
}