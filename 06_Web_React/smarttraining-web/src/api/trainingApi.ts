import axios from "axios";
import {
  deleteData,
  getData,
  postData,
  putData,
  uploadFormData,
} from "./apiClient";
import type {
  AccessCodeEnrollmentRequest,
  EnrollmentResponse,
  FileUploadResponse,
  FullTrainingResponse,
  LessonRequest,
  LessonResponse,
  LearnerCatalogTrainingResponse,
  LearnerMyTrainingResponse,
  LearnerTrainingContentResponse,
  ModuleRequest,
  ModuleResponse,
  ResourceRequest,
  ResourceResponse,
  ScormUploadResponse,
  SelfEnrollmentRequest,
  TrainingAccessRequestCreateRequest,
  TrainingAccessRequestDecisionRequest,
  TrainingAccessRequestResponse,
  TrainingAssignmentRequest,
  TrainingInvitationAcceptRequest,
  TrainingInvitationCreateRequest,
  TrainingInvitationResponse,
  TrainingRequest,
  TrainingResponse,
} from "../types/training";

export async function getAllTrainings(): Promise<TrainingResponse[]> {
  return getData<TrainingResponse[]>("/trainings");
}

export async function getAdminTrainings(): Promise<TrainingResponse[]> {
  return getData<TrainingResponse[]>("/trainings/admin");
}

export async function getCatalogTrainings(): Promise<LearnerCatalogTrainingResponse[]> {
  return getData<LearnerCatalogTrainingResponse[]>("/trainings/catalog");
}

export async function getMyTrainings(): Promise<LearnerMyTrainingResponse[]> {
  return getData<LearnerMyTrainingResponse[]>("/trainings/learner/me");
}

export async function getMyTrainingContent(
  trainingId: number,
): Promise<LearnerTrainingContentResponse> {
  return getData<LearnerTrainingContentResponse>(
    `/trainings/learner/me/${trainingId}/full`,
  );
}

export async function getTrainingById(trainingId: number): Promise<TrainingResponse> {
  return getData<TrainingResponse>(`/trainings/${trainingId}`);
}

export async function getFullTrainingById(trainingId: number): Promise<FullTrainingResponse> {
  return getData<FullTrainingResponse>(`/trainings/${trainingId}/full`);
}

export async function getTrainingsByTrainer(trainerId: number): Promise<TrainingResponse[]> {
  return getData<TrainingResponse[]>(`/trainings/trainer/${trainerId}`);
}

export async function createTraining(request: TrainingRequest): Promise<TrainingResponse> {
  return postData<TrainingResponse, TrainingRequest>("/trainings", request);
}

export async function updateTraining(
  trainingId: number,
  request: TrainingRequest,
): Promise<TrainingResponse> {
  return putData<TrainingResponse, TrainingRequest>(`/trainings/${trainingId}`, request);
}

export async function publishTraining(trainingId: number): Promise<TrainingResponse> {
  return putData<TrainingResponse>(`/trainings/${trainingId}/publish`);
}

export async function archiveTraining(trainingId: number): Promise<TrainingResponse> {
  return putData<TrainingResponse>(`/trainings/${trainingId}/archive`);
}

export async function moveTrainingToDraft(trainingId: number): Promise<TrainingResponse> {
  return putData<TrainingResponse>(`/trainings/${trainingId}/draft`);
}

export async function deleteTraining(trainingId: number): Promise<void> {
  return deleteData<void>(`/trainings/${trainingId}`);
}

export async function getModulesByTraining(trainingId: number): Promise<ModuleResponse[]> {
  return getData<ModuleResponse[]>(`/modules/training/${trainingId}`);
}

export async function createModule(request: ModuleRequest): Promise<ModuleResponse> {
  return postData<ModuleResponse, ModuleRequest>("/modules", request);
}

export async function updateModule(
  moduleId: number,
  request: ModuleRequest,
): Promise<ModuleResponse> {
  return putData<ModuleResponse, ModuleRequest>(`/modules/${moduleId}`, request);
}

export async function deleteModule(moduleId: number): Promise<void> {
  return deleteData<void>(`/modules/${moduleId}`);
}

export async function getLessonsByModule(moduleId: number): Promise<LessonResponse[]> {
  return getData<LessonResponse[]>(`/lessons/module/${moduleId}`);
}

export async function createLesson(request: LessonRequest): Promise<LessonResponse> {
  return postData<LessonResponse, LessonRequest>("/lessons", request);
}

export async function updateLesson(
  lessonId: number,
  request: LessonRequest,
): Promise<LessonResponse> {
  return putData<LessonResponse, LessonRequest>(`/lessons/${lessonId}`, request);
}

