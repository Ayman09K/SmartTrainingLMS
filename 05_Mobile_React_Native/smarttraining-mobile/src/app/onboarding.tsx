import {
  router,
  Stack,
} from "expo-router";

import OnboardingScreen from "../screens/onboarding/OnboardingScreen";

export default function OnboardingRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: "fade",
        }}
      />

      <OnboardingScreen
        onFinished={() => {
          /**
           * Très important :
           *
           * ce paramètre indique à index.tsx
           * de ne PAS afficher le splash
           * une deuxième fois.
           */
          router.replace(
            "/?skipOnboarding=1",
          );
        }}
      />
    </>
  );
}