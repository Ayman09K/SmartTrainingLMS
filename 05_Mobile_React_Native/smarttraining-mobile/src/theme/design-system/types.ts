export type SmartTrainingAccentName =
  | "BLUE"
  | "VIOLET"
  | "GREEN"
  | "ORANGE";

export type SmartTrainingThemeName =
  | "MODERN"
  | "CORPORATE"
  | "DARK"
  | "ACCESSIBLE";

export type SmartTrainingThemeColors = {
  background: string;
  surface: string;
  surfaceSoft: string;
  surfaceElevated: string;
  foreground: string;
  foregroundMuted: string;
  foregroundSubtle: string;
  border: string;
  accent: string;
  accentForeground: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  statusForeground: string;
  focusRing: string;
  headerBackground: string;
  headerForeground: string;
  shadow: string;
};

export type SmartTrainingThemeShape = {
  cardRadius: number;
  controlRadius: number;
  minTouchTarget: number;
  borderWidth: number;
  cardPadding: number;
  sectionGap: number;
  shadowOpacity: number;
};

export type SmartTrainingThemeDefinition = {
  name: SmartTrainingThemeName;
  label: string;
  description: string;
  dark: boolean;
  colors: SmartTrainingThemeColors;
  shape: SmartTrainingThemeShape;
};