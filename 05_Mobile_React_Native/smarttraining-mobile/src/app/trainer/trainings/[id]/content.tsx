import { Href, Stack, router, useLocalSearchParams } from "expo-router";
import RoleHeaderShortcuts from "../../../../components/assistant/RoleHeaderShortcuts";
import { useEffect, useState } from "react";

import ErrorMessage from "../../../../components/ErrorMessage";
import LoadingState from "../../../../components/LoadingState";
import ScreenContainer from "../../../../components/ScreenContainer";
import TrainerTrainingContentScreen from "../../../../screens/trainer/TrainerTrainingContentScreen";
import {
  getConnectedUser,
} from "../../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../../types/auth";

export default function TrainerTrainingContentRoute() {
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
      <LoadingState message="Ouverture du contenu..." />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <RoleHeaderShortcuts
              onAssistantPress={() =>
                router.push(
                  `/trainer/assistant?trainingId=${trainingId}` as Href,
                )
              }
            />
          ),
        }}
      />
      <TrainerTrainingContentScreen
      trainingId={trainingId}
      trainerId={user.userId}
      />
    </>
  );
}
