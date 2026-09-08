import { apiClient } from "./apiClient";
import type { FileUploadResponse } from "../types/training";

export interface PexelsCoverPhoto {
  id: number;
  width: number;
  height: number;
  alt?: string | null;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
  previewUrl: string;
  landscapeUrl: string;
}

export interface PexelsCoverSearchResponse {
  page: number;
  perPage: number;
  totalResults: number;
  photos: PexelsCoverPhoto[];
}

export async function searchPexelsCovers(
  query: string,
  page = 1,
  perPage = 12,
): Promise<PexelsCoverSearchResponse> {
  const response = await apiClient.get<PexelsCoverSearchResponse>(
    "/trainings/cover-library/pexels/search",
    {
      params: {
        query,
        page,
        perPage,
      },
    },
  );

  return response.data;
}

export async function importPexelsTrainingCover(
  trainingId: number,
  photoId: number,
): Promise<FileUploadResponse> {
  const response = await apiClient.post<FileUploadResponse>(
    `/trainings/cover-library/pexels/${photoId}/import`,
    null,
    {
      params: {
        trainingId,
      },
    },
  );

  return response.data;
}