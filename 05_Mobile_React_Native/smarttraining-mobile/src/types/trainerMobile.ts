export type TrainerTrainingStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ARCHIVED"
  | string;

export type TrainerAlertStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "IGNORED"
  | string;

export type TrainerFeedbackStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | string;

export type TrainerInterventionStatus =
  | "PLANNED"
  | "DONE"
  | "CANCELLED"
  | string;

export type TrainerSupportSessionStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | string;

export interface TrainerTrainingSummary {
  id: number;
  title?: string | null;
  status: TrainerTrainingStatus;
}

export interface TrainerAlertSummary {
  id: number;
  status: TrainerAlertStatus;
}

export interface TrainerFeedbackSummary {
  id: number;
  status: TrainerFeedbackStatus;
}

export interface TrainerInterventionSummary {
  id: number;
  status: TrainerInterventionStatus;
}

export interface TrainerSupportSessionSummary {
  id: number;
  status: TrainerSupportSessionStatus;
}

export interface TrainerDashboardSummary {
  trainings: number;
  publishedTrainings: number;
  openAlerts: number;
  openFeedbacks: number;
  plannedInterventions: number;
  scheduledSessions: number;
  degradedSections: string[];
}

export interface TrainerTraining {
  id: number;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  objectives?: string | null;
  prerequisites?: string | null;
  targetAudience?: string | null;
  category?: string | null;
  language?: string | null;
  coverImageUrl?: string | null;
  coverImagePath?: string | null;
  level?: string | null;
  estimatedDurationHours?: number | null;
  status: TrainerTrainingStatus;
  visibility?: string | null;
  enrollmentMode?: string | null;
  maxLearners?: number | null;
  averageRating?: number | null;
  reviewCount?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
}

export interface TrainerEnrollment {
  id: number;
  learnerId: number;
  trainingId: number;
  trainingTitle?: string | null;
  status?: string | null;
  source?: string | null;
  progressPercentage?: number | null;
  enrolledAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
}

export interface TrainerTrainingMetrics {
  learners: number;
  averageProgress: number;
}

export interface TrainerTrainingListItem {
  training: TrainerTraining;
  metrics: TrainerTrainingMetrics;
}