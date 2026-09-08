export const SMART_TRAINING_THEME_MODES = [
  "MODERN",
  "CORPORATE",
  "DARK",
  "ACCESSIBLE",
] as const;

export type SmartTrainingThemeMode =
  (typeof SMART_TRAINING_THEME_MODES)[number];

export const SMART_TRAINING_ACCENTS = [
  "BLUE",
  "VIOLET",
  "GREEN",
  "ORANGE",
] as const;

export type SmartTrainingAccent =
  (typeof SMART_TRAINING_ACCENTS)[number];

export type SmartTrainingAppearance = {
  themeMode: SmartTrainingThemeMode;
  accent: SmartTrainingAccent;
};

export const DEFAULT_SMART_TRAINING_APPEARANCE: SmartTrainingAppearance = {
  themeMode: "MODERN",
  accent: "BLUE",
};

export function isSmartTrainingThemeMode(
  value: unknown,
): value is SmartTrainingThemeMode {
  return (
    typeof value === "string" &&
    SMART_TRAINING_THEME_MODES.includes(value as SmartTrainingThemeMode)
  );
}

export function isSmartTrainingAccent(
  value: unknown,
): value is SmartTrainingAccent {
  return (
    typeof value === "string" &&
    SMART_TRAINING_ACCENTS.includes(value as SmartTrainingAccent)
  );
}

export function normalizeSmartTrainingAppearance(
  value?: Partial<SmartTrainingAppearance> | null,
): SmartTrainingAppearance {
  return {
    themeMode: isSmartTrainingThemeMode(value?.themeMode)
      ? value.themeMode
      : DEFAULT_SMART_TRAINING_APPEARANCE.themeMode,
    accent: isSmartTrainingAccent(value?.accent)
      ? value.accent
      : DEFAULT_SMART_TRAINING_APPEARANCE.accent,
  };
}