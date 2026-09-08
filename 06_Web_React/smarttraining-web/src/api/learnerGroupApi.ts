import {
  deleteData,
  getData,
  postData,
  putData,
} from "./apiClient";
import type {
  LearnerGroup,
  LearnerGroupMember,
  LearnerGroupMemberAddRequest,
  LearnerGroupRequest,
} from "../types/learnerGroup";

const basePath = "/trainings/learner-groups";

export async function getLearnerGroups(): Promise<LearnerGroup[]> {
  return getData<LearnerGroup[]>(basePath);
}

export async function getLearnerGroup(
  groupId: number,
): Promise<LearnerGroup> {
  return getData<LearnerGroup>(`${basePath}/${groupId}`);
}

export async function createLearnerGroup(
  request: LearnerGroupRequest,
): Promise<LearnerGroup> {
  return postData<LearnerGroup, LearnerGroupRequest>(
    basePath,
    request,
  );
}

export async function updateLearnerGroup(
  groupId: number,
  request: LearnerGroupRequest,
): Promise<LearnerGroup> {
  return putData<LearnerGroup, LearnerGroupRequest>(
    `${basePath}/${groupId}`,
    request,
  );
}

export async function deleteLearnerGroup(
  groupId: number,
): Promise<void> {
  return deleteData<void>(`${basePath}/${groupId}`);
}

export async function getLearnerGroupMembers(
  groupId: number,
): Promise<LearnerGroupMember[]> {
  return getData<LearnerGroupMember[]>(
    `${basePath}/${groupId}/members`,
  );
}

export async function addLearnerGroupMembers(
  groupId: number,
  request: LearnerGroupMemberAddRequest,
): Promise<LearnerGroupMember[]> {
  return postData<
    LearnerGroupMember[],
    LearnerGroupMemberAddRequest
  >(
    `${basePath}/${groupId}/members`,
    request,
  );
}

export async function removeLearnerGroupMember(
  groupId: number,
  learnerId: number,
): Promise<void> {
  return deleteData<void>(
    `${basePath}/${groupId}/members/${learnerId}`,
  );
}
export interface LearnerGroupTrainingAssignmentRequest {
  trainingId: number;
  dueAt?: string | null;
}

export interface LearnerGroupTrainingAssignmentRecord {
  id: number;
  groupId: number;
  trainingId: number;
  trainingTitle: string;
  assignedBy: number;
  dueAt?: string | null;
  assignedAt?: string | null;
  totalMembers: number;
  enrolledMembers: number;
  missingMembers: number;
}

export interface LearnerGroupTrainingAssignmentResponse {
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

export async function getLearnerGroupTrainingAssignments(
  groupId: number,
): Promise<LearnerGroupTrainingAssignmentRecord[]> {
  return getData<LearnerGroupTrainingAssignmentRecord[]>(
    `${basePath}/${groupId}/training-assignments`,
  );
}

export async function assignTrainingToLearnerGroup(
  groupId: number,
  request: LearnerGroupTrainingAssignmentRequest,
): Promise<LearnerGroupTrainingAssignmentResponse> {
  return postData<
    LearnerGroupTrainingAssignmentResponse,
    LearnerGroupTrainingAssignmentRequest
  >(
    `${basePath}/${groupId}/training-assignments`,
    request,
  );
}
