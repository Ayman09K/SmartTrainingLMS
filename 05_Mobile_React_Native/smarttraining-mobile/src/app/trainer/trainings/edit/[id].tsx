// PATCH16_A8C5N_POST_EDIT_DETAIL_ROUTE_V1
import {
  Href,
  router,
  useLocalSearchParams,
} from "expo-router";
import { useEffect, useState } from "react";

import ErrorMessage from "../../../../components/ErrorMessage";
import LoadingState from "../../../../components/LoadingState";
import ScreenContainer from "../../../../components/ScreenContainer";
import TrainerTrainingEditorScreen from "../../../../screens/trainer/TrainerTrainingEditorScreen";
import {
  getConnectedUser,
} from "../../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../../types/auth";

export default function TrainerTrainingEditRoute() {
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
            router.replace("/trainer/trainings" as Href)
          }
        />
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <LoadingState message="Ouverture de la formation..." />
    );
  }

  return (
    <TrainerTrainingEditorScreen
      trainerId={user.userId}
      trainingId={trainingId}
      onSaved={(savedId) =>
        router.replace(
          `/trainer/trainings/${savedId}` as Href,
        )
      }
      onCancel={() =>
        router.replace("/trainer/trainings" as Href)
      }
    />
  );
}