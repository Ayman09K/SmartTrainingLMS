import {
  Href,
  router,
} from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../components/LoadingState";
import {
  ScormQuickCreateMobileScreen,
  TrainingCreationMethodScreen,
} from "../../screens/training/ScormQuickCreateMobileScreen";
import AdminTrainingEditorScreen from "../../screens/admin/AdminTrainingEditorScreen";
import {
  getConnectedUser,
} from "../../storage/tokenStorage";

export default function AdminTrainingNewRoute() {
  const [authorized, setAuthorized] =
    useState(false);
  const [creationMethod, setCreationMethod] =
    useState<"MANUAL" | "SCORM" | null>(null);

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

  if (!authorized) {
    return (
      <LoadingState message="Vérification administrateur..." />
    );
  }

  if (!creationMethod) {
    return (
      <TrainingCreationMethodScreen
        onManual={() => setCreationMethod("MANUAL")}
        onScorm={() => setCreationMethod("SCORM")}
        onCancel={() =>
          router.replace("/admin/trainings")
        }
      />
    );
  }

  if (creationMethod === "SCORM") {
    return (
      <ScormQuickCreateMobileScreen
        role="ADMIN"
        onBack={() => setCreationMethod(null)}
        onCreated={(trainingId) =>
          router.replace(
            `/admin/training-edit/${trainingId}` as Href,
          )
        }
      />
    );
  }

  return (
    <AdminTrainingEditorScreen
      onCancel={() =>
        router.replace("/admin/trainings")
      }
      onSaved={(trainingId) =>
        router.replace(
          `/admin/training-edit/${trainingId}` as Href,
        )
      }
    />
  );
}