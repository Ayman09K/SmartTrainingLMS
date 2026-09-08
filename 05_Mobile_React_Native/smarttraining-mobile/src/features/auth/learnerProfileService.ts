import { apiClient } from "../../api/apiClient";
import {
  saveConnectedUser,
  saveToken,
} from "../../storage/tokenStorage";
import {
  LearnerChangePasswordRequest,
  LearnerProfile,
  LearnerProfileUpdateRequest,
  LearnerProfileUpdateResponse,
} from "../../types/learnerProfile";

export async function getMyProfile(): Promise<LearnerProfile> {
  const response = await apiClient.get<LearnerProfile>("/auth/me");

  return response.data;
}

export async function updateMyProfile(
  request: LearnerProfileUpdateRequest,
): Promise<LearnerProfileUpdateResponse> {
  const response =
    await apiClient.put<LearnerProfileUpdateResponse>(
      "/auth/me/profile",
      request,
    );

  const updated = response.data;

  await Promise.all([
    saveToken(updated.token),
    saveConnectedUser({
      userId: updated.userId,
      email: updated.email,
      role: updated.role,
      firstName: updated.firstName,
      lastName: updated.lastName,
    }),
  ]);

  return updated;
}

export async function changeMyPassword(
  request: LearnerChangePasswordRequest,
): Promise<void> {
  await apiClient.put("/auth/me/password", request);
}