import { getData, postData } from "./apiClient";
import type { AuthUser } from "../types/auth";
import type { TrainerLearnerOverviewResponse } from "../types/trainerLearnerOverview";

export async function getTrainerLearnerOverview(
  learnerId: number,
): Promise<TrainerLearnerOverviewResponse> {
  return getData<TrainerLearnerOverviewResponse>(
    `/analytics/trainer/learners/${learnerId}/overview`,
  );
}

export async function getTrainerLearnerIdentity(
  learnerId: number,
): Promise<AuthUser> {
  return getData<AuthUser>(`/auth/directory/learners/${learnerId}`);
}

export async function searchTrainerLearners(
  query = "",
  limit = 50,
): Promise<AuthUser[]> {
  const params = new URLSearchParams({
    query,
    limit: String(limit),
  });

  return getData<AuthUser[]>(`/auth/directory/learners?${params.toString()}`);
}

export async function resolveTrainerLearners(
  learnerIds: number[],
): Promise<AuthUser[]> {
  if (!learnerIds.length) {
    return [];
  }

  return postData<AuthUser[], { learnerIds: number[] }>(
    "/auth/directory/learners/resolve",
    { learnerIds },
  );
}