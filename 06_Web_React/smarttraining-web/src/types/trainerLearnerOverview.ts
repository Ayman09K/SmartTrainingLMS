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
}

export interface TrainerLearnerEvent {
  id: number;
  learnerId: number;
  trainingId?: number | null;
  moduleId?: number | null;
  lessonId?: number | null;
  resourceId?: number | null;
  quizId?: number | null;
  attemptId?: number | null;
  eventType?: string | null;
  source?: string | null;
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
  moduleId?: number | null;
  lessonId?: number | null;
  resourceId?: number | null;
  difficultyLevel?: string | null;
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
  alertType?: string | null;
  severity?: string | null;
  title?: string | null;
  message?: string | null;
  source?: string | null;
  status?: string | null;
  riskProbability?: number | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
}

export interface TrainerLearnerRecommendation {
  id: number;
  learnerId: number;
  trainingId: number;
  recommendationType?: string | null;
  priority?: string | null;
  title?: string | null;
  description?: string | null;
  source?: string | null;
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
  source?: string | null;
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