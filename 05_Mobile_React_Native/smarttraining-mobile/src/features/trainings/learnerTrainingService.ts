import { apiClient } from "../../api/apiClient";
import { API_BASE_URL } from "../../api/apiConfig";
import {
  LearnerMyTraining,
  LearnerResourceType,
  LearnerTrainingContent,
} from "../../types/learnerTraining";

export async function getMyLearnerTrainings(): Promise<LearnerMyTraining[]> {
  const response =
    await apiClient.get<LearnerMyTraining[]>("/trainings/learner/me");

  return response.data;
}

export async function getMyLearnerTrainingContent(
  trainingId: number,
): Promise<LearnerTrainingContent> {
  const response = await apiClient.get<LearnerTrainingContent>(
    `/trainings/learner/me/${trainingId}/full`,
  );

  return response.data;
}

export function normalizeLearnerResourceType(
  type?: string | null,
): LearnerResourceType {
  if (type === "PDF_URL") {
    return "PDF";
  }

  if (type === "VIDEO_URL") {
    return "VIDEO";
  }

  return type || "DOCUMENT";
}

export function buildLearnerMediaUrl(
  path?: string | null,
): string {
  const value = path?.trim();

  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
  const normalized = value.startsWith("/") ? value : `/${value}`;

  return `${apiOrigin}${normalized}`;
}