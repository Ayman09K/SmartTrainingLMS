import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";

import NotificationShortcut from "../notifications/NotificationShortcut";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

type Props = {
  onAssistantPress: () => void;
  onNotificationsPress?: () => void;
};

export default function RoleHeaderShortcuts({
  onAssistantPress,
  onNotificationsPress,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View className="flex-row items-center gap-2 pr-2">
      {/* Assistant IA */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ouvrir l’Assistant SmartTraining"
        hitSlop={8}
        onPress={onAssistantPress}
        android_ripple={{ color: "transparent" }}
        className="h-10 flex-row items-center justify-center rounded-[14px] border px-3"
        style={{
          backgroundColor: "rgba(255,255,255,0.08)",
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        <View className="h-6 w-6 items-center justify-center rounded-[9px] bg-[#7C3AED]">
          <SymbolView
            name={{
              ios: "sparkles",
              android: "auto_awesome",
              web: "auto_awesome",
            }}
            tintColor="#FFFFFF"
            size={14}
            weight="bold"
          />
        </View>

        <Text
          className="ml-1.5 text-[10px] font-black tracking-[0.2px]"
          style={{
            color: theme.colors.headerForeground,
          }}
        >
          IA
        </Text>
      </Pressable>

      {/* Notifications */}
      {onNotificationsPress ? (
        <NotificationShortcut
          onPress={onNotificationsPress}
        />
      ) : null}
    </View>
  );
}
