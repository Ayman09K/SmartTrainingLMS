export type BiScope = "trainer" | "admin";

export type BiEnrollmentStatus =
  | ""
  | "ACTIVE"
  | "COMPLETED";

export type BiPeriodPreset =
  | "7"
  | "30"
  | "CUSTOM";

export interface BiFilters {
  from: string;
  to: string;
  trainingId?: number;
  status?: string;
}

export interface BiSummary {
  from: string;
  to: string;
  totalTrainings: number;
  publishedTrainings: number;
  totalLearners: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
  averageProgress: number | null;
  averageQuizScore: number | null;
  activeLearners: number;
  atRiskLearners: number;
  dataInsufficientLearners: number;
  totalEvents: number;
}

export interface BiTrainingMetric {
  trainingId: number;
  title: string;
  status: string;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
  averageProgress: number | null;
  averageQuizScore: number | null;
  activeLearners: number;
  atRiskLearners: number;
  dataInsufficientLearners: number;
  totalEvents: number;
  lastActivityAt: string | null;
}

export interface BiActivityPoint {
  date: string;
  totalEvents: number;
  activeLearners: number;
}

export interface BiDistribution {
  progress: Record<string, number>;
  scores: Record<string, number>;
  risk: Record<string, number>;
}

export interface BiTrainingOption {
  id: number;
  title: string;
  status?: string;
}