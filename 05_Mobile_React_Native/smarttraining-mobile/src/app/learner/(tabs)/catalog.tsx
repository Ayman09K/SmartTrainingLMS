import { Href, router } from "expo-router";
import { useEffect, useState } from "react";
import LoadingState from "../../../components/LoadingState";
import TrainingCatalogScreen from "../../../screens/learner/TrainingCatalogScreen";
import { getConnectedUser } from "../../../storage/tokenStorage";

export default function LearnerCatalogRoute() {
  const [learnerId, setLearnerId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((user) => {
        if (!active) return;

        if (
          !user ||
          !["APPRENANT", "FORMATEUR", "ADMIN"].includes(user.role)
        ) {
          router.replace("/");
          return;
        }

        setLearnerId(user.userId);
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

  if (!learnerId) {
    return <LoadingState message="Ouverture du catalogue..." />;
  }

  return (
    <TrainingCatalogScreen
      learnerId={learnerId}
      onOpenTraining={(trainingId) =>
        router.push(
          `/learner/training-detail?trainingId=${trainingId}` as Href,
        )
      }
      onOpenLearningPath={(pathId) =>
        router.push(
          `/learner/learning-path-detail?pathId=${pathId}` as Href,
        )
      }
    />
  );
}