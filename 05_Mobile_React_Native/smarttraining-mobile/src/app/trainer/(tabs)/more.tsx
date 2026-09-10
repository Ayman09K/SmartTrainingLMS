import {
  SymbolView,
  type SymbolViewProps,
} from "expo-symbols";
import { Href, router } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { removeToken } from "../../../storage/tokenStorage";
import {
  useSmartTrainingTheme,
} from "../../../theme/provider/SmartTrainingThemeProvider";

type TrainerTool = {
  label: string;
  description: string;
  href: string;
  icon: SymbolViewProps["name"];
  tone: "violet" | "teal" | "coral" | "pink" | "blue" | "amber";
};

type TrainerToolSection = {
  title: string;
  description: string;
  icon: SymbolViewProps["name"];
  tools: readonly TrainerTool[];
};

const TONES = {
  violet: { soft: "#F1E9FF", color: "#7C3AED" },
  teal: { soft: "#E4F8F3", color: "#109E85" },
  coral: { soft: "#FFF0EA", color: "#E45B54" },
  pink: { soft: "#FDEAF7", color: "#CE3C9C" },
  blue: { soft: "#EAF2FF", color: "#3478D4" },
  amber: { soft: "#FFF3DD", color: "#DD8A00" },
} as const;

const sections: readonly TrainerToolSection[] = [
  {
    title: "Organisation",
    description: "Parcours, groupes et accompagnement.",
    icon: {
      ios: "person.3.fill",
      android: "groups",
      web: "groups",
    },
    tools: [
      {
        label: "Parcours de formation",
        description: "Assembler et publier vos parcours.",
        href: "/trainer/learning-paths",
        icon: {
          ios: "map.fill",
          android: "route",
          web: "route",
        },
        tone: "violet",
      },
      {
        label: "Groupes / cohortes",
        description: "Piloter les cohortes et leur suivi.",
        href: "/trainer/groups",
        icon: {
          ios: "person.3.fill",
          android: "groups",
          web: "groups",
        },
        tone: "teal",
      },
      {
        label: "Séances d’accompagnement",
        description: "Planifier les rendez-vous.",
        href: "/trainer/support-sessions",
        icon: {
          ios: "calendar",
          android: "event",
          web: "event",
        },
        tone: "coral",
      },
    ],
  },
  {
    title: "Suivi pédagogique",
    description: "Interventions, feedbacks et avis.",
    icon: {
      ios: "graduationcap.fill",
      android: "school",
      web: "school",
    },
    tools: [
      {
        label: "Interventions",
        description: "Organiser l’accompagnement.",
        href: "/trainer/interventions",
        icon: {
          ios: "gearshape.fill",
          android: "settings",
          web: "settings",
        },
        tone: "violet",
      },
      {
        label: "Feedbacks apprenants",
        description: "Traiter les retours.",
        href: "/trainer/feedbacks",
        icon: {
          ios: "bubble.left.and.bubble.right.fill",
          android: "forum",
          web: "forum",
        },
        tone: "pink",
      },
      {
        label: "Avis sur mes formations",
        description: "Consulter les avis apprenants.",
        href: "/trainer/reviews",
        icon: {
          ios: "star.fill",
          android: "star",
          web: "star",
        },
        tone: "amber",
      },
    ],
  },
  {
    title: "Compte et activité",
    description: "Notifications, profil et préférences.",
    icon: {
      ios: "person.crop.circle.fill",
      android: "account_circle",
      web: "account_circle",
    },
    tools: [
      {
        label: "Notifications",
        description: "Restez informé de votre activité.",
        href: "/trainer/notifications",
        icon: {
          ios: "bell.fill",
          android: "notifications",
          web: "notifications",
        },
        tone: "pink",
      },
      {
        label: "Mon profil",
        description: "Gérer vos informations personnelles.",
        href: "/trainer/profile",
        icon: {
          ios: "person.crop.circle.fill",
          android: "account_circle",
          web: "account_circle",
        },
        tone: "blue",
      },
      {
        label: "Préférences",
        description: "Personnaliser thème et couleur.",
        href: "/trainer/appearance",
        icon: {
          ios: "slider.horizontal.3",
          android: "tune",
          web: "tune",
        },
        tone: "violet",
      },
    ],
  },
];

