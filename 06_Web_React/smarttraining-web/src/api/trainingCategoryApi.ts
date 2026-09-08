import { getData, postData, putData } from "./apiClient";
import type {
  TrainingCategoryRequest,
  TrainingCategoryResponse,
} from "../types/trainingCategory";

export async function getActiveTrainingCategories(): Promise<
  TrainingCategoryResponse[]
> {
  return getData<TrainingCategoryResponse[]>("/training-categories");
}

export async function getAdminTrainingCategories(): Promise<
  TrainingCategoryResponse[]
> {
  return getData<TrainingCategoryResponse[]>("/training-categories/admin");
}

export async function createTrainingCategory(
  request: TrainingCategoryRequest,
): Promise<TrainingCategoryResponse> {
  return postData<TrainingCategoryResponse, TrainingCategoryRequest>(
    "/training-categories",
    request,
  );
}

export async function updateTrainingCategory(
  categoryId: number,
  request: TrainingCategoryRequest,
): Promise<TrainingCategoryResponse> {
  return putData<TrainingCategoryResponse, TrainingCategoryRequest>(
    `/training-categories/${categoryId}`,
    request,
  );
}