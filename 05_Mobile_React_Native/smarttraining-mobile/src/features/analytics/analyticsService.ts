import { apiClient } from "../../api/apiClient";
import {
  LearnerProgressResponse,
  LearningEventResponse,
  RecommendationResponse,
  RiskIndicatorResponse,
} from "../../types/analytics";

export async function getMyProgress(): Promise<LearnerProgressResponse[]> {
  const response =
    await apiClient.get<LearnerProgressResponse[]>("/progress/me");

  return response.data;
}

export async function getMyTrainingProgress(
  trainingId: number,
): Promise<LearnerProgressResponse> {
  const response = await apiClient.get<LearnerProgressResponse>(
    `/progress/me/training/${trainingId}`,
  );

  return response.data;
}

export async function getMyTrainingEvents(
  trainingId: number,
): Promise<LearningEventResponse[]> {
  const response = await apiClient.get<LearningEventResponse[]>(
    `/analytics/events/me/training/${trainingId}`,
  );

  return response.data;
}

export async function getMyRiskIndicator(): Promise<RiskIndicatorResponse> {
  const response =
    await apiClient.get<RiskIndicatorResponse>("/analytics/risk/me");

  return response.data;
}

export async function getMyTrainingRiskIndicator(
  trainingId: number,
): Promise<RiskIndicatorResponse> {
  const response = await apiClient.get<RiskIndicatorResponse>(
    `/analytics/risk/me/training/${trainingId}`,
  );

  return response.data;
}

export async function getMyRecommendations(): Promise<
  RecommendationResponse[]
> {
  const response = await apiClient.get<RecommendationResponse[]>(
    "/analytics/recommendations/me",
  );

  return response.data;
}

export async function acceptRecommendation(
  recommendationId: number,
): Promise<RecommendationResponse> {
  const response = await apiClient.put<RecommendationResponse>(
    `/analytics/recommendations/${recommendationId}/accept`,
  );

  return response.data;
}

export async function completeRecommendation(
  recommendationId: number,
): Promise<RecommendationResponse> {
  const response = await apiClient.put<RecommendationResponse>(
    `/analytics/recommendations/${recommendationId}/complete`,
  );

  return response.data;
}

export async function dismissRecommendation(
  recommendationId: number,
): Promise<RecommendationResponse> {
  const response = await apiClient.put<RecommendationResponse>(
    `/analytics/recommendations/${recommendationId}/dismiss`,
  );

  return response.data;
}

export interface SelfLearningEventRequest {
  requestId: string;
  trainingId: number;
  moduleId?: number | null;
  lessonId?: number | null;
  resourceId?: number | null;
  eventType:
    | "TRAINING_OPENED"
    | "MODULE_OPENED"
    | "LESSON_OPENED"
    | "RESOURCE_OPENED";
  description?: string;
}

export async function createSelfLearningEvent(
  request: SelfLearningEventRequest,
): Promise<LearningEventResponse> {
  const response = await apiClient.post<LearningEventResponse>(
    "/analytics/events/self",
    request,
  );

  return response.data;
}