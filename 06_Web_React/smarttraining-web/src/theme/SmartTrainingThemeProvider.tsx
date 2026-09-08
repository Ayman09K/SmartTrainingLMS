import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import {
  getMyAppearancePreferences,
  updateMyAppearancePreferences,
} from "../api/preferencesApi";
import { getApiErrorMessage } from "../api/apiClient";
import { useAuth } from "../features/auth/AuthContext";
import {
  DEFAULT_SMART_TRAINING_APPEARANCE,
  normalizeSmartTrainingAppearance,
  type SmartTrainingAccent,
  type SmartTrainingAppearance,
  type SmartTrainingThemeMode,
} from "./appearance";
import {
  SmartTrainingAppearanceContext,
  type SmartTrainingAppearanceContextValue,
  type SmartTrainingPreferenceStatus,
} from "./SmartTrainingAppearanceContext";
import { createSmartTrainingTheme } from "./createSmartTrainingTheme";

type SmartTrainingThemeProviderProps = PropsWithChildren<{
  initialAppearance?: Partial<SmartTrainingAppearance>;
}>;

export function SmartTrainingThemeProvider({
  children,
  initialAppearance,
}: SmartTrainingThemeProviderProps) {
  const { token, loading: authLoading } = useAuth();

  const [appearance, setAppearanceState] = useState<SmartTrainingAppearance>(
    () => normalizeSmartTrainingAppearance(initialAppearance),
  );
  const [preferenceStatus, setPreferenceStatus] =
    useState<SmartTrainingPreferenceStatus>("IDLE");
  const [preferenceError, setPreferenceError] = useState<string | null>(null);

  const setAppearance = useCallback(
    (nextAppearance: SmartTrainingAppearance) => {
      setAppearanceState(normalizeSmartTrainingAppearance(nextAppearance));
    },
    [],
  );

  const setThemeMode = useCallback((themeMode: SmartTrainingThemeMode) => {
    setAppearanceState((current) => ({
      ...current,
      themeMode,
    }));
  }, []);

  const setAccent = useCallback((accent: SmartTrainingAccent) => {
    setAppearanceState((current) => ({
      ...current,
      accent,
    }));
  }, []);

  const resetAppearance = useCallback(() => {
    setAppearanceState(DEFAULT_SMART_TRAINING_APPEARANCE);
  }, []);

  const syncPreferencesFromServer = useCallback(async () => {
    if (!token) {
      setAppearanceState(DEFAULT_SMART_TRAINING_APPEARANCE);
      setPreferenceStatus("IDLE");
      setPreferenceError(null);
      return null;
    }

    setPreferenceStatus("LOADING");
    setPreferenceError(null);

    try {
      const serverPreferences = await getMyAppearancePreferences();
      const nextAppearance = normalizeSmartTrainingAppearance({
        themeMode: serverPreferences.theme,
        accent: serverPreferences.accentColor,
      });

      setAppearanceState(nextAppearance);
      setPreferenceStatus("SYNCED");
      return nextAppearance;
    } catch (error) {
      setPreferenceStatus("ERROR");
      setPreferenceError(getApiErrorMessage(error));
      throw error;
    }
  }, [token]);

  const savePreferencesToServer = useCallback(
    async (nextAppearance: SmartTrainingAppearance) => {
      if (!token) {
        const error = new Error("Session non authentifiee");
        setPreferenceStatus("ERROR");
        setPreferenceError(error.message);
        throw error;
      }

      const normalized = normalizeSmartTrainingAppearance(nextAppearance);

      setPreferenceStatus("LOADING");
      setPreferenceError(null);

      try {
        const serverPreferences = await updateMyAppearancePreferences({
          theme: normalized.themeMode,
          accentColor: normalized.accent,
        });

        const savedAppearance = normalizeSmartTrainingAppearance({
          themeMode: serverPreferences.theme,
          accent: serverPreferences.accentColor,
        });

        setAppearanceState(savedAppearance);
        setPreferenceStatus("SYNCED");
        return savedAppearance;
      } catch (error) {
        setPreferenceStatus("ERROR");
        setPreferenceError(getApiErrorMessage(error));
        throw error;
      }
    },
    [token],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!token) {
      setAppearanceState(DEFAULT_SMART_TRAINING_APPEARANCE);
      setPreferenceStatus("IDLE");
      setPreferenceError(null);
      return;
    }

    let active = true;

    setPreferenceStatus("LOADING");
    setPreferenceError(null);

    void getMyAppearancePreferences()
      .then((serverPreferences) => {
        if (!active) {
          return;
        }

        setAppearanceState(
          normalizeSmartTrainingAppearance({
            themeMode: serverPreferences.theme,
            accent: serverPreferences.accentColor,
          }),
        );
        setPreferenceStatus("SYNCED");
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setPreferenceStatus("ERROR");
        setPreferenceError(getApiErrorMessage(error));
      });

    return () => {
      active = false;
    };
  }, [authLoading, token]);

  const contextValue = useMemo<SmartTrainingAppearanceContextValue>(
    () => ({
      appearance,
      preferenceStatus,
      preferenceError,
      setAppearance,
      setThemeMode,
      setAccent,
      resetAppearance,
      syncPreferencesFromServer,
      savePreferencesToServer,
    }),
    [
      appearance,
      preferenceError,
      preferenceStatus,
      resetAppearance,
      savePreferencesToServer,
      setAccent,
      setAppearance,
      setThemeMode,
      syncPreferencesFromServer,
    ],
  );

  const theme = useMemo(
    () => createSmartTrainingTheme(appearance),
    [appearance],
  );

  return (
    <SmartTrainingAppearanceContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </SmartTrainingAppearanceContext.Provider>
  );
}