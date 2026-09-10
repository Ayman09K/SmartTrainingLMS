import { SymbolView } from "expo-symbols";
import { Href, Tabs, router } from "expo-router";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ColorValue,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RoleHeaderShortcuts from "../../../components/assistant/RoleHeaderShortcuts";
import {
  useSmartTrainingTheme,
} from "../../../theme/provider/SmartTrainingThemeProvider";

export default function AdminTabsLayout() {
  const { theme } = useSmartTrainingTheme();
  const insets = useSafeAreaInsets();

  // Même protection Android que les espaces Formateur / Apprenant.
  const bottomSafeArea = Math.max(
    insets.bottom,
    Platform.OS === "android" ? 20 : 8,
  );

  return (
    <Tabs
      screenOptions={{
        // Header cohérent avec Formateur / Apprenant.
        headerStyle: {
          backgroundColor: theme.colors.headerBackground,
        },
        headerTintColor: theme.colors.headerForeground,
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: "800",
        },

        // Évite le gros fond/ripple Android sur les tabs.
        tabBarButton: ({
          children,
          style,
          onPress,
          onLongPress,
          accessibilityState,
          accessibilityLabel,
          testID,
        }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={accessibilityState}
            accessibilityLabel={accessibilityLabel}
            testID={testID}
            onPress={onPress}
            onLongPress={onLongPress}
            android_ripple={{ color: "transparent" }}
            android_disableSound
            style={[style, styles.tabButton]}
          >
            {children}
          </Pressable>
        ),

        // Même barre premium que Formateur / Apprenant.
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          height: 62 + bottomSafeArea,
          paddingTop: 5,
          paddingBottom: bottomSafeArea,
          shadowColor: theme.colors.shadow,
          shadowOffset: {
            width: 0,
            height: -3,
          },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 8,
        },
        tabBarItemStyle: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
        },
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.foregroundMuted,
        tabBarActiveBackgroundColor: "transparent",
        tabBarInactiveBackgroundColor: "transparent",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          lineHeight: 12,
          marginTop: 1,
          marginBottom: 0,
          textAlign: "center",
        },
        tabBarIconStyle: {
          marginTop: 0,
          marginBottom: 0,
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
          title: "Accueil",
          tabBarLabel: "Accueil",
          tabBarAccessibilityLabel: "Accueil administration",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={
                focused
                  ? {
                      ios: "rectangle.3.group.fill",
                      android: "dashboard",
                      web: "dashboard",
                    }
                  : {
                      ios: "rectangle.3.group",
                      android: "dashboard",
                      web: "dashboard",
                    }
              }
              backgroundColor={theme.colors.surfaceSoft}
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={
                focused
                  ? { ios: "person.2.fill", android: "group", web: "group" }
                  : { ios: "person.2", android: "group", web: "group" }
              }
              backgroundColor={theme.colors.surfaceSoft}
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={
                focused
                  ? {
                      ios: "graduationcap.fill",
                      android: "school",
                      web: "school",
                    }
                  : {
                      ios: "graduationcap",
                      android: "school",
                      web: "school",
                    }
              }
              backgroundColor={theme.colors.surfaceSoft}
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={
                focused
                  ? { ios: "chart.bar.fill", android: "analytics", web: "analytics" }
                  : { ios: "chart.bar", android: "analytics", web: "analytics" }
              }
              backgroundColor={theme.colors.surfaceSoft}
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={
                focused
                  ? {
                      ios: "square.grid.2x2.fill",
                      android: "apps",
                      web: "apps",
                    }
                  : {
                      ios: "square.grid.2x2",
                      android: "apps",
                      web: "apps",
                    }
              }
              backgroundColor={theme.colors.surfaceSoft}
            />
          ),
        }}
      />
    </Tabs>
  );
}

type TabIconProps = {
  focused: boolean;
  color: ColorValue;
  icon: React.ComponentProps<typeof SymbolView>["name"];
  backgroundColor: ColorValue;
};

function TabIcon({ focused, color, icon, backgroundColor }: TabIconProps) {
  return (
    <View
      style={[
        styles.iconContainer,
        focused && { backgroundColor },
      ]}
    >
      <SymbolView
        name={icon}
        tintColor={color}
        size={21}
        weight={focused ? "bold" : "regular"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconContainer: {
    width: 40,
    height: 30,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
