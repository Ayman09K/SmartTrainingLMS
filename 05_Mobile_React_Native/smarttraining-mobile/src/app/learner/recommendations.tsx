import { Href, router } from "expo-router";
import LearnerRecommendationsScreen from "../../screens/learner/LearnerRecommendationsScreen";

export default function LearnerRecommendationsRoute() {
  return (
    <LearnerRecommendationsScreen
      onOpenTraining={(trainingId) =>
        router.push(
          `/learner/training-detail?trainingId=${trainingId}` as Href,
        )
      }
      onBackHome={() => router.replace("/learner" as Href)}
    />
  );
}