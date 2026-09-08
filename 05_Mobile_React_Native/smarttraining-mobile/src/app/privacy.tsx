import { Href, router } from "expo-router";

import PrivacyScreen from "../screens/privacy/PrivacyScreen";

export default function PrivacyRoute() {
  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/" as Href);
  }

  return <PrivacyScreen onBack={handleBack} />;
}