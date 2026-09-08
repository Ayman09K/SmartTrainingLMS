import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../../components/LoadingState";
import LearningPathManagerEditorScreen from "../../../screens/learningPaths/LearningPathManagerEditorScreen";
import { getConnectedUser } from "../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../types/auth";

export default function TrainerLearningPathNewRoute() {
  const [user, setUser] = useState<ConnectedUser | null>(null);

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((connectedUser) => {
        if (!active) return;

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
        if (active) router.replace("/");
      });

    return () => {
      active = false;
    };
  }, []);

  if (!user) {
    return <LoadingState message="Préparation du parcours..." />;
  }

  return (
    <LearningPathManagerEditorScreen
      role="FORMATEUR"
      userId={user.userId}
      onBack={() =>
        router.replace("/trainer/learning-paths" as Href)
      }
      onPathCreated={(pathId) =>
        router.replace(
          `/trainer/learning-paths/${pathId}` as Href,
        )
      }
      onPathDeleted={() =>
        router.replace("/trainer/learning-paths" as Href)
      }
    />
  );
}