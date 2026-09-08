import { Href, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";

export type AdminUserManagementSection =
  | "users"
  | "trainer-requests"
  | "account-deletion";

const entries: {
  key: AdminUserManagementSection;
  label: string;
  route: Href;
}[] = [
  {
    key: "users",
    label: "Utilisateurs",
    route: "/admin/users" as Href,
  },
  {
    key: "trainer-requests",
    label: "Rôle formateur",
    route: "/admin/trainer-requests" as Href,
  },
  {
    key: "account-deletion",
    label: "Suppressions de compte",
    route: "/admin/account-deletion-requests" as Href,
  },
];

export default function AdminUserManagementNav({
  active,
}: {
  active: AdminUserManagementSection;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceSoft,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
        },
      ]}
    >
      <Text
        style={[
          styles.eyebrow,
          { color: theme.colors.foregroundSubtle },
        ]}
      >
        GESTION DES UTILISATEURS
      </Text>

      <View style={styles.items}>
        {entries.map((entry) => {
          const selected = entry.key === active;

          return (
            <Pressable
              key={entry.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                if (!selected) {
                  router.push(entry.route);
                }
              }}
              style={({ pressed }) => [
                styles.item,
                {
                  backgroundColor: selected
                    ? theme.colors.accent
                    : theme.colors.surface,
                  borderColor: selected
                    ? theme.colors.accent
                    : theme.colors.border,
                  borderRadius: theme.shape.controlRadius,
                  borderWidth: Math.max(1, theme.shape.borderWidth),
                },
                pressed && !selected ? styles.pressed : null,
              ]}
            >
              <Text
                style={[
                  styles.itemText,
                  {
                    color: selected
                      ? theme.colors.accentForeground
                      : theme.colors.foreground,
                  },
                ]}
              >
                {entry.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
  },
  items: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  item: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  itemText: {
    fontSize: 12,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.78,
  },
});
