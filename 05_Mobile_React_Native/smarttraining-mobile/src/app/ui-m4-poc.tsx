import { Stack } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { Text } from "@/components/nativewindui/Text";
import {
  smartTrainingAccentNames,
} from "@/theme/design-system/accents";
import {
  smartTrainingThemes,
} from "@/theme/design-system/themes";
import {
  SmartTrainingThemeName,
} from "@/theme/design-system/types";
import {
  accentLabel,
} from "@/theme/design-system/labels";
import {
  useSmartTrainingTheme,
} from "@/theme/provider/SmartTrainingThemeProvider";

const themeNames: SmartTrainingThemeName[] = [
  "MODERN",
  "CORPORATE",
  "DARK",
  "ACCESSIBLE",
];

export default function UiM4PocScreen() {
  const {
    theme,
    themeName,
    accentName,
    cacheHydrated,
    setThemeName,
    setAccentName,
  } = useSmartTrainingTheme();

  const cardStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    borderWidth: theme.shape.borderWidth,
    padding: theme.shape.cardPadding,
    shadowColor: theme.colors.shadow,
    shadowOpacity: theme.shape.shadowOpacity,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  } as const;

  return (
    <>
      <Stack.Screen
        options={{
          title: `Theme ${themeName} / ${accentName}`,
        }}
      />

      <ScrollView
        style={{
          backgroundColor: theme.colors.background,
        }}
        contentContainerStyle={styles.content}
      >
        <View style={styles.page}>
          <Text variant="largeTitle">
            SmartTraining Design System
          </Text>

          <Text color="secondary" className="mt-2">
            Quatre themes, quatre accents et un seul moteur visuel.
          </Text>

          <View style={styles.section}>
            <Text variant="heading">
              {"Th\u00E8me"}
            </Text>

            <View style={styles.optionRow}>
              {themeNames.map((candidate) => {
                const selected = candidate === themeName;

                return (
                  <Pressable
                    key={candidate}
                    accessibilityRole="button"
                accessibilityLabel={`Th\u00E8me ${candidate === "MODERN" ? "Moderne" : candidate === "CORPORATE" ? "Entreprise" : candidate === "DARK" ? "Sombre" : "Accessible"}`}
                accessibilityState={{ selected }}
                    onPress={() => setThemeName(candidate)}
                    style={{
                      alignItems: "center",
                      backgroundColor: selected
                        ? theme.colors.accent
                        : theme.colors.surface,
                      borderColor: selected
                        ? theme.colors.focusRing
                        : theme.colors.border,
                      borderRadius: theme.shape.controlRadius,
                      borderWidth: selected
                        ? Math.max(2, theme.shape.borderWidth)
                        : theme.shape.borderWidth,
                      justifyContent: "center",
                      minHeight: theme.shape.minTouchTarget,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Text
                      variant="footnote"
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

          <View style={styles.section}>
            <Text variant="heading">
              {"Couleur d'accent"}
            </Text>

            <View style={styles.optionRow}>
              {smartTrainingAccentNames.map((candidate) => {
                const selected = candidate === accentName;

                return (
                  <Pressable
                    key={candidate}
                    accessibilityRole="button"
                accessibilityLabel={`Couleur d\u2019accent ${candidate === "BLUE" ? "Bleu" : candidate === "VIOLET" ? "Violet" : candidate === "GREEN" ? "Vert" : "Orange"}`}
                accessibilityState={{ selected }}
                    onPress={() => setAccentName(candidate)}
                    style={{
                      alignItems: "center",
                      backgroundColor: selected
                        ? theme.colors.accent
                        : theme.colors.surface,
                      borderColor: selected
                        ? theme.colors.focusRing
                        : theme.colors.border,
                      borderRadius: theme.shape.controlRadius,
                      borderWidth: selected
                        ? Math.max(2, theme.shape.borderWidth)
                        : theme.shape.borderWidth,
                      justifyContent: "center",
                      minHeight: theme.shape.minTouchTarget,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Text
                      variant="footnote"
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

            <Text color="tertiary" variant="caption1">
              Cache local : {cacheHydrated ? "pret" : "chargement"}
            </Text>
          </View>

          <View style={cardStyle}>
            <View
              style={{
                backgroundColor: theme.colors.surfaceSoft,
                borderRadius: theme.shape.controlRadius,
                marginBottom: 18,
                padding: 14,
              }}
            >
              <Text variant="title1">
                {theme.label} / {accentLabel(accentName)}
              </Text>

              <Text color="secondary" className="mt-2">
                {theme.description}
              </Text>
            </View>

            <View style={styles.statusRow}>
              {[
                ["Succes", theme.colors.success],
                ["Attention", theme.colors.warning],
                ["Erreur", theme.colors.danger],
                ["Information", theme.colors.info],
              ].map(([label, backgroundColor]) => (
                <View
                  key={label}
                  style={{
                    backgroundColor,
                    borderRadius: theme.shape.controlRadius,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    color="statusForeground"
                    variant="footnote"
                    className="font-bold"
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.columns}>
            <View style={[styles.flexCard, cardStyle]}>
              <Text variant="heading">
                Formation active
              </Text>

              <Text color="secondary" className="mt-2">
                Le theme fixe la structure. L accent pilote les actions.
              </Text>

              <View
                style={{
                  backgroundColor: theme.colors.surfaceSoft,
                  borderRadius: 999,
                  height: 9,
                  marginTop: 18,
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

              <Text
                color="tertiary"
                variant="caption1"
                className="mt-2"
              >
                Progression 67 %
              </Text>
            </View>

            <View
              style={[
                styles.flexCard,
                cardStyle,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                },
              ]}
            >
              <Text variant="heading">
                Hierarchie visuelle
              </Text>

              <Text className="mt-3">
                Texte principal
              </Text>

              <Text color="secondary" className="mt-1">
                Texte secondaire
              </Text>

              <Text color="tertiary" className="mt-1">
                Texte tertiaire
              </Text>
            </View>
          </View>

          <View style={cardStyle}>
            <Text variant="heading">
              Persistance locale
            </Text>

            <Text color="secondary" className="mt-2">
              S\u00E9lection actuelle : {theme.label} / {accentLabel(accentName)}.
            </Text>

            <Text color="tertiary" className="mt-1">
              UI-M6C verifiera la restauration apres rechargement.
            </Text>

            <Pressable
              accessibilityRole="button"
              style={{
                alignItems: "center",
                alignSelf: "flex-start",
                backgroundColor: theme.colors.accent,
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
                color="accentForeground"
                className="font-bold"
              >
                Action principale
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 56,
  },
  page: {
    alignSelf: "center",
    maxWidth: 820,
    width: "100%",
  },
  section: {
    gap: 10,
    marginTop: 18,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  columns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 16,
  },
  flexCard: {
    flex: 1,
    minWidth: 260,
  },
});