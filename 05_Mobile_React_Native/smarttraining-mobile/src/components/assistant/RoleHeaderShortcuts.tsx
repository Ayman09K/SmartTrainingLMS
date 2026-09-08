import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";

import NotificationShortcut from "../notifications/NotificationShortcut";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";

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
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ouvrir l’Assistant SmartTraining"
        hitSlop={8}
        onPress={onAssistantPress}
        style={({ pressed }) => [
          styles.assistantButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <SymbolView
          name={{
            ios: "sparkles",
            android: "auto_awesome",
            web: "auto_awesome",
          }}
          tintColor={theme.colors.headerForeground}
          size={21}
          weight="bold"
        />
      </Pressable>

      {onNotificationsPress ? (
        <NotificationShortcut onPress={onNotificationsPress} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  assistantButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
