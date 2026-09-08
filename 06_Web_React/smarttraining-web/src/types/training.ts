export type TrainingLevel = "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE";

export type TrainingStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | "ACTIVE" | "INACTIVE";

export type TrainingVisibility = "PUBLIC" | "PRIVATE" | "ASSIGNED_ONLY";

export type EnrollmentMode =
  | "SELF_ENROLLMENT"
  | "ASSIGNMENT_ONLY"
  | "ACCESS_CODE"
  | "INVITATION";

export type ResourceType =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "PDF"
  | "DOCUMENT"
  | "EXTERNAL_LINK"
  | "SCORM"
  | "PDF_URL"
  | "VIDEO_URL";

export type StorageMode =
  | "TEXT_CONTENT"
  | "EXTERNAL_URL"
  | "LOCAL_FILE"
  | "SCORM_PACKAGE";

export type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export type EnrollmentSource =
  | "ADMIN_ASSIGNMENT"
  | "TRAINER_ASSIGNMENT"
  | "SELF_ENROLLMENT"
  | "ACCESS_CODE"
  | "INVITATION"
  | "APPROVED_REQUEST";

export type TrainingAccessRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type TrainingInvitationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED";

export interface LearnerCatalogTrainingResponse {
  id: number;
  title: string;
  shortDescription?: string;
  description?: string;
  objectives?: string;
  prerequisites?: string;
  targetAudience?: string;
  category?: string;
  language?: string;
  coverImageUrl?: string;
  level?: TrainingLevel | string;
  estimatedDurationHours?: number;
  enrollmentMode?: EnrollmentMode | string;
  maxLearners?: number;
  averageRating?: number;
  reviewCount?: number;
  publishedAt?: string;
}

export interface TrainingResponse {
  id: number;
  trainerId: number;
  ownerId?: number;
  title: string;
  shortDescription?: string;
  description?: string;
  objectives?: string;
  prerequisites?: string;
  targetAudience?: string;
  category?: string;
  categoryId?: number;
  language?: string;
  coverImageUrl?: string;
  coverImagePath?: string;
  level?: TrainingLevel | string;

  // Compatibilité ancien frontend
  durationHours?: number;
  estimatedDurationHours?: number;
  active?: boolean;

  status?: TrainingStatus | string;
  visibility?: TrainingVisibility | string;
  enrollmentMode?: EnrollmentMode | string;
  accessCode?: string;
  maxLearners?: number;
  averageRating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  archivedAt?: string;
}

export interface TrainingRequest {
  trainerId: number;
  ownerId?: number;
  title: string;
  shortDescription?: string;
  description?: string;
  objectives?: string;
  prerequisites?: string;
  targetAudience?: string;
  category?: string;
  categoryId?: number;
  language?: string;
  coverImageUrl?: string;
  coverImagePath?: string;
  level: TrainingLevel;
  estimatedDurationHours?: number;
  status?: TrainingStatus;
  visibility?: TrainingVisibility;
  enrollmentMode?: EnrollmentMode;
  accessCode?: string;
  maxLearners?: number;
}

export interface ModuleResponse {
  id: number;
  trainingId?: number;
  title: string;
  description?: string;
  orderIndex?: number;
}

export interface ModuleRequest {
  trainingId: number;
  title: string;
  description?: string;
  orderIndex: number;
}

// PATCH16_A8C5L_AUTHORING_CONTENT_CLARITY_V1
export interface LessonResponse {
  id: number;
  moduleId?: number;
  title: string;
  description?: string;
  objective?: string;
  content?: string;
  orderIndex?: number;
  estimatedDurationMinutes?: number;
}

export interface LessonRequest {
  moduleId: number;
  title: string;
  description?: string;
  objective?: string;
  content?: string;
  orderIndex: number;
  estimatedDurationMinutes?: number;
}

