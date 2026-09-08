import ScreenContainer from "../../components/ScreenContainer";
import { Href, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "../../features/notifications/notificationService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  MobileNotification,
  MobileNotificationRole,
} from "../../types/notification";

type NotificationsScreenProps = {
  role: MobileNotificationRole;
};

function typeLabel(
  notification: MobileNotification,
): string {
  const labels: Record<
    MobileNotification["notificationType"],
    string
  > = {
    SUPPORT_SESSION_CREATED: "S\u00e9ance planifi\u00e9e",
    SUPPORT_SESSION_UPDATED: "S\u00e9ance modifi\u00e9e",
    SUPPORT_SESSION_CANCELLED: "S\u00e9ance annul\u00e9e",
    SUPPORT_SESSION_SCHEDULED: "S\u00e9ance planifi\u00e9e",
    TRAINING_INVITATION: "Invitation \u00e0 une formation",
    TRAINING_ASSIGNED: "Formation affect\u00e9e",
    DEADLINE_ASSIGNED: "\u00c9ch\u00e9ance de formation",
    ACCESS_REQUEST_DECISION: "D\u00e9cision d'acc\u00e8s",
    FEEDBACK_RESPONSE: "R\u00e9ponse \u00e0 votre feedback",
    ACCOUNT_DELETION_REQUESTED: "Demande de suppression",
    ACCOUNT_DELETION_STATUS_UPDATED: "Suppression du compte",
  };

  return labels[notification.notificationType];
}

function actionLabel(
  notification: MobileNotification,
): string {
  const labels: Record<
    MobileNotification["notificationType"],
    string
  > = {
    SUPPORT_SESSION_CREATED: "Voir les s\u00e9ances",
    SUPPORT_SESSION_UPDATED: "Voir les s\u00e9ances",
    SUPPORT_SESSION_CANCELLED: "Voir les s\u00e9ances",
    SUPPORT_SESSION_SCHEDULED: "Voir les s\u00e9ances",
    TRAINING_INVITATION: "Voir les invitations",
    TRAINING_ASSIGNED: "Voir la formation",
    DEADLINE_ASSIGNED: "Voir la formation",
    ACCESS_REQUEST_DECISION: "Voir les formations",
    FEEDBACK_RESPONSE: "Voir les feedbacks",
    ACCOUNT_DELETION_REQUESTED: "Voir les demandes",
    ACCOUNT_DELETION_STATUS_UPDATED: "Voir mon compte",
  };

  return labels[notification.notificationType];
}

function actionTarget(
  role: MobileNotificationRole,
  notification: MobileNotification,
): Href {
  if (notification.notificationType === "ACCOUNT_DELETION_REQUESTED") {
    return "/admin/account-deletion-requests" as Href;
  }

  if (notification.notificationType === "ACCOUNT_DELETION_STATUS_UPDATED") {
    if (role === "ADMIN") return "/admin/profile" as Href;
    if (role === "FORMATEUR") return "/trainer/profile" as Href;
    return "/learner/profile" as Href;
  }

  if (role === "APPRENANT") {
    switch (notification.notificationType) {
      case "SUPPORT_SESSION_CREATED":
      case "SUPPORT_SESSION_UPDATED":
      case "SUPPORT_SESSION_CANCELLED":
      case "SUPPORT_SESSION_SCHEDULED":
        return "/learner/sessions" as Href;
      case "TRAINING_INVITATION":
        return "/learner/invitations" as Href;
      case "TRAINING_ASSIGNED":
      case "DEADLINE_ASSIGNED":
        return notification.trainingId
          ? (`/learner/training-detail?trainingId=${notification.trainingId}` as Href)
          : ("/learner/my-trainings" as Href);
      case "ACCESS_REQUEST_DECISION":
        return "/learner/catalog" as Href;
      case "FEEDBACK_RESPONSE":
        return "/learner/reviews-feedback" as Href;
    }
  }

  if (role === "FORMATEUR") {
    switch (notification.notificationType) {
      case "SUPPORT_SESSION_CREATED":
      case "SUPPORT_SESSION_UPDATED":
      case "SUPPORT_SESSION_CANCELLED":
      case "SUPPORT_SESSION_SCHEDULED":
        return "/trainer/support-sessions" as Href;
      case "FEEDBACK_RESPONSE":
        return "/trainer/feedbacks" as Href;
      default:
        return "/trainer/trainings" as Href;
    }
  }

  switch (notification.notificationType) {
    case "FEEDBACK_RESPONSE":
      return "/admin/feedbacks" as Href;
    default:
      return "/admin/trainings" as Href;
  }
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-FR");
}

