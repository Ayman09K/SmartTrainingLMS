import { useContext } from "react";
import { SmartTrainingAppearanceContext } from "./SmartTrainingAppearanceContext";

export function useSmartTrainingAppearance() {
  const context = useContext(SmartTrainingAppearanceContext);

  if (!context) {
    throw new Error(
      "useSmartTrainingAppearance doit etre utilise dans SmartTrainingThemeProvider",
    );
  }

  return context;
}