export interface ResourceResponse {
  id: number;
  lessonId?: number;
  title: string;
  description?: string;
  type?: ResourceType | string;
  storageMode?: StorageMode | string;
  url?: string;
  textContent?: string;
  originalFileName?: string;
  storedFileName?: string;
  relativePath?: string;
  publicUrl?: string;
  mimeType?: string;
  fileSize?: number;
  durationSeconds?: number;
  uploadedBy?: number;
  uploadedAt?: string;
  scormPackageId?: number;
  scormLaunchPath?: string;
  scormManifestPath?: string;
  active?: boolean;
  orderIndex?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceRequest {
  lessonId: number;
  title: string;
  description?: string;
  type: ResourceType;
  storageMode?: StorageMode;
  url?: string;
  textContent?: string;
  orderIndex: number;
}

export interface FullLessonResponse extends LessonResponse {
  resources?: ResourceResponse[];
}

export interface FullModuleResponse extends ModuleResponse {
  lessons?: FullLessonResponse[];
}

export interface FullTrainingResponse extends TrainingResponse {
  modules?: FullModuleResponse[];
}

export interface EnrollmentResponse {
  id: number;
  learnerId: number;
  trainingId: number;
  trainingTitle?: string;
  status?: EnrollmentStatus | string;
  source?: EnrollmentSource | string;
  assignedBy?: number;
  progressPercentage?: number;
  enrolledAt?: string;
  completedAt?: string | null;
  cancelledAt?: string | null;
  dueAt?: string | null;
}

export interface SelfEnrollmentRequest {
  learnerId: number;
  trainingId: number;
}

export interface AccessCodeEnrollmentRequest {
  learnerId: number;
  trainingId: number;
  accessCode: string;
}

export interface TrainingAssignmentRequest {
  trainingId: number;
  learnerIds: number[];
  assignedBy?: number;
  source?: "ADMIN_ASSIGNMENT" | "TRAINER_ASSIGNMENT";
  dueAt?: string | null;
}

export interface TrainingAccessRequestCreateRequest {
  learnerId: number;
  trainingId: number;
  learnerMessage?: string;
}

export interface TrainingAccessRequestDecisionRequest {
  decidedBy: number;
  decisionComment?: string;
}

export interface TrainingAccessRequestResponse {
  id: number;
  learnerId: number;
  trainingId: number;
  trainingTitle?: string;
  learnerMessage?: string;
  status: TrainingAccessRequestStatus;
  requestedAt?: string;
  decidedAt?: string | null;
  decidedBy?: number | null;
  decisionComment?: string | null;
  enrollmentId?: number | null;
}

export interface TrainingInvitationCreateRequest {
  trainingId: number;
  learnerId?: number;
  learnerEmail?: string;
  invitedBy: number;
  message?: string;
  validityDays?: number;
}

export interface TrainingInvitationAcceptRequest {
  token: string;
  learnerId: number;
}

export interface TrainingInvitationResponse {
  id: number;
  trainingId: number;
  trainingTitle?: string;
  learnerId?: number;
  learnerEmail?: string;
  invitedBy: number;
  token?: string;
  message?: string;
  status: TrainingInvitationStatus;
  createdAt?: string;
  expiresAt?: string;
  respondedAt?: string | null;
  enrollmentId?: number | null;
}

export interface FileUploadResponse {
  trainingId?: number;
  lessonId?: number;
  resourceId?: number;
  originalFileName?: string;
  storedFileName?: string;
  relativePath?: string;
  publicUrl?: string;
  mimeType?: string;
  fileSize?: number;
  resourceType?: ResourceType;
  message?: string;
}

export interface ScormUploadResponse {
  scormPackageId: number;
  lessonId: number;
  resourceId?: number;
  title?: string;
  originalFileName?: string;
  storedFileName?: string;
  zipRelativePath?: string;
  extractRelativePath?: string;
  manifestRelativePath?: string;
  launchRelativePath?: string;
  launchPublicUrl?: string;
  scormVersion?: string;
  fileSize?: number;
  uploadedBy?: number;
  uploadedAt?: string;
  message?: string;
}

export interface LearnerMyTrainingResponse {
  id: number;
  title: string;
  shortDescription?: string;
  category?: string;
  language?: string;
  coverImageUrl?: string;
  level?: TrainingLevel | string;
  estimatedDurationHours?: number;
  averageRating?: number;
  reviewCount?: number;
  progressPercentage?: number;
  enrollmentStatus?: EnrollmentStatus | string;
  enrolledAt?: string;
  completedAt?: string | null;
  dueAt?: string | null;
}

export interface LearnerTrainingResourceContent {
  id: number;
  title: string;
  description?: string;
  type?: ResourceType | string;
  storageMode?: StorageMode | string;
  url?: string;
  textContent?: string;
  publicUrl?: string;
  mimeType?: string;
  fileSize?: number;
  durationSeconds?: number;
  active?: boolean;
  orderIndex?: number;
}

export interface LearnerTrainingLessonContent {
  id: number;
  title: string;
  description?: string;
  objective?: string;
  content?: string;
  orderIndex?: number;
  estimatedDurationMinutes?: number;
  required?: boolean;
  completionRule?: string;
  resources: LearnerTrainingResourceContent[];
}

export interface LearnerTrainingModuleContent {
  id: number;
  title: string;
  description?: string;
  orderIndex?: number;
  required?: boolean;
  estimatedDurationMinutes?: number;
  lessons: LearnerTrainingLessonContent[];
}

export interface LearnerTrainingContentResponse {
  id: number;
  title: string;
  shortDescription?: string;
  description?: string;
  objectives?: string;
  prerequisites?: string;
  targetAudience?: string;
  category?: string;
  language?: string;
  coverImageUrl?: string;
  level?: TrainingLevel | string;
  estimatedDurationHours?: number;
  status?: TrainingStatus | string;
  enrollmentMode?: EnrollmentMode | string;
  averageRating?: number;
  reviewCount?: number;
  progressPercentage?: number;
  enrollmentStatus?: EnrollmentStatus | string;
  enrolledAt?: string;
  completedAt?: string | null;
  dueAt?: string | null;
  canSelfUnenroll?: boolean;
  modules: LearnerTrainingModuleContent[];
}
