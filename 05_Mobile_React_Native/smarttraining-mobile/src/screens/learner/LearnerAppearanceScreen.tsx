import { SymbolView } from "expo-symbols";
import { Stack } from "expo-router";
import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import ScreenContainer from "../../components/ScreenContainer";
import {
  resolveSmartTrainingAccent,
  smartTrainingAccentNames,
} from "../../theme/design-system/accents";
import {
  accentLabel,
  serverStatusLabel,
} from "../../theme/design-system/labels";
import { smartTrainingThemes } from "../../theme/design-system/themes";
import {
  SmartTrainingAccentName,
  SmartTrainingThemeName,
} from "../../theme/design-system/types";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

type Props = {
  onBack: () => void;
};

const themeNames: SmartTrainingThemeName[] = [
  "MODERN",
  "CORPORATE",
  "DARK",
  "ACCESSIBLE",
];

function errorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return "Impossible d'enregistrer les preferences.";
  }

  const data = error.response?.data;

  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof data.message === "string" &&
    data.message.trim()
  ) {
    return data.message;
  }

  return "Impossible d'enregistrer les preferences.";
}

function themeDescription(name: SmartTrainingThemeName): string {
  switch (name) {
    case "MODERN":
      return "Chaleureux, doux et contemporain";
    case "CORPORATE":
      return "Sobre, structuré et professionnel";
    case "DARK":
      return "Sombre, confortable et contrasté";
    case "ACCESSIBLE":
      return "Contraste renforcé et lecture facilitée";
    default:
      return "";
  }
}

