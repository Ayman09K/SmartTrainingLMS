import { apiClient } from "../../api/apiClient";
import type {
  MobileEnrollmentMode,
  MobileTrainingCategory,
  MobileTrainingLevel,
  MobileTrainingVisibility,
  TrainerPickedFile,
} from "../../types/trainerAuthoringMobile";

export type ScormQuickCreateMode =
  | "SAFE"
  | "STRUCTURED";

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
  level: MobileTrainingLevel;
  estimatedDurationHours?: number;
  visibility?: MobileTrainingVisibility;
  enrollmentMode?: MobileEnrollmentMode;
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

function buildScormQuickCreateFormData(
  file: TrainerPickedFile,
): FormData {
  const formData = new FormData();

  if (file.webFile) {
    formData.append("file", file.webFile, file.name);
  } else {
    formData.append(
      "file",
      {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/zip",
      } as unknown as Blob,
    );
  }

  return formData;
}

export async function getScormQuickCreateCategories(): Promise<
  MobileTrainingCategory[]
> {
  const response =
    await apiClient.get<MobileTrainingCategory[]>(
      "/training-categories",
    );

  return response.data;
}

export async function analyzeScormQuickCreateMobile(
  file: TrainerPickedFile,
  onProgress?: (percentage: number) => void,
): Promise<ScormQuickCreateAnalysisResponse> {
  const response =
    await apiClient.post<ScormQuickCreateAnalysisResponse>(
      "/scorm/quick-create/analyze",
      buildScormQuickCreateFormData(file),
      {
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
                1,
                Math.min(
                  99,
                  Math.round(
                    (progressEvent.loaded * 100) /
                      progressEvent.total,
                  ),
                ),
              ),
            );
          } else if (progressEvent.loaded > 0) {
            onProgress(10);
          }
        },
      },
    );

  onProgress?.(100);
  return response.data;
}

export async function previewScormQuickCreateMobile(
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

export async function confirmScormQuickCreateMobile(
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
