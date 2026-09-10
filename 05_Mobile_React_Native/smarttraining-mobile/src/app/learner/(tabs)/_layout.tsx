import { SymbolView } from "expo-symbols";
import { Href, Tabs, router } from "expo-router";
import { type ComponentProps, useEffect, useState } from "react";
import {
  type ColorValue,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  /*
   * Même protection Android que l'espace formateur :
   * suffisamment d'espace pour les boutons système,
   * sans créer de grande bande vide.
   */
  const bottomSafeArea = Math.max(
    insets.bottom,
    Platform.OS === "android" ? 20 : 8,
  );

  return (
    <Tabs
      screenOptions={{
        /*
         * HEADER — même rendu que Formateur
         */
        headerStyle: {
          backgroundColor: theme.colors.headerBackground,
        },
        headerTintColor: theme.colors.headerForeground,
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: "800",
        },

        /*
         * Supprime le ripple gris Android.
         */
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
            className="flex-1 items-center justify-center bg-[transparent]" style={style}
          >
            {children}
          </Pressable>
        ),

        /*
         * BARRE DU BAS — copie visuelle du Formateur
         */
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

        /*
         * Si un formateur/admin consulte son espace apprenant,
         * son retour vers l'espace d'origine reste disponible.
         */
        headerLeft:
          connectedRole === "FORMATEUR" || connectedRole === "ADMIN"
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Retour vers ${staffReturnLabel}`}
                  onPress={returnToStaffSpace}
                  android_ripple={{ color: "transparent" }}
                  className="max-w-[140px] min-h-[36px] ml-[8px] px-[8px] rounded-[11px] flex-row items-center"
                >
                  <SymbolView
                    name={{
                      ios: "chevron.left",
                      android: "chevron_left",
                      web: "chevron_left",
                    }}
                    tintColor={theme.colors.headerForeground}
                    size={13}
                    weight="bold"
                  />
                  <Text
                    numberOfLines={1}
                    className="shrink ml-[3px] text-[10px] font-extrabold" style={{ color: theme.colors.headerForeground }}
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
          title: "Accueil",
          tabBarLabel: "Accueil",
          tabBarAccessibilityLabel: "Accueil apprenant",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={
                focused
                  ? { ios: "house.fill", android: "home", web: "home" }
                  : { ios: "house", android: "home", web: "home" }
              }
            />
          ),
        }}
      />

      <Tabs.Screen
        name="my-trainings"
        options={{
          title: "Mes formations",
          tabBarLabel: "Formations",
          tabBarAccessibilityLabel: "Mes formations",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={
                focused
                  ? {
                      ios: "books.vertical.fill",
                      android: "library_books",
                      web: "library_books",
                    }
                  : {
                      ios: "books.vertical",
                      android: "library_books",
                      web: "library_books",
                    }
              }
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={
                focused
                  ? { ios: "safari.fill", android: "explore", web: "explore" }
                  : { ios: "safari", android: "explore", web: "explore" }
              }
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={
                focused
                  ? {
                      ios: "chart.bar.fill",
                      android: "show_chart",
                      web: "show_chart",
                    }
                  : {
                      ios: "chart.bar",
                      android: "show_chart",
                      web: "show_chart",
                    }
              }
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={
                focused
                  ? {
                      ios: "person.crop.circle.fill",
                      android: "account_circle",
                      web: "account_circle",
                    }
                  : {
                      ios: "person.crop.circle",
                      android: "account_circle",
                      web: "account_circle",
                    }
              }
            />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  focused,
  color,
  icon,
}: {
  focused: boolean;
  color: ColorValue;
  icon: ComponentProps<typeof SymbolView>["name"];
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      className="w-[40px] h-[30px] rounded-[11px] items-center justify-center" style={(focused ? {
          backgroundColor: theme.colors.surfaceSoft,
        } : null)}
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
