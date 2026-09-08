import { createTheme } from "@mui/material/styles";
import type { SmartTrainingAppearance } from "./appearance";
import {
  smartTrainingAccents,
  smartTrainingThemeProfiles,
  smartTrainingTokens,
} from "./tokens";

export function createSmartTrainingTheme(
  appearance: SmartTrainingAppearance,
) {
  const profile = smartTrainingThemeProfiles[appearance.themeMode];
  const accent = smartTrainingAccents[appearance.accent];

  const baseFontSize = 15 * profile.fontScale;

  return createTheme({
    cssVariables: true,
    spacing: 8,
    shape: {
      borderRadius: profile.radius,
    },
    palette: {
      mode: profile.paletteMode,
      primary: {
        main: accent.main,
        dark: accent.dark,
        light: accent.light,
        contrastText: accent.contrastText,
      },
      secondary: {
        main: appearance.accent === "VIOLET" ? "#2563eb" : "#7c3aed",
      },
      success: {
        main: "#15803d",
      },
      warning: {
        main: "#b45309",
      },
      error: {
        main: "#b91c1c",
      },
      info: {
        main: "#0369a1",
      },
      background: {
        default: profile.background,
        paper: profile.paper,
      },
      text: {
        primary: profile.text,
        secondary: profile.textMuted,
      },
      divider: profile.border,
    },
    typography: {
      fontFamily: smartTrainingTokens.typography.fontFamily,
      fontSize: baseFontSize,
      h1: {
        fontSize: `${2.25 * profile.fontScale}rem`,
        lineHeight: 1.15,
        fontWeight: 800,
        letterSpacing: "-0.035em",
      },
      h2: {
        fontSize: `${1.875 * profile.fontScale}rem`,
        lineHeight: 1.2,
        fontWeight: 800,
        letterSpacing: "-0.03em",
      },
      h3: {
        fontSize: `${1.5 * profile.fontScale}rem`,
        lineHeight: 1.25,
        fontWeight: 800,
        letterSpacing: "-0.02em",
      },
      h4: {
        fontSize: `${1.25 * profile.fontScale}rem`,
        lineHeight: 1.3,
        fontWeight: 800,
      },
      h5: {
        fontSize: `${1.0625 * profile.fontScale}rem`,
        lineHeight: 1.35,
        fontWeight: 800,
      },
      h6: {
        fontSize: `${0.9375 * profile.fontScale}rem`,
        lineHeight: 1.4,
        fontWeight: 800,
      },
      body1: {
        fontSize: `${0.9375 * profile.fontScale}rem`,
        lineHeight: 1.6,
      },
      body2: {
        fontSize: `${0.875 * profile.fontScale}rem`,
        lineHeight: 1.55,
      },
      button: {
        fontWeight: 750,
        textTransform: "none",
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            minHeight: "100%",
          },
          body: {
            minWidth: 320,
            minHeight: "100%",
            textRendering: "optimizeLegibility",
            backgroundColor: profile.background,
          },
          "#root": {
            minHeight: "100%",
          },
          "*:focus-visible": {
            outline: profile.highContrast
              ? `4px solid ${accent.main}`
              : `3px solid ${accent.main}`,
            outlineOffset: profile.highContrast ? 3 : 2,
          },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": {
              scrollBehavior: "auto !important",
              transitionDuration: "0.01ms !important",
              animationDuration: "0.01ms !important",
              animationIterationCount: "1 !important",
            },
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            minHeight: profile.highContrast ? 44 : 40,
            borderRadius: profile.highContrast ? 8 : Math.min(profile.radius, 12),
            paddingInline: 16,
            fontWeight: 750,
            textTransform: "none",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${profile.border}`,
            borderRadius: profile.radius,
            boxShadow: profile.cardShadow,
            backgroundImage: "none",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
          rounded: {
            borderRadius: profile.radius,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            minHeight: profile.highContrast ? 44 : undefined,
            borderRadius: profile.highContrast ? 8 : Math.min(profile.radius, 12),
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: profile.highContrast ? "medium" : "small",
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            minHeight: profile.highContrast ? 32 : undefined,
            fontWeight: 700,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: profile.radius,
          },
        },
      },
      MuiTooltip: {
        defaultProps: {
          arrow: true,
        },
      },
    },
  });
}