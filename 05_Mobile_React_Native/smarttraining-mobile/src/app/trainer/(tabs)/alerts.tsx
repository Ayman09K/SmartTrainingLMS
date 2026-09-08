import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../../components/LoadingState";
import TrainerAlertsScreen from "../../../screens/trainer/TrainerAlertsScreen";
import {
  getConnectedUser,
} from "../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../types/auth";

export default function TrainerAlertsRoute() {
  const [user, setUser] = useState<ConnectedUser | null>(null);

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((connectedUser) => {
        if (!active) {
          return;
        }

        if (
          !connectedUser ||
          connectedUser.role !== "FORMATEUR"
        ) {
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

  if (!user) {
    return (
      <LoadingState message="Chargement des alertes pédagogiques..." />
    );
  }

  return (
    <TrainerAlertsScreen
      trainerId={user.userId}
      onOpenAlert={(alertId) =>
        router.push(
          `/trainer/alerts/${alertId}` as Href,
        )
      }
    />
  );
}