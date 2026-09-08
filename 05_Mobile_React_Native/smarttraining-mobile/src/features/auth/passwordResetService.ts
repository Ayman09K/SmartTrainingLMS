import { apiClient } from "../../api/apiClient";

export type PasswordResetMessageResponse = {
  message: string;
};

export async function requestPasswordReset(
  email: string,
): Promise<PasswordResetMessageResponse> {
  const response =
    await apiClient.post<PasswordResetMessageResponse>(
      "/auth/password/forgot",
      {
        email: email.trim().toLowerCase(),
      },
    );

  return response.data;
}