import { Href, router } from "expo-router";
import LearnerProgressScreen from "../../../screens/learner/LearnerProgressScreen";

export default function LearnerProgressRoute() {
  return (
    <LearnerProgressScreen
      onOpenTraining={(trainingId) =>
        router.push(
          `/learner/training-detail?trainingId=${trainingId}` as Href,
        )
      }
      onOpenRecommendations={() =>
        router.push("/learner/recommendations" as Href)
      }
      onBackHome={() => router.replace("/learner" as Href)}
    />
  );
}