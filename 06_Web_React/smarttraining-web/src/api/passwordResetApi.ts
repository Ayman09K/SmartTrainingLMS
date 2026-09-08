import { postData } from "./apiClient";

export type PasswordResetMessageResponse = {
  message: string;
};

export async function requestPasswordReset(
  email: string,
): Promise<PasswordResetMessageResponse> {
  return postData<
    PasswordResetMessageResponse,
    { email: string }
  >("/auth/password/forgot", {
    email: email.trim().toLowerCase(),
  });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<PasswordResetMessageResponse> {
  return postData<
    PasswordResetMessageResponse,
    { token: string; newPassword: string }
  >("/auth/password/reset", {
    token: token.trim(),
    newPassword,
  });
}