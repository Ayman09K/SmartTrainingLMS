export type LearnerNotificationType =
  | "SUPPORT_SESSION_CREATED"
  | "SUPPORT_SESSION_UPDATED"
  | "SUPPORT_SESSION_CANCELLED"
  | "SUPPORT_SESSION_SCHEDULED"
  | "TRAINING_INVITATION"
  | "TRAINING_ASSIGNED"
  | "DEADLINE_ASSIGNED"
  | "ACCESS_REQUEST_DECISION"
  | "FEEDBACK_RESPONSE"
  | "ACCOUNT_DELETION_REQUESTED"
  | "ACCOUNT_DELETION_STATUS_UPDATED";

export interface LearnerNotificationResponse {
  id: number;
  userId?: number;
  learnerId?: number;
  supportSessionId?: number | null;
  trainingId?: number | null;
  notificationType: LearnerNotificationType;
  title: string;
  message: string;
  actionUrl: string;
  eventKey?: string | null;
  createdAt: string;
  readAt?: string | null;
  read: boolean;
}

export interface UnreadNotificationCountResponse {
  unreadCount: number;
}
