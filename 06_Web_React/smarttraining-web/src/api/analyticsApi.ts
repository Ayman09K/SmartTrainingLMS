import { getData, postData, putData } from "./apiClient";
import type {
  AiRiskPredictionResponse,
  FeedbackRequest,
  FeedbackUpdateRequest,
  FeedbackResponse,
  LearnerAnalyticsSummaryResponse,
  LearnerProgressResponse,
  LearningEventResponse,
  RecommendationResponse,
  RiskIndicatorResponse,
  TrainingReviewRequest,
  TrainingReviewResponse,
} from "../types/analytics";

export async function getProgressByLearner(
  learnerId: number,
): Promise<LearnerProgressResponse[]> {
  return getData<LearnerProgressResponse[]>(`/progress/learner/${learnerId}`);
}

export async function getMyProgress(): Promise<LearnerProgressResponse[]> {
  return getData<LearnerProgressResponse[]>("/progress/me");
}

export async function getMyTrainingEvents(
  trainingId: number,
): Promise<LearningEventResponse[]> {
  return getData<LearningEventResponse[]>(
    `/analytics/events/me/training/${trainingId}`,
  );
}

export async function getLearnerAnalyticsSummary(
  learnerId: number,
): Promise<LearnerAnalyticsSummaryResponse> {
  return getData<LearnerAnalyticsSummaryResponse>(`/analytics/summary/learner/${learnerId}`);
}

export async function getMyRiskIndicator(): Promise<RiskIndicatorResponse> {
  return getData<RiskIndicatorResponse>("/analytics/risk/me");
}

export async function getMyTrainingRiskIndicator(
  trainingId: number,
): Promise<RiskIndicatorResponse> {
  return getData<RiskIndicatorResponse>(
    `/analytics/risk/me/training/${trainingId}`,
  );
}
export async function getLearnerRiskIndicator(
  learnerId: number,
): Promise<RiskIndicatorResponse> {
  return getData<RiskIndicatorResponse>(`/analytics/risk/learner/${learnerId}`);
}

export async function getLearnerTrainingRiskIndicator(
  learnerId: number,
  trainingId: number,
): Promise<RiskIndicatorResponse> {
  return getData<RiskIndicatorResponse>(
    `/analytics/risk/learner/${learnerId}/training/${trainingId}`,
  );
}

export async function getLearnerAiRiskPrediction(
  learnerId: number,
  trainingId: number,
): Promise<AiRiskPredictionResponse> {
  return getData<AiRiskPredictionResponse>(
    `/analytics/ai-risk/learner/${learnerId}/training/${trainingId}`,
  );
}

export async function getRecommendationsByLearner(
  learnerId: number,
): Promise<RecommendationResponse[]> {
  return getData<RecommendationResponse[]>(`/analytics/recommendations/learner/${learnerId}`);
}

export async function getMyRecommendations(): Promise<RecommendationResponse[]> {
  return getData<RecommendationResponse[]>("/analytics/recommendations/me");
}

export async function completeRecommendation(id: number): Promise<RecommendationResponse> {
  return putData<RecommendationResponse>(`/analytics/recommendations/${id}/complete`);
}

export async function dismissRecommendation(id: number): Promise<RecommendationResponse> {
  return putData<RecommendationResponse>(`/analytics/recommendations/${id}/dismiss`);
}

export async function createTrainingReview(
  request: TrainingReviewRequest,
): Promise<TrainingReviewResponse> {
  return postData<TrainingReviewResponse, TrainingReviewRequest>("/analytics/reviews", request);
}

export async function getReviewsByTraining(
  trainingId: number,
): Promise<TrainingReviewResponse[]> {
  return getData<TrainingReviewResponse[]>(`/analytics/reviews/training/${trainingId}`);
}

export async function getAdminReviewsByTraining(
  trainingId: number,
): Promise<TrainingReviewResponse[]> {
  return getData<TrainingReviewResponse[]>(`/analytics/reviews/admin/training/${trainingId}`);
}

export async function getReviewsByLearner(
  learnerId: number,
): Promise<TrainingReviewResponse[]> {
  return getData<TrainingReviewResponse[]>(`/analytics/reviews/learner/${learnerId}`);
}

export async function getMyReviews(): Promise<TrainingReviewResponse[]> {
  return getData<TrainingReviewResponse[]>("/analytics/reviews/me");
}

export async function hideReview(reviewId: number): Promise<TrainingReviewResponse> {
  return putData<TrainingReviewResponse>(`/analytics/reviews/${reviewId}/hide`);
}

export async function publishReview(reviewId: number): Promise<TrainingReviewResponse> {
  return putData<TrainingReviewResponse>(`/analytics/reviews/${reviewId}/publish`);
}

export async function createFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
  return postData<FeedbackResponse, FeedbackRequest>("/analytics/feedbacks", request);
}

export async function getFeedbacksByLearner(learnerId: number): Promise<FeedbackResponse[]> {
  return getData<FeedbackResponse[]>(`/analytics/feedbacks/learner/${learnerId}`);
}

export async function getMyFeedbacks(): Promise<FeedbackResponse[]> {
  return getData<FeedbackResponse[]>("/analytics/feedbacks/me");
}

export async function updateMyFeedback(
  feedbackId: number,
  request: FeedbackUpdateRequest,
): Promise<FeedbackResponse> {
  return putData<FeedbackResponse, FeedbackUpdateRequest>(
    `/analytics/feedbacks/${feedbackId}/me`,
    request,
  );
}

export async function getFeedbacksByTraining(trainingId: number): Promise<FeedbackResponse[]> {
  return getData<FeedbackResponse[]>(`/analytics/feedbacks/training/${trainingId}`);
}

export async function getOpenFeedbacks(): Promise<FeedbackResponse[]> {
  return getData<FeedbackResponse[]>("/analytics/feedbacks/open");
}

export async function markFeedbackInProgress(feedbackId: number): Promise<FeedbackResponse> {
  return putData<FeedbackResponse>(`/analytics/feedbacks/${feedbackId}/in-progress`);
}

export async function resolveFeedback(
  feedbackId: number,
  trainerResponseOrLegacyHandledBy?: string | number,
  legacyTrainerResponse?: string,
): Promise<FeedbackResponse> {
  const trainerResponse =
    typeof trainerResponseOrLegacyHandledBy === "string"
      ? trainerResponseOrLegacyHandledBy
      : legacyTrainerResponse;

  const params = new URLSearchParams();

  if (trainerResponse) {
    params.set("trainerResponse", trainerResponse);
  }

  const query = params.toString();
  const suffix = query ? `?${query}` : "";

  return putData<FeedbackResponse>(
    `/analytics/feedbacks/${feedbackId}/resolve${suffix}`,
  );
}

export async function getLearningEventsByLearnerTraining(
  learnerId: number,
  trainingId: number,
): Promise<LearningEventResponse[]> {
  return getData<LearningEventResponse[]>(
    `/analytics/events/learner/${learnerId}/training/${trainingId}`,
  );
}
