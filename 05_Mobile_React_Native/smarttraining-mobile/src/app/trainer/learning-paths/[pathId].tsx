import { Href, router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import ErrorMessage from "../../../components/ErrorMessage";
import LoadingState from "../../../components/LoadingState";
import LearningPathManagerEditorScreen from "../../../screens/learningPaths/LearningPathManagerEditorScreen";
import { getConnectedUser } from "../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../types/auth";

export default function TrainerLearningPathDetailRoute() {
  const params = useLocalSearchParams<{ pathId?: string }>();
  const [user, setUser] = useState<ConnectedUser | null>(null);

  const pathId = useMemo(() => {
    const value = Number(params.pathId);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [params.pathId]);

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

  if (!pathId) {
    return (
      <ErrorMessage
        title="Parcours invalide"
        message="L’identifiant du parcours est absent ou incorrect."
      />
    );
  }

  if (!user) {
    return <LoadingState message="Chargement du parcours..." />;
  }

  return (
    <LearningPathManagerEditorScreen
      role="FORMATEUR"
      userId={user.userId}
      pathId={pathId}
      onBack={() =>
        router.replace("/trainer/learning-paths" as Href)
      }
      onPathCreated={(nextPathId) =>
        router.replace(
          `/trainer/learning-paths/${nextPathId}` as Href,
        )
      }
      onPathDeleted={() =>
        router.replace("/trainer/learning-paths" as Href)
      }
    />
  );
}
