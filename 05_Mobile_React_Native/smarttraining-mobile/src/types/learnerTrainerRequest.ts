export type LearnerTrainerRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface LearnerTrainerRequestCreateRequest {
  expertiseDomain: string;
  experienceSummary?: string;
  motivation: string;
}

export interface LearnerTrainerRequest {
  id: number;
  expertiseDomain: string;
  experienceSummary?: string | null;
  motivation: string;
  status: LearnerTrainerRequestStatus;
  adminComment?: string | null;
  requestedAt: string;
  reviewedAt?: string | null;
}