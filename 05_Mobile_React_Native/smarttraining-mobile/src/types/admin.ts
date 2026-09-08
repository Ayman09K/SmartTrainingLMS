export type AdminUserRole =
  | "APPRENANT"
  | "FORMATEUR"
  | "ADMIN"
  | string;

export type AdminAccountStatus =
  | "ACTIVE"
  | "DISABLED"
  | "SUSPENDED"
  | string;

export type AdminTrainerRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | string;

export type AdminTrainingStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ARCHIVED"
  | "INACTIVE"
  | string;

export type AdminFeedbackStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | string;

export type AdminAlertStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "IGNORED"
  | string;

export interface AdminCreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: AdminUserRole;
  accountStatus?: AdminAccountStatus;
}
export interface AdminUserSummary {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email: string;
  civilite?: string | null;
  avatarDataUrl?: string | null;
  role: AdminUserRole;
  enabled?: boolean | null;
  accountStatus?: AdminAccountStatus | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminTrainerRequestSummary {
  id: number;
  requesterId: number;
  requesterEmail?: string | null;
  requesterFullName?: string | null;
  expertiseDomain?: string | null;
  experienceSummary?: string | null;
  motivation?: string | null;
  status: AdminTrainerRequestStatus;
  reviewerId?: number | null;
  reviewerEmail?: string | null;
  adminComment?: string | null;
  requestedAt?: string | null;
  reviewedAt?: string | null;
}

export interface AdminTrainingSummary {
  id: number;
  trainerId?: number | null;
  ownerId?: number | null;
  title: string;
  shortDescription?: string | null;
  category?: string | null;
  language?: string | null;
  level?: string | null;
  estimatedDurationHours?: number | null;
  status: AdminTrainingStatus;
  visibility?: string | null;
  enrollmentMode?: string | null;
  maxLearners?: number | null;
  averageRating?: number | null;
  reviewCount?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
}

export interface AdminFeedbackSummary {
  id: number;
  learnerId: number;
  trainingId: number;
  difficultyLevel?: string | null;
  needHelp?: boolean | null;
  message?: string | null;
  status: AdminFeedbackStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
  resolvedAt?: string | null;
  handledBy?: number | null;
  trainerResponse?: string | null;
}

export interface AdminAlertSummary {
  id: number;
  learnerId: number;
  trainingId: number;
  alertType?: string | null;
  severity?: string | null;
  title?: string | null;
  message?: string | null;
  source?: string | null;
  riskProbability?: number | null;
  status: AdminAlertStatus;
  createdAt?: string | null;
  resolvedAt?: string | null;
}

export interface AdminDashboardSummary {
  users: number;
  activeUsers: number;
  trainings: number;
  publishedTrainings: number;
  pendingTrainerRequests: number;
  openFeedbacks: number;
  openAlerts: number;
  degradedSections: string[];
}