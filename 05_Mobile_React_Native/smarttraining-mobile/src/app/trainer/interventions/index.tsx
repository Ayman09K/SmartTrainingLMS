import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../../components/LoadingState";
import TrainerInterventionsScreen from "../../../screens/trainer/TrainerInterventionsScreen";
import {
  getConnectedUser,
} from "../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../types/auth";

export default function TrainerInterventionsRoute() {
  const [user, setUser] =
    useState<ConnectedUser | null>(null);

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
      <LoadingState message="Chargement des interventions..." />
    );
  }

  return (
    <TrainerInterventionsScreen
      trainerId={user.userId}
      onCreate={() =>
        router.push(
          "/trainer/interventions/new" as Href,
        )
      }
      onOpen={(interventionId) =>
        router.push(
          `/trainer/interventions/${interventionId}` as Href,
        )
      }
    />
  );
}