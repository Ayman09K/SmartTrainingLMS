import {
  Href,
  Stack,
  router,
  useLocalSearchParams,
} from "expo-router";
import RoleHeaderShortcuts from "../../../../../components/assistant/RoleHeaderShortcuts";
import { useEffect, useState } from "react";

import ErrorMessage from "../../../../../components/ErrorMessage";
import LoadingState from "../../../../../components/LoadingState";
import { navigateBackOrReplace } from "../../../../../components/navigation/mobileNavigation";
import ScreenContainer from "../../../../../components/ScreenContainer";
import TrainerLessonResourcesScreen from "../../../../../screens/trainer/TrainerLessonResourcesScreen";
import {
  getConnectedUser,
} from "../../../../../storage/tokenStorage";
import type {
  ConnectedUser,
} from "../../../../../types/auth";

export default function TrainerLessonResourcesRoute() {
  const params =
    useLocalSearchParams<{
      id: string;
      lessonId: string;
    }>();

  const trainingId = Number(params.id);
  const lessonId = Number(params.lessonId);
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
    !Number.isFinite(trainingId) ||
    trainingId <= 0 ||
    !Number.isFinite(lessonId) ||
    lessonId <= 0
  ) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message="Formation ou leçon invalide."
          onRetry={() =>
            router.replace("/trainer/trainings")
          }
        />
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <LoadingState message="Vérification du compte formateur..." />
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
                  `/trainer/assistant?trainingId=${trainingId}&lessonId=${lessonId}` as Href,
                )
              }
            />
          ),
        }}
      />
      <TrainerLessonResourcesScreen
      trainerId={user.userId}
      trainingId={trainingId}
      lessonId={lessonId}
      onBack={() =>
        navigateBackOrReplace(
          `/trainer/trainings/${trainingId}/content`,
        )
      }
      />
    </>
  );
}
