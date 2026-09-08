export type LearnerInvitationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED"
  | "EXPIRED"
  | string;

export interface LearnerTrainingInvitation {
  id: number;
  trainingId: number;
  trainingTitle: string;
  learnerId?: number | null;
  learnerEmail?: string | null;
  invitedBy?: number | null;
  token: string;
  message?: string | null;
  status: LearnerInvitationStatus;
  createdAt?: string | null;
  expiresAt?: string | null;
  respondedAt?: string | null;
  enrollmentId?: number | null;
}