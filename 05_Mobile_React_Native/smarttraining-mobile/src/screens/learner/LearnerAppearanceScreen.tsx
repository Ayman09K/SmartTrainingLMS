import ScreenContainer from "../../components/ScreenContainer";
import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { Text } from "../../components/nativewindui/Text";
import {
  smartTrainingAccentNames,
} from "../../theme/design-system/accents";
import {
  smartTrainingThemes,
} from "../../theme/design-system/themes";
import {
  SmartTrainingAccentName,
  SmartTrainingThemeName,
} from "../../theme/design-system/types";
import {
  accentLabel,
  serverStatusLabel,
} from "../../theme/design-system/labels";
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

export default function LearnerAppearanceScreen({
  onBack,
}: Props) {
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
        if (!active || !preferences) {
          return;
        }

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
        if (active) {
          setLoadingServer(false);
        }
      });

    return () => {
      active = false;
    };
  }, [syncPreferencesFromServer]);

  const dirty =
    themeName !== initialTheme ||
    accentName !== initialAccent;

  async function save(): Promise<void> {
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const saved = await savePreferencesToServer(
        themeName,
        accentName,
      );

      setInitialTheme(saved.theme);
      setInitialAccent(saved.accentColor);
      setSuccess("Pr\u00E9f\u00E9rences d'apparence enregistr\u00E9es.");
    }
    catch (saveError: unknown) {
      setError(errorMessage(saveError));
    }
    finally {
      setSaving(false);
    }
  }

  async function back(): Promise<void> {
    if (dirty) {
      try {
        await syncPreferencesFromServer();
      }
      catch {
        setThemeName(initialTheme);
        setAccentName(initialAccent);
      }
    }

    onBack();
  }

  const cardStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    borderWidth: theme.shape.borderWidth,
    padding: theme.shape.cardPadding,
  } as const;

  return (
    <ScreenContainer>
      <ScrollView
      style={{
        backgroundColor: theme.colors.background,
      }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.page}>
        <Pressable
          accessibilityRole="button"
            accessibilityLabel={"Retour \u00E0 Mon compte"}
            onPress={() => void back()}
          style={{
            alignItems: "center",
            alignSelf: "flex-start",
            borderColor: theme.colors.border,
            borderRadius: theme.shape.controlRadius,
            borderWidth: theme.shape.borderWidth,
            justifyContent: "center",
            minHeight: theme.shape.minTouchTarget,
            paddingHorizontal: 16,
          }}
        >
          <Text className="font-bold">
            Retour a Mon compte
          </Text>
        </Pressable>

        <View style={styles.header}>
          <Text variant="largeTitle">
            Apparence
          </Text>

          <Text color="secondary">
            {"Choisis le th\u00E8me et la couleur d'accent de ton espace."}
          </Text>
        </View>

        {loadingServer ? (
          <View
            style={[
              cardStyle,
              {
                backgroundColor: theme.colors.surfaceSoft,
              },
            ]}
          >
            <Text color="secondary">
              Synchronisation avec ton compte...
            </Text>
          </View>
        ) : null}

        {success ? (
          <View
            style={[
              cardStyle,
              {
                backgroundColor: theme.colors.accent,
                borderColor: theme.colors.accent,
              },
            ]}
          >
            <Text
              color="accentForeground"
              className="font-bold"
            >
              {success}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={[
              cardStyle,
              {
                backgroundColor: theme.colors.danger,
              },
            ]}
          >
            <Text
              color="statusForeground"
              className="font-bold"
            >
              {error}
            </Text>
          </View>
        ) : null}

        <View style={cardStyle}>
          <Text variant="title2">
            {"Th\u00E8me"}
          </Text>

          <Text color="secondary" className="mt-2">
            {"Le th\u00E8me change les surfaces, contrastes, rayons et densit\u00E9."}
          </Text>

          <View style={styles.options}>
            {themeNames.map((candidate) => {
              const selected = candidate === themeName;

              return (
                <Pressable
                  key={candidate}
                  accessibilityRole="button"
                accessibilityLabel={`Th\u00E8me ${candidate === "MODERN" ? "Moderne" : candidate === "CORPORATE" ? "Entreprise" : candidate === "DARK" ? "Sombre" : "Accessible"}`}
                accessibilityState={{ selected }}
                  onPress={() => {
                    setSuccess("");
                    setError("");
                    setThemeName(candidate);
                  }}
                  style={{
                    alignItems: "center",
                    backgroundColor: selected
                      ? theme.colors.accent
                      : theme.colors.surfaceSoft,
                    borderColor: selected
                      ? theme.colors.focusRing
                      : theme.colors.border,
                    borderRadius: theme.shape.controlRadius,
                    borderWidth: selected
                      ? Math.max(2, theme.shape.borderWidth)
                      : theme.shape.borderWidth,
                    justifyContent: "center",
                    minHeight: theme.shape.minTouchTarget,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text
                    color={
                      selected
                        ? "accentForeground"
                        : "primary"
                    }
                    className="font-bold"
                  >
                    {smartTrainingThemes[candidate].label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={cardStyle}>
          <Text variant="title2">
            {"Couleur d'accent"}
          </Text>

          <Text color="secondary" className="mt-2">
            {"L'accent colore les actions principales et les elements actifs."}
          </Text>

          <View style={styles.options}>
            {smartTrainingAccentNames.map((candidate) => {
              const selected = candidate === accentName;

              return (
                <Pressable
                  key={candidate}
                  accessibilityRole="button"
                accessibilityLabel={`Couleur d\u2019accent ${candidate === "BLUE" ? "Bleu" : candidate === "VIOLET" ? "Violet" : candidate === "GREEN" ? "Vert" : "Orange"}`}
                accessibilityState={{ selected }}
                  onPress={() => {
                    setSuccess("");
                    setError("");
                    setAccentName(candidate);
                  }}
                  style={{
                    alignItems: "center",
                    backgroundColor: selected
                      ? theme.colors.accent
                      : theme.colors.surfaceSoft,
                    borderColor: selected
                      ? theme.colors.focusRing
                      : theme.colors.border,
                    borderRadius: theme.shape.controlRadius,
                    borderWidth: selected
                      ? Math.max(2, theme.shape.borderWidth)
                      : theme.shape.borderWidth,
                    justifyContent: "center",
                    minHeight: theme.shape.minTouchTarget,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text
                    color={
                      selected
                        ? "accentForeground"
                        : "primary"
                    }
                    className="font-bold"
                  >
                    {accentLabel(candidate)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            cardStyle,
            {
              backgroundColor: theme.colors.surfaceSoft,
            },
          ]}
        >
          <Text variant="title2">
            Apercu
          </Text>

          <Text color="secondary" className="mt-2">
            {smartTrainingThemes[themeName].label} / {accentLabel(accentName)}
          </Text>

          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.shape.controlRadius,
              borderWidth: theme.shape.borderWidth,
              marginTop: 16,
              padding: 16,
            }}
          >
            <Text variant="heading">
              Formation active
            </Text>

            <Text color="secondary" className="mt-2">
              Cette carte montre le rendu general de ton choix.
            </Text>

            <View
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: 999,
                height: 9,
                marginTop: 16,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  backgroundColor: theme.colors.accent,
                  borderRadius: 999,
                  height: "100%",
                  width: "67%",
                }}
              />
            </View>
          </View>
        </View>

        <View style={cardStyle}>
          <Text variant="heading">
            Etat
          </Text>

          <Text color="secondary" className="mt-2">
            Serveur : {serverStatusLabel(serverStatus)}
          </Text>

          <Text color="secondary" className="mt-1">
            Modifications non enregistrees : {dirty ? "oui" : "non"}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={"Enregistrer mes pr\u00E9f\u00E9rences d\u2019apparence"}
            accessibilityState={{
              disabled: saving || !dirty,
            }}
            disabled={saving || !dirty}
            onPress={() => void save()}
            style={{
              alignItems: "center",
              alignSelf: "flex-start",
              backgroundColor:
                saving || !dirty
                  ? theme.colors.surfaceSoft
                  : theme.colors.accent,
              borderColor: theme.colors.focusRing,
              borderRadius: theme.shape.controlRadius,
              borderWidth:
                themeName === "ACCESSIBLE"
                  ? 3
                  : theme.shape.borderWidth,
              justifyContent: "center",
              marginTop: 18,
              minHeight: theme.shape.minTouchTarget,
              paddingHorizontal: 20,
            }}
          >
            <Text
              color={
                saving || !dirty
                  ? "secondary"
                  : "accentForeground"
              }
              className="font-bold"
            >
              {saving
                ? "Enregistrement..."
                : "Enregistrer l'apparence"}
            </Text>
          </Pressable>
        </View>
      </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 56,
  },
  page: {
    alignSelf: "center",
    gap: 18,
    maxWidth: 820,
    width: "100%",
  },
  header: {
    gap: 8,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
});