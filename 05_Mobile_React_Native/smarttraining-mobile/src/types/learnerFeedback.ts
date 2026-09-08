export type LearnerDifficultyLevel =
  | "VERY_EASY"
  | "EASY"
  | "NORMAL"
  | "HARD"
  | "VERY_HARD";

export type LearnerFeedbackStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

export type LearnerReviewStatus =
  | "PUBLISHED"
  | "HIDDEN";

export interface LearnerFeedbackRequest {
  trainingId: number;
  moduleId?: number | null;
  lessonId?: number | null;
  resourceId?: number | null;
  difficultyLevel?: LearnerDifficultyLevel | null;
  needHelp?: boolean;
  message?: string;
}

export interface LearnerFeedbackResponse {
  id: number;
  learnerId: number;
  trainingId: number;
  moduleId?: number | null;
  lessonId?: number | null;
  resourceId?: number | null;
  difficultyLevel: LearnerDifficultyLevel;
  needHelp: boolean;
  message?: string | null;
  status: LearnerFeedbackStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
  resolvedAt?: string | null;
  handledBy?: number | null;
  trainerResponse?: string | null;
}

export interface LearnerReviewRequest {
  trainingId: number;
  rating: number;
  comment?: string;
}

export interface LearnerReviewResponse {
  id: number;
  learnerId: number;
  trainingId: number;
  rating: number;
  comment?: string | null;
  status: LearnerReviewStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
}