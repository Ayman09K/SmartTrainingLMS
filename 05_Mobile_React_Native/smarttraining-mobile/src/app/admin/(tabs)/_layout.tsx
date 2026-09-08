import { SymbolView } from "expo-symbols";
import { Href, Tabs, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RoleHeaderShortcuts from "../../../components/assistant/RoleHeaderShortcuts";
import {
  useSmartTrainingTheme,
} from "../../../theme/provider/SmartTrainingThemeProvider";

export default function AdminTabsLayout() {
  const { theme } = useSmartTrainingTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.headerBackground,
        },
        headerTintColor: theme.colors.headerForeground,
        headerTitleStyle: {
          fontWeight: "700",
        },
        tabBarStyle: {
          backgroundColor: theme.colors.headerBackground,
          borderTopWidth: 0,
          minHeight: 68,
          paddingTop: 5,
          paddingBottom: Math.max(9, insets.bottom),
        },
        tabBarActiveTintColor: theme.colors.accentForeground,
        tabBarInactiveTintColor: theme.colors.headerForeground,
        tabBarActiveBackgroundColor: theme.colors.accent,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          lineHeight: 16,
          marginBottom: 1,
        },
        tabBarHideOnKeyboard: true,
        headerRight: () => (
          <RoleHeaderShortcuts
            onAssistantPress={() =>
              router.push("/admin/assistant" as Href)
            }
            onNotificationsPress={() =>
              router.push("/admin/notifications" as Href)
            }
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Vue globale",
          tabBarLabel: "Vue globale",
          tabBarAccessibilityLabel: "Vue globale administration",
          tabBarIcon: ({ color, size, focused }) => (
            <SymbolView
              name={focused
                ? { ios: "rectangle.3.group.fill", android: "dashboard", web: "dashboard" }
                : { ios: "rectangle.3.group", android: "dashboard", web: "dashboard" }}
              tintColor={color}
              size={size}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Utilisateurs",
          tabBarLabel: "Utilisateurs",
          tabBarAccessibilityLabel: "Utilisateurs",
          tabBarIcon: ({ color, size, focused }) => (
            <SymbolView
              name={focused
                ? { ios: "person.2.fill", android: "group", web: "group" }
                : { ios: "person.2", android: "group", web: "group" }}
              tintColor={color}
              size={size}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trainings"
        options={{
          title: "Formations",
          tabBarLabel: "Formations",
          tabBarAccessibilityLabel: "Formations",
          tabBarIcon: ({ color, size, focused }) => (
            <SymbolView
              name={focused
                ? { ios: "graduationcap.fill", android: "school", web: "school" }
                : { ios: "graduationcap", android: "school", web: "school" }}
              tintColor={color}
              size={size}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Pilotage",
          tabBarLabel: "Pilotage",
          tabBarAccessibilityLabel: "Pilotage et alertes",
          tabBarIcon: ({ color, size, focused }) => (
            <SymbolView
              name={focused
                ? { ios: "chart.bar.fill", android: "analytics", web: "analytics" }
                : { ios: "chart.bar", android: "analytics", web: "analytics" }}
              tintColor={color}
              size={size}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Plus",
          tabBarLabel: "Plus",
          tabBarAccessibilityLabel: "Plus d’outils administration",
          tabBarIcon: ({ color, size, focused }) => (
            <SymbolView
              name={focused
                ? { ios: "square.grid.2x2.fill", android: "apps", web: "apps" }
                : { ios: "square.grid.2x2", android: "apps", web: "apps" }}
              tintColor={color}
              size={size}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
