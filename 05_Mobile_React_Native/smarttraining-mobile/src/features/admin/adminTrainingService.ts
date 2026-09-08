import { apiClient } from "../../api/apiClient";
import type {
  AdminTrainingStatus,
  AdminTrainingSummary,
} from "../../types/admin";
import type {
  MobileTrainingCategory,
  TrainerFileUploadResponse,
  TrainerFullTrainingResponse,
  TrainerPickedFile,
  TrainerTrainingAuthoringForm,
  TrainerTrainingAuthoringResponse,
} from "../../types/trainerAuthoringMobile";

export type AdminTrainingLifecycleTarget =
  | "DRAFT"
  | "PUBLISHED"
  | "ARCHIVED";

function adminTrainingPayload(
  trainerId: number,
  form: TrainerTrainingAuthoringForm,
) {
  return {
    ...form,
    trainerId,
    ownerId: trainerId,
  };
}

export async function getAdminTrainings(): Promise<
  AdminTrainingSummary[]
> {
  const response =
    await apiClient.get<AdminTrainingSummary[]>(
      "/trainings/admin",
    );

  return response.data;
}

export async function getAdminFullTraining(
  trainingId: number,
): Promise<TrainerFullTrainingResponse> {
  const response =
    await apiClient.get<TrainerFullTrainingResponse>(
      `/trainings/${trainingId}/full`,
    );

  return response.data;
}

export async function getAdminActiveTrainingCategories(): Promise<
  MobileTrainingCategory[]
> {
  const response =
    await apiClient.get<MobileTrainingCategory[]>(
      "/training-categories",
    );

  return response.data;
}

export interface AdminTrainingCategoryRequest {
  name: string;
  active?: boolean;
  sortOrder?: number;
}

export async function getAdminTrainingCategories(): Promise<
  MobileTrainingCategory[]
> {
  const response =
    await apiClient.get<MobileTrainingCategory[]>(
      "/training-categories/admin",
    );

  return response.data;
}

export async function createAdminTrainingCategory(
  request: AdminTrainingCategoryRequest,
): Promise<MobileTrainingCategory> {
  const response =
    await apiClient.post<MobileTrainingCategory>(
      "/training-categories",
      request,
    );

  return response.data;
}

export async function updateAdminTrainingCategory(
  categoryId: number,
  request: AdminTrainingCategoryRequest,
): Promise<MobileTrainingCategory> {
  const response =
    await apiClient.put<MobileTrainingCategory>(
      `/training-categories/${categoryId}`,
      request,
    );

  return response.data;
}

export async function createAdminTrainingDraft(
  trainerId: number,
  form: TrainerTrainingAuthoringForm,
): Promise<TrainerTrainingAuthoringResponse> {
  const response =
    await apiClient.post<TrainerTrainingAuthoringResponse>(
      "/trainings",
      adminTrainingPayload(trainerId, {
        ...form,
        status: "DRAFT",
      }),
    );

  return response.data;
}

export async function updateAdminTraining(
  trainingId: number,
  trainerId: number,
  form: TrainerTrainingAuthoringForm,
): Promise<TrainerTrainingAuthoringResponse> {
  const response =
    await apiClient.put<TrainerTrainingAuthoringResponse>(
      `/trainings/${trainingId}`,
      adminTrainingPayload(trainerId, form),
    );

  return response.data;
}

function buildAdminTrainingCoverFormData(
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
        type: file.mimeType || "application/octet-stream",
      } as unknown as Blob,
    );
  }

  return formData;
}

export async function uploadAdminTrainingCover(
  trainingId: number,
  file: TrainerPickedFile,
): Promise<TrainerFileUploadResponse> {
  const response = await apiClient.post<TrainerFileUploadResponse>(
    `/uploads/trainings/${trainingId}/cover`,
    buildAdminTrainingCoverFormData(file),
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function updateAdminTrainingLifecycle(
  trainingId: number,
  target: AdminTrainingLifecycleTarget,
): Promise<AdminTrainingSummary> {
  const endpoint =
    target === "PUBLISHED"
      ? `/trainings/${trainingId}/publish`
      : target === "ARCHIVED"
        ? `/trainings/${trainingId}/archive`
        : `/trainings/${trainingId}/draft`;

  const response =
    await apiClient.put<AdminTrainingSummary>(endpoint);

  return response.data;
}

export const ADMIN_TRAINING_FILTER_STATUSES:
  readonly AdminTrainingStatus[] = [
    "DRAFT",
    "PUBLISHED",
    "ARCHIVED",
    "INACTIVE",
  ];

export const ADMIN_TRAINING_LIFECYCLE_TARGETS:
  readonly AdminTrainingLifecycleTarget[] = [
    "DRAFT",
    "PUBLISHED",
    "ARCHIVED",
  ];