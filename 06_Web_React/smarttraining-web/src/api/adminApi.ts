import { getData, postData, putData } from "./apiClient";
import {
  approveTrainingAccessRequest,
  assignLearners,
  getAdminTrainings,
  getEnrollmentsByTraining,
  getPendingTrainingAccessRequests,
  getTrainingInvitationsByTraining,
  rejectTrainingAccessRequest,
  createTrainingInvitation,
} from "./trainingApi";
import {
  getOpenFeedbacks,
  getReviewsByTraining,
  getAdminReviewsByTraining,
  hideReview,
  publishReview,
  markFeedbackInProgress,
  resolveFeedback,
} from "./analyticsApi";
import type {
  AccountStatus,
  AdminAlertResponse,
  AdminCreateUserRequest,
  AdminDashboardData,
  AdminTrainerRequestReviewRequest,
  AdminUpdateUserRoleRequest,
  AdminUpdateUserStatusRequest,
  AuthUser,
  TrainerAccessRequestResponse,
  TrainerRequestStatus,
  UserRole,
} from "../types/admin";
import type {
  EnrollmentResponse,
  TrainingAccessRequestDecisionRequest,
  TrainingAccessRequestResponse,
  TrainingAssignmentRequest,
  TrainingInvitationCreateRequest,
  TrainingInvitationResponse,
  TrainingResponse,
} from "../types/training";
import type {
  FeedbackResponse,
  TrainingReviewResponse,
} from "../types/analytics";

async function safe<T>(operation: Promise<T>, _fallback: T): Promise<T> {
  return operation;
}

export async function getAdminUsers(): Promise<AuthUser[]> {
  return getData<AuthUser[]>("/auth/admin/users");
}

export async function createAdminUser(request: AdminCreateUserRequest): Promise<AuthUser> {
  return postData<AuthUser, AdminCreateUserRequest>("/auth/admin/users", request);
}

export async function updateAdminUserRole(
  userId: number,
  role: UserRole,
): Promise<AuthUser> {
  const body: AdminUpdateUserRoleRequest = { role };
  return putData<AuthUser, AdminUpdateUserRoleRequest>(`/auth/admin/users/${userId}/role`, body);
}

export async function updateAdminUserStatus(
  userId: number,
  accountStatus: AccountStatus,
): Promise<AuthUser> {
  const body: AdminUpdateUserStatusRequest = { accountStatus };
  return putData<AuthUser, AdminUpdateUserStatusRequest>(`/auth/admin/users/${userId}/status`, body);
}

export async function getAdminTrainerRequests(
  status?: TrainerRequestStatus,
): Promise<TrainerAccessRequestResponse[]> {
  const query = status ? `?status=${status}` : "";
  return getData<TrainerAccessRequestResponse[]>(`/auth/admin/trainer-requests${query}`);
}

export async function approveTrainerRequest(
  requestId: number,
  adminComment?: string,
): Promise<TrainerAccessRequestResponse> {
  const body: AdminTrainerRequestReviewRequest = { adminComment };
  return putData<TrainerAccessRequestResponse, AdminTrainerRequestReviewRequest>(
    `/auth/admin/trainer-requests/${requestId}/approve`,
    body,
  );
}

export async function rejectTrainerRequest(
  requestId: number,
  adminComment?: string,
): Promise<TrainerAccessRequestResponse> {
  const body: AdminTrainerRequestReviewRequest = { adminComment };
  return putData<TrainerAccessRequestResponse, AdminTrainerRequestReviewRequest>(
    `/auth/admin/trainer-requests/${requestId}/reject`,
    body,
  );
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [
    users,
    trainings,
    pendingTrainerRequests,
    pendingAccessRequests,
    openFeedbacks,
    openAlerts,
  ] = await Promise.all([
    safe(getAdminUsers(), []),
    safe(getAdminTrainings(), []),
    safe(getAdminTrainerRequests("PENDING"), []),
    safe(getPendingTrainingAccessRequests(), []),
    safe(getOpenFeedbacks(), []),
    safe(getOpenAlerts(), []),
  ]);

  return {
    users,
    trainings,
    pendingTrainerRequests,
    pendingAccessRequests,
    openFeedbacks,
    openAlerts,
  };
}

