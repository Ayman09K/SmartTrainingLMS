import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../../components/LoadingState";
import TrainerSupportSessionsScreen from "../../../screens/trainer/TrainerSupportSessionsScreen";
import {
  getConnectedUser,
} from "../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../types/auth";

export default function TrainerSupportSessionsRoute() {
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
      <LoadingState message="Chargement des séances..." />
    );
  }

  return (
    <TrainerSupportSessionsScreen
      trainerId={user.userId}
      onCreate={() =>
        router.push(
          "/trainer/support-sessions/new" as Href,
        )
      }
      onOpen={(sessionId) =>
        router.push(
          `/trainer/support-sessions/${sessionId}` as Href,
        )
      }
    />
  );
}