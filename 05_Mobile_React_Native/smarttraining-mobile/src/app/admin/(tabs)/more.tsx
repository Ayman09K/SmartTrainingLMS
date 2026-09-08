import {
  SymbolView,
  type SymbolViewProps,
} from "expo-symbols";
import {
  Href,
  router,
} from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../../../theme/provider/SmartTrainingThemeProvider";
import { removeToken } from "../../../storage/tokenStorage";

type AdminTool = {
  label: string;
  description: string;
  href: string;
  icon: SymbolViewProps["name"];
};

type AdminToolSection = {
  title: string;
  description: string;
  tools: readonly AdminTool[];
};

const sections: readonly AdminToolSection[] = [
  {
    title: "Organisation",
    description: "Structurez le catalogue et les cohortes.",
    tools: [
      {
        label: "Parcours",
        description: "Construire et publier.",
        href: "/admin/learning-paths",
        icon: {
          ios: "map.fill",
          android: "route",
          web: "route",
        },
      },
      {
        label: "Groupes",
        description: "Piloter les cohortes.",
        href: "/admin/groups",
        icon: {
          ios: "person.3.fill",
          android: "groups",
          web: "groups",
        },
      },
      {
        label: "Catégories",
        description: "Gérer le référentiel.",
        href: "/admin/training-categories",
        icon: {
          ios: "tag.fill",
          android: "sell",
          web: "sell",
        },
      },
    ],
  },
  {
    title: "Gouvernance",
    description: "Traitez les demandes et contrôles.",
    tools: [
      {
        label: "Demandes formateur",
        description: "Valider les accès.",
        href: "/admin/trainer-requests",
        icon: {
          ios: "person.badge.plus",
          android: "person_add",
          web: "person_add",
        },
      },
      {
        label: "Feedbacks",
        description: "Lire les retours.",
        href: "/admin/feedbacks",
        icon: {
          ios: "bubble.left.and.bubble.right.fill",
          android: "forum",
          web: "forum",
        },
      },
      {
        label: "Suppressions",
        description: "Suivre les demandes.",
        href: "/admin/account-deletion-requests",
        icon: {
          ios: "trash.fill",
          android: "delete",
          web: "delete",
        },
      },
    ],
  },
  {
    title: "Compte",
    description: "Vos réglages et autres espaces.",
    tools: [
      {
        label: "Notifications",
        description: "Événements à consulter.",
        href: "/admin/notifications",
        icon: {
          ios: "bell.fill",
          android: "notifications",
          web: "notifications",
        },
      },
      {
        label: "Mon compte",
        description: "Identité et préférences.",
        href: "/admin/profile",
        icon: {
          ios: "person.crop.circle.fill",
          android: "account_circle",
          web: "account_circle",
        },
      },
      {
        label: "Apparence",
        description: "Thème et couleur.",
        href: "/admin/appearance",
        icon: {
          ios: "paintpalette.fill",
          android: "palette",
          web: "palette",
        },
      },
      {
        label: "Mon apprentissage",
        description: "Passer côté apprenant.",
        href: "/learner",
        icon: {
          ios: "graduationcap.fill",
          android: "school",
          web: "school",
        },
      },
    ],
  },
];

