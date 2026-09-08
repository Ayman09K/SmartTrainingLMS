import { SymbolView } from "expo-symbols";
import { Href, Tabs, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";

import RoleHeaderShortcuts from "../../../components/assistant/RoleHeaderShortcuts";
import { getConnectedUser } from "../../../storage/tokenStorage";
import {
  useSmartTrainingTheme,
} from "../../../theme/provider/SmartTrainingThemeProvider";

export default function LearnerTabsLayout() {
  const { theme } = useSmartTrainingTheme();
  const insets = useSafeAreaInsets();
  const [connectedRole, setConnectedRole] = useState<
    "APPRENANT" | "FORMATEUR" | "ADMIN" | null
  >(null);

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((user) => {
        if (active) {
          setConnectedRole(user?.role ?? null);
        }
      })
      .catch(() => {
        if (active) {
          setConnectedRole(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const staffReturnLabel =
    connectedRole === "ADMIN"
      ? "Administration"
      : connectedRole === "FORMATEUR"
        ? "Espace formateur"
        : "";

  function returnToStaffSpace() {
    if (connectedRole === "FORMATEUR") {
      router.replace("/trainer" as Href);
      return;
    }

    if (connectedRole === "ADMIN") {
      router.replace("/admin" as Href);
    }
  }

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
        headerLeft:
          connectedRole === "FORMATEUR" || connectedRole === "ADMIN"
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Retour vers ${staffReturnLabel}`}
                  onPress={returnToStaffSpace}
                  style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                >
                  <Text
                    style={{
                      color: theme.colors.headerForeground,
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    {staffReturnLabel}
                  </Text>
                </Pressable>
              )
            : undefined,
        headerRight: () => (
          <RoleHeaderShortcuts
            onAssistantPress={() =>
              router.push("/learner/assistant" as Href)
            }
            onNotificationsPress={() =>
              router.push("/learner/notifications" as Href)
            }
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title:
            connectedRole === "APPRENANT"
              ? "Accueil"
              : "Mon apprentissage",
          tabBarLabel: "Accueil",
          tabBarAccessibilityLabel: "Accueil apprenant",
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
        name="my-trainings"
        options={{
          title: "Mon apprentissage",
          tabBarLabel: "Formations",
          tabBarAccessibilityLabel: "Mon apprentissage",
          tabBarIcon: ({ color, size, focused }) => (
            <SymbolView
              name={focused
                ? { ios: "play.circle.fill", android: "play_circle", web: "play_circle" }
                : { ios: "play.circle", android: "play_circle", web: "play_circle" }}
              tintColor={color}
              size={size}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: "Explorer",
          tabBarLabel: "Explorer",
          tabBarAccessibilityLabel: "Explorer le catalogue",
          tabBarIcon: ({ color, size, focused }) => (
            <SymbolView
              name={focused
                ? { ios: "safari.fill", android: "explore", web: "explore" }
                : { ios: "safari", android: "explore", web: "explore" }}
              tintColor={color}
              size={size}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Activité",
          tabBarLabel: "Activité",
          tabBarAccessibilityLabel: "Mon activité et ma progression",
          tabBarIcon: ({ color, size, focused }) => (
            <SymbolView
              name={focused
                ? { ios: "chart.bar.fill", android: "show_chart", web: "show_chart" }
                : { ios: "chart.bar", android: "show_chart", web: "show_chart" }}
              tintColor={color}
              size={size}
              weight={focused ? "bold" : "regular"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Mon compte",
          tabBarLabel: "Compte",
          tabBarAccessibilityLabel: "Mon compte",
          tabBarIcon: ({ color, size, focused }) => (
            <SymbolView
              name={focused
                ? { ios: "person.crop.circle.fill", android: "account_circle", web: "account_circle" }
                : { ios: "person.crop.circle", android: "account_circle", web: "account_circle" }}
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
