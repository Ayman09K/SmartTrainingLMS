import { Href, router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  Pressable,
  Text,
  View,
} from "react-native";

import { removeToken } from "../../storage/tokenStorage";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

export default function AccountSessionCard() {
  const { theme } = useSmartTrainingTheme();
  const [loggingOut, setLoggingOut] = useState(false);

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
    <View
      className="overflow-hidden rounded-[18px] border bg-white"
      style={{ borderColor: theme.colors.border }}
    >
      <View className="flex-row items-center px-3.5 py-3">
        <View className="h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#F1E9FF]">
          <SymbolView
            name={{
              ios: "rectangle.portrait.and.arrow.right",
              android: "logout",
              web: "logout",
            }}
            tintColor={theme.colors.accent}
            size={14}
            weight="bold"
          />
        </View>

        <View className="ml-3 min-w-0 flex-1">
          <Text
            className="text-[10px] font-black uppercase tracking-[0.6px]"
            style={{ color: theme.colors.accent }}
          >
            Session
          </Text>

          <Text
            className="mt-0.5 text-[14px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            Se déconnecter
          </Text>

          <Text
            className="mt-0.5 text-[11px] leading-[16px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            Fermez votre session SmartTraining sur cet appareil.
          </Text>
        </View>
      </View>

      <View className="border-t border-[#EEE9F0] px-3.5 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: loggingOut }}
          disabled={loggingOut}
          onPress={() => void handleLogout()}
          android_ripple={{ color: "transparent" }}
          className="h-10 flex-row items-center justify-center rounded-[11px] border"
          style={{
            backgroundColor: "#FBF9FC",
            borderColor: theme.colors.border,
            opacity: loggingOut ? 0.5 : 1,
          }}
        >
          <SymbolView
            name={{
              ios: "rectangle.portrait.and.arrow.right",
              android: "logout",
              web: "logout",
            }}
            tintColor={theme.colors.accent}
            size={13}
            weight="bold"
          />

          <Text
            className="ml-2 text-[11px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {loggingOut ? "Déconnexion..." : "Se déconnecter"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
