import { apiClient } from "../../api/apiClient";
import {
  TrainerGroupTrainingAssignmentRequest,
  TrainerGroupTrainingAssignmentResponse,
  TrainerLearnerGroup,
  TrainerLearnerGroupMember,
} from "../../types/trainerGroupMobile";
import type {
  TrainerLearnerIdentity,
} from "../../types/trainerLearnerMobile";

const basePath = "/trainings/learner-groups";

export async function getTrainerGroups(): Promise<
  TrainerLearnerGroup[]
> {
  const response =
    await apiClient.get<TrainerLearnerGroup[]>(basePath);

  return response.data;
}

export async function getTrainerGroup(
  groupId: number,
): Promise<TrainerLearnerGroup> {
  const response =
    await apiClient.get<TrainerLearnerGroup>(
      `${basePath}/${groupId}`,
    );

  return response.data;
}

export async function getTrainerGroupMembers(
  groupId: number,
): Promise<TrainerLearnerGroupMember[]> {
  const response =
    await apiClient.get<TrainerLearnerGroupMember[]>(
      `${basePath}/${groupId}/members`,
    );

  return response.data;
}

export async function searchTrainerGroupDirectory(
  query: string,
  limit = 60,
): Promise<TrainerLearnerIdentity[]> {
  const safeLimit = Math.max(
    1,
    Math.min(100, Math.trunc(limit)),
  );

  const response =
    await apiClient.get<TrainerLearnerIdentity[]>(
      "/auth/directory/learners",
      {
        params: {
          query: query.trim(),
          limit: safeLimit,
        },
      },
    );

  return response.data;
}

export async function addTrainerGroupMembers(
  groupId: number,
  learnerIds: number[],
): Promise<TrainerLearnerGroupMember[]> {
  const uniqueLearnerIds = Array.from(
    new Set(
      learnerIds.filter(
        (learnerId) =>
          Number.isFinite(learnerId) &&
          learnerId > 0,
      ),
    ),
  );

  if (uniqueLearnerIds.length === 0) {
    return getTrainerGroupMembers(groupId);
  }

  const response =
    await apiClient.post<TrainerLearnerGroupMember[]>(
      `${basePath}/${groupId}/members`,
      {
        learnerIds: uniqueLearnerIds,
      },
    );

  return response.data;
}

export async function removeTrainerGroupMember(
  groupId: number,
  learnerId: number,
): Promise<void> {
  await apiClient.delete(
    `${basePath}/${groupId}/members/${learnerId}`,
  );
}

export async function assignTrainingToTrainerGroup(
  groupId: number,
  request: TrainerGroupTrainingAssignmentRequest,
): Promise<TrainerGroupTrainingAssignmentResponse> {
  const response =
    await apiClient.post<
      TrainerGroupTrainingAssignmentResponse
    >(
      `${basePath}/${groupId}/training-assignments`,
      request,
    );

  return response.data;
}