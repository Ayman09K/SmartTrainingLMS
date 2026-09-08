import { apiClient } from "../../api/apiClient";
import type {
  MobileTrainingCategory,
  TrainerFullTrainingResponse,
  TrainerLessonRequest,
  TrainerLessonResponse,
  TrainerModuleRequest,
  TrainerModuleResponse,
  TrainerFileUploadResponse,
  TrainerPickedFile,
  TrainerResourceRequest,
  TrainerResourceResponse,
  TrainerScormUploadResponse,
  TrainerTrainingAuthoringForm,
  TrainerUploadOptions,
  TrainerTrainingAuthoringPayload,
  TrainerTrainingAuthoringResponse,
} from "../../types/trainerAuthoringMobile";

function trainingPayload(
  trainerId: number,
  form: TrainerTrainingAuthoringForm,
): TrainerTrainingAuthoringPayload {
  return {
    ...form,
    trainerId,
    ownerId: trainerId,
    status: form.status ?? "DRAFT",
  };
}

export async function getTrainerActiveCategories(): Promise<
  MobileTrainingCategory[]
> {
  const response = await apiClient.get<MobileTrainingCategory[]>(
    "/training-categories",
  );

  return response.data;
}

export async function createTrainerTrainingDraft(
  trainerId: number,
  form: TrainerTrainingAuthoringForm,
): Promise<TrainerTrainingAuthoringResponse> {
  const response =
    await apiClient.post<TrainerTrainingAuthoringResponse>(
      "/trainings",
      trainingPayload(trainerId, {
        ...form,
        status: "DRAFT",
      }),
    );

  return response.data;
}

export async function updateTrainerTraining(
  trainingId: number,
  trainerId: number,
  form: TrainerTrainingAuthoringForm,
): Promise<TrainerTrainingAuthoringResponse> {
  const response =
    await apiClient.put<TrainerTrainingAuthoringResponse>(
      `/trainings/${trainingId}`,
      trainingPayload(trainerId, form),
    );

  return response.data;
}

export async function getTrainerFullTraining(
  trainingId: number,
): Promise<TrainerFullTrainingResponse> {
  const response =
    await apiClient.get<TrainerFullTrainingResponse>(
      `/trainings/${trainingId}/full`,
    );

  return response.data;
}

export async function publishTrainerTraining(
  trainingId: number,
): Promise<TrainerTrainingAuthoringResponse> {
  const response =
    await apiClient.put<TrainerTrainingAuthoringResponse>(
      `/trainings/${trainingId}/publish`,
    );

  return response.data;
}

export async function moveTrainerTrainingToDraft(
  trainingId: number,
): Promise<TrainerTrainingAuthoringResponse> {
  const response =
    await apiClient.put<TrainerTrainingAuthoringResponse>(
      `/trainings/${trainingId}/draft`,
    );

  return response.data;
}

export async function archiveTrainerTraining(
  trainingId: number,
): Promise<TrainerTrainingAuthoringResponse> {
  const response =
    await apiClient.put<TrainerTrainingAuthoringResponse>(
      `/trainings/${trainingId}/archive`,
    );

  return response.data;
}

export async function deleteTrainerTraining(
  trainingId: number,
): Promise<void> {
  await apiClient.delete(`/trainings/${trainingId}`);
}

export async function createTrainerModule(
  request: TrainerModuleRequest,
): Promise<TrainerModuleResponse> {
  const response = await apiClient.post<TrainerModuleResponse>(
    "/modules",
    request,
  );

  return response.data;
}

export async function updateTrainerModule(
  moduleId: number,
  request: TrainerModuleRequest,
): Promise<TrainerModuleResponse> {
  const response = await apiClient.put<TrainerModuleResponse>(
    `/modules/${moduleId}`,
    request,
  );

  return response.data;
}

export async function deleteTrainerModule(
  moduleId: number,
): Promise<void> {
  await apiClient.delete(`/modules/${moduleId}`);
}

export async function createTrainerLesson(
  request: TrainerLessonRequest,
): Promise<TrainerLessonResponse> {
  const response = await apiClient.post<TrainerLessonResponse>(
    "/lessons",
    request,
  );

  return response.data;
}

