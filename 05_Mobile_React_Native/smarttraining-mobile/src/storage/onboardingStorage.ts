import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETED_KEY =
  "smarttraining_onboarding_completed_v1";

export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const value =
      await AsyncStorage.getItem(
        ONBOARDING_COMPLETED_KEY,
      );

    return value === "1";
  } catch {
    return false;
  }
}

export async function completeOnboarding(): Promise<void> {
  await AsyncStorage.setItem(
    ONBOARDING_COMPLETED_KEY,
    "1",
  );
}