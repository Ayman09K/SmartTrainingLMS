import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../../components/LoadingState";
import LearningPathManagerListScreen from "../../../screens/learningPaths/LearningPathManagerListScreen";
import { getConnectedUser } from "../../../storage/tokenStorage";

export default function TrainerLearningPathsRoute() {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((user) => {
        if (!active) return;

        if (!user || user.role !== "FORMATEUR") {
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
    return <LoadingState message="Chargement des parcours..." />;
  }

  return (
    <LearningPathManagerListScreen
      role="FORMATEUR"
      onCreatePath={() =>
        router.push("/trainer/learning-paths/new" as Href)
      }
      onOpenPath={(pathId) =>
        router.push(
          `/trainer/learning-paths/${pathId}` as Href,
        )
      }
    />
  );
}