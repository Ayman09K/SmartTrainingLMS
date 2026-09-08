export type CertificateStatus = "ACTIVE" | "REVOKED" | string;

export interface TrainingCertificate {
  id: number;
  publicCode: string;
  trainingId: number;
  trainingVersionNumber?: number | null;
  learnerDisplayName: string;
  trainingTitle: string;
  issuedAt: string;
  status: CertificateStatus;
}

export interface CertificateVerification {
  valid: boolean;
  publicCode: string;
  learnerDisplayName?: string | null;
  trainingTitle?: string | null;
  issuedAt?: string | null;
  status: string;
}