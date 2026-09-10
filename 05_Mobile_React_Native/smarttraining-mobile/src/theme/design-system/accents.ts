import {
  SmartTrainingAccentName,
  SmartTrainingThemeName,
} from "./types";

export type SmartTrainingAccentDefinition = {
  accent: string;
  accentForeground: string;
  focusRing: string;
};

/*
 * ============================================================
 * MODERN
 * ============================================================
 */

const modernAccents: Record<
  SmartTrainingAccentName,
  SmartTrainingAccentDefinition
> = {
  BLUE: {
    accent: "#2563EB",
    accentForeground: "#FFFFFF",
    focusRing: "#3B82F6",
  },

  VIOLET: {
    accent: "#7C3AED",
    accentForeground: "#FFFFFF",
    focusRing: "#8B5CF6",
  },

  GREEN: {
    accent: "#12B76A",
    accentForeground: "#FFFFFF",
    focusRing: "#32D583",
  },

  ORANGE: {
    accent: "#F79009",
    accentForeground: "#FFFFFF",
    focusRing: "#FDB022",
  },
};

/*
 * ============================================================
 * CORPORATE
 * ============================================================
 */

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

/*
 * ============================================================
 * DARK
 * ============================================================
 */

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

/*
 * ============================================================
 * ACCESSIBLE
 * ============================================================
 */

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

/*
 * Liste des accents disponibles dans l'application.
 */

export const smartTrainingAccentNames: SmartTrainingAccentName[] = [
  "BLUE",
  "VIOLET",
  "GREEN",
  "ORANGE",
];

/*
 * IMPORTANT :
 * violet devient maintenant la couleur par défaut.
 */

export const defaultSmartTrainingAccentName: SmartTrainingAccentName =
  "VIOLET";

/*
 * Résolution de l'accent selon le thème.
 */

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