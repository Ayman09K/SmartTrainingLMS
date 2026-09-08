import { getData, putData } from "./apiClient";
import type {
  LearnerNotificationResponse,
  UnreadNotificationCountResponse,
} from "../types/notification";

export async function getMyNotifications(): Promise<LearnerNotificationResponse[]> {
  return getData<LearnerNotificationResponse[]>("/analytics/notifications/me");
}

export async function getUnreadNotificationCount(): Promise<UnreadNotificationCountResponse> {
  return getData<UnreadNotificationCountResponse>(
    "/analytics/notifications/me/unread-count",
  );
}

export async function markNotificationRead(
  notificationId: number,
): Promise<LearnerNotificationResponse> {
  return putData<LearnerNotificationResponse>(
    `/analytics/notifications/${notificationId}/read`,
  );
}

export async function markAllNotificationsRead(): Promise<void> {
  await putData<void>("/analytics/notifications/me/read-all");
}
