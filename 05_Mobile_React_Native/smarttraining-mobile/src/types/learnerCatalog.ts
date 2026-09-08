export type LearnerEnrollmentMode =
  | "SELF_ENROLLMENT"
  | "ASSIGNMENT_ONLY"
  | "ACCESS_CODE"
  | "INVITATION";

export type LearnerEnrollmentStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";

export type LearnerAccessRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface LearnerCatalogTraining {
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
  level?: string | null;
  estimatedDurationHours?: number | null;
  enrollmentMode?: LearnerEnrollmentMode | string | null;
  maxLearners?: number | null;
  averageRating?: number | null;
  reviewCount?: number | null;
  publishedAt?: string | null;
}

export interface LearnerEnrollment {
  id: number;
  learnerId: number;
  trainingId: number;
  trainingTitle?: string | null;
  status: LearnerEnrollmentStatus | string;
  source?: string | null;
  assignedBy?: number | null;
  progressPercentage?: number | null;
  enrolledAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
}

export interface LearnerAccessRequest {
  id: number;
  learnerId: number;
  trainingId: number;
  trainingTitle?: string | null;
  learnerMessage?: string | null;
  status: LearnerAccessRequestStatus | string;
  requestedAt?: string | null;
  decidedAt?: string | null;
  decisionComment?: string | null;
  enrollmentId?: number | null;
}