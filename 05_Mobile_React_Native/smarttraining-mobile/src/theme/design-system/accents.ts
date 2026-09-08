import {
  SmartTrainingAccentName,
  SmartTrainingThemeName,
} from "./types";

export type SmartTrainingAccentDefinition = {
  accent: string;
  accentForeground: string;
  focusRing: string;
};

const modernAccents: Record<
  SmartTrainingAccentName,
  SmartTrainingAccentDefinition
> = {
  BLUE: {
    accent: "#2563EB",
    accentForeground: "#FFFFFF",
    focusRing: "#2563EB",
  },
  VIOLET: {
    accent: "#7C3AED",
    accentForeground: "#FFFFFF",
    focusRing: "#7C3AED",
  },
  GREEN: {
    accent: "#15803D",
    accentForeground: "#FFFFFF",
    focusRing: "#15803D",
  },
  ORANGE: {
    accent: "#C2410C",
    accentForeground: "#FFFFFF",
    focusRing: "#C2410C",
  },
};

const corporateAccents: Record<
  SmartTrainingAccentName,
  SmartTrainingAccentDefinition
> = {
  BLUE: {
    accent: "#174A7E",
    accentForeground: "#FFFFFF",
    focusRing: "#174A7E",
  },
  VIOLET: {
    accent: "#5B3A8A",
    accentForeground: "#FFFFFF",
    focusRing: "#5B3A8A",
  },
  GREEN: {
    accent: "#176B45",
    accentForeground: "#FFFFFF",
    focusRing: "#176B45",
  },
  ORANGE: {
    accent: "#A64F0B",
    accentForeground: "#FFFFFF",
    focusRing: "#A64F0B",
  },
};

const darkAccents: Record<
  SmartTrainingAccentName,
  SmartTrainingAccentDefinition
> = {
  BLUE: {
    accent: "#5AA9FF",
    accentForeground: "#07111F",
    focusRing: "#8BC5FF",
  },
  VIOLET: {
    accent: "#C084FC",
    accentForeground: "#12051E",
    focusRing: "#D8B4FE",
  },
  GREEN: {
    accent: "#4ADE80",
    accentForeground: "#04150B",
    focusRing: "#86EFAC",
  },
  ORANGE: {
    accent: "#FB923C",
    accentForeground: "#1F0B02",
    focusRing: "#FDBA74",
  },
};

const accessibleAccents: Record<
  SmartTrainingAccentName,
  SmartTrainingAccentDefinition
> = {
  BLUE: {
    accent: "#003D99",
    accentForeground: "#FFFFFF",
    focusRing: "#FFB800",
  },
  VIOLET: {
    accent: "#54218C",
    accentForeground: "#FFFFFF",
    focusRing: "#FFB800",
  },
  GREEN: {
    accent: "#006B34",
    accentForeground: "#FFFFFF",
    focusRing: "#FFB800",
  },
  ORANGE: {
    accent: "#8A3F00",
    accentForeground: "#FFFFFF",
    focusRing: "#FFB800",
  },
};

export const smartTrainingAccentNames: SmartTrainingAccentName[] = [
  "BLUE",
  "VIOLET",
  "GREEN",
  "ORANGE",
];

export const defaultSmartTrainingAccentName: SmartTrainingAccentName =
  "BLUE";

export function resolveSmartTrainingAccent(
  themeName: SmartTrainingThemeName,
  accentName: SmartTrainingAccentName,
): SmartTrainingAccentDefinition {
  if (themeName === "DARK") {
    return darkAccents[accentName];
  }

  if (themeName === "ACCESSIBLE") {
    return accessibleAccents[accentName];
  }

  if (themeName === "CORPORATE") {
    return corporateAccents[accentName];
  }

  return modernAccents[accentName];
}