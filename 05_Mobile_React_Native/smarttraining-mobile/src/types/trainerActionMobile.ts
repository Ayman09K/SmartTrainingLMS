import type {
  TrainerLearnerIdentity,
} from "./trainerLearnerMobile";
import type {
  TrainerTraining,
} from "./trainerMobile";

export type TrainerInterventionType =
  | "MESSAGE"
  | "CALL"
  | "SUPPORT_SESSION"
  | "MANUAL_REVIEW"
  | "FOLLOW_UP";

export type TrainerInterventionStatus =
  | "PLANNED"
  | "DONE"
  | "CANCELLED";

export type TrainerActionSource =
  | "RULE_BASED"
  | "AI_BASED"
  | "MANUAL";

export interface TrainerInterventionRequest {
  learnerId: number;
  trainingId: number;
  interventionType: TrainerInterventionType;
  note: string;
  source: TrainerActionSource;
}

export interface TrainerInterventionResponse
  extends TrainerInterventionRequest {
  id: number;
  trainerId: number;
  status: TrainerInterventionStatus;
  createdAt?: string | null;
  closedAt?: string | null;
}

export interface TrainerInterventionListItem {
  intervention: TrainerInterventionResponse;
  learner?: TrainerLearnerIdentity | null;
  training?: TrainerTraining | null;
}

export type TrainerSupportSessionStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED";

export interface TrainerSupportSessionRequest {
  learnerId: number;
  trainingId: number;
  title: string;
  objective: string;
  scheduledAt: string;
  meetingLink: string;
  note?: string;
}

export interface TrainerSupportSessionResponse
  extends TrainerSupportSessionRequest {
  id: number;
  trainerId: number;
  status: TrainerSupportSessionStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
  closedAt?: string | null;
}

export interface TrainerSupportSessionListItem {
  session: TrainerSupportSessionResponse;
  learner?: TrainerLearnerIdentity | null;
  training?: TrainerTraining | null;
}

export interface TrainerLearnerTrainingOption {
  learnerId: number;
  trainingId: number;
  learnerName: string;
  learnerEmail: string;
  trainingTitle: string;
}

export interface TrainerInterventionDetailData {
  intervention: TrainerInterventionResponse;
  learner: TrainerLearnerIdentity;
  training: TrainerTraining;
}

export interface TrainerSupportSessionDetailData {
  session: TrainerSupportSessionResponse;
  learner: TrainerLearnerIdentity;
  training: TrainerTraining;
}