export type LearningEventType =
  | "TRAINING_OPENED"
  | "MODULE_OPENED"
  | "LESSON_OPENED"
  | "RESOURCE_OPENED"
  | "QUIZ_STARTED"
  | "QUIZ_SUBMITTED"
  | "SCORE_RECORDED";

export type ProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "AT_RISK";

export interface LearningEventResponse {
  id: number;
  learnerId: number;
  trainingId: number;
  moduleId?: number | null;
  lessonId?: number | null;
  resourceId?: number | null;
  quizId?: number | null;
  attemptId?: number | null;
  eventType: string;
  source?: "CLIENT" | "EVALUATION_SERVICE" | "TRAINING_SERVICE" | "SCORM_RUNTIME" | "LEGACY";
  description?: string | null;
  score?: number | null;
  totalPoints?: number | null;
  progressPercentage?: number | null;
  eventDate: string;
}

export interface LearnerProgressResponse {
  id: number;
  learnerId: number;
  trainingId: number;
  progressPercentage: number;
  completedLessons: number;
  totalLessons: number;
  completedQuizzes: number;
  totalQuizzes: number;
  averageScore: number;
  status: ProgressStatus;
  firstActivityAt?: string;
  lastActivityAt?: string;
  completedAt?: string | null;
}

export interface LearnerAnalyticsSummaryResponse {
  learnerId: number;
  totalEvents: number;
  totalTrainingsStarted: number;
  totalTrainingsCompleted: number;
  averageProgress: number;
  averageScore: number;
  atRiskTrainings: number;
}

export type RiskLevel = "DATA_INSUFFICIENT" | "LOW" | "MEDIUM" | "HIGH";

export interface RiskIndicatorResponse {
  learnerId: number;
  trainingId?: number | null;
  riskScore: number;
  riskLevel: RiskLevel;
  averageProgress: number;
  averageScore: number;
  totalEvents: number;
  totalTrainingsStarted: number;
  totalTrainingsCompleted: number;
  atRiskTrainings: number;
  riskFactors: string[];
  recommendations: string[];
}

export interface AiRiskPredictionResponse {
  learnerId: number;
  trainingId: number;
  prediction: number;
  riskLabel: "AT_RISK" | "NOT_AT_RISK";
  riskProbability: number;
  riskLevel: RiskLevel;
  modelName: string;
  modelVersion: string;
  explanation: string;
  progressPercentage: number;
  averageScore: number;
  totalEvents: number;
  daysSinceLastActivity: number;
}

export type RecommendationType =
  | "REVIEW_LESSON"
  | "RETAKE_QUIZ"
  | "CONSULT_RESOURCE"
  | "CONTACT_TRAINER"
  | "CONTINUE_TRAINING";

export type RecommendationPriority = "LOW" | "MEDIUM" | "HIGH";
export type RecommendationStatus = "PROPOSED" | "ACCEPTED" | "COMPLETED" | "DISMISSED";
export type ActionSource = "RULE_BASED" | "AI_BASED" | "MANUAL";

export interface RecommendationResponse {
  id: number;
  learnerId: number;
  trainingId: number;
  recommendationType: RecommendationType;
  priority: RecommendationPriority;
  title: string;
  description: string;
  source: ActionSource;
  status: RecommendationStatus;
  createdAt?: string;
  completedAt?: string | null;
}
