export type LearnerGroupOwnerRole = "ADMIN" | "FORMATEUR";

export interface LearnerGroup {
  id: number;
  name: string;
  description?: string | null;
  ownerId: number;
  ownerRole: LearnerGroupOwnerRole | string;
  memberCount: number;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface LearnerGroupRequest {
  name: string;
  description?: string | null;
}

export interface LearnerGroupMember {
  id: number;
  learnerId: number;
  fullName?: string | null;
  email?: string | null;
  addedBy: number;
  addedAt?: string;
}

export interface LearnerGroupMemberAddRequest {
  learnerIds: number[];
}
