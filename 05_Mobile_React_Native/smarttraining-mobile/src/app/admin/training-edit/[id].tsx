import {
  Href,
  Stack,
  router,
  useLocalSearchParams,
} from "expo-router";
import RoleHeaderShortcuts from "../../../components/assistant/RoleHeaderShortcuts";
import { useEffect, useState } from "react";

import ErrorMessage from "../../../components/ErrorMessage";
import LoadingState from "../../../components/LoadingState";
import ScreenContainer from "../../../components/ScreenContainer";
import AdminTrainingEditorScreen from "../../../screens/admin/AdminTrainingEditorScreen";
import {
  getConnectedUser,
} from "../../../storage/tokenStorage";

export default function AdminTrainingEditRoute() {
  const { id } =
    useLocalSearchParams<{ id: string }>();
  const trainingId = Number(id);
  const [authorized, setAuthorized] =
    useState(false);

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((user) => {
        if (!active) return;

        if (!user || user.role !== "ADMIN") {
          router.replace("/");
          return;
        }

        setAuthorized(true);
      })
      .catch(() => {
        if (active) router.replace("/");
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
            router.replace("/admin/trainings")
          }
        />
      </ScreenContainer>
    );
  }

  if (!authorized) {
    return (
      <LoadingState message="Vérification administrateur..." />
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
                  `/admin/assistant?trainingId=${trainingId}` as Href,
                )
              }
            />
          ),
        }}
      />
      <AdminTrainingEditorScreen
      trainingId={trainingId}
      onCancel={() =>
        router.replace("/admin/trainings")
      }
      onSaved={() =>
        router.replace("/admin/trainings")
      }
      />
    </>
  );
}