export default function TrainerMoreRoute() {
  const { theme } = useSmartTrainingTheme();
  const { width } = useWindowDimensions();
  const [loggingOut, setLoggingOut] = useState(false);

  const threeColumns = width >= 390;
  const toolWidth = threeColumns ? "31.6%" : "48.3%";

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
      className="flex-1"
      style={{ backgroundColor: "#F8F6F3" }}
      contentContainerStyle={{
        paddingHorizontal: 14,
        paddingTop: 12,

        // Seule modification :
        // anciennement 112.
        paddingBottom: 8,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View
        className="overflow-hidden rounded-[22px] border bg-white"
        style={{
          borderColor: "#E7E2EB",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View className="h-1 bg-[#7C3AED]" />

        <View className="relative overflow-hidden px-3.5 py-3">
          <View
            className="absolute -right-8 -top-10 h-[120px] w-[120px] rounded-full"
            style={{ backgroundColor: "#F4ECFF" }}
          />

          <View
            className="absolute right-3 top-5 h-[66px] w-[58px] rotate-6 rounded-[18px]"
            style={{ backgroundColor: "#E4D2FF" }}
          />

          <View className="flex-row items-center">
            <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-[#F1E9FF]">
              <SymbolView
                name={{
                  ios: "square.grid.3x3.fill",
                  android: "apps",
                  web: "apps",
                }}
                tintColor="#7C3AED"
                size={21}
                weight="bold"
              />
            </View>

            <View className="ml-3 min-w-0 flex-1 pr-[68px]">
              <Text className="text-[9px] font-black uppercase tracking-[0.6px] text-[#7C3AED]">
                Espace formateur
              </Text>

              <Text
                accessibilityRole="header"
                className="mt-0.5 text-[18px] font-black leading-[22px]"
                style={{ color: theme.colors.foreground }}
              >
                Outils et pilotage
              </Text>

              <Text
                className="mt-0.5 text-[10px] leading-[14px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Accès rapide aux fonctions complémentaires.
              </Text>
            </View>

            <View className="h-8 w-8 items-center justify-center rounded-full bg-[#F3EEFF]">
              <SymbolView
                name={{
                  ios: "chevron.right",
                  android: "chevron_right",
                  web: "chevron_right",
                }}
                tintColor="#7C3AED"
                size={11}
                weight="bold"
              />
            </View>
          </View>
        </View>
      </View>

      {sections.map((section) => (
        <View key={section.title} className="mt-5">
          <View className="mb-2.5 flex-row items-center">
            <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-[#F1E9FF]">
              <SymbolView
                name={section.icon}
                tintColor="#7C3AED"
                size={15}
                weight="bold"
              />
            </View>

            <View className="ml-2.5 min-w-0 flex-1">
              <Text
                accessibilityRole="header"
                className="text-[17px] font-black leading-[20px]"
                style={{ color: theme.colors.foreground }}
              >
                {section.title}
              </Text>

              <Text
                className="mt-0.5 text-[10px] leading-[14px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                {section.description}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap justify-between gap-y-2.5">
            {section.tools.map((tool) => {
              const visual = TONES[tool.tone];

              return (
                <Pressable
                  key={tool.href}
                  accessibilityRole="button"
                  accessibilityLabel={tool.label}
                  accessibilityHint={tool.description}
                  onPress={() => router.push(tool.href as Href)}
                  android_ripple={{ color: "transparent" }}
                  className="min-h-[132px] rounded-[18px] border bg-white p-2.5"
                  style={{
                    width: toolWidth,
                    borderColor: "#E7E2EB",
                    shadowColor: "#0F172A",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.025,
                    shadowRadius: 5,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-start justify-between">
                    <View
                      className="h-9 w-9 items-center justify-center rounded-[12px]"
                      style={{
                        backgroundColor: visual.soft,
                      }}
                    >
                      <SymbolView
                        name={tool.icon}
                        tintColor={visual.color}
                        size={16}
                        weight="bold"
                      />
                    </View>

                    <View className="h-7 w-7 items-center justify-center rounded-full bg-[#F3EEFF]">
                      <SymbolView
                        name={{
                          ios: "chevron.right",
                          android: "chevron_right",
                          web: "chevron_right",
                        }}
                        tintColor="#7C3AED"
                        size={10}
                        weight="bold"
                      />
                    </View>
                  </View>

                  <Text
                    numberOfLines={3}
                    className="mt-2.5 text-[12px] font-black leading-[15px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    {tool.label}
                  </Text>

                  <Text
                    numberOfLines={3}
                    className="mt-1 text-[9px] leading-[13px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {tool.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mon apprentissage"
        accessibilityHint="Passer côté apprenant"
        onPress={() => router.push("/learner" as Href)}
        android_ripple={{ color: "transparent" }}
        className="mt-3 flex-row items-center rounded-[16px] border bg-white px-3 py-2.5"
        style={{
          borderColor: "#E7E2EB",
        }}
      >
        <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-[#EEF2F8]">
          <SymbolView
            name={{
              ios: "book.fill",
              android: "menu_book",
              web: "menu_book",
            }}
            tintColor="#53657F"
            size={15}
            weight="bold"
          />
        </View>

        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-[12px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            Mon apprentissage
          </Text>

          <Text
            className="mt-0.5 text-[9px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            Accéder à mes formations côté apprenant.
          </Text>
        </View>

        <SymbolView
          name={{
            ios: "chevron.right",
            android: "chevron_right",
            web: "chevron_right",
          }}
          tintColor="#7C3AED"
          size={11}
          weight="bold"
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Se déconnecter"
        accessibilityHint="Ferme la session et revient à la connexion"
        disabled={loggingOut}
        onPress={() => void handleLogout()}
        android_ripple={{ color: "transparent" }}
        className="mt-2.5 flex-row items-center rounded-[16px] border bg-white px-3 py-2.5"
        style={{
          borderColor: "#E7E2EB",
          opacity: loggingOut ? 0.55 : 1,
        }}
      >
        <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-[#F3EEFF]">
          <SymbolView
            name={{
              ios: "rectangle.portrait.and.arrow.right",
              android: "logout",
              web: "logout",
            }}
            tintColor="#7C3AED"
            size={15}
            weight="bold"
          />
        </View>

        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-[12px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {loggingOut ? "Déconnexion…" : "Se déconnecter"}
          </Text>

          <Text
            className="mt-0.5 text-[9px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            Une reconnexion sera nécessaire.
          </Text>
        </View>

        <SymbolView
          name={{
            ios: "chevron.right",
            android: "chevron_right",
            web: "chevron_right",
          }}
          tintColor="#7C3AED"
          size={11}
          weight="bold"
        />
      </Pressable>
    </ScrollView>
  );
}