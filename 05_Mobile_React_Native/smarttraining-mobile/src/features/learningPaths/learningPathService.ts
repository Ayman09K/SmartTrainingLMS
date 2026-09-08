import { apiClient } from "../../api/apiClient";
import type {
  LearningPathManager,
  LearningPathManagerRequest,
  LearningPathStep,
  LearningPathStepAddRequest,
  LearningPathStepReorderRequest,
  LearningPathStepRequiredRequest,
  LearningPathAssignmentResult,
  LearningPathGroupAssignmentRecord,
  LearningPathGroupAssignmentRequest,
  LearningPathLearnerAssignmentRecord,
  LearningPathLearnerAssignmentRequest,
  LearningPathLearnerIdentity,
} from "../../types/learningPath";
import {
  LearningPathCatalog,
  LearningPathProgress,
} from "../../types/learningPath";

const basePath = "/trainings/learning-paths";

export async function getLearningPathCatalog(): Promise<
  LearningPathCatalog[]
> {
  const response = await apiClient.get<LearningPathCatalog[]>(
    `${basePath}/catalog`,
  );

  return response.data;
}

export async function getLearningPathCatalogDetail(
  pathId: number,
): Promise<LearningPathCatalog> {
  const response = await apiClient.get<LearningPathCatalog>(
    `${basePath}/catalog/${pathId}`,
  );

  return response.data;
}

export async function getMyLearningPathProgress(
  pathId: number,
): Promise<LearningPathProgress> {
  const response = await apiClient.get<LearningPathProgress>(
    `${basePath}/${pathId}/progress/me`,
  );

  return response.data;
}

export async function getMyAssignedLearningPaths(): Promise<
  LearningPathProgress[]
> {
  const response = await apiClient.get<LearningPathProgress[]>(
    `${basePath}/learner/me`,
  );

  return response.data;
}
export async function getManageableLearningPaths(): Promise<
  LearningPathManager[]
> {
  const response = await apiClient.get<LearningPathManager[]>(
    basePath,
  );

  return response.data;
}

export async function getManageableLearningPath(
  pathId: number,
): Promise<LearningPathManager> {
  const response = await apiClient.get<LearningPathManager>(
    `${basePath}/${pathId}`,
  );

  return response.data;
}

export async function getManageableLearningPathVersions(
  pathId: number,
): Promise<LearningPathManager[]> {
  const response = await apiClient.get<LearningPathManager[]>(
    `${basePath}/${pathId}/versions`,
  );

  return response.data;
}

export async function createManageableLearningPathVersion(
  pathId: number,
): Promise<LearningPathManager> {
  const response = await apiClient.post<LearningPathManager>(
    `${basePath}/${pathId}/versions`,
  );

  return response.data;
}

export async function createLearningPath(
  request: LearningPathManagerRequest,
): Promise<LearningPathManager> {
  const response = await apiClient.post<LearningPathManager>(
    basePath,
    request,
  );

  return response.data;
}

export async function updateLearningPath(
  pathId: number,
  request: LearningPathManagerRequest,
): Promise<LearningPathManager> {
  const response = await apiClient.put<LearningPathManager>(
    `${basePath}/${pathId}`,
    request,
  );

  return response.data;
}

export async function deleteLearningPath(
  pathId: number,
): Promise<void> {
  await apiClient.delete(`${basePath}/${pathId}`);
}

export async function getLearningPathSteps(
  pathId: number,
): Promise<LearningPathStep[]> {
  const response = await apiClient.get<LearningPathStep[]>(
    `${basePath}/${pathId}/steps`,
  );

  return response.data;
}

export async function addLearningPathStep(
  pathId: number,
  request: LearningPathStepAddRequest,
): Promise<LearningPathStep> {
  const response = await apiClient.post<LearningPathStep>(
    `${basePath}/${pathId}/steps`,
    request,
  );

  return response.data;
}

export async function updateLearningPathStepRequired(
  pathId: number,
  stepId: number,
  request: LearningPathStepRequiredRequest,
): Promise<LearningPathStep> {
  const response = await apiClient.patch<LearningPathStep>(
    `${basePath}/${pathId}/steps/${stepId}`,
    request,
  );

  return response.data;
}

