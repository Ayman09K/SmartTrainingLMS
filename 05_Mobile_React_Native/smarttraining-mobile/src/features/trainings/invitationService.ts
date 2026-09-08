import { apiClient } from "../../api/apiClient";
import { LearnerTrainingInvitation } from "../../types/learnerInvitation";

function uniqueInvitations(
  invitations: LearnerTrainingInvitation[],
): LearnerTrainingInvitation[] {
  const byId = new Map<number, LearnerTrainingInvitation>();

  for (const invitation of invitations) {
    byId.set(invitation.id, invitation);
  }

  return Array.from(byId.values()).sort((a, b) => {
    const left = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const right = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return right - left;
  });
}

export async function getMyTrainingInvitations(
  learnerId: number,
  learnerEmail: string,
): Promise<LearnerTrainingInvitation[]> {
  const [byLearner, byEmail] = await Promise.all([
    apiClient.get<LearnerTrainingInvitation[]>(
      `/training-invitations/learner/${learnerId}`,
    ),
    apiClient.get<LearnerTrainingInvitation[]>(
      "/training-invitations/learner-email",
      {
        params: { email: learnerEmail },
      },
    ),
  ]);

  return uniqueInvitations([
    ...byLearner.data,
    ...byEmail.data,
  ]);
}

export async function acceptTrainingInvitation(
  token: string,
): Promise<LearnerTrainingInvitation> {
  const response = await apiClient.post<LearnerTrainingInvitation>(
    "/training-invitations/accept",
    { token },
  );

  return response.data;
}

export async function declineTrainingInvitation(
  invitationId: number,
): Promise<LearnerTrainingInvitation> {
  const response = await apiClient.put<LearnerTrainingInvitation>(
    `/training-invitations/${invitationId}/decline`,
  );

  return response.data;
}