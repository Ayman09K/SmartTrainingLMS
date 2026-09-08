import { apiClient } from "../../api/apiClient";
import {
  LearnerAccessRequest,
  LearnerCatalogTraining,
  LearnerEnrollment,
} from "../../types/learnerCatalog";

export async function getLearnerCatalog(): Promise<LearnerCatalogTraining[]> {
  const response =
    await apiClient.get<LearnerCatalogTraining[]>("/trainings/catalog");

  return response.data;
}

export async function getLearnerEnrollments(
  learnerId: number,
): Promise<LearnerEnrollment[]> {
  const response = await apiClient.get<LearnerEnrollment[]>(
    `/enrollments/learner/${learnerId}`,
  );

  return response.data;
}

export async function getLearnerAccessRequests(
  learnerId: number,
): Promise<LearnerAccessRequest[]> {
  const response = await apiClient.get<LearnerAccessRequest[]>(
    `/training-access-requests/learner/${learnerId}`,
  );

  return response.data;
}

export async function selfEnroll(
  trainingId: number,
): Promise<LearnerEnrollment> {
  const response = await apiClient.post<LearnerEnrollment>(
    "/enrollments/self",
    { trainingId },
  );

  return response.data;
}

export async function selfUnenroll(
  trainingId: number,
): Promise<LearnerEnrollment> {
  const response = await apiClient.delete<LearnerEnrollment>(
    `/enrollments/self/${trainingId}`,
  );

  return response.data;
}

export async function enrollWithAccessCode(
  trainingId: number,
  accessCode: string,
): Promise<LearnerEnrollment> {
  const response = await apiClient.post<LearnerEnrollment>(
    "/enrollments/access-code",
    {
      trainingId,
      accessCode,
    },
  );

  return response.data;
}

export async function requestTrainingAccess(
  trainingId: number,
  learnerMessage?: string,
): Promise<LearnerAccessRequest> {
  const normalizedMessage = learnerMessage?.trim();

  const response = await apiClient.post<LearnerAccessRequest>(
    "/training-access-requests",
    {
      trainingId,
      ...(normalizedMessage ? { learnerMessage: normalizedMessage } : {}),
    },
  );

  return response.data;
}