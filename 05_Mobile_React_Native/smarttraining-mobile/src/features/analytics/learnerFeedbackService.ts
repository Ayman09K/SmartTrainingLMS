import { apiClient } from "../../api/apiClient";
import {
  LearnerFeedbackRequest,
  LearnerFeedbackResponse,
  LearnerReviewRequest,
  LearnerReviewResponse,
} from "../../types/learnerFeedback";

export async function getMyFeedbacks(): Promise<
  LearnerFeedbackResponse[]
> {
  const response = await apiClient.get<LearnerFeedbackResponse[]>(
    "/analytics/feedbacks/me",
  );

  return response.data;
}

export async function createMyFeedback(
  request: LearnerFeedbackRequest,
): Promise<LearnerFeedbackResponse> {
  const response = await apiClient.post<LearnerFeedbackResponse>(
    "/analytics/feedbacks",
    request,
  );

  return response.data;
}

export async function getMyReviews(): Promise<
  LearnerReviewResponse[]
> {
  const response = await apiClient.get<LearnerReviewResponse[]>(
    "/analytics/reviews/me",
  );

  return response.data;
}

export async function createOrUpdateMyReview(
  request: LearnerReviewRequest,
): Promise<LearnerReviewResponse> {
  const response = await apiClient.post<LearnerReviewResponse>(
    "/analytics/reviews",
    request,
  );

  return response.data;
}