export default function NotificationsScreen({
  role,
}: NotificationsScreenProps) {
  const { theme } = useSmartTrainingTheme();
  const [notifications, setNotifications] = useState<
    MobileNotification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    setError("");

    try {
      const data = await getMyNotifications();
      setNotifications(data);
    } catch {
      setError(
        "Impossible de charger vos notifications pour le moment.",
      );
    }
  }, []);

  useEffect(() => {
    let active = true;

    void getMyNotifications()
      .then((data) => {
        if (active) {
          setNotifications(data);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger vos notifications pour le moment.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  async function refresh() {
    setRefreshing(true);

    try {
      await loadNotifications();
    } finally {
      setRefreshing(false);
    }
  }

  async function openNotification(
    notification: MobileNotification,
  ) {
    setBusyId(notification.id);
    setError("");

    try {
      if (!notification.read) {
        const updated =
          await markMyNotificationRead(notification.id);

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  read: true,
                  readAt:
                    updated.readAt ??
                    new Date().toISOString(),
                }
              : item,
          ),
        );
      }

      router.push(actionTarget(role, notification));
    } catch {
      setError(
        "Impossible d'ouvrir cette notification pour le moment.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    if (unreadCount === 0 || markingAll) {
      return;
    }

    setMarkingAll(true);
    setError("");

    try {
      await markAllMyNotificationsRead();
      const now = new Date().toISOString();

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
          readAt: item.readAt ?? now,
        })),
      );
    } catch {
      setError(
        "Impossible de marquer toutes les notifications comme lues.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  if (loading) {
    return (
      <View
        style={[
          styles.centered,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={theme.colors.accent}
        />
        <Text
          style={[
            styles.mutedText,
            {
              color: theme.colors.foregroundMuted,
            },
          ]}
        >
          Chargement des notifications...
        </Text>
      </View>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
      style={{
        backgroundColor: theme.colors.background,
      }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          tintColor={theme.colors.accent}
        />
      }
    >
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.accent,
              },
            ]}
          >
            Notifications
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {
              "Retrouvez vos notifications et acc\u00e9dez aux informations qui vous concernent."
            }
          </Text>
        </View>

        <View
          style={[
            styles.unreadBadge,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.accent,
            },
          ]}
        >
          <Text
            style={[
              styles.unreadBadgeText,
              {
                color: theme.colors.accent,
              },
            ]}
          >
            {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={unreadCount === 0 || markingAll}
        onPress={() => void markAllRead()}
        style={({ pressed }) => [
          styles.markAllButton,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
          },
          unreadCount === 0 ? styles.disabled : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Text
          style={[
            styles.markAllText,
            {
              color: theme.colors.accent,
            },
          ]}
        >
          {markingAll
            ? "Mise \u00e0 jour..."
            : "Tout marquer comme lu"}
        </Text>
      </Pressable>

      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.errorText,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {error}
          </Text>
        </View>
      ) : null}

      {notifications.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.emptyTitle,
              {
                color: theme.colors.accent,
              },
            ]}
          >
            Aucune notification
          </Text>
          <Text
            style={[
              styles.mutedText,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {
              "Vos notifications appara\u00eetront ici d\u00e8s qu'une action ou une information vous concernera."
            }
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {notifications.map((notification) => (
            <View
              key={notification.id}
              style={[
                styles.card,
                {
                  backgroundColor:
                    theme.colors.surfaceElevated,
                  borderColor: notification.read
                    ? theme.colors.border
                    : theme.colors.accent,
                },
              ]}
            >
              <View style={styles.cardTopRow}>
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor:
                        theme.colors.surfaceSoft,
                      borderColor: notification.read
                        ? theme.colors.border
                        : theme.colors.accent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      {
                        color: notification.read
                          ? theme.colors.foregroundMuted
                          : theme.colors.accent,
                      },
                    ]}
                  >
                    {typeLabel(notification)}
                  </Text>
                </View>

                {!notification.read ? (
                  <View
                    style={[
                      styles.unreadDot,
                      {
                        backgroundColor:
                          theme.colors.accent,
                      },
                    ]}
                  />
                ) : null}
              </View>

              <Text
                style={[
                  styles.cardTitle,
                  {
                    color: theme.colors.accent,
                  },
                ]}
              >
                {notification.title}
              </Text>

              <Text
                style={[
                  styles.message,
                  {
                    color: theme.colors.foregroundMuted,
                  },
                ]}
              >
                {notification.message}
              </Text>

              <Text
                style={[
                  styles.date,
                  {
                    color: theme.colors.foregroundMuted,
                  },
                ]}
              >
                {formatCreatedAt(notification.createdAt)}
              </Text>

              <Pressable
                accessibilityRole="button"
                disabled={busyId === notification.id}
                onPress={() =>
                  void openNotification(notification)
                }
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    backgroundColor:
                      theme.colors.surfaceSoft,
                    borderColor: theme.colors.accent,
                  },
                  busyId === notification.id
                    ? styles.disabled
                    : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    {
                      color: theme.colors.accent,
                    },
                  ]}
                >
                  {busyId === notification.id
                    ? "Ouverture..."
                    : actionLabel(notification)}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 40,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 24,
  },
  headingRow: {
    gap: 12,
  },
  headingText: {
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  unreadBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  markAllButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "900",
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  mutedText: {
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  typeBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
  },
  actionButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.78,
  },
});
