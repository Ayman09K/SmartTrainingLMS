import { SymbolView } from "expo-symbols";
import { Href, router } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";

export type AdminUserManagementSection =
  | "users"
  | "trainer-requests"
  | "account-deletion";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

const entries: {
  key: AdminUserManagementSection;
  label: string;
  helper: string;
  route: Href;
  icon: SymbolName;
}[] = [
  {
    key: "users",
    label: "Utilisateurs",
    helper: "Comptes & rôles",
    route: "/admin/users" as Href,
    icon: {
      ios: "person.2.fill",
      android: "group",
      web: "group",
    },
  },
  {
    key: "trainer-requests",
    label: "Rôle formateur",
    helper: "Demandes d’accès",
    route: "/admin/trainer-requests" as Href,
    icon: {
      ios: "person.badge.plus",
      android: "badge",
      web: "badge",
    },
  },
  {
    key: "account-deletion",
    label: "Suppressions",
    helper: "Demandes de compte",
    route: "/admin/account-deletion-requests" as Href,
    icon: {
      ios: "trash.fill",
      android: "delete",
      web: "delete",
    },
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
      className="mb-3 overflow-hidden rounded-[20px] border bg-white"
      style={{ borderColor: "#E5DFE8" }}
    >
      <View className="h-[3px] bg-[#7C3AED]" />

      <View className="px-3.5 pb-3.5 pt-3">
        <View className="mb-2 flex-row items-center">
          <View className="h-7 w-7 items-center justify-center rounded-[9px] bg-[#F1E9FF]">
            <SymbolView
              name={{
                ios: "person.2.badge.gearshape.fill",
                android: "manage_accounts",
                web: "manage_accounts",
              }}
              tintColor="#7C3AED"
              size={12}
              weight="bold"
            />
          </View>

          <Text
            className="ml-2 text-[9px] font-black uppercase tracking-[0.65px]"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            Gestion des utilisateurs
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingRight: 4 }}
        >
          {entries.map((entry) => {
            const selected = entry.key === active;

            return (
              <Pressable
                key={entry.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={entry.label}
                onPress={() => {
                  if (!selected) router.push(entry.route);
                }}
                android_ripple={{ color: "transparent" }}
                className="min-w-[136px] flex-row items-center rounded-[13px] border px-3 py-2.5"
                style={{
                  backgroundColor: selected ? "#7C3AED" : "#FFFFFF",
                  borderColor: selected ? "#7C3AED" : "#E5DFE8",
                }}
              >
                <View
                  className="h-7 w-7 shrink-0 items-center justify-center rounded-[9px]"
                  style={{
                    backgroundColor: selected
                      ? "rgba(255,255,255,0.18)"
                      : "#F3EEFF",
                  }}
                >
                  <SymbolView
                    name={entry.icon}
                    tintColor={selected ? "#FFFFFF" : "#7C3AED"}
                    size={11}
                    weight="bold"
                  />
                </View>

                <View className="ml-2 min-w-0 flex-1">
                  <Text
                    numberOfLines={1}
                    className="text-[9px] font-black"
                    style={{
                      color: selected
                        ? "#FFFFFF"
                        : theme.colors.foreground,
                    }}
                  >
                    {entry.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="mt-0.5 text-[7px]"
                    style={{
                      color: selected
                        ? "rgba(255,255,255,0.78)"
                        : theme.colors.foregroundMuted,
                    }}
                  >
                    {entry.helper}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
