import {
  deleteData,
  getData,
  patchData,
  postData,
  putData,
  uploadFormData,
} from "./apiClient";
import type {
  LearningPathAssignmentResult,
  LearningPathCatalogResponse,
  LearningPathGroupAssignmentRequest,
  LearningPathLearnerAssignmentRequest,
  LearningPathProgressResponse,
  LearningPathRequest,
  LearningPathResponse,
  LearningPathStepAddRequest,
  LearningPathStepReorderRequest,
  LearningPathStepRequiredRequest,
  LearningPathStepResponse,
} from "../types/learningPath";

const basePath = "/trainings/learning-paths";

export async function getLearningPaths(): Promise<LearningPathResponse[]> {
  return getData<LearningPathResponse[]>(basePath);
}

export async function getLearningPath(
  pathId: number,
): Promise<LearningPathResponse> {
  return getData<LearningPathResponse>(`${basePath}/${pathId}`);
}

export async function getLearningPathVersions(
  pathId: number,
): Promise<LearningPathResponse[]> {
  return getData<LearningPathResponse[]>(
    `${basePath}/${pathId}/versions`,
  );
}

export async function createLearningPathVersion(
  pathId: number,
): Promise<LearningPathResponse> {
  return postData<LearningPathResponse>(
    `${basePath}/${pathId}/versions`,
  );
}

export async function createLearningPath(
  request: LearningPathRequest,
): Promise<LearningPathResponse> {
  return postData<LearningPathResponse, LearningPathRequest>(
    basePath,
    request,
  );
}

export async function updateLearningPath(
  pathId: number,
  request: LearningPathRequest,
): Promise<LearningPathResponse> {
  return putData<LearningPathResponse, LearningPathRequest>(
    `${basePath}/${pathId}`,
    request,
  );
}

export async function deleteLearningPath(pathId: number): Promise<void> {
  return deleteData<void>(`${basePath}/${pathId}`);
}

export async function publishLearningPath(
  pathId: number,
): Promise<LearningPathResponse> {
  return putData<LearningPathResponse>(`${basePath}/${pathId}/publish`);
}

export async function archiveLearningPath(
  pathId: number,
): Promise<LearningPathResponse> {
  return putData<LearningPathResponse>(`${basePath}/${pathId}/archive`);
}

export async function unarchiveLearningPath(
  pathId: number,
): Promise<LearningPathResponse> {
  return putData<LearningPathResponse>(
    `${basePath}/${pathId}/unarchive`,
  );
}

export async function getLearningPathSteps(
  pathId: number,
): Promise<LearningPathStepResponse[]> {
  return getData<LearningPathStepResponse[]>(
    `${basePath}/${pathId}/steps`,
  );
}

export async function addLearningPathStep(
  pathId: number,
  request: LearningPathStepAddRequest,
): Promise<LearningPathStepResponse> {
  return postData<
    LearningPathStepResponse,
    LearningPathStepAddRequest
  >(`${basePath}/${pathId}/steps`, request);
}

export async function updateLearningPathStepRequired(
  pathId: number,
  stepId: number,
  request: LearningPathStepRequiredRequest,
): Promise<LearningPathStepResponse> {
  return patchData<
    LearningPathStepResponse,
    LearningPathStepRequiredRequest
  >(`${basePath}/${pathId}/steps/${stepId}`, request);
}

export async function reorderLearningPathSteps(
  pathId: number,
  request: LearningPathStepReorderRequest,
): Promise<LearningPathStepResponse[]> {
  return putData<
    LearningPathStepResponse[],
    LearningPathStepReorderRequest
  >(`${basePath}/${pathId}/steps/reorder`, request);
}

export async function removeLearningPathStep(
  pathId: number,
  stepId: number,
): Promise<void> {
  return deleteData<void>(`${basePath}/${pathId}/steps/${stepId}`);
}

export async function assignLearningPathToLearners(
  pathId: number,
  request: LearningPathLearnerAssignmentRequest,
): Promise<LearningPathAssignmentResult> {
  return postData<
    LearningPathAssignmentResult,
    LearningPathLearnerAssignmentRequest
  >(`${basePath}/${pathId}/assignments/learners`, request);
}

export async function assignLearningPathToGroup(
  pathId: number,
  groupId: number,
  request: LearningPathGroupAssignmentRequest,
): Promise<LearningPathAssignmentResult> {
  return postData<
    LearningPathAssignmentResult,
    LearningPathGroupAssignmentRequest
  >(`${basePath}/${pathId}/assignments/groups/${groupId}`, request);
}
export async function getLearningPathCatalog(): Promise<
  LearningPathCatalogResponse[]
> {
  return getData<LearningPathCatalogResponse[]>(
    `${basePath}/catalog`,
  );
}

export async function getLearningPathCatalogDetail(
  pathId: number,
): Promise<LearningPathCatalogResponse> {
  return getData<LearningPathCatalogResponse>(
    `${basePath}/catalog/${pathId}`,
  );
}

export async function getMyAssignedLearningPaths(): Promise<
  LearningPathProgressResponse[]
> {
  return getData<LearningPathProgressResponse[]>(
    `${basePath}/learner/me`,
  );
}

export async function getMyLearningPathProgress(
  pathId: number,
): Promise<LearningPathProgressResponse> {
  return getData<LearningPathProgressResponse>(
    `${basePath}/${pathId}/progress/me`,
  );
}
export async function getLearningPathLearnerProgress(
  pathId: number,
): Promise<LearningPathProgressResponse[]> {
  return getData<LearningPathProgressResponse[]>(
    `${basePath}/${pathId}/progress/learners`,
  );
}

export async function getLearningPathLearnerProgressDetail(
  pathId: number,
  learnerId: number,
): Promise<LearningPathProgressResponse> {
  return getData<LearningPathProgressResponse>(
    `${basePath}/${pathId}/progress/learners/${learnerId}`,
  );
}
export async function getLearningPathLearnerAssignments(
  pathId: number,
): Promise<unknown[]> {
  return getData<unknown[]>(
    `${basePath}/${pathId}/assignments/learners`,
  );
}

export async function getLearningPathGroupAssignments(
  pathId: number,
): Promise<unknown[]> {
  return getData<unknown[]>(
    `${basePath}/${pathId}/assignments/groups`,
  );
}
export interface LearningPathCoverUploadResponse {
  publicUrl?: string | null;
  relativePath?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  message?: string | null;
}

export async function uploadLearningPathCover(
  pathId: number,
  file: File,
): Promise<LearningPathCoverUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return uploadFormData<LearningPathCoverUploadResponse>(
    `/uploads/learning-paths/${pathId}/cover`,
    formData,
  );
}
