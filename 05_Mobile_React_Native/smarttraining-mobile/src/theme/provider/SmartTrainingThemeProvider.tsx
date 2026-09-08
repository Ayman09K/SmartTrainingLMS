import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "expo-router/react-navigation";
import { vars } from "nativewind";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";

import {
  getMyAppearancePreferences,
  updateMyAppearancePreferences,
  UserAppearancePreferences,
} from "../../api/preferencesApi";
import { getToken } from "../../storage/tokenStorage";
import {
  defaultSmartTrainingAccentName,
  resolveSmartTrainingAccent,
} from "../design-system/accents";
import {
  defaultSmartTrainingThemeName,
  smartTrainingThemes,
} from "../design-system/themes";
import {
  SmartTrainingAccentName,
  SmartTrainingThemeDefinition,
  SmartTrainingThemeName,
} from "../design-system/types";
import { smartTrainingTokens } from "../design-system/tokens";
import {
  loadAppearanceCache,
  saveAppearanceCache,
} from "../storage/appearanceCache";

export type PreferenceServerStatus =
  | "IDLE"
  | "LOADING"
  | "SYNCED"
  | "ERROR";

type SmartTrainingThemeContextValue = {
  themeName: SmartTrainingThemeName;
  accentName: SmartTrainingAccentName;
  theme: SmartTrainingThemeDefinition;
  tokens: typeof smartTrainingTokens;
  cacheHydrated: boolean;
  serverStatus: PreferenceServerStatus;
  setThemeName: (themeName: SmartTrainingThemeName) => void;
  setAccentName: (accentName: SmartTrainingAccentName) => void;
  syncPreferencesFromServer:
    () => Promise<UserAppearancePreferences | null>;
  savePreferencesToServer: (
    themeName: SmartTrainingThemeName,
    accentName: SmartTrainingAccentName,
  ) => Promise<UserAppearancePreferences>;
};

const SmartTrainingThemeContext =
  createContext<SmartTrainingThemeContextValue | null>(null);

function hexToRgbTriplet(hex: string): string {
  const normalized = hex.replace("#", "");

  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
    throw new Error(`Invalid theme color: ${hex}`);
  }

  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ].join(" ");
}

function variablesFor(theme: SmartTrainingThemeDefinition) {
  return vars({
    "--background": hexToRgbTriplet(theme.colors.background),
    "--surface": hexToRgbTriplet(theme.colors.surface),
    "--surface-soft": hexToRgbTriplet(theme.colors.surfaceSoft),
    "--surface-elevated": hexToRgbTriplet(
      theme.colors.surfaceElevated,
    ),
    "--foreground": hexToRgbTriplet(theme.colors.foreground),
    "--secondary-foreground": hexToRgbTriplet(
      theme.colors.foregroundMuted,
    ),
    "--muted-foreground": hexToRgbTriplet(
      theme.colors.foregroundMuted,
    ),
    "--border": hexToRgbTriplet(theme.colors.border),
    "--accent": hexToRgbTriplet(theme.colors.accent),
    "--accent-foreground": hexToRgbTriplet(
      theme.colors.accentForeground,
    ),
    "--success": hexToRgbTriplet(theme.colors.success),
    "--warning": hexToRgbTriplet(theme.colors.warning),
    "--danger": hexToRgbTriplet(theme.colors.danger),
    "--info": hexToRgbTriplet(theme.colors.info),
    "--focus-ring": hexToRgbTriplet(theme.colors.focusRing),
  });
}

