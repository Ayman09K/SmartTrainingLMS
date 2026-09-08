import { getData, postData, putData } from "./apiClient";
import {
  archiveTraining,
  assignLearners,
  createLesson,
  createModule,
  createResource,
  createTraining,
  createTrainingInvitation,
  deleteLesson,
  deleteModule,
  deleteResource,
  deleteTraining,
  getEnrollmentsByTraining,
  getFullTrainingById,
  getLessonsByModule,
  getModulesByTraining,
  getPendingTrainingAccessRequests,
  getResourcesByLesson,
  getTrainingAccessRequestsByTraining,
  getTrainingInvitationsByTraining,
  getTrainingsByTrainer,
  moveTrainingToDraft,
  publishTraining,
  rejectTrainingAccessRequest,
  approveTrainingAccessRequest,
  updateLesson,
  updateModule,
  updateResource,
  updateTraining,
  uploadLessonDocument,
  uploadLessonImage,
  uploadLessonPdf,
  uploadLessonScorm,
  uploadLessonVideo,
  uploadTrainingCover,
} from "./trainingApi";
import {
  getFeedbacksByTraining,
  getOpenFeedbacks,
  markFeedbackInProgress,
  resolveFeedback,
} from "./analyticsApi";
import type {
  AccessCodeEnrollmentRequest,
  EnrollmentResponse,
  FileUploadResponse,
  FullTrainingResponse,
  LessonRequest,
  LessonResponse,
  ModuleRequest,
  ModuleResponse,
  ResourceRequest,
  ResourceResponse,
  ScormUploadResponse,
  TrainingAccessRequestDecisionRequest,
  TrainingAccessRequestResponse,
  TrainingAssignmentRequest,
  TrainingInvitationCreateRequest,
  TrainingInvitationResponse,
  TrainingRequest,
  TrainingResponse,
} from "../types/training";
import type {
  FeedbackResponse,
} from "../types/analytics";
import type {
  AlertResponse,
  InterventionRequest,
  InterventionResponse,
  SupportSessionRequest,
  SupportSessionResponse,
  TrainerDashboardData,
} from "../types/trainer";

async function safe<T>(operation: Promise<T>, _fallback: T): Promise<T> {
  return operation;
}

export async function getTrainerDashboardData(trainerId: number): Promise<TrainerDashboardData> {
  const [trainings, alerts, interventions, feedbacks] = await Promise.all([
    safe(getTrainingsByTrainer(trainerId), []),
    safe(getOpenAlerts(), []),
    safe(getInterventionsByTrainer(trainerId), []),
    safe(getOpenFeedbacks(), []),
  ]);

  return {
    trainings,
    alerts,
    interventions,
    feedbacks,
  };
}

export async function getTrainerTrainings(trainerId: number): Promise<TrainingResponse[]> {
  return getTrainingsByTrainer(trainerId);
}

export async function createTrainerTraining(
  trainerId: number,
  request: Omit<TrainingRequest, "trainerId" | "ownerId">,
): Promise<TrainingResponse> {
  return createTraining({
    ...request,
    trainerId,
    ownerId: trainerId,
  });
}

export async function updateTrainerTraining(
  trainingId: number,
  request: TrainingRequest,
): Promise<TrainingResponse> {
  return updateTraining(trainingId, request);
}

export {
  publishTraining,
  archiveTraining,
  moveTrainingToDraft,
  deleteTraining,
  getFullTrainingById,
  getLessonsByModule,
  getModulesByTraining,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  getResourcesByLesson,
  createResource,
  updateResource,
  deleteResource,
  getEnrollmentsByTraining,
  assignLearners,
  getTrainingAccessRequestsByTraining,
  getPendingTrainingAccessRequests,
  approveTrainingAccessRequest,
  rejectTrainingAccessRequest,
  createTrainingInvitation,
  getTrainingInvitationsByTraining,
  uploadTrainingCover,
  uploadLessonImage,
  uploadLessonPdf,
  uploadLessonVideo,
  uploadLessonDocument,
  uploadLessonScorm,
  getFeedbacksByTraining,
  getOpenFeedbacks,
  markFeedbackInProgress,
  resolveFeedback,
};

export async function getOpenAlerts(): Promise<AlertResponse[]> {
  return getData<AlertResponse[]>("/analytics/alerts/open");
}

export async function markAlertInProgress(id: number): Promise<AlertResponse> {
  return putData<AlertResponse>(`/analytics/alerts/${id}/in-progress`);
}

export async function resolveAlert(id: number): Promise<AlertResponse> {
  return putData<AlertResponse>(`/analytics/alerts/${id}/resolve`);
}

export async function ignoreAlert(id: number): Promise<AlertResponse> {
  return putData<AlertResponse>(`/analytics/alerts/${id}/ignore`);
}

export async function createIntervention(
  request: InterventionRequest,
): Promise<InterventionResponse> {
  return postData<InterventionResponse, InterventionRequest>(
    "/analytics/interventions",
    request,
  );
}

export async function getInterventionsByTrainer(
  trainerId: number,
): Promise<InterventionResponse[]> {
  return getData<InterventionResponse[]>(`/analytics/interventions/trainer/${trainerId}`);
}

export async function markInterventionDone(id: number): Promise<InterventionResponse> {
  return putData<InterventionResponse>(`/analytics/interventions/${id}/done`);
}

export async function cancelIntervention(id: number): Promise<InterventionResponse> {
  return putData<InterventionResponse>(`/analytics/interventions/${id}/cancel`);
}


export async function getSupportSessionsForTrainer(): Promise<SupportSessionResponse[]> {
  return getData<SupportSessionResponse[]>("/support-sessions/trainer");
}

export async function getSupportSessionsForLearner(
  learnerId: number,
): Promise<SupportSessionResponse[]> {
  return getData<SupportSessionResponse[]>(
    `/support-sessions/learner/${learnerId}`,
  );
}

export async function getMySupportSessions(): Promise<SupportSessionResponse[]> {
  return getData<SupportSessionResponse[]>("/support-sessions/me");
}

export async function createSupportSession(
  request: SupportSessionRequest,
): Promise<SupportSessionResponse> {
  return postData<SupportSessionResponse, SupportSessionRequest>(
    "/support-sessions",
    request,
  );
}

export async function updateSupportSession(
  sessionId: number,
  request: SupportSessionRequest,
): Promise<SupportSessionResponse> {
  return putData<SupportSessionResponse, SupportSessionRequest>(
    `/support-sessions/${sessionId}`,
    request,
  );
}

export async function completeSupportSession(
  sessionId: number,
): Promise<SupportSessionResponse> {
  return putData<SupportSessionResponse>(
    `/support-sessions/${sessionId}/complete`,
  );
}

export async function cancelSupportSession(
  sessionId: number,
): Promise<SupportSessionResponse> {
  return putData<SupportSessionResponse>(
    `/support-sessions/${sessionId}/cancel`,
  );
}

export type {
  AccessCodeEnrollmentRequest,
  EnrollmentResponse,
  FeedbackResponse,
  FileUploadResponse,
  FullTrainingResponse,
  LessonRequest,
  LessonResponse,
  ModuleRequest,
  ModuleResponse,
  ResourceRequest,
  ResourceResponse,
  ScormUploadResponse,
  TrainingAccessRequestDecisionRequest,
  TrainingAccessRequestResponse,
  TrainingAssignmentRequest,
  TrainingInvitationCreateRequest,
  TrainingInvitationResponse,
  TrainingRequest,
  TrainingResponse,
};
