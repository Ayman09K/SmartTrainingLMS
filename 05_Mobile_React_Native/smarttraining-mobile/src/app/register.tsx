import ScreenContainer from "../components/ScreenContainer";
import { Href, router } from "expo-router";
import RegisterScreen from "../screens/auth/RegisterScreen";
import { removeToken } from "../storage/tokenStorage";

export default function RegisterRoute() {
  async function handleBackToLogin() {
    await removeToken();
    router.replace("/" as Href);
  }

  return (
    <ScreenContainer edges={["top", "right", "bottom", "left"]}>
      <RegisterScreen
        onBackToLogin={() => void handleBackToLogin()}
        onOpenPrivacy={() => router.push("/privacy" as Href)}
      />
    </ScreenContainer>
  );
}