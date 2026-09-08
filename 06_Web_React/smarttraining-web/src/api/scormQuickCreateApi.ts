import { apiClient } from "./apiClient";
import type {
  EnrollmentMode,
  TrainingLevel,
  TrainingVisibility,
} from "../types/training";

export type ScormQuickCreateMode = "SAFE" | "STRUCTURED";

export interface ScormQuickCreatePreviewLesson {
  title: string;
}

export interface ScormQuickCreatePreviewModule {
  title: string;
  lessons: ScormQuickCreatePreviewLesson[];
}

export interface ScormQuickCreateAnalysisResponse {
  temporaryImportId: string;
  originalFileName: string;
  checksumSha256: string;
  scormVersion: string;
  detectedTitle: string;
  organizationTitle?: string | null;
  itemCount: number;
  scoCount: number;
  structuredAvailable: boolean;
  proposedMode: ScormQuickCreateMode;
  preview: ScormQuickCreatePreviewModule[];
  expiresAt: string;
}

export interface ScormQuickCreateConfirmRequest {
  title?: string;
  shortDescription?: string;
  description?: string;
  objectives?: string;
  prerequisites?: string;
  targetAudience?: string;
  categoryId: number;
  language?: string;
  level: TrainingLevel;
  estimatedDurationHours?: number;
  visibility?: TrainingVisibility;
  enrollmentMode?: EnrollmentMode;
  accessCode?: string;
  maxLearners?: number;
  mode: ScormQuickCreateMode;
}

export interface ScormQuickCreateConfirmResponse {
  trainingId: number;
  title: string;
  status: "DRAFT";
  modeApplied: ScormQuickCreateMode;
  moduleCount: number;
  lessonCount: number;
  resourceCount: number;
  checksumSha256: string;
  message: string;
}

export async function analyzeScormQuickCreate(
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<ScormQuickCreateAnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const response =
    await apiClient.post<ScormQuickCreateAnalysisResponse>(
      "/scorm/quick-create/analyze",
      formData,
      {
        timeout: 15 * 60 * 1000,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (!onProgress) {
            return;
          }

          if (
            typeof progressEvent.total === "number" &&
            progressEvent.total > 0
          ) {
            onProgress(
              Math.max(
                0,
                Math.min(
                  100,
                  Math.round(
                    (progressEvent.loaded * 100) /
                      progressEvent.total,
                  ),
                ),
              ),
            );
          }
        },
      },
    );

  onProgress?.(100);
  return response.data;
}

export async function previewScormQuickCreate(
  temporaryImportId: string,
): Promise<ScormQuickCreateAnalysisResponse> {
  const response =
    await apiClient.get<ScormQuickCreateAnalysisResponse>(
      `/scorm/quick-create/${encodeURIComponent(
        temporaryImportId,
      )}/preview`,
    );

  return response.data;
}

export async function confirmScormQuickCreate(
  temporaryImportId: string,
  request: ScormQuickCreateConfirmRequest,
): Promise<ScormQuickCreateConfirmResponse> {
  const response =
    await apiClient.post<ScormQuickCreateConfirmResponse>(
      `/scorm/quick-create/${encodeURIComponent(
        temporaryImportId,
      )}/confirm`,
      request,
    );

  return response.data;
}
