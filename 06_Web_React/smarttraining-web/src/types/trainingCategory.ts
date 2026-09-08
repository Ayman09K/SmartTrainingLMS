export interface TrainingCategoryResponse {
  id: number;
  name: string;
  active: boolean;
  sortOrder: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TrainingCategoryRequest {
  name: string;
  active?: boolean;
  sortOrder?: number;
}