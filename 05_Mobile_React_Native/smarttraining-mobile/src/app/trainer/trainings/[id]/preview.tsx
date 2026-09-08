import {
  router,
  useLocalSearchParams,
} from "expo-router";
import { useEffect, useState } from "react";

import ErrorMessage from "../../../../components/ErrorMessage";
import LoadingState from "../../../../components/LoadingState";
import { navigateBackOrReplace } from "../../../../components/navigation/mobileNavigation";
import ScreenContainer from "../../../../components/ScreenContainer";
import TrainerTrainingPreviewScreen from "../../../../screens/trainer/TrainerTrainingPreviewScreen";
import {
  getConnectedUser,
} from "../../../../storage/tokenStorage";
import type {
  ConnectedUser,
} from "../../../../types/auth";

export default function TrainerTrainingPreviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trainingId = Number(id);
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
    !Number.isInteger(trainingId) ||
    trainingId <= 0
  ) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message="Formation invalide."
          onRetry={() =>
            router.replace("/trainer/trainings")
          }
        />
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <LoadingState message="Ouverture de la prévisualisation..." />
    );
  }

  return (
    <TrainerTrainingPreviewScreen
      trainingId={trainingId}
      trainerId={user.userId}
      onBack={() =>
        navigateBackOrReplace(
          `/trainer/trainings/${trainingId}`,
        )
      }
    />
  );
}
