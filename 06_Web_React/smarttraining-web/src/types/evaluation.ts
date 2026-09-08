export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "FILL_BLANK"
  | "ORDERING"
  | "MATCHING"
  | "DRAG_DROP"
  | "NUMERIC";

export type QuizAttemptStatus =
  | "STARTED"
  | "SUBMITTED"
  | "CANCELLED";

export type ResultPolicy = "AFTER_SUBMIT" | "AFTER_EACH_QUESTION";
export type CorrectAnswerPolicy =
  | "NEVER"
  | "AFTER_SUBMIT"
  | "AFTER_LAST_ATTEMPT";
export type QuestionResultStatus = "CORRECT" | "INCORRECT" | "PARTIAL";

export interface LearnerAnswerOptionResponse {
  id: number;
  content: string;
  orderIndex?: number;
}

export interface LearnerDisplayItem {
  id: string;
  text: string;
}

export interface LearnerQuestionTypeConfigResponse {
  version?: number | null;
  blankIds?: string[];
  orderingItems?: LearnerDisplayItem[];
  matchingLeft?: LearnerDisplayItem[];
  matchingRight?: LearnerDisplayItem[];
  dragItems?: LearnerDisplayItem[];
  dragZones?: LearnerDisplayItem[];
  numericUnit?: string | null;
}

export interface LearnerQuestionResponse {
  id: number;
  content: string;
  type: QuestionType;
  orderIndex?: number;
  points?: number;
  options: LearnerAnswerOptionResponse[];
  typeConfig?: LearnerQuestionTypeConfigResponse | null;
}

export interface LearnerQuizResponse {
  id: number;
  trainingId: number;
  moduleId?: number | null;
  title: string;
  description?: string | null;
  passingScore?: number | null;
  maxAttempts?: number | null;
  timeLimitMinutes?: number | null;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  resultPolicy?: ResultPolicy;
  correctAnswerPolicy?: CorrectAnswerPolicy;
  successFeedback?: string | null;
  failureFeedback?: string | null;
  questions: LearnerQuestionResponse[];
}

export interface QuizAttemptResponse {
  id: number;
  quizId: number;
  learnerId: number;
  status: QuizAttemptStatus;
  startedAt?: string | null;
  submittedAt?: string | null;
  score?: number | null;
  totalPoints?: number | null;
  success?: boolean | null;
}

export interface BlankAnswerRequest {
  blankId: string;
  value: string;
}

export interface MatchingPairAnswerRequest {
  leftId: string;
  rightId: string;
}

export interface DragPlacementAnswerRequest {
  itemId: string;
  zoneId: string;
}

export interface SubmittedAnswerRequest {
  questionId: number;
  selectedOptionIds?: number[];
  answerText?: string;
  blankAnswers?: BlankAnswerRequest[];
  orderedItemIds?: string[];
  matchingPairs?: MatchingPairAnswerRequest[];
  dragPlacements?: DragPlacementAnswerRequest[];
  numericValue?: number;
}

export interface DisplayItemConfig {
  id: string;
  text: string;
}

export interface QuestionTypeConfigRequest {
  version?: number;
  fillBlank?: {
    blanks: {
      id: string;
      accepted: string[];
      caseSensitive?: boolean;
      trim?: boolean;
    }[];
  };
  ordering?: {
    items: {
      id: string;
      text: string;
      correctIndex: number;
    }[];
  };
  matching?: {
    left: DisplayItemConfig[];
    right: DisplayItemConfig[];
    pairs: { leftId: string; rightId: string }[];
  };
  dragDrop?: {
    items: DisplayItemConfig[];
    zones: DisplayItemConfig[];
    placements: { itemId: string; zoneId: string }[];
  };
  numeric?: {
    expected: number;
    tolerance: number;
    unit?: string | null;
  };
}

export interface LearnerCorrectAnswerResponse {
  options?: LearnerAnswerOptionResponse[];
  typeConfig?: QuestionTypeConfigRequest | null;
}

export interface LearnerQuestionResultResponse {
  questionId: number;
  prompt: string;
  type: QuestionType;
  status: QuestionResultStatus;
  pointsEarned: number;
  maxPoints: number;
  learnerAnswer?: SubmittedAnswerRequest | null;
  feedback?: string | null;
  explanation?: string | null;
  correctAnswer?: LearnerCorrectAnswerResponse | null;
}

export interface LearnerQuizAttemptResultResponse
  extends QuizAttemptResponse {
  attemptId: number;
  attemptNumber: number;
  durationSeconds: number;
  earnedPoints: number;
  maxPoints: number;
  scorePercent: number;
  passed: boolean;
  remainingAttempts: number;
  globalFeedback?: string | null;
  resultPolicy: ResultPolicy;
  correctAnswerPolicy: CorrectAnswerPolicy;
  questionResults: LearnerQuestionResultResponse[];
}

export type QuizAttemptFullResponse = LearnerQuizAttemptResultResponse;

export interface LearnerStartAttemptRequest {
  quizId: number;
}

export interface SubmitAttemptRequest {
  answers: SubmittedAnswerRequest[];
}
