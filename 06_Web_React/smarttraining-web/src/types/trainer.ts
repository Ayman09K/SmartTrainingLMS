import type {
  EnrollmentResponse,
  FileUploadResponse,
  FullTrainingResponse,
  LessonResponse,
  ModuleResponse,
  ResourceResponse,
  ScormUploadResponse,
  TrainingAccessRequestResponse,
  TrainingInvitationResponse,
  TrainingResponse,
} from "./training";
import type {
  FeedbackResponse,
  RiskLevel,
} from "./analytics";

export type AlertType =
  | "LOW_PROGRESS"
  | "LOW_SCORE"
  | "INACTIVITY"
  | "AI_RISK"
  | "QUIZ_FAILURE"
  | "LOW_ACTIVITY"
  | "HELP_REQUEST";

export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH";

export type AlertStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "IGNORED";

export type ActionSource = "RULE_BASED" | "AI_BASED" | "MANUAL";

export interface AlertResponse {
  id: number;
  learnerId: number;
  trainingId: number;
  alertType?: AlertType | string;
  severity?: AlertSeverity | string;
  riskLevel?: RiskLevel | string;
  title?: string;
  message?: string;
  description?: string;
  source?: ActionSource | string;
  status?: AlertStatus | string;
  riskProbability?: number | null;
  createdAt?: string;
  resolvedAt?: string | null;
}

export type InterventionType =
  | "MESSAGE"
  | "CALL"
  | "SUPPORT_SESSION"
  | "MANUAL_REVIEW"
  | "FOLLOW_UP";

export type InterventionStatus = "PLANNED" | "DONE" | "CANCELLED";

export interface InterventionRequest {
  learnerId: number;
  trainingId: number;
  interventionType: InterventionType;
  note: string;
  source: ActionSource;
}

export interface InterventionResponse extends InterventionRequest {
  id: number;
  trainerId: number;
  status: InterventionStatus;
  createdAt?: string;
  closedAt?: string | null;
}


export type SupportSessionStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED";

export interface SupportSessionRequest {
  learnerId: number;
  trainingId: number;
  title: string;
  objective: string;
  scheduledAt: string;
  meetingLink: string;
  note?: string;
}

export interface SupportSessionResponse extends SupportSessionRequest {
  id: number;
  trainerId: number;
  status: SupportSessionStatus;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string | null;
}

export interface TrainerDashboardData {
  trainings: TrainingResponse[];
  alerts: AlertResponse[];
  interventions: InterventionResponse[];
  feedbacks: FeedbackResponse[];
}

export interface TrainerStats {
  totalTrainings: number;
  publishedTrainings: number;
  openAlerts: number;
  openFeedbacks: number;
  plannedInterventions: number;
}

export type {
  EnrollmentResponse,
  FeedbackResponse,
  FileUploadResponse,
  FullTrainingResponse,
  LessonResponse,
  ModuleResponse,
  ResourceResponse,
  ScormUploadResponse,
  TrainingAccessRequestResponse,
  TrainingInvitationResponse,
  TrainingResponse,
};
