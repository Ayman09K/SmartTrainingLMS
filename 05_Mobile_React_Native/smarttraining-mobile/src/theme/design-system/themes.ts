import {
  SmartTrainingThemeDefinition,
  SmartTrainingThemeName,
} from "./types";

export const smartTrainingThemes: Record<
  SmartTrainingThemeName,
  SmartTrainingThemeDefinition
> = {
  MODERN: {
    name: "MODERN",

    label: "Moderne",

    description:
      "Interface moderne et chaleureuse avec fond beige, cartes blanches et accent violet.",

    dark: false,

    colors: {
      /*
       * Fond principal beige chaud.
       */
      background: "#F8F6F3",

      /*
       * Cartes principales.
       */
      surface: "#FFFFFF",

      /*
       * Violet très doux :
       * onglet actif, badges, petites zones secondaires.
       */
      surfaceSoft: "#F3EEFF",

      /*
       * Surface élevée.
       */
      surfaceElevated: "#FFFFFF",

      /*
       * Texte principal.
       */
      foreground: "#111827",

      /*
       * Texte secondaire.
       */
      foregroundMuted: "#667085",

      /*
       * Texte discret.
       */
      foregroundSubtle: "#98A2B3",

      /*
       * Bordure légèrement chaude
       * pour bien fonctionner avec le beige.
       */
      border: "#E7E2EB",

      /*
       * Violet principal.
       */
      accent: "#7C3AED",

      /*
       * Texte sur fond violet.
       */
      accentForeground: "#FFFFFF",

      /*
       * États.
       */
      success: "#16A36A",

      warning: "#D97706",

      danger: "#DC2626",

      info: "#2563EB",

      /*
       * Texte sur badges colorés.
       */
      statusForeground: "#FFFFFF",

      /*
       * Focus.
       */
      focusRing: "#8B5CF6",

      /*
       * Header bleu nuit.
       */
      headerBackground: "#0F172A",

      headerForeground: "#FFFFFF",

      /*
       * Ombres.
       */
      shadow: "#0F172A",
    },

    shape: {
      /*
       * Cartes modernes.
       */
      cardRadius: 20,

      /*
       * Boutons / inputs.
       */
      controlRadius: 14,

      /*
       * Cible tactile confortable.
       */
      minTouchTarget: 46,

      /*
       * Bordure fine.
       */
      borderWidth: 1,

      /*
       * Padding des cartes.
       */
      cardPadding: 18,

      /*
       * Espacement entre sections.
       */
      sectionGap: 20,

      /*
       * Ombre légère.
       */
      shadowOpacity: 0.06,
    },
  },

  CORPORATE: {
    name: "CORPORATE",

    label: "Entreprise",

    description:
      "Interface entreprise dense, structuree et angulaire, en bleu acier.",

    dark: false,

    colors: {
      background: "#EAF0F5",

      surface: "#FFFFFF",

      surfaceSoft: "#DCE6EF",

      surfaceElevated: "#F8FAFC",

      foreground: "#142437",

      foregroundMuted: "#3E556E",

      foregroundSubtle: "#60758A",

      border: "#9FB1C3",

      accent: "#174A7E",

      accentForeground: "#FFFFFF",

      success: "#176B45",

      warning: "#8A530E",

      danger: "#9D2D36",

      info: "#245F87",

      statusForeground: "#FFFFFF",

      focusRing: "#174A7E",

      headerBackground: "#102A43",

      headerForeground: "#FFFFFF",

      shadow: "#000000",
    },

    shape: {
      cardRadius: 8,

      controlRadius: 6,

      minTouchTarget: 44,

      borderWidth: 1,

      cardPadding: 18,

      sectionGap: 12,

      shadowOpacity: 0.02,
    },
  },

  DARK: {
    name: "DARK",

    label: "Sombre",

    description:
      "Interface sombre lisible, avec surfaces etagees et textes clairs.",

    dark: true,

    colors: {
      background: "#070D18",

      surface: "#111A2A",

      surfaceSoft: "#182338",

      surfaceElevated: "#152033",

      foreground: "#F8FAFC",

      foregroundMuted: "#C7D2E0",

      foregroundSubtle: "#94A3B8",

      border: "#34445A",

      accent: "#5AA9FF",

      accentForeground: "#07111F",

      success: "#3CCB7F",

      warning: "#F6B94A",

      danger: "#F27A82",

      info: "#51C4F1",

      statusForeground: "#07111F",

      focusRing: "#8BC5FF",

      headerBackground: "#020617",

      headerForeground: "#F8FAFC",

      shadow: "#000000",
    },

    shape: {
      cardRadius: 18,

      controlRadius: 12,

      minTouchTarget: 44,

      borderWidth: 1,

      cardPadding: 22,

      sectionGap: 16,

      shadowOpacity: 0.24,
    },
  },

  ACCESSIBLE: {
    name: "ACCESSIBLE",

    label: "Accessible",

    description:
      "Contraste maximal, bordures epaisses et grandes cibles tactiles.",

    dark: false,

    colors: {
      background: "#FFFFFF",

      surface: "#FFFFFF",

      surfaceSoft: "#FFF8D8",

      surfaceElevated: "#FFFFFF",

      foreground: "#000000",

      foregroundMuted: "#111111",

      foregroundSubtle: "#222222",

      border: "#000000",

      accent: "#003D99",

      accentForeground: "#FFFFFF",

      success: "#006B34",

      warning: "#7A4600",

      danger: "#A00000",

      info: "#005A85",

      statusForeground: "#FFFFFF",

      focusRing: "#FFB800",

      headerBackground: "#000000",

      headerForeground: "#FFFFFF",

      shadow: "#000000",
    },

    shape: {
      cardRadius: 4,

      controlRadius: 4,

      minTouchTarget: 52,

      borderWidth: 2,

      cardPadding: 24,

      sectionGap: 20,

      shadowOpacity: 0,
    },
  },
};

export const defaultSmartTrainingThemeName: SmartTrainingThemeName =
  "MODERN";