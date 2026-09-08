import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getMyUnreadNotificationCount,
} from "../../features/notifications/notificationService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

type NotificationShortcutProps = {
  onPress: () => void;
};

export default function NotificationShortcut({
  onPress,
}: NotificationShortcutProps) {
  const { theme } = useSmartTrainingTheme();
  const [unreadCount, setUnreadCount] = useState<number | null>(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void getMyUnreadNotificationCount()
        .then((count) => {
          if (active) {
            setUnreadCount(Math.max(0, count));
          }
        })
        .catch(() => {
          if (active) {
            setUnreadCount(null);
          }
        });

      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount === null
          ? "Notifications, compteur temporairement indisponible"
          : unreadCount > 0
            ? `Notifications, ${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
            : "Notifications"
      }
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text
        style={[
          styles.bell,
          { color: theme.colors.headerForeground },
        ]}
      >
        {"\uD83D\uDD14"}
      </Text>

      {unreadCount === null || unreadCount > 0 ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.accent,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: theme.colors.accent },
            ]}
          >
            {unreadCount === null ? "!" : unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  bell: {
    fontSize: 20,
    lineHeight: 24,
  },
  badge: {
    position: "absolute",
    right: -2,
    top: 1,
    minWidth: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.7,
  },
});