export async function updateTrainerLesson(
  lessonId: number,
  request: TrainerLessonRequest,
): Promise<TrainerLessonResponse> {
  const response = await apiClient.put<TrainerLessonResponse>(
    `/lessons/${lessonId}`,
    request,
  );

  return response.data;
}

export async function deleteTrainerLesson(
  lessonId: number,
): Promise<void> {
  await apiClient.delete(`/lessons/${lessonId}`);
}

export async function createTrainerResource(
  request: TrainerResourceRequest,
): Promise<TrainerResourceResponse> {
  const response =
    await apiClient.post<TrainerResourceResponse>(
      "/resources",
      request,
    );

  return response.data;
}

export async function updateTrainerResource(
  resourceId: number,
  request: TrainerResourceRequest,
): Promise<TrainerResourceResponse> {
  const response =
    await apiClient.put<TrainerResourceResponse>(
      `/resources/${resourceId}`,
      request,
    );

  return response.data;
}

export async function deleteTrainerResource(
  resourceId: number,
): Promise<void> {
  await apiClient.delete(`/resources/${resourceId}`);
}
function buildTrainerUploadFormData(
  file: TrainerPickedFile,
  options?: TrainerUploadOptions,
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

  if (options?.title?.trim()) {
    formData.append("title", options.title.trim());
  }

  if (options?.description?.trim()) {
    formData.append(
      "description",
      options.description.trim(),
    );
  }

  if (options?.uploadedBy) {
    formData.append(
      "uploadedBy",
      String(options.uploadedBy),
    );
  }

  if (options?.orderIndex) {
    formData.append(
      "orderIndex",
      String(options.orderIndex),
    );
  }

  if (
    options?.durationSeconds !== undefined &&
    options.durationSeconds >= 0
  ) {
    formData.append(
      "durationSeconds",
      String(options.durationSeconds),
    );
  }

  return formData;
}

async function uploadTrainerFormData<T>(
  url: string,
  file: TrainerPickedFile,
  options?: TrainerUploadOptions,
): Promise<T> {
  const response = await apiClient.post<T>(
    url,
    buildTrainerUploadFormData(file, options),
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function uploadTrainerTrainingCover(
  trainingId: number,
  file: TrainerPickedFile,
): Promise<TrainerFileUploadResponse> {
  return uploadTrainerFormData<TrainerFileUploadResponse>(
    `/uploads/trainings/${trainingId}/cover`,
    file,
  );
}

export async function uploadTrainerLessonImage(
  lessonId: number,
  file: TrainerPickedFile,
  options?: TrainerUploadOptions,
): Promise<TrainerFileUploadResponse> {
  return uploadTrainerFormData<TrainerFileUploadResponse>(
    `/uploads/lessons/${lessonId}/image`,
    file,
    options,
  );
}

export async function uploadTrainerLessonPdf(
  lessonId: number,
  file: TrainerPickedFile,
  options?: TrainerUploadOptions,
): Promise<TrainerFileUploadResponse> {
  return uploadTrainerFormData<TrainerFileUploadResponse>(
    `/uploads/lessons/${lessonId}/pdf`,
    file,
    options,
  );
}

export async function uploadTrainerLessonVideo(
  lessonId: number,
  file: TrainerPickedFile,
  options?: TrainerUploadOptions,
): Promise<TrainerFileUploadResponse> {
  return uploadTrainerFormData<TrainerFileUploadResponse>(
    `/uploads/lessons/${lessonId}/video`,
    file,
    options,
  );
}

export async function uploadTrainerLessonDocument(
  lessonId: number,
  file: TrainerPickedFile,
  options?: TrainerUploadOptions,
): Promise<TrainerFileUploadResponse> {
  return uploadTrainerFormData<TrainerFileUploadResponse>(
    `/uploads/lessons/${lessonId}/document`,
    file,
    options,
  );
}

export async function uploadTrainerLessonScorm(
  lessonId: number,
  file: TrainerPickedFile,
  options?: TrainerUploadOptions,
): Promise<TrainerScormUploadResponse> {
  return uploadTrainerFormData<TrainerScormUploadResponse>(
    `/uploads/lessons/${lessonId}/scorm`,
    file,
    options,
  );
}
