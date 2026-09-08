import { apiClient } from "./apiClient";
import {
  SmartTrainingAccentName,
  SmartTrainingThemeName,
} from "../theme/design-system/types";

export type UserAppearancePreferences = {
  theme: SmartTrainingThemeName;
  accentColor: SmartTrainingAccentName;
};

const themeNames: SmartTrainingThemeName[] = [
  "MODERN",
  "CORPORATE",
  "DARK",
  "ACCESSIBLE",
];

const accentNames: SmartTrainingAccentName[] = [
  "BLUE",
  "VIOLET",
  "GREEN",
  "ORANGE",
];

function isThemeName(
  value: unknown,
): value is SmartTrainingThemeName {
  return themeNames.includes(value as SmartTrainingThemeName);
}

function isAccentName(
  value: unknown,
): value is SmartTrainingAccentName {
  return accentNames.includes(value as SmartTrainingAccentName);
}

function validatePreferences(
  value: unknown,
): UserAppearancePreferences {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid appearance preferences response");
  }

  const candidate = value as {
    theme?: unknown;
    accentColor?: unknown;
  };

  if (
    !isThemeName(candidate.theme) ||
    !isAccentName(candidate.accentColor)
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
  const response = await apiClient.get(
    "/auth/me/preferences",
  );

  return validatePreferences(response.data);
}

export async function updateMyAppearancePreferences(
  preferences: UserAppearancePreferences,
): Promise<UserAppearancePreferences> {
  const response = await apiClient.put(
    "/auth/me/preferences",
    {
      theme: preferences.theme,
      accentColor: preferences.accentColor,
    },
  );

  return validatePreferences(response.data);
}