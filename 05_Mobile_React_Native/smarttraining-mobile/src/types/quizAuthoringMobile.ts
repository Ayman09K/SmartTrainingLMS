export type AuthoringQuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "ORDERING"
  | "MATCHING"
  | "DRAG_DROP"
  | "NUMERIC";

export type QuizAuthoringStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type QuizResultPolicy = "AFTER_EACH_QUESTION" | "AFTER_SUBMIT";
export type QuizCorrectAnswerPolicy =
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
  resultPolicy: QuizResultPolicy;
  correctAnswerPolicy: QuizCorrectAnswerPolicy;
  successFeedback?: string | null;
  failureFeedback?: string | null;
  status: QuizAuthoringStatus;
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

export interface QuestionTypeConfigRequest {
  version: number;
  fillBlank?: {
    blanks: {
      id: string;
      accepted: string[];
      caseSensitive: boolean;
      trim: boolean;
    }[];
  };
  ordering?: {
    items: { id: string; text: string; correctIndex: number }[];
  };
  matching?: {
    left: { id: string; text: string }[];
    right: { id: string; text: string }[];
    pairs: { leftId: string; rightId: string }[];
  };
  dragDrop?: {
    items: { id: string; text: string }[];
    zones: { id: string; text: string }[];
    placements: { itemId: string; zoneId: string }[];
  };
  numeric?: {
    expected: number;
    tolerance: number;
    unit?: string | null;
  };
}

export interface QuestionAuthoringRequest {
  quizId: number;
  content: string;
  type: AuthoringQuestionType;
  orderIndex: number;
  points: number;
  explanation?: string | null;
  typeConfig?: QuestionTypeConfigRequest;
}

export interface QuestionAuthoringResponse extends QuestionAuthoringRequest {
  id: number;
}

export interface QuestionFullAuthoringResponse
  extends QuestionAuthoringResponse {
  options: AnswerOptionAuthoringResponse[];
}

export interface QuizFullAuthoringResponse extends QuizAuthoringResponse {
  questions: QuestionFullAuthoringResponse[];
}

export interface QuizBuilderModuleOption {
  id: number;
  title: string;
}

export interface QuizBuilderTrainingOutline {
  id: number;
  title: string;
  modules: QuizBuilderModuleOption[];
}
