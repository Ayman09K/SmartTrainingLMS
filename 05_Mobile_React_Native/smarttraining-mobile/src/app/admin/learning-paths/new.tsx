import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../../components/LoadingState";
import LearningPathManagerEditorScreen from "../../../screens/learningPaths/LearningPathManagerEditorScreen";
import { getConnectedUser } from "../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../types/auth";

export default function AdminLearningPathNewRoute() {
  const [user, setUser] = useState<ConnectedUser | null>(null);

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((connectedUser) => {
        if (!active) return;

        if (!connectedUser || connectedUser.role !== "ADMIN") {
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
      role="ADMIN"
      userId={user.userId}
      onBack={() =>
        router.replace("/admin/learning-paths" as Href)
      }
      onPathCreated={(pathId) =>
        router.replace(
          `/admin/learning-paths/${pathId}` as Href,
        )
      }
      onPathDeleted={() =>
        router.replace("/admin/learning-paths" as Href)
      }
    />
  );
}