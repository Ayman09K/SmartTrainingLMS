import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../../components/LoadingState";
import TrainerInterventionCreateScreen from "../../../screens/trainer/TrainerInterventionCreateScreen";
import {
  getConnectedUser,
} from "../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../types/auth";

export default function TrainerInterventionCreateRoute() {
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
      <LoadingState message="Préparation de l’intervention..." />
    );
  }

  return (
    <TrainerInterventionCreateScreen
      trainerId={user.userId}
      onCreated={(created) =>
        router.replace(
          `/trainer/interventions/${created.id}` as Href,
        )
      }
    />
  );
}