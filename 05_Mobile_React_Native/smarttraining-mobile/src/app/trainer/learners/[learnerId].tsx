import {
  Href,
  router,
  useLocalSearchParams,
} from "expo-router";
import { useEffect, useState } from "react";

import ErrorMessage from "../../../components/ErrorMessage";
import LoadingState from "../../../components/LoadingState";
import ScreenContainer from "../../../components/ScreenContainer";
import TrainerLearner360Screen from "../../../screens/trainer/TrainerLearner360Screen";
import {
  getConnectedUser,
} from "../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../types/auth";

export default function TrainerLearner360Route() {
  const { learnerId } =
    useLocalSearchParams<{ learnerId: string }>();

  const parsedLearnerId = Number(learnerId);
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

  if (
    !Number.isFinite(parsedLearnerId) ||
    parsedLearnerId <= 0
  ) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message="Apprenant invalide."
          onRetry={() =>
            router.replace(
              "/trainer/learners" as Href,
            )
          }
        />
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <LoadingState message="Ouverture du suivi 360..." />
    );
  }

  return (
    <TrainerLearner360Screen
      trainerId={user.userId}
      learnerId={parsedLearnerId}
    />
  );
}