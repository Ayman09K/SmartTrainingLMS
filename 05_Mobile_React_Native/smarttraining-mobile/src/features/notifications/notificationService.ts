import { apiClient } from "../../api/apiClient";
import {
  MobileNotification,
  MobileUnreadNotificationCount,
} from "../../types/notification";

export async function getMyNotifications(): Promise<
  MobileNotification[]
> {
  const response = await apiClient.get<MobileNotification[]>(
    "/analytics/notifications/me",
  );

  return response.data;
}

export async function getMyUnreadNotificationCount(): Promise<number> {
  const response =
    await apiClient.get<MobileUnreadNotificationCount>(
      "/analytics/notifications/me/unread-count",
    );

  return response.data.unreadCount;
}

export async function markMyNotificationRead(
  notificationId: number,
): Promise<MobileNotification> {
  const response = await apiClient.patch<MobileNotification>(
    `/analytics/notifications/me/${notificationId}/read`,
  );

  return response.data;
}

export async function markAllMyNotificationsRead(): Promise<void> {
  await apiClient.patch(
    "/analytics/notifications/me/read-all",
  );
}