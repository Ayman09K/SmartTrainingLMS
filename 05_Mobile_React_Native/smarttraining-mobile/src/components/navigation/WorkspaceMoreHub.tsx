import { Href, router } from "expo-router";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  uxSpacing,
  uxTypography,
} from "../../theme/design-system/uxSemanticTokens";

export type WorkspaceMoreAction = {
  label: string;
  description: string;
  href: string;
};

export type WorkspaceMoreSection = {
  title: string;
  description?: string;
  actions: readonly WorkspaceMoreAction[];
};

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  sections: readonly WorkspaceMoreSection[];
  onLogout?: () => void;
  loggingOut?: boolean;
  compact?: boolean;
};

export default function WorkspaceMoreHub({
  eyebrow,
  title,
  subtitle,
  sections,
  onLogout,
  loggingOut = false,
  compact = false,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 760;

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
      }}
      contentContainerStyle={{
        alignItems: "center",
        paddingHorizontal: wide
          ? uxSpacing.xl
          : compact
            ? uxSpacing.md
            : uxSpacing.lg,
        paddingTop: compact ? uxSpacing.md : uxSpacing.lg,
        paddingBottom: compact ? 92 : 104,
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 960,
          gap: compact ? uxSpacing.lg : theme.shape.sectionGap,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: theme.shape.borderWidth,
            borderRadius: theme.shape.cardRadius,
            padding: compact
              ? Math.max(12, theme.shape.cardPadding - 6)
              : theme.shape.cardPadding,
            gap: compact ? uxSpacing.xs : uxSpacing.sm,
          }}
        >
          <Text
            style={{
              color: theme.colors.accent,
              fontSize: uxTypography.caption,
              fontWeight: "800",
              letterSpacing: 0.8,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </Text>

          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.foreground,
              fontSize: uxTypography.headline,
              fontWeight: "800",
            }}
          >
            {title}
          </Text>

          <Text
            style={{
              color: theme.colors.foregroundMuted,
              fontSize: uxTypography.body,
              lineHeight: 21,
            }}
          >
            {subtitle}
          </Text>
        </View>

        {sections.map((section) => (
          <View
            key={section.title}
            style={{
              gap: compact ? uxSpacing.sm : uxSpacing.md,
            }}
          >
            <View
              style={{
                gap: uxSpacing.xs,
                paddingHorizontal: uxSpacing.xs,
              }}
            >
              <Text
                accessibilityRole="header"
                style={{
                  color: theme.colors.foreground,
                  fontSize: uxTypography.title,
                  fontWeight: "800",
                }}
              >
                {section.title}
              </Text>

              {section.description ? (
                <Text
                  style={{
                    color: theme.colors.foregroundMuted,
                    fontSize: compact
                      ? uxTypography.caption
                      : uxTypography.body,
                    lineHeight: compact ? 17 : 20,
                  }}
                >
                  {section.description}
                </Text>
              ) : null}
            </View>

            <View
              style={{
                flexDirection: wide ? "row" : "column",
                flexWrap: wide ? "wrap" : "nowrap",
                gap: compact ? uxSpacing.sm : uxSpacing.md,
              }}
            >
              {section.actions.map((action) => (
                <Pressable
                  key={action.href}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  accessibilityHint={action.description}
                  onPress={() => router.push(action.href as Href)}
                  style={({ pressed }) => ({
                    flexBasis: wide ? "48%" : "auto",
                    flexGrow: wide ? 1 : 0,
                    minWidth: wide ? 280 : undefined,
                    minHeight: theme.shape.minTouchTarget,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: compact ? uxSpacing.sm : uxSpacing.md,
                    backgroundColor: pressed
                      ? theme.colors.surfaceSoft
                      : theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderWidth: theme.shape.borderWidth,
                    borderRadius: theme.shape.cardRadius,
                    paddingVertical: compact ? uxSpacing.sm : uxSpacing.md,
                    paddingHorizontal: compact ? uxSpacing.md : uxSpacing.lg,
                  })}
                >
                  <View
                    importantForAccessibility="no"
                    style={{
                      alignSelf: "stretch",
                      width: compact ? 3 : 4,
                      minHeight: compact ? 38 : 44,
                      borderRadius: theme.shape.controlRadius,
                      backgroundColor: theme.colors.accent,
                    }}
                  />

                  <View
                    style={{
                      flex: 1,
                      gap: uxSpacing.xs,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.foreground,
                        fontSize: uxTypography.label,
                        fontWeight: "800",
                      }}
                    >
                      {action.label}
                    </Text>

                    <Text
                      style={{
                        color: theme.colors.foregroundMuted,
                        fontSize: uxTypography.caption,
                        lineHeight: compact ? 17 : 18,
                      }}
                    >
                      {action.description}
                    </Text>
                  </View>

                  <Text
                    importantForAccessibility="no"
                    style={{
                      color: theme.colors.accent,
                      fontSize: uxTypography.headline,
                      fontWeight: "700",
                    }}
                  >
                    ›
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {onLogout ? (
          <View
            style={{
              gap: compact ? uxSpacing.sm : uxSpacing.md,
            }}
          >
            <View
              style={{
                gap: uxSpacing.xs,
                paddingHorizontal: uxSpacing.xs,
              }}
            >
              <Text
                accessibilityRole="header"
                style={{
                  color: theme.colors.foreground,
                  fontSize: uxTypography.title,
                  fontWeight: "800",
                }}
              >
                Session
              </Text>
              <Text
                style={{
                  color: theme.colors.foregroundMuted,
                  fontSize: compact
                    ? uxTypography.caption
                    : uxTypography.body,
                  lineHeight: compact ? 17 : 20,
                }}
              >
                Quittez votre compte en toute sécurité sur cet appareil.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Se déconnecter"
              accessibilityHint="Ferme la session et revient à la connexion"
              disabled={loggingOut}
              onPress={onLogout}
              style={({ pressed }) => ({
                minHeight: theme.shape.minTouchTarget,
                flexDirection: "row",
                alignItems: "center",
                gap: compact ? uxSpacing.sm : uxSpacing.md,
                backgroundColor: pressed
                  ? theme.colors.surfaceSoft
                  : theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: theme.shape.borderWidth,
                borderRadius: theme.shape.cardRadius,
                paddingVertical: compact ? uxSpacing.sm : uxSpacing.md,
                paddingHorizontal: compact ? uxSpacing.md : uxSpacing.lg,
                opacity: loggingOut ? 0.6 : 1,
              })}
            >
              <View
                importantForAccessibility="no"
                style={{
                  alignSelf: "stretch",
                  width: compact ? 3 : 4,
                  minHeight: compact ? 38 : 44,
                  borderRadius: theme.shape.controlRadius,
                  backgroundColor: theme.colors.accent,
                }}
              />

              <View style={{ flex: 1, gap: uxSpacing.xs }}>
                <Text
                  style={{
                    color: theme.colors.foreground,
                    fontSize: uxTypography.label,
                    fontWeight: "800",
                  }}
                >
                  {loggingOut ? "Déconnexion…" : "Se déconnecter"}
                </Text>
                <Text
                  style={{
                    color: theme.colors.foregroundMuted,
                    fontSize: uxTypography.caption,
                    lineHeight: compact ? 17 : 18,
                  }}
                >
                  Vous devrez vous reconnecter pour accéder à cet espace.
                </Text>
              </View>

              <Text
                importantForAccessibility="no"
                style={{
                  color: theme.colors.accent,
                  fontSize: uxTypography.headline,
                  fontWeight: "700",
                }}
              >
                →
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