export async function reorderLearningPathSteps(
  pathId: number,
  request: LearningPathStepReorderRequest,
): Promise<LearningPathStep[]> {
  const response = await apiClient.put<LearningPathStep[]>(
    `${basePath}/${pathId}/steps/reorder`,
    request,
  );

  return response.data;
}

export async function removeLearningPathStep(
  pathId: number,
  stepId: number,
): Promise<void> {
  await apiClient.delete(
    `${basePath}/${pathId}/steps/${stepId}`,
  );
}

export async function publishLearningPath(
  pathId: number,
): Promise<LearningPathManager> {
  const response = await apiClient.put<LearningPathManager>(
    `${basePath}/${pathId}/publish`,
  );

  return response.data;
}

export async function archiveLearningPath(
  pathId: number,
): Promise<LearningPathManager> {
  const response = await apiClient.put<LearningPathManager>(
    `${basePath}/${pathId}/archive`,
  );

  return response.data;
}
export async function searchLearningPathLearners(
  query: string,
  limit = 20,
): Promise<LearningPathLearnerIdentity[]> {
  const safeLimit = Math.max(
    1,
    Math.min(100, Math.trunc(limit)),
  );

  const response =
    await apiClient.get<LearningPathLearnerIdentity[]>(
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

export async function unarchiveLearningPath(
  pathId: number,
): Promise<LearningPathManager> {
  const response =
    await apiClient.put<LearningPathManager>(
      `${basePath}/${pathId}/unarchive`,
    );

  return response.data;
}

export async function resolveLearningPathLearners(
  learnerIds: number[],
): Promise<LearningPathLearnerIdentity[]> {
  const unique = Array.from(
    new Set(
      learnerIds.filter(
        (learnerId) =>
          Number.isFinite(learnerId) &&
          learnerId > 0,
      ),
    ),
  );

  if (unique.length === 0) {
    return [];
  }

  const chunks: number[][] = [];

  for (let index = 0; index < unique.length; index += 200) {
    chunks.push(unique.slice(index, index + 200));
  }

  const responses = await Promise.all(
    chunks.map((ids) =>
      apiClient.post<LearningPathLearnerIdentity[]>(
        "/auth/directory/learners/resolve",
        { learnerIds: ids },
      ),
    ),
  );

  return responses.flatMap((response) => response.data);
}

export async function assignLearningPathToLearners(
  pathId: number,
  request: LearningPathLearnerAssignmentRequest,
): Promise<LearningPathAssignmentResult> {
  const response =
    await apiClient.post<LearningPathAssignmentResult>(
      `${basePath}/${pathId}/assignments/learners`,
      request,
    );

  return response.data;
}

export async function assignLearningPathToGroup(
  pathId: number,
  groupId: number,
  request: LearningPathGroupAssignmentRequest,
): Promise<LearningPathAssignmentResult> {
  const response =
    await apiClient.post<LearningPathAssignmentResult>(
      `${basePath}/${pathId}/assignments/groups/${groupId}`,
      request,
    );

  return response.data;
}

export async function getLearningPathLearnerAssignments(
  pathId: number,
): Promise<LearningPathLearnerAssignmentRecord[]> {
  const response =
    await apiClient.get<LearningPathLearnerAssignmentRecord[]>(
      `${basePath}/${pathId}/assignments/learners`,
    );

  return response.data;
}

export async function getLearningPathGroupAssignments(
  pathId: number,
): Promise<LearningPathGroupAssignmentRecord[]> {
  const response =
    await apiClient.get<LearningPathGroupAssignmentRecord[]>(
      `${basePath}/${pathId}/assignments/groups`,
    );

  return response.data;
}

export async function getManagedLearningPathProgress(
  pathId: number,
): Promise<LearningPathProgress[]> {
  const response =
    await apiClient.get<LearningPathProgress[]>(
      `${basePath}/${pathId}/progress/learners`,
    );

  return response.data;
}

export async function getManagedLearningPathLearnerProgress(
  pathId: number,
  learnerId: number,
): Promise<LearningPathProgress> {
  const response =
    await apiClient.get<LearningPathProgress>(
      `${basePath}/${pathId}/progress/learners/${learnerId}`,
    );

  return response.data;
}
