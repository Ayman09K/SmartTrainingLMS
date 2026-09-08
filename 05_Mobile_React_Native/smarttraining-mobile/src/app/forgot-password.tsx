import ScreenContainer from "../components/ScreenContainer";
import {
  Href,
  Stack,
  router,
} from "expo-router";

import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";

export default function ForgotPasswordRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <ScreenContainer edges={["top", "right", "bottom", "left"]}>
        <ForgotPasswordScreen
          onBackToLogin={() =>
            router.replace("/" as Href)
          }
        />
      </ScreenContainer>
    </>
  );
}