import type {
  AccountStatus,
  AuthUser,
  TrainerAccessRequestResponse,
  TrainerRequestStatus,
  UserRole,
} from "./auth";
import type {
  EnrollmentResponse,
  TrainingAccessRequestResponse,
  TrainingInvitationResponse,
  TrainingResponse,
} from "./training";
import type {
  FeedbackResponse,
  TrainingReviewResponse,
} from "./analytics";

export interface AdminCreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  accountStatus?: AccountStatus;
}

export interface AdminUpdateUserRoleRequest {
  role: UserRole;
}

export interface AdminUpdateUserStatusRequest {
  accountStatus: AccountStatus;
}

export interface AdminTrainerRequestReviewRequest {
  adminComment?: string;
}

export interface AdminAlertResponse {
  id: number;
  learnerId?: number;
  trainingId?: number;
  alertType?: string;
  severity?: string;
  source?: string;
  riskProbability?: number | null;
  riskLevel?: string;
  priority?: string;
  status?: string;
  title?: string;
  message?: string;
  description?: string;
  createdAt?: string;
  resolvedAt?: string | null;
}

export interface AdminDashboardData {
  users: AuthUser[];
  trainings: TrainingResponse[];
  pendingTrainerRequests: TrainerAccessRequestResponse[];
  pendingAccessRequests: TrainingAccessRequestResponse[];
  openFeedbacks: FeedbackResponse[];
  openAlerts: AdminAlertResponse[];
}

export interface AdminStats {
  totalUsers: number;
  totalTrainings: number;
  pendingTrainerRequests: number;
  pendingAccessRequests: number;
  openFeedbacks: number;
  openAlerts: number;
}

export type {
  AccountStatus,
  AuthUser,
  UserRole,
  TrainerAccessRequestResponse,
  TrainerRequestStatus,
  TrainingResponse,
  EnrollmentResponse,
  TrainingAccessRequestResponse,
  TrainingInvitationResponse,
  FeedbackResponse,
  TrainingReviewResponse,
};
