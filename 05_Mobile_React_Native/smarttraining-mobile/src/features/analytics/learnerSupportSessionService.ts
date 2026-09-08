import { apiClient } from "../../api/apiClient";
import { LearnerSupportSession } from "../../types/learnerSupportSession";

export async function getMySupportSessions(): Promise<
  LearnerSupportSession[]
> {
  const response = await apiClient.get<LearnerSupportSession[]>(
    "/support-sessions/me",
  );

  return response.data;
}

export async function getMySupportSessionById(
  sessionId: number,
): Promise<LearnerSupportSession> {
  const response = await apiClient.get<LearnerSupportSession>(
    `/support-sessions/${sessionId}`,
  );

  return response.data;
}