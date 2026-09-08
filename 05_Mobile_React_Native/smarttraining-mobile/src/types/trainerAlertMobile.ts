import type {
  TrainerLearnerIdentity,
} from "./trainerLearnerMobile";
import type {
  TrainerTraining,
} from "./trainerMobile";

export type TrainerAlertStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "IGNORED"
  | string;

export type TrainerAlertSeverity =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | string;

export type TrainerAlertType =
  | "LOW_PROGRESS"
  | "LOW_SCORE"
  | "INACTIVITY"
  | "AI_RISK"
  | "QUIZ_FAILURE"
  | "LOW_ACTIVITY"
  | string;

export interface TrainerAlert {
  id: number;
  learnerId: number;
  trainingId: number;
  alertType?: TrainerAlertType | null;
  severity?: TrainerAlertSeverity | null;
  title?: string | null;
  message?: string | null;
  source?: string | null;
  status: TrainerAlertStatus;
  createdAt?: string | null;
  resolvedAt?: string | null;
}

export interface TrainerAlertListItem {
  alert: TrainerAlert;
  learner?: TrainerLearnerIdentity | null;
  training?: TrainerTraining | null;
}

export interface TrainerRiskFactor {
  type?: string | null;
  label?: string | null;
  explanation?: string | null;
  impact?: number | null;
}

export interface TrainerRiskIndicator {
  learnerId: number;
  trainingId?: number | null;
  riskLevel?: string | null;
  dataStatus?: string | null;
  averageProgress?: number | null;
  averageScore?: number | null;
  totalEvents?: number | null;
  totalTrainingsStarted?: number | null;
  totalTrainingsCompleted?: number | null;
  atRiskTrainings?: number | null;
  totalFeedbacks?: number | null;
  helpRequests?: number | null;
  riskFactors?: string[];
  recommendations?: string[];
  factors?: TrainerRiskFactor[];
}

export interface TrainerAlertDetailData {
  alert: TrainerAlert;
  learner: TrainerLearnerIdentity;
  training: TrainerTraining;
  risk: TrainerRiskIndicator | null;
}