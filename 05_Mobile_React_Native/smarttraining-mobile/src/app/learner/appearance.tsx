import { Href, router } from "expo-router";

import LearnerAppearanceScreen from "../../screens/learner/LearnerAppearanceScreen";

export default function LearnerAppearanceRoute() {
  return (
    <LearnerAppearanceScreen
      onBack={() => router.replace("/learner/profile" as Href)}
    />
  );
}