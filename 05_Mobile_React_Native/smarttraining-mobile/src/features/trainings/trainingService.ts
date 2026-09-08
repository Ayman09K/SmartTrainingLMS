import { apiClient } from "../../api/apiClient";
import { FullTraining, Training } from "../../types/training";

export async function getTrainings(): Promise<Training[]> {
  const response = await apiClient.get<Training[]>("/trainings");
  return response.data;
}

export async function getTrainingFullDetails(trainingId: number): Promise<FullTraining> {
  const response = await apiClient.get<FullTraining>(`/trainings/${trainingId}/full`);
  return response.data;
}