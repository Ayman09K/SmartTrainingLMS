import { Href, router } from "expo-router";

import LearnerProfileScreen from "../../../screens/learner/LearnerProfileScreen";

export default function LearnerProfileRoute() {
  return (
    <LearnerProfileScreen
      onBackHome={() => router.replace("/learner" as Href)}
      onOpenBecomeTrainer={() =>
        router.push("/learner/become-trainer" as Href)
      }
      onOpenAppearance={() =>
        router.push("/learner/appearance" as Href)
      }
      onOpenPrivacy={() =>
        router.push("/privacy" as Href)
      }
    />
  );
}
