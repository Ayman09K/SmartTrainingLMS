import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../components/LoadingState";
import LearnerAppearanceScreen from "../../screens/learner/LearnerAppearanceScreen";
import { getConnectedUser } from "../../storage/tokenStorage";

export default function AdminAppearanceRoute() {
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
    <LearnerAppearanceScreen
      onBack={() =>
        router.replace("/admin/profile" as Href)
      }
    />
  );
}