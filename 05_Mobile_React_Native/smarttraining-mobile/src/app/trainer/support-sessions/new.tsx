import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../../components/LoadingState";
import TrainerSupportSessionCreateScreen from "../../../screens/trainer/TrainerSupportSessionCreateScreen";
import {
  getConnectedUser,
} from "../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../types/auth";

export default function TrainerSupportSessionCreateRoute() {
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
      <LoadingState message="Préparation de la séance..." />
    );
  }

  return (
    <TrainerSupportSessionCreateScreen
      trainerId={user.userId}
      onCreated={(created) =>
        router.replace(
          `/trainer/support-sessions/${created.id}` as Href,
        )
      }
    />
  );
}