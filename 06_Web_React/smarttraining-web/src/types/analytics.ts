export type ProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "AT_RISK";

export type DataStatus = "INSUFFICIENT" | "SUFFICIENT";

export type RiskLevel = "DATA_INSUFFICIENT" | "LOW" | "MEDIUM" | "HIGH";

export type DifficultyLevel = "VERY_EASY" | "EASY" | "NORMAL" | "HARD" | "VERY_HARD";

export type FeedbackStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export type ReviewStatus = "PUBLISHED" | "HIDDEN";

export type LearningEventType =
  | "TRAINING_OPENED"
  | "MODULE_OPENED"
  | "LESSON_OPENED"
  | "RESOURCE_OPENED"
  | "VIDEO_OPENED"
  | "PDF_OPENED"
  | "SCORM_OPENED"
  | "QUIZ_STARTED"
  | "QUIZ_SUBMITTED"
  | "QUIZ_PASSED"
  | "QUIZ_FAILED"
  | "SCORE_RECORDED"
  | "REVIEW_CREATED"
  | "FEEDBACK_CREATED"
  | "HELP_REQUESTED";

export interface LearnerProgressResponse {
  id: number;
  learnerId: number;
  trainingId: number;
  progressPercentage: number;
  completedLessons?: number;
  totalLessons?: number;
  completedQuizzes?: number;
  totalQuizzes?: number;
  averageScore?: number;
  status?: ProgressStatus;
  lastActivityAt?: string;
  updatedAt?: string;
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

export interface RiskFactorResponse {
  type: string;
  label: string;
  explanation: string;
  impact: number;
}
export interface RiskIndicatorResponse {
  learnerId: number;
  trainingId?: number | null;
  riskScore: number;
  riskLevel: RiskLevel;
  dataStatus?: DataStatus;
  averageProgress?: number;
  averageScore?: number;
  totalEvents?: number;
  totalTrainingsStarted?: number;
  totalTrainingsCompleted?: number;
  atRiskTrainings?: number;
  totalFeedbacks?: number;
  helpRequests?: number;
  riskFactors: string[];
  factors?: RiskFactorResponse[];

  // CompatibilitÃ© ancien frontend
  recommendation?: string;

  recommendations?: string[];
}

export interface AiRiskPredictionResponse {
  learnerId: number;
  trainingId: number;
  prediction: number;
  riskLabel: "AT_RISK" | "NOT_AT_RISK" | "DATA_INSUFFICIENT";
  riskProbability: number;
  riskLevel: RiskLevel;
  dataStatus?: DataStatus;
  modelName: string;
  modelVersion: string;
  explanation: string;
  progressPercentage?: number;
  averageScore?: number;
  totalEvents?: number;
  daysSinceLastActivity?: number;
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

export interface TrainingReviewRequest {
  learnerId: number;
  trainingId: number;
  rating: number;
  comment?: string;
}

export interface TrainingReviewResponse {
  id: number;
  learnerId: number;
  trainingId: number;
  rating: number;
  comment?: string;
  status: ReviewStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeedbackRequest {
  learnerId: number;
  trainingId: number;
  moduleId?: number;
  lessonId?: number;
  resourceId?: number;
  difficultyLevel?: DifficultyLevel;
  needHelp?: boolean;
  message?: string;
}

export interface FeedbackUpdateRequest {
  difficultyLevel?: DifficultyLevel;
  needHelp?: boolean;
  message?: string;
}

export interface FeedbackResponse {
  id: number;
  learnerId: number;
  trainingId: number;
  moduleId?: number;
  lessonId?: number;
  resourceId?: number;
  difficultyLevel: DifficultyLevel;
  needHelp: boolean;
  message?: string;
  status: FeedbackStatus;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string | null;
  handledBy?: number | null;
  trainerResponse?: string | null;
}

export interface LearningEventResponse {
  id: number;
  learnerId: number;
  trainingId?: number;
  moduleId?: number;
  lessonId?: number;
  resourceId?: number;
  quizId?: number;
  attemptId?: number;
  eventType: LearningEventType | string;
  description?: string;
  score?: number;
  totalPoints?: number;
  progressPercentage?: number;
  eventDate?: string;
  createdAt?: string;
}
