import { SymbolView } from "expo-symbols";
import { Href, Tabs, router } from "expo-router";

import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import RoleHeaderShortcuts from "../../../components/assistant/RoleHeaderShortcuts";

import {
  useSmartTrainingTheme,
} from "../../../theme/provider/SmartTrainingThemeProvider";

export default function TrainerTabsLayout() {
  const { theme } = useSmartTrainingTheme();
  const insets = useSafeAreaInsets();

  /*
   * Protection pour les boutons système Android.
   * On garde suffisamment d'espace sans créer
   * une barre inutilement énorme.
   */
  const bottomSafeArea = Math.max(
    insets.bottom,
    Platform.OS === "android" ? 20 : 8,
  );

  return (
    <Tabs
      screenOptions={{
        /*
         * =====================================================
         * HEADER
         * =====================================================
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
         * =====================================================
         * BOUTON TAB PERSONNALISÉ
         * =====================================================
         *
         * Supprime le fond gris / ripple Android.
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
            android_ripple={{
              color: "transparent",
            }}
            android_disableSound
            style={[
              style,
              styles.tabButton,
            ]}
          >
            {children}
          </Pressable>
        ),

        /*
         * =====================================================
         * BARRE DE NAVIGATION
         * =====================================================
         */

        tabBarStyle: {
          backgroundColor: theme.colors.surface,

          borderTopWidth: 1,
          borderTopColor: theme.colors.border,

          height: 62 + bottomSafeArea,

          paddingTop: 5,
          paddingBottom: bottomSafeArea,

          /*
           * Ombre très légère.
           */
          shadowColor: theme.colors.shadow,

          shadowOffset: {
            width: 0,
            height: -3,
          },

          shadowOpacity: 0.05,
          shadowRadius: 10,

          elevation: 8,
        },

        /*
         * Chaque onglet prend exactement
         * la même largeur.
         */
        tabBarItemStyle: {
          flex: 1,

          alignItems: "center",
          justifyContent: "center",

          backgroundColor: "transparent",
        },

        /*
         * Couleurs.
         */
        tabBarActiveTintColor: theme.colors.accent,

        tabBarInactiveTintColor:
          theme.colors.foregroundMuted,

        /*
         * Aucun gros rectangle de fond.
         */
        tabBarActiveBackgroundColor: "transparent",

        tabBarInactiveBackgroundColor: "transparent",

        /*
         * Titres.
         */
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
         * Boutons à droite du header.
         */
        headerRight: () => (
          <RoleHeaderShortcuts
            onAssistantPress={() =>
              router.push(
                "/trainer/assistant" as Href,
              )
            }
            onNotificationsPress={() =>
              router.push(
                "/trainer/notifications" as Href,
              )
            }
          />
        ),
      }}
    >
      {/* =====================================================
          ACCUEIL
      ===================================================== */}

      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",

          tabBarLabel: "Accueil",

          tabBarAccessibilityLabel:
            "Accueil formateur",

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <View
              style={[
                styles.iconContainer,

                focused && {
                  backgroundColor:
                    theme.colors.surfaceSoft,
                },
              ]}
            >
              <SymbolView
                name={
                  focused
                    ? {
                        ios: "house.fill",
                        android: "home",
                        web: "home",
                      }
                    : {
                        ios: "house",
                        android: "home",
                        web: "home",
                      }
                }
                tintColor={color}
                size={21}
                weight={
                  focused
                    ? "bold"
                    : "regular"
                }
              />
            </View>
          ),
        }}
      />

      {/* =====================================================
          FORMATIONS
      ===================================================== */}

      <Tabs.Screen
        name="trainings"
        options={{
          title: "Mes formations",

          tabBarLabel: "Formations",

          tabBarAccessibilityLabel:
            "Mes formations",

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <View
              style={[
                styles.iconContainer,

                focused && {
                  backgroundColor:
                    theme.colors.surfaceSoft,
                },
              ]}
            >
              <SymbolView
                name={
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
                tintColor={color}
                size={21}
                weight={
                  focused
                    ? "bold"
                    : "regular"
                }
              />
            </View>
          ),
        }}
      />

      {/* =====================================================
          APPRENANTS
      ===================================================== */}

      <Tabs.Screen
        name="learners"
        options={{
          title: "Apprenants suivis",

          tabBarLabel: "Apprenants",

          tabBarAccessibilityLabel:
            "Apprenants suivis",

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <View
              style={[
                styles.iconContainer,

                focused && {
                  backgroundColor:
                    theme.colors.surfaceSoft,
                },
              ]}
            >
              <SymbolView
                name={
                  focused
                    ? {
                        ios: "person.2.fill",
                        android: "group",
                        web: "group",
                      }
                    : {
                        ios: "person.2",
                        android: "group",
                        web: "group",
                      }
                }
                tintColor={color}
                size={21}
                weight={
                  focused
                    ? "bold"
                    : "regular"
                }
              />
            </View>
          ),
        }}
      />

      {/* =====================================================
          SUIVI
      ===================================================== */}

      <Tabs.Screen
        name="alerts"
        options={{
          title: "Suivi",

          tabBarLabel: "Suivi",

          tabBarAccessibilityLabel:
            "Suivi pédagogique",

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <View
              style={[
                styles.iconContainer,

                focused && {
                  backgroundColor:
                    theme.colors.surfaceSoft,
                },
              ]}
            >
              <SymbolView
                name={{
                  ios: "waveform.path.ecg",
                  android: "monitoring",
                  web: "monitoring",
                }}
                tintColor={color}
                size={21}
                weight={
                  focused
                    ? "bold"
                    : "regular"
                }
              />
            </View>
          ),
        }}
      />

      {/* =====================================================
          PLUS
      ===================================================== */}

      <Tabs.Screen
        name="more"
        options={{
          title: "Plus",

          tabBarLabel: "Plus",

          tabBarAccessibilityLabel:
            "Plus d’outils formateur",

          tabBarIcon: ({
            color,
            focused,
          }) => (
            <View
              style={[
                styles.iconContainer,

                focused && {
                  backgroundColor:
                    theme.colors.surfaceSoft,
                },
              ]}
            >
              <SymbolView
                name={
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
                tintColor={color}
                size={21}
                weight={
                  focused
                    ? "bold"
                    : "regular"
                }
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  /*
   * Chaque Pressable remplit correctement
   * sa cellule.
   */
  tabButton: {
    flex: 1,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "transparent",
  },

  /*
   * Petite capsule moderne uniquement
   * derrière l'icône sélectionnée.
   */
  iconContainer: {
    width: 40,
    height: 30,

    borderRadius: 11,

    alignItems: "center",
    justifyContent: "center",
  },
});