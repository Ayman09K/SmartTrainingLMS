import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../../components/LoadingState";
import TrainerHomeScreen from "../../../screens/trainer/TrainerHomeScreen";
import { getConnectedUser } from "../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../types/auth";

export default function TrainerHomeRoute() {
  const [user, setUser] = useState<ConnectedUser | null>(null);

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
      <LoadingState message="Chargement de l’espace formateur..." />
    );
  }

  return (
    <TrainerHomeScreen
      user={user}
      onCreateTraining={() =>
        router.push("/trainer/trainings/new" as Href)
      }
      onImportScorm={() =>
        router.push("/trainer/trainings/new?method=scorm" as Href)
      }
      onOpenTrainings={() =>
        router.push("/trainer/trainings" as Href)
      }
      onOpenTraining={(trainingId) =>
        router.push(`/trainer/trainings/${trainingId}` as Href)
      }
      onOpenLearners={() =>
        router.push("/trainer/learners" as Href)
      }
      onOpenLearner={(learnerId) =>
        router.push(`/trainer/learners/${learnerId}` as Href)
      }
      onOpenAlerts={() =>
        router.push("/trainer/alerts" as Href)
      }
      onOpenGroups={() =>
        router.push("/trainer/groups" as Href)
      }
      onOpenGroup={(groupId) =>
        router.push(`/trainer/groups/${groupId}` as Href)
      }
      onOpenSupportSessions={() =>
        router.push("/trainer/support-sessions" as Href)
      }
      onOpenSupportSession={(sessionId) =>
        router.push(`/trainer/support-sessions/${sessionId}` as Href)
      }
    />
  );
}