export default function AdminMoreRoute() {
  const { theme } = useSmartTrainingTheme();
  const { width } = useWindowDimensions();
  const [loggingOut, setLoggingOut] = useState(false);
  const twoColumns = width >= 360;

  async function handleLogout(): Promise<void> {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await removeToken();
    } finally {
      router.replace("/" as Href);
    }
  }

  return (
    <ScrollView
      style={[
        styles.scroll,
        { backgroundColor: theme.colors.background },
      ]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.hero,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.shape.cardRadius,
            borderWidth: theme.shape.borderWidth,
          },
        ]}
      >
        <View
          style={[
            styles.heroIcon,
            { backgroundColor: theme.colors.surfaceSoft },
          ]}
        >
          <SymbolView
            name={{
              ios: "square.grid.2x2.fill",
              android: "apps",
              web: "apps",
            }}
            tintColor={theme.colors.accent}
            size={28}
            weight="bold"
          />
        </View>
        <View style={styles.heroCopy}>
          <Text
            style={[
              styles.eyebrow,
              { color: theme.colors.accent },
            ]}
          >
            ADMINISTRATION
          </Text>
          <Text
            accessibilityRole="header"
            style={[
              styles.heroTitle,
              { color: theme.colors.foreground },
            ]}
          >
            Outils et gouvernance
          </Text>
          <Text
            style={[
              styles.heroText,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            Accès rapide aux fonctions complémentaires.
          </Text>
        </View>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionHead}>
            <Text
              accessibilityRole="header"
              style={[
                styles.sectionTitle,
                { color: theme.colors.foreground },
              ]}
            >
              {section.title}
            </Text>
            <Text
              style={[
                styles.sectionText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {section.description}
            </Text>
          </View>

          <View style={styles.grid}>
            {section.tools.map((tool) => (
              <Pressable
                key={tool.href}
                accessibilityRole="button"
                accessibilityLabel={tool.label}
                accessibilityHint={tool.description}
                onPress={() =>
                  router.push(tool.href as Href)
                }
                style={({ pressed }) => [
                  styles.toolCard,
                  twoColumns
                    ? styles.toolCardTwoColumns
                    : styles.toolCardOneColumn,
                  {
                    backgroundColor: pressed
                      ? theme.colors.surfaceSoft
                      : theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.shape.cardRadius,
                    borderWidth: theme.shape.borderWidth,
                  },
                ]}
              >
                <View
                  style={[
                    styles.toolIcon,
                    {
                      backgroundColor:
                        theme.colors.surfaceSoft,
                    },
                  ]}
                >
                  <SymbolView
                    name={tool.icon}
                    tintColor={theme.colors.accent}
                    size={24}
                    weight="bold"
                  />
                </View>

                <Text
                  numberOfLines={2}
                  style={[
                    styles.toolTitle,
                    { color: theme.colors.foreground },
                  ]}
                >
                  {tool.label}
                </Text>

                <Text
                  numberOfLines={2}
                  style={[
                    styles.toolText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {tool.description}
                </Text>

                <Text
                  importantForAccessibility="no"
                  style={[
                    styles.chevron,
                    { color: theme.colors.accent },
                  ]}
                >
                  ›
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text
            accessibilityRole="header"
            style={[
              styles.sectionTitle,
              { color: theme.colors.foreground },
            ]}
          >
            Session
          </Text>
          <Text
            style={[
              styles.sectionText,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            Quittez ce compte sur cet appareil.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
          accessibilityHint="Ferme la session et revient à la connexion"
          disabled={loggingOut}
          onPress={() => void handleLogout()}
          style={({ pressed }) => [
            styles.logoutCard,
            {
              backgroundColor: pressed
                ? theme.colors.surfaceSoft
                : theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.shape.cardRadius,
              borderWidth: theme.shape.borderWidth,
              opacity: loggingOut ? 0.6 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.toolIcon,
              { backgroundColor: theme.colors.surfaceSoft },
            ]}
          >
            <SymbolView
              name={{
                ios: "rectangle.portrait.and.arrow.right",
                android: "logout",
                web: "logout",
              }}
              tintColor={theme.colors.accent}
              size={24}
              weight="bold"
            />
          </View>

          <View style={styles.logoutCopy}>
            <Text
              style={[
                styles.toolTitle,
                { color: theme.colors.foreground },
              ]}
            >
              {loggingOut
                ? "Déconnexion…"
                : "Se déconnecter"}
            </Text>
            <Text
              style={[
                styles.toolText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Une reconnexion sera nécessaire.
            </Text>
          </View>

          <Text
            importantForAccessibility="no"
            style={[
              styles.logoutArrow,
              { color: theme.colors.accent },
            ]}
          >
            →
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 96,
    gap: 20,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  heroText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  section: {
    gap: 10,
  },
  sectionHead: {
    gap: 2,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
  },
  sectionText: {
    fontSize: 10,
    lineHeight: 15,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  toolCard: {
    minHeight: 122,
    padding: 11,
    position: "relative",
  },
  toolCardTwoColumns: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 145,
  },
  toolCardOneColumn: {
    width: "100%",
  },
  toolIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  toolTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    paddingRight: 14,
  },
  toolText: {
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
    paddingRight: 12,
  },
  chevron: {
    position: "absolute",
    right: 9,
    bottom: 8,
    fontSize: 18,
    fontWeight: "900",
  },
  logoutCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 11,
  },
  logoutCopy: {
    flex: 1,
    minWidth: 0,
  },
  logoutArrow: {
    fontSize: 18,
    fontWeight: "900",
  },
});
