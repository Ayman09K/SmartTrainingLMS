import type {
  EnrollmentResponse,
  TrainingStatus,
  TrainingVisibility,
} from "./training";

export type LearningPathStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface LearningPathRequest {
  title: string;
  shortDescription?: string;
  description?: string;
  objectives?: string;
  versionNote?: string | null;
  visibility?: TrainingVisibility;
}

export interface LearningPathResponse {
  id: number;
  ownerId: number;
  ownerRole: string;
  title: string;
  shortDescription?: string;
  description?: string;
  objectives?: string;
  coverImageUrl?: string | null;
  coverImagePath?: string | null;
  versionRootId?: number | null;
  previousVersionId?: number | null;
  versionNumber?: number | null;
  versionNote?: string | null;
  status: LearningPathStatus;
  visibility: TrainingVisibility;
  createdAt?: string;
  updatedAt?: string;
}

export interface LearningPathStepResponse {
  id: number;
  pathId: number;
  trainingId: number;
  position: number;
  required: boolean;
  trainingMissing: boolean;
  trainingTitle?: string | null;
  trainingStatus?: TrainingStatus | string | null;
  coverImageUrl?: string | null;
  coverImagePath?: string | null;
  estimatedDurationHours?: number | null;
}

export interface LearningPathStepAddRequest {
  trainingId: number;
  required?: boolean;
}

export interface LearningPathStepRequiredRequest {
  required: boolean;
}

export interface LearningPathStepReorderRequest {
  stepIds: number[];
}

export interface LearningPathLearnerAssignmentRequest {
  learnerIds: number[];
  dueAt?: string;
}

export interface LearningPathGroupAssignmentRequest {
  dueAt?: string;
}

export interface LearningPathAssignmentResult {
  pathId: number;
  groupId?: number | null;
  totalLearners: number;
  pathAssignmentsCreated: number;
  pathAssignmentsExisting: number;
  trainingSteps: number;
  newEnrollments: number;
  alreadyEnrolled: number;
  assignedEnrollments: EnrollmentResponse[];
}
export interface LearningPathCatalogResponse {
  itemType: "LEARNING_PATH";
  id: number;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  objectives?: string | null;
  status: LearningPathStatus;
  visibility: TrainingVisibility;
  totalTrainings: number;
  requiredTrainings: number;
  optionalTrainings: number;
  estimatedDurationHours: number;
  coverImageUrl?: string | null;
  coverImagePath?: string | null;
  assignedToMe: boolean;
  canStart: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  trainings: LearningPathStepResponse[];
}

export interface LearningPathTrainingProgressResponse {
  stepId: number;
  trainingId: number;
  trainingTitle?: string | null;
  position: number;
  required: boolean;
  trainingMissing: boolean;
  enrolled: boolean;
  enrollmentId?: number | null;
  enrollmentStatus?: string | null;
  progressPercentage: number;
  completedAt?: string | null;
  dueAt?: string | null;
}

export interface LearningPathProgressResponse {
  pathId: number;
  pathTitle: string;
  pathStatus: LearningPathStatus;
  learnerId: number;
  assignmentSource: string;
  assignmentGroupId?: number | null;
  assignedAt?: string | null;
  pathDueAt?: string | null;
  totalSteps: number;
  requiredSteps: number;
  optionalSteps: number;
  enrolledSteps: number;
  completedSteps: number;
  completedRequiredSteps: number;
  overallProgressPercentage: number;
  completionProgressPercentage: number;
  completed: boolean;
  nextStepId?: number | null;
  nextTrainingId?: number | null;
  nextPosition?: number | null;
  trainings: LearningPathTrainingProgressResponse[];
}
