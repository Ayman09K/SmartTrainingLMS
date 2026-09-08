import { Href, router } from "expo-router";
import LearnerSessionsScreen from "../../screens/learner/LearnerSessionsScreen";

export default function LearnerSessionsRoute() {
  return (
    <LearnerSessionsScreen
      onBackHome={() => router.replace("/learner" as Href)}
    />
  );
}