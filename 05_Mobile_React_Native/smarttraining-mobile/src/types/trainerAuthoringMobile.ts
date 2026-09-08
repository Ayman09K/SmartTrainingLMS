// PATCH16_A8C5N_COVER_CONTRACT_V1
export type MobileTrainingLevel =
  | "DEBUTANT"
  | "INTERMEDIAIRE"
  | "AVANCE";

export type MobileTrainingStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ARCHIVED";

export type MobileTrainingVisibility =
  | "PRIVATE"
  | "PUBLIC"
  | "ASSIGNED_ONLY";

export type MobileEnrollmentMode =
  | "ASSIGNMENT_ONLY"
  | "SELF_ENROLLMENT"
  | "ACCESS_CODE"
  | "INVITATION";

export type MobileResourceType =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "PDF"
  | "DOCUMENT"
  | "EXTERNAL_LINK"
  | "SCORM";

export type MobileStorageMode =
  | "TEXT_CONTENT"
  | "EXTERNAL_URL"
  | "LOCAL_FILE"
  | "SCORM_PACKAGE";

export interface MobileTrainingCategory {
  id: number;
  name: string;
  active: boolean;
  sortOrder: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TrainerTrainingAuthoringForm {
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
  level: MobileTrainingLevel;
  estimatedDurationHours?: number;
  status?: MobileTrainingStatus;
  visibility?: MobileTrainingVisibility;
  enrollmentMode?: MobileEnrollmentMode;
  accessCode?: string;
  maxLearners?: number;
}

export interface TrainerTrainingAuthoringPayload
  extends TrainerTrainingAuthoringForm {
  trainerId: number;
  ownerId?: number;
}

export interface TrainerTrainingAuthoringResponse {
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
  level?: MobileTrainingLevel | string;
  estimatedDurationHours?: number;
  status?: MobileTrainingStatus | string;
  visibility?: MobileTrainingVisibility | string;
  enrollmentMode?: MobileEnrollmentMode | string;
  accessCode?: string;
  maxLearners?: number;
  averageRating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  archivedAt?: string;
}

export interface TrainerModuleRequest {
  trainingId: number;
  title: string;
  description?: string;
  orderIndex: number;
}

export interface TrainerModuleResponse {
  id: number;
  trainingId?: number;
  title: string;
  description?: string;
  orderIndex?: number;
}

export type MobileLessonCompletionRule =
  | "MANUAL"
  | "OPENED"
  | "ALL_REQUIRED_BLOCKS"
  | "ASSESSMENT_PASSED"
  | "SCORM_COMPLETED";

export interface TrainerLessonRequest {
  moduleId: number;
  title: string;
  description?: string;
  objective?: string;
  content?: string;
  orderIndex: number;
  estimatedDurationMinutes?: number;
  required?: boolean;
  completionRule?: MobileLessonCompletionRule;
}

export interface TrainerLessonResponse {
  id: number;
  moduleId?: number;
  title: string;
  description?: string;
  objective?: string;
  content?: string;
  orderIndex?: number;
  estimatedDurationMinutes?: number;
  required?: boolean;
  completionRule?: MobileLessonCompletionRule | string;
}

export interface TrainerResourceRequest {
  lessonId: number;
  title: string;
  description?: string;
  type: MobileResourceType;
  storageMode: MobileStorageMode;
  url?: string;
  textContent?: string;
  orderIndex: number;
}

export interface TrainerResourceResponse {
  id: number;
  lessonId?: number;
  title: string;
  description?: string;
  type?: MobileResourceType | string;
  storageMode?: MobileStorageMode | string;
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

export interface TrainerPickedFile {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  webFile?: File | null;
}

export interface TrainerUploadOptions {
  title?: string;
  description?: string;
  uploadedBy?: number;
  orderIndex?: number;
  durationSeconds?: number;
}

export interface TrainerFileUploadResponse {
  trainingId?: number;
  lessonId?: number;
  resourceId?: number;
  originalFileName?: string;
  storedFileName?: string;
  relativePath?: string;
  publicUrl?: string;
  mimeType?: string;
  fileSize?: number;
  resourceType?: MobileResourceType | string;
  message?: string;
}

export interface TrainerScormUploadResponse {
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

export interface TrainerFullLessonResponse
  extends TrainerLessonResponse {
  resources?: TrainerResourceResponse[];
}

export interface TrainerFullModuleResponse
  extends TrainerModuleResponse {
  lessons?: TrainerFullLessonResponse[];
}

export interface TrainerFullTrainingResponse
  extends TrainerTrainingAuthoringResponse {
  modules?: TrainerFullModuleResponse[];
}