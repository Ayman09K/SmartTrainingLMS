import { Href, router } from "expo-router";

import LearnerAppearanceScreen from "../../screens/learner/LearnerAppearanceScreen";

export default function TrainerAppearanceRoute() {
  return (
    <LearnerAppearanceScreen
      onBack={() =>
        router.replace("/trainer/profile" as Href)
      }
    />
  );
}