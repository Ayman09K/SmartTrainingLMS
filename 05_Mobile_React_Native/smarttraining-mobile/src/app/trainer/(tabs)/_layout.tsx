import { SymbolView } from "expo-symbols";
import { Href, Tabs, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RoleHeaderShortcuts from "../../../components/assistant/RoleHeaderShortcuts";
import {
  useSmartTrainingTheme,
} from "../../../theme/provider/SmartTrainingThemeProvider";

export default function TrainerTabsLayout() {
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
              router.push("/trainer/assistant" as Href)
            }
            onNotificationsPress={() =>
              router.push("/trainer/notifications" as Href)
            }
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Espace formateur",
          tabBarLabel: "Accueil",
          tabBarAccessibilityLabel: "Accueil formateur",
          tabBarIcon: ({ color, size, focused }) => (
            <SymbolView
              name={focused
                ? { ios: "house.fill", android: "home", web: "home" }
                : { ios: "house", android: "home", web: "home" }}
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
          title: "Mes formations",
          tabBarLabel: "Formations",
          tabBarAccessibilityLabel: "Mes formations",
          tabBarIcon: ({ color, size, focused }) => (
            <SymbolView
              name={focused
                ? { ios: "books.vertical.fill", android: "library_books", web: "library_books" }
                : { ios: "books.vertical", android: "library_books", web: "library_books" }}
              tintColor={color}
              size={size}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="learners"
        options={{
          title: "Apprenants suivis",
          tabBarLabel: "Apprenants",
          tabBarAccessibilityLabel: "Apprenants suivis",
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
        name="alerts"
        options={{
          title: "Suivi",
          tabBarLabel: "Suivi",
          tabBarAccessibilityLabel: "Suivi pédagogique",
          tabBarIcon: ({ color, size, focused }) => (
            <SymbolView
              name={focused
                ? { ios: "waveform.path.ecg", android: "monitoring", web: "monitoring" }
                : { ios: "waveform.path.ecg", android: "monitoring", web: "monitoring" }}
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
          tabBarAccessibilityLabel: "Plus d’outils formateur",
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
