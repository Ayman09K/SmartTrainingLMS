import { Href, router } from "expo-router";

import LearnerProfileScreen from "../../../screens/learner/LearnerProfileScreen";
import { removeToken } from "../../../storage/tokenStorage";

export default function LearnerProfileRoute() {

  async function handleLogout() {
    await removeToken();
    router.replace("/");
  }

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

      onLogout={() => void handleLogout()}

    />

  );
}
