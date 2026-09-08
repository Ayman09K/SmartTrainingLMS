import type {
  SmartTrainingAccent,
  SmartTrainingThemeMode,
} from "./appearance";

export const smartTrainingTokens = {
  colors: {
    primary: "#2563eb",
    primaryDark: "#1d4ed8",
    primarySoft: "#dbeafe",
    background: "#f8fafc",
    surface: "#ffffff",
    surfaceSoft: "#f1f5f9",
    text: "#0f172a",
    textMuted: "#64748b",
    border: "#e2e8f0",
    success: "#16a34a",
    warning: "#d97706",
    danger: "#dc2626",
    info: "#0284c7",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    pill: 999,
  },
  shadow: {
    card: "0 12px 30px rgba(15, 23, 42, 0.08)",
    floating: "0 20px 50px rgba(15, 23, 42, 0.14)",
  },
  layout: {
    sidebarWidth: 270,
    topbarHeight: 72,
    contentMaxWidth: 1600,
  },
  motion: {
    fast: "140ms",
    standard: "200ms",
  },
  typography: {
    fontFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
} as const;

export const smartTrainingAccents: Record<
  SmartTrainingAccent,
  {
    main: string;
    dark: string;
    light: string;
    soft: string;
    contrastText: string;
  }
> = {
  BLUE: {
    main: "#2563eb",
    dark: "#1d4ed8",
    light: "#60a5fa",
    soft: "#dbeafe",
    contrastText: "#ffffff",
  },
  VIOLET: {
    main: "#7c3aed",
    dark: "#6d28d9",
    light: "#a78bfa",
    soft: "#ede9fe",
    contrastText: "#ffffff",
  },
  GREEN: {
    main: "#15803d",
    dark: "#166534",
    light: "#4ade80",
    soft: "#dcfce7",
    contrastText: "#ffffff",
  },
  ORANGE: {
    main: "#c2410c",
    dark: "#9a3412",
    light: "#fb923c",
    soft: "#ffedd5",
    contrastText: "#ffffff",
  },
};

export const smartTrainingThemeProfiles: Record<
  SmartTrainingThemeMode,
  {
    paletteMode: "light" | "dark";
    background: string;
    paper: string;
    surfaceSoft: string;
    text: string;
    textMuted: string;
    border: string;
    radius: number;
    cardShadow: string;
    fontScale: number;
    highContrast: boolean;
  }
> = {
  MODERN: {
    paletteMode: "light",
    background: "#f8fafc",
    paper: "#ffffff",
    surfaceSoft: "#f1f5f9",
    text: "#0f172a",
    textMuted: "#64748b",
    border: "#e2e8f0",
    radius: 18,
    cardShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
    fontScale: 1,
    highContrast: false,
  },
  CORPORATE: {
    paletteMode: "light",
    background: "#f4f6f8",
    paper: "#ffffff",
    surfaceSoft: "#eef2f6",
    text: "#111827",
    textMuted: "#4b5563",
    border: "#d1d5db",
    radius: 10,
    cardShadow: "0 8px 22px rgba(15, 23, 42, 0.07)",
    fontScale: 1,
    highContrast: false,
  },
  DARK: {
    paletteMode: "dark",
    background: "#0b1220",
    paper: "#111827",
    surfaceSoft: "#172033",
    text: "#f8fafc",
    textMuted: "#cbd5e1",
    border: "#334155",
    radius: 18,
    cardShadow: "0 16px 38px rgba(0, 0, 0, 0.32)",
    fontScale: 1,
    highContrast: false,
  },
  ACCESSIBLE: {
    paletteMode: "light",
    background: "#ffffff",
    paper: "#ffffff",
    surfaceSoft: "#f3f4f6",
    text: "#000000",
    textMuted: "#303030",
    border: "#4b5563",
    radius: 8,
    cardShadow: "0 0 0 1px rgba(0, 0, 0, 0.28)",
    fontScale: 1.08,
    highContrast: true,
  },
};

export type SmartTrainingTokens = typeof smartTrainingTokens;