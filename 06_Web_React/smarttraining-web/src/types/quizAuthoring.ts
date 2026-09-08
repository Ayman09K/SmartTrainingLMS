import type { QuestionType } from "./evaluation";

export type QuizStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ResultPolicy = "AFTER_EACH_QUESTION" | "AFTER_SUBMIT";
export type CorrectAnswerPolicy =
  | "AFTER_LAST_ATTEMPT"
  | "AFTER_SUBMIT"
  | "NEVER";

export interface QuizAuthoringRequest {
  trainingId: number;
  moduleId?: number | null;
  title: string;
  description?: string | null;
  passingScore: number;
  maxAttempts: number;
  timeLimitMinutes?: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  resultPolicy: ResultPolicy;
  correctAnswerPolicy: CorrectAnswerPolicy;
  successFeedback?: string | null;
  failureFeedback?: string | null;
  status: QuizStatus;
}

export interface QuizAuthoringResponse extends QuizAuthoringRequest {
  id: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AnswerOptionAuthoringRequest {
  questionId: number;
  content: string;
  correct: boolean;
  orderIndex: number;
}

export interface AnswerOptionAuthoringResponse
  extends AnswerOptionAuthoringRequest {
  id: number;
}

export interface BlankRuleConfig {
  id: string;
  accepted: string[];
  caseSensitive: boolean;
  trim: boolean;
}

export interface FillBlankConfig {
  blanks: BlankRuleConfig[];
}

export interface OrderingItemConfig {
  id: string;
  text: string;
  correctIndex: number;
}

export interface OrderingConfig {
  items: OrderingItemConfig[];
}

export interface DisplayItemConfig {
  id: string;
  text: string;
}

export interface MatchingPairConfig {
  leftId: string;
  rightId: string;
}

export interface MatchingConfig {
  left: DisplayItemConfig[];
  right: DisplayItemConfig[];
  pairs: MatchingPairConfig[];
}

export interface DragPlacementConfig {
  itemId: string;
  zoneId: string;
}

export interface DragDropConfig {
  items: DisplayItemConfig[];
  zones: DisplayItemConfig[];
  placements: DragPlacementConfig[];
}

export interface NumericConfig {
  expected: number;
  tolerance: number;
  unit?: string | null;
}

export interface QuestionTypeConfigRequest {
  version: number;
  fillBlank?: FillBlankConfig;
  ordering?: OrderingConfig;
  matching?: MatchingConfig;
  dragDrop?: DragDropConfig;
  numeric?: NumericConfig;
}

export interface QuestionAuthoringRequest {
  quizId: number;
  content: string;
  type: QuestionType;
  orderIndex: number;
  points: number;
  explanation?: string | null;
  typeConfig?: QuestionTypeConfigRequest;
}

export interface QuestionAuthoringResponse
  extends QuestionAuthoringRequest {
  id: number;
}

export interface QuestionFullAuthoringResponse
  extends QuestionAuthoringResponse {
  options: AnswerOptionAuthoringResponse[];
}

export interface QuizFullAuthoringResponse
  extends QuizAuthoringResponse {
  questions: QuestionFullAuthoringResponse[];
}
