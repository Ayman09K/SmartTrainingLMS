export type LearnerSupportSessionStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED";

export interface LearnerSupportSession {
  id: number;
  learnerId: number;
  trainerId: number;
  trainingId: number;
  title: string;
  objective: string;
  scheduledAt: string;
  meetingLink: string;
  note?: string | null;
  status: LearnerSupportSessionStatus;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
}