export async function deleteLesson(lessonId: number): Promise<void> {
  return deleteData<void>(`/lessons/${lessonId}`);
}

export async function getResourcesByLesson(lessonId: number): Promise<ResourceResponse[]> {
  try {
    return await getData<ResourceResponse[]>(`/resources/lesson/${lessonId}`);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }

    throw error;
  }
}

export async function createResource(request: ResourceRequest): Promise<ResourceResponse> {
  return postData<ResourceResponse, ResourceRequest>("/resources", request);
}

export async function updateResource(
  resourceId: number,
  request: ResourceRequest,
): Promise<ResourceResponse> {
  return putData<ResourceResponse, ResourceRequest>(`/resources/${resourceId}`, request);
}

export async function deleteResource(resourceId: number): Promise<void> {
  return deleteData<void>(`/resources/${resourceId}`);
}

export async function getTrainingsByLearner(learnerId: number): Promise<TrainingResponse[]> {
  const enrollments = await getData<EnrollmentResponse[]>(`/enrollments/learner/${learnerId}`);
  return Promise.all(enrollments.map((enrollment) => getTrainingById(enrollment.trainingId)));
}

export async function getEnrollmentsByLearner(learnerId: number): Promise<EnrollmentResponse[]> {
  return getData<EnrollmentResponse[]>(`/enrollments/learner/${learnerId}`);
}

export async function getEnrollmentsByTraining(trainingId: number): Promise<EnrollmentResponse[]> {
  return getData<EnrollmentResponse[]>(`/enrollments/training/${trainingId}`);
}

export async function selfEnroll(request: SelfEnrollmentRequest): Promise<EnrollmentResponse> {
  return postData<EnrollmentResponse, SelfEnrollmentRequest>("/enrollments/self", request);
}

export async function selfUnenroll(trainingId: number): Promise<EnrollmentResponse> {
  return deleteData<EnrollmentResponse>(`/enrollments/self/${trainingId}`);
}

export async function enrollWithAccessCode(
  request: AccessCodeEnrollmentRequest,
): Promise<EnrollmentResponse> {
  return postData<EnrollmentResponse, AccessCodeEnrollmentRequest>(
    "/enrollments/access-code",
    request,
  );
}

export async function assignLearners(
  request: TrainingAssignmentRequest,
): Promise<EnrollmentResponse[]> {
  return postData<EnrollmentResponse[], TrainingAssignmentRequest>(
    "/enrollments/assignments",
    request,
  );
}

export async function createTrainingAccessRequest(
  request: TrainingAccessRequestCreateRequest,
): Promise<TrainingAccessRequestResponse> {
  return postData<TrainingAccessRequestResponse, TrainingAccessRequestCreateRequest>(
    "/training-access-requests",
    request,
  );
}

export async function getPendingTrainingAccessRequests(): Promise<TrainingAccessRequestResponse[]> {
  return getData<TrainingAccessRequestResponse[]>("/training-access-requests/pending");
}

export async function getTrainingAccessRequestsByLearner(
  learnerId: number,
): Promise<TrainingAccessRequestResponse[]> {
  return getData<TrainingAccessRequestResponse[]>(
    `/training-access-requests/learner/${learnerId}`,
  );
}

export async function getTrainingAccessRequestsByTraining(
  trainingId: number,
): Promise<TrainingAccessRequestResponse[]> {
  return getData<TrainingAccessRequestResponse[]>(
    `/training-access-requests/training/${trainingId}`,
  );
}

export async function approveTrainingAccessRequest(
  requestId: number,
  request: TrainingAccessRequestDecisionRequest,
): Promise<TrainingAccessRequestResponse> {
  return putData<TrainingAccessRequestResponse, TrainingAccessRequestDecisionRequest>(
    `/training-access-requests/${requestId}/approve`,
    request,
  );
}

export async function rejectTrainingAccessRequest(
  requestId: number,
  request: TrainingAccessRequestDecisionRequest,
): Promise<TrainingAccessRequestResponse> {
  return putData<TrainingAccessRequestResponse, TrainingAccessRequestDecisionRequest>(
    `/training-access-requests/${requestId}/reject`,
    request,
  );
}

export async function createTrainingInvitation(
  request: TrainingInvitationCreateRequest,
): Promise<TrainingInvitationResponse> {
  return postData<TrainingInvitationResponse, TrainingInvitationCreateRequest>(
    "/training-invitations",
    request,
  );
}

