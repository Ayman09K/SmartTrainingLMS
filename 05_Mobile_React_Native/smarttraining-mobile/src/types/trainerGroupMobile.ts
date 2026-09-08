export type TrainerGroupOwnerRole =
  | "ADMIN"
  | "FORMATEUR"
  | string;

export interface TrainerLearnerGroup {
  id: number;
  name: string;
  description?: string | null;
  ownerId: number;
  ownerRole: TrainerGroupOwnerRole;
  memberCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TrainerLearnerGroupMember {
  id?: number | null;
  groupId?: number | null;
  learnerId: number;
  fullName?: string | null;
  email?: string | null;
  addedBy?: number | null;
  addedAt?: string | null;
}

export interface TrainerGroupTrainingAssignmentRequest {
  trainingId: number;
  dueAt?: string | null;
}

export interface TrainerGroupTrainingAssignmentResponse {
  totalMembers: number;
  assigned: number;
  alreadyEnrolled: number;
  failed: number;
  assignedEnrollments: Array<{
    id: number;
    learnerId: number;
    trainingId: number;
    dueAt?: string | null;
  }>;
}