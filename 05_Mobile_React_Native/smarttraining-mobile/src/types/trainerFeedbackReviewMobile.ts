import type {
  TrainerLearnerIdentity,
} from "./trainerLearnerMobile";
import type {
  TrainerTraining,
} from "./trainerMobile";

export type TrainerDifficultyLevel =
  | "VERY_EASY"
  | "EASY"
  | "NORMAL"
  | "HARD"
  | "VERY_HARD"
  | string;

export type TrainerFeedbackStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | string;

export type TrainerReviewStatus =
  | "PUBLISHED"
  | "HIDDEN"
  | string;

export interface TrainerFeedback {
  id: number;
  learnerId: number;
  trainingId: number;
  moduleId?: number | null;
  lessonId?: number | null;
  resourceId?: number | null;
  difficultyLevel?: TrainerDifficultyLevel | null;
  needHelp?: boolean | null;
  message?: string | null;
  status: TrainerFeedbackStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
  resolvedAt?: string | null;
  trainerResponse?: string | null;
}

export interface TrainerReview {
  id: number;
  learnerId: number;
  trainingId: number;
  rating: number;
  comment?: string | null;
  status: TrainerReviewStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TrainerFeedbackListItem {
  feedback: TrainerFeedback;
  learner?: TrainerLearnerIdentity | null;
  training?: TrainerTraining | null;
}

export interface TrainerReviewListItem {
  review: TrainerReview;
  learner?: TrainerLearnerIdentity | null;
  training?: TrainerTraining | null;
}