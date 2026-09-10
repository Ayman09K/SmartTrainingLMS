import { SymbolView } from "expo-symbols";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
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

  const [unreadCount, setUnreadCount] =
    useState<number | null>(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void getMyUnreadNotificationCount()
        .then((count) => {
          if (active) {
            setUnreadCount(
              Math.max(0, count),
            );
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

  const hasUnread =
    unreadCount === null ||
    unreadCount > 0;

  const badgeLabel =
    unreadCount === null
      ? "!"
      : unreadCount > 99
        ? "99+"
        : String(unreadCount);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount === null
          ? "Notifications, compteur temporairement indisponible"
          : unreadCount > 0
            ? `Notifications, ${unreadCount} non lue${
                unreadCount > 1 ? "s" : ""
              }`
            : "Notifications"
      }
      hitSlop={8}
      onPress={onPress}
      android_ripple={{
        color: "transparent",
      }}
      className="relative h-10 w-10 items-center justify-center rounded-[14px] border"
      style={{
        backgroundColor:
          "rgba(255,255,255,0.08)",
        borderColor:
          "rgba(255,255,255,0.12)",
      }}
    >
      <SymbolView
        name={{
          ios: hasUnread
            ? "bell.fill"
            : "bell",
          android:
            "notifications_none",
          web: "notifications",
        }}
        tintColor={
          theme.colors.headerForeground
        }
        size={19}
        weight="medium"
      />

      {hasUnread ? (
        <View
          className="absolute -right-1 -top-1 min-w-[18px] items-center justify-center rounded-full border-2 px-1"
          style={{
            height: 18,
            backgroundColor: "#F04438",
            borderColor:
              theme.colors.headerBackground,
          }}
        >
          <Text className="text-[8px] font-black leading-[10px] text-white">
            {badgeLabel}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
