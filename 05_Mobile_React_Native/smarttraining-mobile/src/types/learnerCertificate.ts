export type LearnerCertificateStatus =
  | "ACTIVE"
  | "REVOKED"
  | string;

export interface LearnerCertificate {
  id: number;
  publicCode: string;
  trainingId: number;
  trainingVersionNumber?: number | null;
  learnerDisplayName: string;
  trainingTitle: string;
  issuedAt: string;
  status: LearnerCertificateStatus;
}