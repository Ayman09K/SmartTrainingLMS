import { Href, router } from "expo-router";

import TrainerProfileScreen from "../../screens/trainer/TrainerProfileScreen";

export default function TrainerProfileRoute() {
  return (
    <TrainerProfileScreen
      onBackHome={() =>
        router.replace("/trainer" as Href)
      }
      onOpenAppearance={() =>
        router.push("/trainer/appearance" as Href)
      }
      onOpenPrivacy={() => router.push("/privacy" as Href)}
    />
  );
}