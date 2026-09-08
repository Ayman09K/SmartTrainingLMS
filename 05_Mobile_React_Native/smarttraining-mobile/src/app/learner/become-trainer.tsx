import { Href, router } from "expo-router";
import LearnerBecomeTrainerScreen from "../../screens/learner/LearnerBecomeTrainerScreen";

export default function LearnerBecomeTrainerRoute() {
  return (
    <LearnerBecomeTrainerScreen
      onBackHome={() => router.replace("/learner/profile" as Href)}
    />
  );
}