import { apiClient } from "../../api/apiClient";
import {
  LearnerTrainerRequest,
  LearnerTrainerRequestCreateRequest,
} from "../../types/learnerTrainerRequest";

export async function getMyTrainerRequests(): Promise<
  LearnerTrainerRequest[]
> {
  const response = await apiClient.get<LearnerTrainerRequest[]>(
    "/auth/trainer-requests/me",
  );

  return response.data;
}

export async function createTrainerRequest(
  request: LearnerTrainerRequestCreateRequest,
): Promise<LearnerTrainerRequest> {
  const response = await apiClient.post<LearnerTrainerRequest>(
    "/auth/trainer-requests",
    request,
  );

  return response.data;
}