export async function getAdminTrainingsSafe(): Promise<TrainingResponse[]> {
  return safe(getAdminTrainings(), []);
}

export async function getEnrollmentsByTrainingSafe(trainingId: number): Promise<EnrollmentResponse[]> {
  return safe(getEnrollmentsByTraining(trainingId), []);
}

export async function assignLearnersAsAdmin(
  request: TrainingAssignmentRequest,
): Promise<EnrollmentResponse[]> {
  return assignLearners(request);
}

export async function getPendingAccessRequestsSafe(): Promise<TrainingAccessRequestResponse[]> {
  return safe(getPendingTrainingAccessRequests(), []);
}

export async function approveAccessRequestAsAdmin(
  requestId: number,
  request: TrainingAccessRequestDecisionRequest,
): Promise<TrainingAccessRequestResponse> {
  return approveTrainingAccessRequest(requestId, request);
}

export async function rejectAccessRequestAsAdmin(
  requestId: number,
  request: TrainingAccessRequestDecisionRequest,
): Promise<TrainingAccessRequestResponse> {
  return rejectTrainingAccessRequest(requestId, request);
}

export async function createInvitationAsAdmin(
  request: TrainingInvitationCreateRequest,
): Promise<TrainingInvitationResponse> {
  return createTrainingInvitation(request);
}

export async function getTrainingInvitationsSafe(
  trainingId: number,
): Promise<TrainingInvitationResponse[]> {
  return safe(getTrainingInvitationsByTraining(trainingId), []);
}

export async function getReviewsByTrainingSafe(
  trainingId: number,
  adminMode = true,
): Promise<TrainingReviewResponse[]> {
  return safe(
    adminMode ? getAdminReviewsByTraining(trainingId) : getReviewsByTraining(trainingId),
    [],
  );
}

export async function hideReviewAsAdmin(reviewId: number): Promise<TrainingReviewResponse> {
  return hideReview(reviewId);
}

export async function publishReviewAsAdmin(reviewId: number): Promise<TrainingReviewResponse> {
  return publishReview(reviewId);
}

export async function getOpenFeedbacksSafe(): Promise<FeedbackResponse[]> {
  return safe(getOpenFeedbacks(), []);
}

export async function markFeedbackInProgressAsAdmin(feedbackId: number): Promise<FeedbackResponse> {
  return markFeedbackInProgress(feedbackId);
}

export async function resolveFeedbackAsAdmin(
  feedbackId: number,
  handledBy: number,
  trainerResponse?: string,
): Promise<FeedbackResponse> {
  return resolveFeedback(feedbackId, handledBy, trainerResponse);
}

export async function getOpenAlerts(): Promise<AdminAlertResponse[]> {
  return getData<AdminAlertResponse[]>("/analytics/alerts/open");
}

export async function markAlertInProgress(alertId: number): Promise<AdminAlertResponse> {
  return putData<AdminAlertResponse>(`/analytics/alerts/${alertId}/in-progress`);
}

export async function resolveAlert(alertId: number): Promise<AdminAlertResponse> {
  return putData<AdminAlertResponse>(`/analytics/alerts/${alertId}/resolve`);
}

export async function ignoreAlert(alertId: number): Promise<AdminAlertResponse> {
  return putData<AdminAlertResponse>(`/analytics/alerts/${alertId}/ignore`);
}

export async function getOpenAlertsSafe(): Promise<AdminAlertResponse[]> {
  return safe(getOpenAlerts(), []);
}

export async function getAlertsByTrainingAsAdmin(
  trainingId: number,
): Promise<AdminAlertResponse[]> {
  return getData<AdminAlertResponse[]>(`/analytics/alerts/training/${trainingId}`);
}

export async function getAllAlertsAsAdmin(): Promise<AdminAlertResponse[]> {
  const trainings = await getAdminTrainingsSafe();

  if (!trainings.length) {
    return safe(getOpenAlerts(), []);
  }

  const alertLists = await Promise.all(
    trainings.map((training) => safe(getAlertsByTrainingAsAdmin(training.id), [])),
  );

  const uniqueAlerts = new Map<number, AdminAlertResponse>();

  alertLists.flat().forEach((alert) => {
    uniqueAlerts.set(alert.id, alert);
  });

  return Array.from(uniqueAlerts.values()).sort((a, b) => b.id - a.id);
}