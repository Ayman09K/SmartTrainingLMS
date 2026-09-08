import type {
  TrainerEnrollment,
  TrainerTraining,
} from "./trainerMobile";

export interface TrainerLearnerIdentity {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email: string;
  civilite?: string | null;
  avatarDataUrl?: string | null;
  role?: string | null;
  enabled?: boolean | null;
  accountStatus?: string | null;
}

export interface TrainerLearnerListItem {
  identity: TrainerLearnerIdentity;
  enrollments: TrainerEnrollment[];
  trainingIds: number[];
  trainingsCount: number;
  completedTrainings: number;
  averageProgress: number;
}

export interface TrainerLearnerOverviewSummary {
  totalTrainings: number;
  completedTrainings: number;
  averageProgress: number;
  averageScore: number;
  completedLessons: number;
  totalLessons: number;
  completedQuizzes: number;
  totalQuizzes: number;
  totalEvents: number;
  openAlerts: number;
  helpRequests: number;
  lastActivityAt?: string | null;
}

export interface TrainerLearnerProgress {
  id: number;
  learnerId: number;
  trainingId: number;
  progressPercentage?: number | null;
  completedLessons?: number | null;
  totalLessons?: number | null;
  completedQuizzes?: number | null;
  totalQuizzes?: number | null;
  averageScore?: number | null;
  status?: string | null;
  firstActivityAt?: string | null;
  lastActivityAt?: string | null;
  completedAt?: string | null;
}

export interface TrainerRiskFactor {
  type?: string | null;
  label?: string | null;
  explanation?: string | null;
  impact?: number | null;
}

export interface TrainerLearnerRisk {
  learnerId: number;
  trainingId?: number | null;
  riskScore?: number | null;
  riskLevel?: string | null;
  dataStatus?: string | null;
  averageProgress?: number | null;
  averageScore?: number | null;
  totalEvents?: number | null;
  totalFeedbacks?: number | null;
  helpRequests?: number | null;
  riskFactors?: string[];
  recommendations?: string[];
  factors?: TrainerRiskFactor[];
}

export interface TrainerLearnerEvent {
  id: number;
  learnerId: number;
  trainingId?: number | null;
  eventType?: string | null;
  description?: string | null;
  score?: number | null;
  totalPoints?: number | null;
  progressPercentage?: number | null;
  eventDate?: string | null;
}

export interface TrainerLearnerFeedback {
  id: number;
  learnerId: number;
  trainingId: number;
  needHelp?: boolean | null;
  message?: string | null;
  status?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
  trainerResponse?: string | null;
}

export interface TrainerLearnerAlert {
  id: number;
  learnerId: number;
  trainingId: number;
  severity?: string | null;
  title?: string | null;
  message?: string | null;
  status?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
}

export interface TrainerLearnerRecommendation {
  id: number;
  learnerId: number;
  trainingId: number;
  priority?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
}

export interface TrainerLearnerIntervention {
  id: number;
  learnerId: number;
  trainerId: number;
  trainingId: number;
  interventionType?: string | null;
  note?: string | null;
  status?: string | null;
  createdAt?: string | null;
  closedAt?: string | null;
}

export interface TrainerLearnerOverviewResponse {
  learnerId: number;
  trainingIds: number[];
  summary: TrainerLearnerOverviewSummary;
  progress: TrainerLearnerProgress[];
  risks: TrainerLearnerRisk[];
  recentEvents: TrainerLearnerEvent[];
  feedbacks: TrainerLearnerFeedback[];
  alerts: TrainerLearnerAlert[];
  recommendations: TrainerLearnerRecommendation[];
  interventions: TrainerLearnerIntervention[];
}

export interface TrainerLearner360Data {
  identity: TrainerLearnerIdentity;
  overview: TrainerLearnerOverviewResponse;
  trainings: TrainerTraining[];
}