import { apiClient } from "../../api/apiClient";
import type {
  TrainerLearnerIdentity,
} from "../../types/trainerLearnerMobile";
import type {
  TrainerFeedback,
  TrainerFeedbackListItem,
  TrainerReview,
  TrainerReviewListItem,
} from "../../types/trainerFeedbackReviewMobile";
import {
  getTrainerTrainings,
} from "./trainerTrainingService";

async function resolveLearners(
  learnerIds: number[],
): Promise<TrainerLearnerIdentity[]> {
  const unique = Array.from(new Set(learnerIds));

  if (unique.length === 0) {
    return [];
  }

  const chunks: number[][] = [];

  for (let index = 0; index < unique.length; index += 200) {
    chunks.push(unique.slice(index, index + 200));
  }

  const responses = await Promise.all(
    chunks.map((ids) =>
      apiClient.post<TrainerLearnerIdentity[]>(
        "/auth/directory/learners/resolve",
        { learnerIds: ids },
      ),
    ),
  );

  return responses.flatMap((response) => response.data);
}

function timestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function getTrainerFeedbacks(
  trainerId: number,
): Promise<TrainerFeedbackListItem[]> {
  const trainings = await getTrainerTrainings(trainerId);

  const responses = await Promise.all(
    trainings.map((training) =>
      apiClient.get<TrainerFeedback[]>(
        `/analytics/feedbacks/training/${training.id}`,
      ),
    ),
  );

  const byId = new Map<number, TrainerFeedback>();

  for (const response of responses) {
    for (const feedback of response.data) {
      byId.set(feedback.id, feedback);
    }
  }

  const feedbacks = Array.from(byId.values()).sort(
    (a, b) =>
      timestamp(b.createdAt) - timestamp(a.createdAt),
  );

  const identities = await resolveLearners(
    feedbacks.map((item) => item.learnerId),
  );

  const identityById = new Map(
    identities.map((identity) => [identity.id, identity]),
  );

  const trainingById = new Map(
    trainings.map((training) => [training.id, training]),
  );

  return feedbacks.map((feedback) => ({
    feedback,
    learner: identityById.get(feedback.learnerId) ?? null,
    training: trainingById.get(feedback.trainingId) ?? null,
  }));
}

export async function getTrainerFeedbackDetail(
  trainerId: number,
  feedbackId: number,
): Promise<TrainerFeedbackListItem | null> {
  const feedbacks = await getTrainerFeedbacks(trainerId);

  return (
    feedbacks.find(
      (item) => item.feedback.id === feedbackId,
    ) ?? null
  );
}

export async function markTrainerFeedbackInProgress(
  feedbackId: number,
): Promise<TrainerFeedback> {
  const response = await apiClient.put<TrainerFeedback>(
    `/analytics/feedbacks/${feedbackId}/in-progress`,
  );

  return response.data;
}

export async function resolveTrainerFeedback(
  feedbackId: number,
  trainerResponse?: string,
): Promise<TrainerFeedback> {
  const normalized = trainerResponse?.trim();
  const suffix = normalized
    ? `?trainerResponse=${encodeURIComponent(normalized)}`
    : "";

  const response = await apiClient.put<TrainerFeedback>(
    `/analytics/feedbacks/${feedbackId}/resolve${suffix}`,
  );

  return response.data;
}

export async function getTrainerReviews(
  trainerId: number,
): Promise<TrainerReviewListItem[]> {
  const trainings = await getTrainerTrainings(trainerId);

  const responses = await Promise.all(
    trainings.map((training) =>
      apiClient.get<TrainerReview[]>(
        `/analytics/reviews/training/${training.id}`,
      ),
    ),
  );

  const byId = new Map<number, TrainerReview>();

  for (const response of responses) {
    for (const review of response.data) {
      byId.set(review.id, review);
    }
  }

  const reviews = Array.from(byId.values()).sort(
    (a, b) =>
      timestamp(b.updatedAt || b.createdAt) -
      timestamp(a.updatedAt || a.createdAt),
  );

  const identities = await resolveLearners(
    reviews.map((item) => item.learnerId),
  );

  const identityById = new Map(
    identities.map((identity) => [identity.id, identity]),
  );

  const trainingById = new Map(
    trainings.map((training) => [training.id, training]),
  );

  return reviews.map((review) => ({
    review,
    learner: identityById.get(review.learnerId) ?? null,
    training: trainingById.get(review.trainingId) ?? null,
  }));
}