export async function acceptTrainingInvitation(
  request: TrainingInvitationAcceptRequest,
): Promise<TrainingInvitationResponse> {
  return postData<TrainingInvitationResponse, TrainingInvitationAcceptRequest>(
    "/training-invitations/accept",
    request,
  );
}

export async function getTrainingInvitationsByTraining(
  trainingId: number,
): Promise<TrainingInvitationResponse[]> {
  return getData<TrainingInvitationResponse[]>(`/training-invitations/training/${trainingId}`);
}

export async function getTrainingInvitationsByLearner(
  learnerId: number,
): Promise<TrainingInvitationResponse[]> {
  return getData<TrainingInvitationResponse[]>(`/training-invitations/learner/${learnerId}`);
}

export async function declineTrainingInvitation(
  invitationId: number,
): Promise<TrainingInvitationResponse> {
  return putData<TrainingInvitationResponse>(
    `/training-invitations/${invitationId}/decline`,
  );
}

export async function cancelTrainingInvitation(
  invitationId: number,
): Promise<TrainingInvitationResponse> {
  return putData<TrainingInvitationResponse>(`/training-invitations/${invitationId}/cancel`);
}

function buildUploadFormData(
  file: File,
  options?: {
    title?: string;
    description?: string;
    uploadedBy?: number;
    orderIndex?: number;
    durationSeconds?: number;
  },
): FormData {
  const formData = new FormData();
  formData.append("file", file);

  if (options?.title) {
    formData.append("title", options.title);
  }

  if (options?.description) {
    formData.append("description", options.description);
  }

  if (options?.uploadedBy) {
    formData.append("uploadedBy", String(options.uploadedBy));
  }

  if (options?.orderIndex) {
    formData.append("orderIndex", String(options.orderIndex));
  }

  if (options?.durationSeconds) {
    formData.append("durationSeconds", String(options.durationSeconds));
  }

  return formData;
}

export async function uploadTrainingCover(
  trainingId: number,
  file: File,
): Promise<FileUploadResponse> {
  return uploadFormData<FileUploadResponse>(
    `/uploads/trainings/${trainingId}/cover`,
    buildUploadFormData(file),
  );
}

export async function uploadLessonImage(
  lessonId: number,
  file: File,
  options?: Parameters<typeof buildUploadFormData>[1],
): Promise<FileUploadResponse> {
  return uploadFormData<FileUploadResponse>(
    `/uploads/lessons/${lessonId}/image`,
    buildUploadFormData(file, options),
  );
}

export async function uploadLessonPdf(
  lessonId: number,
  file: File,
  options?: Parameters<typeof buildUploadFormData>[1],
): Promise<FileUploadResponse> {
  return uploadFormData<FileUploadResponse>(
    `/uploads/lessons/${lessonId}/pdf`,
    buildUploadFormData(file, options),
  );
}

export async function uploadLessonVideo(
  lessonId: number,
  file: File,
  options?: Parameters<typeof buildUploadFormData>[1],
): Promise<FileUploadResponse> {
  return uploadFormData<FileUploadResponse>(
    `/uploads/lessons/${lessonId}/video`,
    buildUploadFormData(file, options),
  );
}

export async function uploadLessonDocument(
  lessonId: number,
  file: File,
  options?: Parameters<typeof buildUploadFormData>[1],
): Promise<FileUploadResponse> {
  return uploadFormData<FileUploadResponse>(
    `/uploads/lessons/${lessonId}/document`,
    buildUploadFormData(file, options),
  );
}

export async function uploadLessonScorm(
  lessonId: number,
  file: File,
  options?: Parameters<typeof buildUploadFormData>[1],
): Promise<ScormUploadResponse> {
  return uploadFormData<ScormUploadResponse>(
    `/uploads/lessons/${lessonId}/scorm`,
    buildUploadFormData(file, options),
  );
}

export async function getScormPackage(scormPackageId: number): Promise<ScormUploadResponse> {
  return getData<ScormUploadResponse>(`/scorm/packages/${scormPackageId}`);
}


export interface LearningCompletionResponse {
  completionType: string;
  learnerId: number;
  trainingId: number;
  lessonId?: number | null;
  resourceId?: number | null;
  analyticsEventId?: number | null;
  progressAffecting: boolean;
}

export async function completeLearningLesson(
  lessonId: number,
): Promise<LearningCompletionResponse> {
  return postData<LearningCompletionResponse>(
    `/lessons/${lessonId}/complete`,
  );
}

export async function completeLearningResource(
  resourceId: number,
): Promise<LearningCompletionResponse> {
  return postData<LearningCompletionResponse>(
    `/resources/${resourceId}/complete`,
  );
}
