export type LearningPathStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ARCHIVED";

export type LearningPathVisibility =
  | "PUBLIC"
  | "ASSIGNED_ONLY"
  | "PRIVATE"
  | string;

export interface LearningPathStep {
  id: number;
  pathId: number;
  trainingId: number;
  position: number;
  required: boolean;
  trainingMissing: boolean;
  trainingTitle?: string | null;
  trainingStatus?: string | null;
  coverImageUrl?: string | null;
  coverImagePath?: string | null;
  estimatedDurationHours?: number | null;
}

export interface LearningPathCatalog {
  itemType: "LEARNING_PATH";
  id: number;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  objectives?: string | null;
  status: LearningPathStatus;
  visibility: LearningPathVisibility;
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
  trainings: LearningPathStep[];
}

export interface LearningPathTrainingProgress {
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

export interface LearningPathProgress {
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
  trainings: LearningPathTrainingProgress[];
}
export interface LearningPathManager {
  id: number;
  ownerId: number;
  ownerRole: string;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  objectives?: string | null;
  versionRootId?: number | null;
  previousVersionId?: number | null;
  versionNumber?: number | null;
  versionNote?: string | null;
  status: LearningPathStatus;
  visibility: LearningPathVisibility;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface LearningPathManagerRequest {
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  objectives?: string | null;
  versionNote?: string | null;
  visibility: LearningPathVisibility;
}

export interface LearningPathStepAddRequest {
  trainingId: number;
  required: boolean;
}

export interface LearningPathStepReorderRequest {
  stepIds: number[];
}

export interface LearningPathStepRequiredRequest {
  required: boolean;
}
export interface LearningPathLearnerIdentity {
  id: number;
  email?: string | null;
  fullName?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
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
  assignedEnrollments: unknown[];
}

export type LearningPathAssignmentSource =
  | "DIRECT"
  | "GROUP"
  | string;

export interface LearningPathLearnerAssignmentRecord {
  id: number;
  pathId: number;
  learnerId: number;
  source: LearningPathAssignmentSource;
  groupId?: number | null;
  assignedBy: number;
  dueAt?: string | null;
  assignedAt?: string | null;
}

export interface LearningPathGroupAssignmentRecord {
  id: number;
  pathId: number;
  groupId: number;
  assignedBy: number;
  dueAt?: string | null;
  assignedAt?: string | null;
}
