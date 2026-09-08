import {
  SmartTrainingAccentName,
  SmartTrainingThemeName,
} from "./types";
import {
  PreferenceServerStatus,
} from "../provider/SmartTrainingThemeProvider";

const themeLabels: Record<SmartTrainingThemeName, string> = {
  MODERN: "Moderne",
  CORPORATE: "Entreprise",
  DARK: "Sombre",
  ACCESSIBLE: "Accessible",
};

const accentLabels: Record<SmartTrainingAccentName, string> = {
  BLUE: "Bleu",
  VIOLET: "Violet",
  GREEN: "Vert",
  ORANGE: "Orange",
};

const serverStatusLabels: Record<PreferenceServerStatus, string> = {
  IDLE: "En attente",
  LOADING: "Synchronisation...",
  SYNCED: "Synchronis\u00E9",
  ERROR: "Erreur",
};

export function themeLabel(
  themeName: SmartTrainingThemeName,
): string {
  return themeLabels[themeName];
}

export function accentLabel(
  accentName: SmartTrainingAccentName,
): string {
  return accentLabels[accentName];
}

export function serverStatusLabel(
  status: PreferenceServerStatus,
): string {
  return serverStatusLabels[status];
}