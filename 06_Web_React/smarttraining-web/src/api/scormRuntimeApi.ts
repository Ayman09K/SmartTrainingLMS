import { apiClient } from "./apiClient";
import { API_BASE_URL } from "./apiConfig";

export interface ScormLaunchResponse {
  attemptId: number;
  attemptNumber: number;
  scormVersion: "SCORM_1_2" | "SCORM_2004";
  attemptStatus: string;
  resumed: boolean;
  runtimePath: string;
}

export interface ScormRuntimeStateResponse {
  attemptId: number;
  attemptNumber: number;
  scormVersion: "SCORM_1_2" | "SCORM_2004";
  status: string;
  lessonStatus?: string | null;
  completionStatus?: string | null;
  successStatus?: string | null;
  location?: string | null;
  scoreRaw?: number | null;
  scoreMin?: number | null;
  scoreMax?: number | null;
  scoreScaled?: number | null;
  progressMeasure?: number | null;
  sessionTimeMs?: number | null;
  totalTimeMs?: number | null;
  startedAt?: string | null;
  lastActivityAt?: string | null;
  completedAt?: string | null;
}

export interface ScormAuthorPreviewLaunchResponse {
  runtimePath: string;
  expiresAt: string;
}

export async function launchScormAuthorPreview(
  resourceId: number,
): Promise<ScormAuthorPreviewLaunchResponse> {
  const response =
    await apiClient.post<ScormAuthorPreviewLaunchResponse>(
      `/scorm/runtime/author-preview/launch/${resourceId}`,
    );

  return response.data;
}

export function buildScormRuntimeUrl(runtimePath: string): string {
  if (/^https?:\/\//i.test(runtimePath)) {
    return runtimePath;
  }

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
  const normalized = runtimePath.startsWith("/") ? runtimePath : `/${runtimePath}`;
  return `${apiOrigin}${normalized}`;
}

export async function launchScorm(
  resourceId: number,
): Promise<ScormLaunchResponse> {
  const response = await apiClient.post<ScormLaunchResponse>(
    `/scorm/runtime/launch/${resourceId}`,
  );

  return response.data;
}

export async function getMyScormAttemptState(
  attemptId: number,
): Promise<ScormRuntimeStateResponse> {
  const response = await apiClient.get<ScormRuntimeStateResponse>(
    `/scorm/runtime/attempts/${attemptId}/me`,
  );

  return response.data;
}