export function SmartTrainingThemeProvider({
  children,
}: PropsWithChildren) {
  const [themeNameState, setThemeNameState] =
    useState<SmartTrainingThemeName>(
      defaultSmartTrainingThemeName,
    );

  const [accentNameState, setAccentNameState] =
    useState<SmartTrainingAccentName>(
      defaultSmartTrainingAccentName,
    );

  const [cacheHydrated, setCacheHydrated] = useState(false);

  const [serverStatus, setServerStatus] =
    useState<PreferenceServerStatus>("IDLE");

  const applyPreferences = useCallback(
    async (
      themeName: SmartTrainingThemeName,
      accentName: SmartTrainingAccentName,
    ) => {
      setThemeNameState(themeName);
      setAccentNameState(accentName);

      await saveAppearanceCache(
        themeName,
        accentName,
      );
    },
    [],
  );

  const syncPreferencesFromServer = useCallback(
    async (): Promise<UserAppearancePreferences | null> => {
      const token = await getToken();

      if (!token) {
        setServerStatus("IDLE");
        return null;
      }

      setServerStatus("LOADING");

      try {
        const serverPreferences =
          await getMyAppearancePreferences();

        await applyPreferences(
          serverPreferences.theme,
          serverPreferences.accentColor,
        );

        setServerStatus("SYNCED");
        return serverPreferences;
      }
      catch (error) {
        setServerStatus("ERROR");
        throw error;
      }
    },
    [applyPreferences],
  );

  const savePreferencesToServer = useCallback(
    async (
      themeName: SmartTrainingThemeName,
      accentName: SmartTrainingAccentName,
    ): Promise<UserAppearancePreferences> => {
      setServerStatus("LOADING");

      try {
        const serverPreferences =
          await updateMyAppearancePreferences({
            theme: themeName,
            accentColor: accentName,
          });

        await applyPreferences(
          serverPreferences.theme,
          serverPreferences.accentColor,
        );

        setServerStatus("SYNCED");
        return serverPreferences;
      }
      catch (error) {
        setServerStatus("ERROR");
        throw error;
      }
    },
    [applyPreferences],
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const cached = await loadAppearanceCache();

        if (!active) {
          return;
        }

        if (cached) {
          setThemeNameState(cached.themeName);
          setAccentNameState(cached.accentName);
        }
      }
      finally {
        if (active) {
          setCacheHydrated(true);
        }
      }

      try {
        const token = await getToken();

        if (!active || !token) {
          return;
        }

        setServerStatus("LOADING");

        const serverPreferences =
          await getMyAppearancePreferences();

        if (!active) {
          return;
        }

        setThemeNameState(serverPreferences.theme);
        setAccentNameState(serverPreferences.accentColor);

        await saveAppearanceCache(
          serverPreferences.theme,
          serverPreferences.accentColor,
        );

        if (active) {
          setServerStatus("SYNCED");
        }
      }
      catch {
        if (active) {
          setServerStatus("ERROR");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const setThemeName = useCallback(
    (nextThemeName: SmartTrainingThemeName) => {
      setThemeNameState(nextThemeName);

      void saveAppearanceCache(
        nextThemeName,
        accentNameState,
      );
    },
    [accentNameState],
  );

  const setAccentName = useCallback(
    (nextAccentName: SmartTrainingAccentName) => {
      setAccentNameState(nextAccentName);

      void saveAppearanceCache(
        themeNameState,
        nextAccentName,
      );
    },
    [themeNameState],
  );

  const theme = useMemo<SmartTrainingThemeDefinition>(() => {
    const baseTheme = smartTrainingThemes[themeNameState];

    const accent = resolveSmartTrainingAccent(
      themeNameState,
      accentNameState,
    );

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        accent: accent.accent,
        accentForeground: accent.accentForeground,
        focusRing: accent.focusRing,
      },
    };
  }, [accentNameState, themeNameState]);

  const nativeVariables = useMemo(
    () => variablesFor(theme),
    [theme],
  );

  const navigationTheme = useMemo(() => {
    const baseTheme = theme.dark ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      dark: theme.dark,
      colors: {
        ...baseTheme.colors,
        primary: theme.colors.accent,
        background: theme.colors.background,
        card: theme.colors.headerBackground,
        text: theme.colors.foreground,
        border: theme.colors.border,
        notification: theme.colors.danger,
      },
    };
  }, [theme]);

  const contextValue = useMemo(
    () => ({
      themeName: themeNameState,
      accentName: accentNameState,
      theme,
      tokens: smartTrainingTokens,
      cacheHydrated,
      serverStatus,
      setThemeName,
      setAccentName,
      syncPreferencesFromServer,
      savePreferencesToServer,
    }),
    [
      accentNameState,
      cacheHydrated,
      savePreferencesToServer,
      serverStatus,
      setAccentName,
      setThemeName,
      syncPreferencesFromServer,
      theme,
      themeNameState,
    ],
  );

  return (
    <SmartTrainingThemeContext.Provider value={contextValue}>
      <NavigationThemeProvider value={navigationTheme}>
        <View style={[styles.root, nativeVariables]}>
          {children}
        </View>
      </NavigationThemeProvider>
    </SmartTrainingThemeContext.Provider>
  );
}

export function useSmartTrainingTheme() {
  const context = useContext(SmartTrainingThemeContext);

  if (!context) {
    throw new Error(
      "useSmartTrainingTheme must be used inside SmartTrainingThemeProvider",
    );
  }

  return context;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});