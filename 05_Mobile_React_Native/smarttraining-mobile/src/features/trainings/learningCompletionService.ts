import { apiClient } from "../../api/apiClient";

export interface LearningCompletionResponse {
  completionType: "LESSON_COMPLETED" | "RESOURCE_COMPLETED";
  learnerId: number;
  trainingId: number;
  lessonId: number;
  resourceId?: number | null;
  analyticsEventId?: number | null;
  progressAffecting: boolean;
}

export async function completeLesson(
  lessonId: number
): Promise<LearningCompletionResponse> {
  const response = await apiClient.post<LearningCompletionResponse>(
    `/lessons/${lessonId}/complete`
  );
  return response.data;
}

export async function completeResource(
  resourceId: number
): Promise<LearningCompletionResponse> {
  const response = await apiClient.post<LearningCompletionResponse>(
    `/resources/${resourceId}/complete`
  );
  return response.data;
}