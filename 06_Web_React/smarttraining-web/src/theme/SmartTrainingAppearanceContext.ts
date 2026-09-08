import { createContext } from "react";
import type {
  SmartTrainingAccent,
  SmartTrainingAppearance,
  SmartTrainingThemeMode,
} from "./appearance";

export type SmartTrainingPreferenceStatus =
  | "IDLE"
  | "LOADING"
  | "SYNCED"
  | "ERROR";

export type SmartTrainingAppearanceContextValue = {
  appearance: SmartTrainingAppearance;
  preferenceStatus: SmartTrainingPreferenceStatus;
  preferenceError: string | null;
  setAppearance: (appearance: SmartTrainingAppearance) => void;
  setThemeMode: (themeMode: SmartTrainingThemeMode) => void;
  setAccent: (accent: SmartTrainingAccent) => void;
  resetAppearance: () => void;
  syncPreferencesFromServer: () => Promise<SmartTrainingAppearance | null>;
  savePreferencesToServer: (
    appearance: SmartTrainingAppearance,
  ) => Promise<SmartTrainingAppearance>;
};

export const SmartTrainingAppearanceContext =
  createContext<SmartTrainingAppearanceContextValue | null>(null);