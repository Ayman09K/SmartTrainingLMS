import { getData, putData } from "./apiClient";
import {
  isSmartTrainingAccent,
  isSmartTrainingThemeMode,
  type SmartTrainingAccent,
  type SmartTrainingThemeMode,
} from "../theme/appearance";

export type UserAppearancePreferences = {
  theme: SmartTrainingThemeMode;
  accentColor: SmartTrainingAccent;
};

function validatePreferences(value: unknown): UserAppearancePreferences {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid appearance preferences response");
  }

  const candidate = value as {
    theme?: unknown;
    accentColor?: unknown;
  };

  if (
    !isSmartTrainingThemeMode(candidate.theme) ||
    !isSmartTrainingAccent(candidate.accentColor)
  ) {
    throw new Error("Invalid appearance preferences values");
  }

  return {
    theme: candidate.theme,
    accentColor: candidate.accentColor,
  };
}

export async function getMyAppearancePreferences():
  Promise<UserAppearancePreferences> {
  const response = await getData<unknown>("/auth/me/preferences");
  return validatePreferences(response);
}

export async function updateMyAppearancePreferences(
  preferences: UserAppearancePreferences,
): Promise<UserAppearancePreferences> {
  const response = await putData<unknown, UserAppearancePreferences>(
    "/auth/me/preferences",
    {
      theme: preferences.theme,
      accentColor: preferences.accentColor,
    },
  );

  return validatePreferences(response);
}