export default function LearnerAppearanceScreen({ onBack }: Props) {
  const {
    theme,
    themeName,
    accentName,
    serverStatus,
    setThemeName,
    setAccentName,
    syncPreferencesFromServer,
    savePreferencesToServer,
  } = useSmartTrainingTheme();

  const [initialTheme, setInitialTheme] =
    useState<SmartTrainingThemeName>(themeName);
  const [initialAccent, setInitialAccent] =
    useState<SmartTrainingAccentName>(accentName);
  const [saving, setSaving] = useState(false);
  const [loadingServer, setLoadingServer] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void syncPreferencesFromServer()
      .then((preferences) => {
        if (!active || !preferences) return;
        setInitialTheme(preferences.theme);
        setInitialAccent(preferences.accentColor);
      })
      .catch(() => {
        if (active) {
          setError(
            "Le serveur est indisponible. Le cache local reste affiche.",
          );
        }
      })
      .finally(() => {
        if (active) setLoadingServer(false);
      });

    return () => {
      active = false;
    };
  }, [syncPreferencesFromServer]);

  const dirty =
    themeName !== initialTheme || accentName !== initialAccent;

  const selectedThemeDefinition = smartTrainingThemes[themeName];
  const currentAccent = useMemo(
    () => resolveSmartTrainingAccent(themeName, accentName),
    [accentName, themeName],
  );

  async function save(): Promise<void> {
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const saved = await savePreferencesToServer(themeName, accentName);
      setInitialTheme(saved.theme);
      setInitialAccent(saved.accentColor);
      setSuccess("Préférences d'apparence enregistrées.");
    } catch (saveError: unknown) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function back(): Promise<void> {
    if (dirty) {
      try {
        await syncPreferencesFromServer();
      } catch {
        setThemeName(initialTheme);
        setAccentName(initialAccent);
      }
    }

    onBack();
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retour à Mon compte"
              hitSlop={6}
              onPress={() => void back()}
              android_ripple={{ color: "transparent" }}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                marginLeft: 2,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
                backgroundColor: pressed
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(255,255,255,0.10)",
              })}
            >
              <SymbolView
                name={{
                  ios: "chevron.left",
                  android: "chevron_left",
                  web: "chevron_left",
                }}
                tintColor={theme.colors.headerForeground}
                size={24}
                weight="bold"
              />
            </Pressable>
          ),
        }}
      />
      <ScreenContainer>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingBottom: 22 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full self-center" style={{ maxWidth: 820 }}>
          <View
            className="overflow-hidden rounded-[22px] border"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: theme.shape.shadowOpacity,
              shadowRadius: 14,
              elevation: 2,
            }}
          >
            <View className="h-1.5" style={{ backgroundColor: theme.colors.accent }} />
            <View className="relative overflow-hidden px-4 py-3.5">
              <View
                className="absolute -right-12 -top-14 h-32 w-32 rounded-full"
                style={{ backgroundColor: theme.colors.surfaceSoft }}
              />
              <View className="flex-row items-center">
                <View
                  className="h-12 w-12 items-center justify-center rounded-[16px]"
                  style={{ backgroundColor: theme.colors.surfaceSoft }}
                >
                  <SymbolView
                    name={{ ios: "paintpalette.fill", android: "palette", web: "palette" }}
                    tintColor={theme.colors.accent}
                    size={22}
                    weight="bold"
                  />
                </View>
                <View className="ml-3 min-w-0 flex-1 pr-2">
                  <Text
                    className="text-[10px] font-black uppercase tracking-[0.9px]"
                    style={{ color: theme.colors.accent }}
                  >
                    Personnalisation
                  </Text>
                  <Text
                    className="mt-0.5 text-[22px] font-black leading-[27px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    Apparence
                  </Text>
                  <Text
                    className="mt-1 text-[12px] leading-[18px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Choisis un style qui te ressemble. Les changements sont visibles immédiatement.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {loadingServer ? (
            <View
              className="mt-2.5 flex-row items-center rounded-[15px] border px-3.5 py-2.5"
              style={{
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.border,
              }}
            >
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text
                className="ml-2.5 text-[13px] font-bold"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Synchronisation avec ton compte…
              </Text>
            </View>
          ) : null}

          {success ? (
            <View
              className="mt-2.5 flex-row items-center rounded-[15px] border px-3.5 py-2.5"
              style={{
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.success,
              }}
            >
              <SymbolView
                name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }}
                tintColor={theme.colors.success}
                size={22}
                weight="bold"
              />
              <Text
                className="ml-2.5 flex-1 text-[13px] font-black"
                style={{ color: theme.colors.success }}
              >
                {success}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View
              className="mt-3 flex-row items-start rounded-[16px] border px-3.5 py-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.danger,
              }}
            >
              <SymbolView
                name={{ ios: "exclamationmark.triangle.fill", android: "warning", web: "warning" }}
                tintColor={theme.colors.danger}
                size={22}
                weight="bold"
              />
              <Text
                className="ml-2.5 flex-1 text-[13px] font-bold leading-[18px]"
                style={{ color: theme.colors.danger }}
              >
                {error}
              </Text>
            </View>
          ) : null}

          <View className="mt-4">
            <Text
              className="text-[18px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              Style de l’interface
            </Text>
            <Text
              className="mt-1 text-[12px] leading-[18px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              Chaque style applique ses propres surfaces, contrastes et formes.
            </Text>

            <View className="mt-2.5 flex-row flex-wrap justify-between gap-y-2.5">
              {themeNames.map((candidate) => {
                const selected = candidate === themeName;
                const definition = smartTrainingThemes[candidate];
                const candidateAccent = resolveSmartTrainingAccent(
                  candidate,
                  accentName,
                );

                return (
                  <Pressable
                    key={candidate}
                    accessibilityRole="button"
                    accessibilityLabel={`Thème ${definition.label}`}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setSuccess("");
                      setError("");
                      setThemeName(candidate);
                    }}
                    android_ripple={{ color: "transparent" }}
                    className="overflow-hidden rounded-[18px] border p-2.5"
                    style={{
                      width: "48.5%",
                      minHeight: 150,
                      backgroundColor: selected
                        ? theme.colors.surface
                        : theme.colors.surfaceElevated,
                      borderColor: selected
                        ? theme.colors.accent
                        : theme.colors.border,
                      borderWidth: selected ? 2 : 1,
                    }}
                  >
                    <View
                      className="h-[58px] overflow-hidden rounded-[13px] border p-2"
                      style={{
                        backgroundColor: definition.colors.background,
                        borderColor: definition.colors.border,
                      }}
                    >
                      <View className="flex-row items-center justify-between">
                        <View
                          className="h-2.5 w-14 rounded-full"
                          style={{ backgroundColor: definition.colors.foreground }}
                        />
                        <View
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: candidateAccent.accent }}
                        />
                      </View>
                      <View
                        className="mt-2 h-7 rounded-[9px] border"
                        style={{
                          backgroundColor: definition.colors.surface,
                          borderColor: definition.colors.border,
                        }}
                      />
                    </View>

                    <View className="mt-2 flex-row items-start justify-between">
                      <View className="min-w-0 flex-1 pr-2">
                        <Text
                          className="text-[13px] font-black"
                          style={{ color: theme.colors.foreground }}
                        >
                          {definition.label}
                        </Text>
                        <Text
                          className="mt-0.5 text-[10px] leading-[14px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {themeDescription(candidate)}
                        </Text>
                      </View>

                      <View
                        className="h-6 w-6 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: selected
                            ? theme.colors.accent
                            : theme.colors.surfaceSoft,
                        }}
                      >
                        {selected ? (
                          <SymbolView
                            name={{ ios: "checkmark", android: "check", web: "check" }}
                            tintColor={theme.colors.accentForeground}
                            size={11}
                            weight="bold"
                          />
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="mt-4">
            <Text
              className="text-[18px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              Couleur d’accent
            </Text>
            <Text
              className="mt-1 text-[12px] leading-[18px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              Elle colore les actions principales, les états actifs et les repères visuels.
            </Text>

            <View className="mt-2.5 flex-row flex-wrap justify-between gap-y-2">
              {smartTrainingAccentNames.map((candidate) => {
                const selected = candidate === accentName;
                const visual = resolveSmartTrainingAccent(themeName, candidate);

                return (
                  <Pressable
                    key={candidate}
                    accessibilityRole="button"
                    accessibilityLabel={`Couleur d’accent ${accentLabel(candidate)}`}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setSuccess("");
                      setError("");
                      setAccentName(candidate);
                    }}
                    android_ripple={{ color: "transparent" }}
                    className="flex-row items-center rounded-[15px] border px-3 py-2.5"
                    style={{
                      width: "48.5%",
                      backgroundColor: theme.colors.surface,
                      borderColor: selected
                        ? visual.accent
                        : theme.colors.border,
                      borderWidth: selected ? 2 : 1,
                    }}
                  >
                    <View
                      className="h-7 w-7 items-center justify-center rounded-full"
                      style={{ backgroundColor: visual.accent }}
                    >
                      {selected ? (
                        <SymbolView
                          name={{ ios: "checkmark", android: "check", web: "check" }}
                          tintColor={visual.accentForeground}
                          size={12}
                          weight="bold"
                        />
                      ) : null}
                    </View>
                    <Text
                      className="ml-2 text-[12px] font-black"
                      style={{ color: theme.colors.foreground }}
                    >
                      {accentLabel(candidate)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View
            className="mt-4 overflow-hidden rounded-[20px] border"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <View className="px-3.5 pb-1.5 pt-3.5">
              <Text
                className="text-[10px] font-black uppercase tracking-[0.8px]"
                style={{ color: theme.colors.accent }}
              >
                Aperçu en direct
              </Text>
              <Text
                className="mt-1 text-[17px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                {selectedThemeDefinition.label} · {accentLabel(accentName)}
              </Text>
            </View>

            <View
              className="m-2.5 rounded-[16px] p-3"
              style={{ backgroundColor: theme.colors.background }}
            >
              <View
                className="rounded-[14px] border p-2.5"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }}
              >
                <View className="flex-row items-center">
                  <View
                    className="h-9 w-9 items-center justify-center rounded-[11px]"
                    style={{ backgroundColor: theme.colors.surfaceSoft }}
                  >
                    <SymbolView
                      name={{ ios: "sparkles", android: "auto_awesome", web: "auto_awesome" }}
                      tintColor={theme.colors.accent}
                      size={17}
                      weight="bold"
                    />
                  </View>
                  <View className="ml-3 flex-1">
                    <View
                      className="h-3 w-28 rounded-full"
                      style={{ backgroundColor: theme.colors.foreground }}
                    />
                    <View
                      className="mt-2 h-2.5 w-44 max-w-full rounded-full"
                      style={{ backgroundColor: theme.colors.border }}
                    />
                  </View>
                </View>

                <View className="mt-3 flex-row items-center justify-between">
                  <View
                    className="h-8 w-[48%] rounded-[11px]"
                    style={{ backgroundColor: theme.colors.surfaceSoft }}
                  />
                  <View
                    className="h-8 w-[48%] rounded-[11px]"
                    style={{ backgroundColor: currentAccent.accent }}
                  />
                </View>
              </View>
            </View>
          </View>

          <View
            className="mt-3 flex-row items-center justify-between rounded-[15px] border px-3.5 py-2.5"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <View className="min-w-0 flex-1 pr-3">
              <Text
                className="text-[12px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Synchronisation
              </Text>
              <Text
                className="mt-0.5 text-[11px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Serveur : {serverStatusLabel(serverStatus)}
              </Text>
            </View>
            <View
              className="rounded-full px-2.5 py-1.5"
              style={{ backgroundColor: theme.colors.surfaceSoft }}
            >
              <Text
                className="text-[10px] font-black"
                style={{ color: dirty ? theme.colors.warning : theme.colors.success }}
              >
                {dirty ? "À enregistrer" : "À jour"}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enregistrer mes préférences d’apparence"
            accessibilityState={{ disabled: saving || !dirty }}
            disabled={saving || !dirty}
            onPress={() => void save()}
            android_ripple={{ color: "transparent" }}
            className="mt-3.5 min-h-[50px] flex-row items-center justify-center rounded-[15px] px-4"
            style={{
              backgroundColor:
                saving || !dirty
                  ? theme.colors.surfaceSoft
                  : theme.colors.accent,
              opacity: saving ? 0.75 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.foregroundMuted} />
            ) : (
              <SymbolView
                name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }}
                tintColor={
                  dirty
                    ? theme.colors.accentForeground
                    : theme.colors.foregroundMuted
                }
                size={22}
                weight="bold"
              />
            )}
            <Text
              className="ml-2 text-[13px] font-black"
              style={{
                color:
                  saving || !dirty
                    ? theme.colors.foregroundMuted
                    : theme.colors.accentForeground,
              }}
            >
              {saving ? "Enregistrement…" : "Enregistrer l’apparence"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      </ScreenContainer>
    </>
  );
}
