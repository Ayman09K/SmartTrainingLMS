// PATCH16_A8C5P_POST_CREATE_DETAIL_ROUTE_V1
// PATCH16_A8C5N_POST_CREATE_CONTENT_ROUTE_V1
import {
  Href,
  router,
  useLocalSearchParams,
} from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../../components/LoadingState";
import {
  ScormQuickCreateMobileScreen,
  TrainingCreationMethodScreen,
} from "../../../screens/training/ScormQuickCreateMobileScreen";
import TrainerTrainingEditorScreen from "../../../screens/trainer/TrainerTrainingEditorScreen";
import { getConnectedUser } from "../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../types/auth";

export default function TrainerTrainingNewRoute() {
  const { method } = useLocalSearchParams<{
    method?: string | string[];
  }>();
  const requestedMethod = Array.isArray(method) ? method[0] : method;
  const directScorm = requestedMethod?.toLowerCase() === "scorm";

  const [user, setUser] =
    useState<ConnectedUser | null>(null);
  const [creationMethod, setCreationMethod] =
    useState<"MANUAL" | "SCORM" | null>(null);

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
      <LoadingState message="Préparation du formulaire..." />
    );
  }

  const activeMethod =
    creationMethod ?? (directScorm ? "SCORM" : null);

  if (!activeMethod) {
    return (
      <TrainingCreationMethodScreen
        onManual={() => setCreationMethod("MANUAL")}
        onScorm={() => setCreationMethod("SCORM")}
        onCancel={() =>
          router.replace("/trainer/trainings" as Href)
        }
      />
    );
  }

  if (activeMethod === "SCORM") {
    return (
      <ScormQuickCreateMobileScreen
        role="FORMATEUR"
        onBack={() => {
          if (directScorm) {
            router.replace("/trainer" as Href);
            return;
          }

          setCreationMethod(null);
        }}
        onCreated={(trainingId) =>
          router.replace(
            `/trainer/trainings/${trainingId}` as Href,
          )
        }
      />
    );
  }

  return (
    <TrainerTrainingEditorScreen
      trainerId={user.userId}
      onSaved={(trainingId) =>
        router.replace(
          `/trainer/trainings/${trainingId}/content` as Href,
        )
      }
      onCancel={() =>
        router.replace("/trainer/trainings" as Href)
      }
    />
  );
}
