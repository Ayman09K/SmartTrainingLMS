export type LearnerTrainingLevel =
  | "DEBUTANT"
  | "INTERMEDIAIRE"
  | "AVANCE"
  | string;

export type LearnerEnrollmentStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED"
  | string;

export type LearnerResourceType =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "PDF"
  | "DOCUMENT"
  | "EXTERNAL_LINK"
  | "SCORM"
  | "PDF_URL"
  | "VIDEO_URL"
  | string;

export interface LearnerMyTraining {
  id: number;
  title: string;
  shortDescription?: string | null;
  category?: string | null;
  language?: string | null;
  coverImageUrl?: string | null;
  level?: LearnerTrainingLevel | null;
  estimatedDurationHours?: number | null;
  averageRating?: number | null;
  reviewCount?: number | null;
  progressPercentage?: number | null;
  enrollmentStatus?: LearnerEnrollmentStatus | null;
  enrolledAt?: string | null;
  completedAt?: string | null;
  dueAt?: string | null;
}

export interface LearnerTrainingResource {
  id: number;
  title: string;
  description?: string | null;
  type?: LearnerResourceType | null;
  storageMode?: string | null;
  url?: string | null;
  textContent?: string | null;
  publicUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
  active?: boolean | null;
  orderIndex?: number | null;
}

export interface LearnerTrainingLesson {
  id: number;
  title: string;
  description?: string | null;
  objective?: string | null;
  content?: string | null;
  orderIndex?: number | null;
  estimatedDurationMinutes?: number | null;
  required?: boolean | null;
  completionRule?: string | null;
  resources: LearnerTrainingResource[];
}

export interface LearnerTrainingModule {
  id: number;
  title: string;
  description?: string | null;
  orderIndex?: number | null;
  required?: boolean | null;
  estimatedDurationMinutes?: number | null;
  lessons: LearnerTrainingLesson[];
}

export interface LearnerTrainingContent {
  id: number;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  objectives?: string | null;
  prerequisites?: string | null;
  targetAudience?: string | null;
  category?: string | null;
  language?: string | null;
  coverImageUrl?: string | null;
  level?: LearnerTrainingLevel | null;
  estimatedDurationHours?: number | null;
  status?: string | null;
  enrollmentMode?: string | null;
  averageRating?: number | null;
  reviewCount?: number | null;
  progressPercentage?: number | null;
  enrollmentStatus?: LearnerEnrollmentStatus | null;
  enrolledAt?: string | null;
  completedAt?: string | null;
  dueAt?: string | null;
  canSelfUnenroll?: boolean | null;
  modules: LearnerTrainingModule[];
}