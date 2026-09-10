import { Href, router } from "expo-router";
import {
  SymbolView,
  type SymbolViewProps,
} from "expo-symbols";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import ScreenContainer from "../../components/ScreenContainer";
import {
  getMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "../../features/notifications/notificationService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  MobileNotification,
  MobileNotificationRole,
} from "../../types/notification";

type NotificationsScreenProps = {
  role: MobileNotificationRole;
};

type NotificationFilter =
  | "ALL"
  | "TRAININGS"
  | "LEARNERS"
  | "SYSTEM";

type PaginationItem = number | "ellipsis";

type NotificationVisual = {
  soft: string;
  color: string;
  badgeSoft: string;
  icon: SymbolViewProps["name"];
};

const PAGE_SIZE = 5;

const FILTERS: {
  value: NotificationFilter;
  label: string;
}[] = [
  { value: "ALL", label: "Toutes" },
  { value: "TRAININGS", label: "Formations" },
  { value: "LEARNERS", label: "Apprenants" },
  { value: "SYSTEM", label: "Système" },
];

function typeLabel(
  notification: MobileNotification,
): string {
  const labels: Record<
    MobileNotification["notificationType"],
    string
  > = {
    SUPPORT_SESSION_CREATED: "Séance planifiée",
    SUPPORT_SESSION_UPDATED: "Séance modifiée",
    SUPPORT_SESSION_CANCELLED: "Séance annulée",
    SUPPORT_SESSION_SCHEDULED: "Séance planifiée",
    TRAINING_INVITATION: "Invitation formation",
    TRAINING_ASSIGNED: "Formation affectée",
    DEADLINE_ASSIGNED: "Échéance de formation",
    ACCESS_REQUEST_DECISION: "Décision d’accès",
    FEEDBACK_RESPONSE: "Feedback reçu",
    ACCOUNT_DELETION_REQUESTED: "Demande de suppression",
    ACCOUNT_DELETION_STATUS_UPDATED: "Information système",
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
    SUPPORT_SESSION_CREATED: "Voir les séances",
    SUPPORT_SESSION_UPDATED: "Voir les séances",
    SUPPORT_SESSION_CANCELLED: "Voir les séances",
    SUPPORT_SESSION_SCHEDULED: "Voir les séances",
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
  if (
    notification.notificationType ===
    "ACCOUNT_DELETION_REQUESTED"
  ) {
    return "/admin/account-deletion-requests" as Href;
  }

  if (
    notification.notificationType ===
    "ACCOUNT_DELETION_STATUS_UPDATED"
  ) {
    if (role === "ADMIN") {
      return "/admin/profile" as Href;
    }

    if (role === "FORMATEUR") {
      return "/trainer/profile" as Href;
    }

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

function filterForNotification(
  notification: MobileNotification,
): Exclude<NotificationFilter, "ALL"> {
  switch (notification.notificationType) {
    case "TRAINING_INVITATION":
    case "TRAINING_ASSIGNED":
    case "DEADLINE_ASSIGNED":
    case "ACCESS_REQUEST_DECISION":
      return "TRAININGS";

    case "SUPPORT_SESSION_CREATED":
    case "SUPPORT_SESSION_UPDATED":
    case "SUPPORT_SESSION_CANCELLED":
    case "SUPPORT_SESSION_SCHEDULED":
    case "FEEDBACK_RESPONSE":
      return "LEARNERS";

    case "ACCOUNT_DELETION_REQUESTED":
    case "ACCOUNT_DELETION_STATUS_UPDATED":
      return "SYSTEM";
  }
}

function visualForNotification(
  notification: MobileNotification,
): NotificationVisual {
  switch (notification.notificationType) {
    case "DEADLINE_ASSIGNED":
      return {
        soft: "#F1E9FF",
        badgeSoft: "#EFE6FF",
        color: "#7C3AED",
        icon: {
          ios: "calendar.badge.clock",
          android: "event",
          web: "event",
        },
      };

    case "TRAINING_ASSIGNED":
    case "TRAINING_INVITATION":
    case "ACCESS_REQUEST_DECISION":
      return {
        soft: "#EAF4FF",
        badgeSoft: "#E8F4FF",
        color: "#2480E8",
        icon: {
          ios: "person.badge.plus",
          android: "person_add",
          web: "person_add",
        },
      };

    case "FEEDBACK_RESPONSE":
      return {
        soft: "#E8F9EF",
        badgeSoft: "#E7F8EF",
        color: "#16A36A",
        icon: {
          ios: "bubble.left.and.bubble.right.fill",
          android: "forum",
          web: "forum",
        },
      };

    case "SUPPORT_SESSION_CREATED":
    case "SUPPORT_SESSION_UPDATED":
    case "SUPPORT_SESSION_CANCELLED":
    case "SUPPORT_SESSION_SCHEDULED":
      return {
        soft: "#FFF2E8",
        badgeSoft: "#FFF0E2",
        color: "#D97706",
        icon: {
          ios: "calendar",
          android: "event",
          web: "event",
        },
      };

    case "ACCOUNT_DELETION_REQUESTED":
    case "ACCOUNT_DELETION_STATUS_UPDATED":
      return {
        soft: "#F1E9FF",
        badgeSoft: "#F1E9FF",
        color: "#7C3AED",
        icon: {
          ios: "gearshape.fill",
          android: "settings",
          web: "settings",
        },
      };
  }
}

function relativeCreatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = Date.now() - date.getTime();

  if (diffMs < 0) {
    return date.toLocaleDateString("fr-FR");
  }

  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) {
    return "À l’instant";
  }

  if (minutes < 60) {
    return `Il y a ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Il y a ${hours} h`;
  }

  const days = Math.floor(hours / 24);

  if (days < 30) {
    return `Il y a ${days} jour${days > 1 ? "s" : ""}`;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function buildPagination(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  if (currentPage <= 2) {
    return [1, 2, 3, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 1) {
    return [
      1,
      "ellipsis",
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage,
    "ellipsis",
    totalPages,
  ];
}

export default function NotificationsScreen({
  role,
}: NotificationsScreenProps) {
  const { theme } = useSmartTrainingTheme();

  const [notifications, setNotifications] = useState<
    MobileNotification[]
  >([]);
  const [filter, setFilter] =
    useState<NotificationFilter>("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] =
    useState<number | null>(null);
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

  const filteredNotifications = useMemo(() => {
    if (filter === "ALL") {
      return notifications;
    }

    return notifications.filter(
      (notification) =>
        filterForNotification(notification) === filter,
    );
  }, [filter, notifications]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredNotifications.length / PAGE_SIZE,
    ),
  );

  const currentPage = Math.min(
    Math.max(page, 1),
    totalPages,
  );

  const startIndex =
    (currentPage - 1) * PAGE_SIZE;

  const visibleNotifications =
    filteredNotifications.slice(
      startIndex,
      startIndex + PAGE_SIZE,
    );

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const firstVisible =
    filteredNotifications.length === 0
      ? 0
      : startIndex + 1;

  const lastVisible = Math.min(
    startIndex + PAGE_SIZE,
    filteredNotifications.length,
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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
          await markMyNotificationRead(
            notification.id,
          );

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

      router.push(
        actionTarget(role, notification),
      );
    } catch {
      setError(
        "Impossible d’ouvrir cette notification pour le moment.",
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

  function changeFilter(
    nextFilter: NotificationFilter,
  ) {
    setFilter(nextFilter);
    setPage(1);
  }

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center gap-3 px-6"
        style={{
          backgroundColor: "#F8F6F3",
        }}
      >
        <ActivityIndicator
          size="large"
          color={theme.colors.accent}
        />

        <Text
          className="text-[14px]"
          style={{
            color: theme.colors.foregroundMuted,
          }}
        >
          Chargement des notifications...
        </Text>
      </View>
    );
  }

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{
        padding: 0,
        backgroundColor: "#F8F6F3",
      }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 28,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-[760px]">
          {/* HERO EXACT STYLE */}
          <View
            className="overflow-hidden rounded-[20px] border"
            style={{
              backgroundColor: "#F2E9FF",
              borderColor: "#E8DAFB",
            }}
          >
            <View className="relative flex-row items-center px-3.5 py-3">
              <View
                className="absolute -right-5 -top-8 h-[110px] w-[110px] rounded-full"
                style={{ backgroundColor: "#DCC5FF" }}
              />
              <View
                className="absolute right-8 -top-3 h-[82px] w-[82px] rounded-full"
                style={{ backgroundColor: "#E9DAFF" }}
              />

              <View
                className="h-[54px] w-[54px] items-center justify-center rounded-[16px]"
                style={{ backgroundColor: "#7C3AED" }}
              >
                <SymbolView
                  name={{
                    ios: "bell.fill",
                    android: "notifications",
                    web: "notifications",
                  }}
                  tintColor="#FFFFFF"
                  size={24}
                  weight="bold"
                />
              </View>

              <View className="ml-3 min-w-0 flex-1 pr-8">
                <Text
                  className="text-[17px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Notifications
                </Text>

                <Text
                  className="mt-1 text-[13px] leading-[18px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Restez informé de tout ce qui concerne vos formations et vos apprenants.
                </Text>
              </View>
            </View>
          </View>

          {/* KPI EXACT STYLE */}
          <View className="mt-2 flex-row gap-2">
            <View
              className="min-w-0 flex-1 flex-row items-center rounded-[15px] border bg-white px-3 py-2.5"
              style={{ borderColor: "#E7E2EB" }}
            >
              <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-[#EAF4FF]">
                <SymbolView
                  name={{
                    ios: "doc.text.fill",
                    android: "description",
                    web: "description",
                  }}
                  tintColor="#2480E8"
                  size={15}
                  weight="bold"
                />
              </View>

              <View className="ml-2.5">
                <Text
                  className="text-[21px] font-black leading-[21px]"
                  style={{ color: theme.colors.foreground }}
                >
                  {notifications.length}
                </Text>
                <Text
                  className="text-[13px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Total
                </Text>
              </View>
            </View>

            <View
              className="min-w-0 flex-1 flex-row items-center rounded-[15px] border bg-white px-3 py-2.5"
              style={{ borderColor: "#E7E2EB" }}
            >
              <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-[#FDEAF7]">
                <SymbolView
                  name={{
                    ios: "bell.fill",
                    android: "notifications",
                    web: "notifications",
                  }}
                  tintColor="#E83E8C"
                  size={15}
                  weight="bold"
                />
              </View>

              <View className="ml-2.5">
                <Text
                  className="text-[21px] font-black leading-[21px]"
                  style={{ color: theme.colors.foreground }}
                >
                  {unreadCount}
                </Text>
                <Text
                  className="text-[13px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Non lues
                </Text>
              </View>
            </View>
          </View>

          {/* FILTRES EXACT STYLE */}
          <View className="mt-2 flex-row gap-1.5">
            {FILTERS.map((item) => {
              const active = filter === item.value;

              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => changeFilter(item.value)}
                  android_ripple={{ color: "transparent" }}
                  className="h-9 min-w-0 flex-1 items-center justify-center rounded-full border px-1"
                  style={{
                    backgroundColor: active
                      ? "#7C3AED"
                      : "#FFFFFF",
                    borderColor: active
                      ? "#7C3AED"
                      : "#E3DFE7",
                  }}
                >
                  <Text
                    numberOfLines={1}
                    className="text-[12px] font-bold"
                    style={{
                      color: active
                        ? "#FFFFFF"
                        : theme.colors.foregroundMuted,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* MARK ALL EXACT STYLE */}
          <Pressable
            accessibilityRole="button"
            disabled={unreadCount === 0 || markingAll}
            onPress={() => void markAllRead()}
            android_ripple={{ color: "transparent" }}
            className="mt-2 flex-row items-center rounded-[14px] border bg-white px-3 py-2.5"
            style={{
              borderColor: "#E7E2EB",
              opacity:
                unreadCount === 0 || markingAll
                  ? 0.45
                  : 1,
            }}
          >
            <View className="h-6 w-6 items-center justify-center rounded-full bg-[#7C3AED]">
              <SymbolView
                name={{
                  ios: "checkmark",
                  android: "check",
                  web: "check",
                }}
                tintColor="#FFFFFF"
                size={11}
                weight="bold"
              />
            </View>

            <Text className="ml-2 flex-1 text-[13px] font-black text-[#7C3AED]">
              {markingAll
                ? "Mise à jour..."
                : "Tout marquer comme lu"}
            </Text>

            <SymbolView
              name={{
                ios: "chevron.right",
                android: "chevron_right",
                web: "chevron_right",
              }}
              tintColor="#7F8AA3"
              size={13}
              weight="bold"
            />
          </Pressable>

          {error ? (
            <View
              className="mt-2 rounded-[14px] border px-3 py-2.5"
              style={{
                backgroundColor: "#FFF4F4",
                borderColor: "#F0C8C8",
              }}
            >
              <Text
                className="text-[13px] font-bold leading-[18px]"
                style={{ color: theme.colors.danger }}
              >
                {error}
              </Text>
            </View>
          ) : null}

          <View className="mt-2.5 gap-2">
            {visibleNotifications.map(
              (notification) => {
                const unread = !notification.read;
                const visual =
                  visualForNotification(notification);

                return (
                  <Pressable
                    key={notification.id}
                    accessibilityRole="button"
                    disabled={
                      busyId === notification.id
                    }
                    onPress={() =>
                      void openNotification(
                        notification,
                      )
                    }
                    android_ripple={{
                      color: "transparent",
                    }}
                    className="overflow-hidden rounded-[17px] border"
                    style={{
                      backgroundColor: unread
                        ? "#F7F2FF"
                        : "#FFFFFF",
                      borderColor: unread
                        ? "#D9C8F6"
                        : "#E7E2EB",
                      borderLeftWidth: unread ? 3 : 1,
                      borderLeftColor: unread
                        ? "#7C3AED"
                        : "#E7E2EB",
                      opacity:
                        busyId === notification.id
                          ? 0.5
                          : 1,
                    }}
                  >
                    <View className="flex-row items-start px-3 py-2.5">
                      <View
                        className="h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
                        style={{
                          backgroundColor: visual.soft,
                        }}
                      >
                        <SymbolView
                          name={visual.icon}
                          tintColor={visual.color}
                          size={17}
                          weight="bold"
                        />
                      </View>

                      <View className="ml-2.5 min-w-0 flex-1">
                        <View className="flex-row items-center justify-between gap-2">
                          <View
                            className="max-w-[62%] rounded-full px-2 py-0.5"
                            style={{
                              backgroundColor:
                                visual.badgeSoft,
                            }}
                          >
                            <Text
                              numberOfLines={1}
                              className="text-[11px] font-bold"
                              style={{
                                color: visual.color,
                              }}
                            >
                              {typeLabel(
                                notification,
                              )}
                            </Text>
                          </View>

                          <View className="flex-row items-center">
                            <Text
                              numberOfLines={1}
                              className="text-[11px]"
                              style={{
                                color:
                                  theme.colors
                                    .foregroundSubtle,
                              }}
                            >
                              {relativeCreatedAt(
                                notification.createdAt,
                              )}
                            </Text>

                            {unread ? (
                              <View className="ml-1.5 h-2 w-2 rounded-full bg-[#7C3AED]" />
                            ) : null}
                          </View>
                        </View>

                        <View className="mt-1.5 flex-row items-center">
                          <View className="min-w-0 flex-1">
                            <Text
                              numberOfLines={1}
                              className="text-[14px] font-black"
                              style={{
                                color:
                                  theme.colors.foreground,
                              }}
                            >
                              {notification.title}
                            </Text>

                            <Text
                              numberOfLines={2}
                              className="mt-0.5 text-[12px] leading-[18px]"
                              style={{
                                color:
                                  theme.colors
                                    .foregroundMuted,
                              }}
                            >
                              {notification.message}
                            </Text>
                          </View>

                          <SymbolView
                            name={{
                              ios: "chevron.right",
                              android: "chevron_right",
                              web: "chevron_right",
                            }}
                            tintColor="#7F8AA3"
                            size={13}
                            weight="bold"
                          />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              },
            )}
          </View>

          {filteredNotifications.length === 0 ? (
            <View
              className="mt-2 items-center rounded-[17px] border bg-white px-5 py-7"
              style={{ borderColor: "#E7E2EB" }}
            >
              <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F1E9FF]">
                <SymbolView
                  name={{
                    ios: "bell.slash.fill",
                    android: "notifications_off",
                    web: "notifications_off",
                  }}
                  tintColor="#7C3AED"
                  size={18}
                  weight="bold"
                />
              </View>

              <Text
                className="mt-3 text-[15px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Aucune notification
              </Text>

              <Text
                className="mt-1 text-center text-[12px] leading-[18px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Aucune notification ne correspond à ce filtre.
              </Text>
            </View>
          ) : null}

          {filteredNotifications.length > 0 ? (
            <View
              className="mt-6 mb-2 rounded-[18px] border bg-white px-3 py-3"
              style={{ borderColor: "#E7E2EB" }}
            >
              <View className="mb-2.5 flex-row items-center justify-between">
                <Text
                  className="text-[12px] font-bold"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {filteredNotifications.length <= PAGE_SIZE
                    ? `${filteredNotifications.length} notification${filteredNotifications.length > 1 ? "s" : ""}`
                    : `${firstVisible}–${lastVisible} sur ${filteredNotifications.length}`}
                </Text>

                <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1">
                  <Text className="text-[11px] font-black text-[#7C3AED]">
                    Page {currentPage} / {totalPages}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-center gap-1.5">
                <PageArrow
                  previous
                  disabled={currentPage === 1}
                  onPress={() => setPage(currentPage - 1)}
                />

                {paginationItems.map((entry, index) =>
                  entry === "ellipsis" ? (
                    <Text
                      key={`ellipsis-${index}`}
                      className="w-5 text-center text-[14px]"
                      style={{ color: theme.colors.foregroundSubtle }}
                    >
                      …
                    </Text>
                  ) : (
                    <Pressable
                      key={entry}
                      accessibilityRole="button"
                      accessibilityLabel={`Page ${entry}`}
                      accessibilityState={{
                        selected: entry === currentPage,
                      }}
                      onPress={() => setPage(entry)}
                      android_ripple={{ color: "transparent" }}
                      className="h-9 w-9 items-center justify-center rounded-[11px] border"
                      style={{
                        backgroundColor:
                          entry === currentPage
                            ? theme.colors.accent
                            : theme.colors.surface,
                        borderColor:
                          entry === currentPage
                            ? theme.colors.accent
                            : theme.colors.border,
                      }}
                    >
                      <Text
                        className="text-[12px] font-black"
                        style={{
                          color:
                            entry === currentPage
                              ? theme.colors.accentForeground
                              : theme.colors.foregroundMuted,
                        }}
                      >
                        {entry}
                      </Text>
                    </Pressable>
                  ),
                )}

                <PageArrow
                  disabled={currentPage === totalPages}
                  onPress={() => setPage(currentPage + 1)}
                />
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function PageArrow({
    previous = false,
    disabled,
    onPress,
  }: {
    previous?: boolean;
    disabled: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          previous
            ? "Page précédente"
            : "Page suivante"
        }
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{
          color: "transparent",
        }}
        className="h-9 w-9 items-center justify-center rounded-[11px] border"
        style={{
          backgroundColor: disabled
            ? "#F8F6F3"
            : theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <SymbolView
          name={{
            ios: previous
              ? "chevron.left"
              : "chevron.right",
            android: previous
              ? "chevron_left"
              : "chevron_right",
            web: previous
              ? "chevron_left"
              : "chevron_right",
          }}
          tintColor={
            disabled
              ? theme.colors.foregroundSubtle
              : theme.colors.accent
          }
          size={12}
          weight="bold"
        />
      </Pressable>
    );
  }
}
