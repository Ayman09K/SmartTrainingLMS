export type AccountDeletionRequestStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export type AccountDeletionRequest = {
  id: number;
  status: AccountDeletionRequestStatus;
  requestedAt: string;
  processingStartedAt?: string | null;
  updatedAt?: string | null;
  processedAt?: string | null;
  adminComment?: string | null;
  active: boolean;
};

export type AdminAccountDeletionRequest = {
  id: number;
  userId: number;
  requesterName: string;
  email: string;
  role: string;
  status: AccountDeletionRequestStatus;
  requestedAt: string;
  processingStartedAt?: string | null;
  updatedAt?: string | null;
  processedAt?: string | null;
  adminComment?: string | null;
  handledByEmail?: string | null;
};
