import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  SmartTrainingAccentName,
  SmartTrainingThemeName,
} from "../design-system/types";

const APPEARANCE_CACHE_KEY =
  "smarttraining_ui_appearance_cache_v1";

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

export type CachedAppearancePreferences = {
  version: 1;
  themeName: SmartTrainingThemeName;
  accentName: SmartTrainingAccentName;
};

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

export async function loadAppearanceCache():
  Promise<CachedAppearancePreferences | null> {
  const raw = await AsyncStorage.getItem(APPEARANCE_CACHE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      raw,
    ) as Partial<CachedAppearancePreferences>;

    if (
      parsed.version !== 1 ||
      !isThemeName(parsed.themeName) ||
      !isAccentName(parsed.accentName)
    ) {
      await AsyncStorage.removeItem(APPEARANCE_CACHE_KEY);
      return null;
    }

    return {
      version: 1,
      themeName: parsed.themeName,
      accentName: parsed.accentName,
    };
  }
  catch {
    await AsyncStorage.removeItem(APPEARANCE_CACHE_KEY);
    return null;
  }
}

export async function saveAppearanceCache(
  themeName: SmartTrainingThemeName,
  accentName: SmartTrainingAccentName,
): Promise<void> {
  const value: CachedAppearancePreferences = {
    version: 1,
    themeName,
    accentName,
  };

  await AsyncStorage.setItem(
    APPEARANCE_CACHE_KEY,
    JSON.stringify(value),
  );
}

export async function clearAppearanceCache(): Promise<void> {
  await AsyncStorage.removeItem(APPEARANCE_CACHE_KEY);
}