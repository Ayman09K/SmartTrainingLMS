import { apiClient } from "../../api/apiClient";
import type { AccountDeletionRequest } from "../../types/accountDeletion";

export async function getMyAccountDeletionRequest(): Promise<
  AccountDeletionRequest | null
> {
  const response =
    await apiClient.get<AccountDeletionRequest | undefined>(
      "/auth/me/account-deletion-request",
    );

  return response.status === 204 || !response.data ? null : response.data;
}

export async function requestMyAccountDeletion(): Promise<
  AccountDeletionRequest
> {
  const response =
    await apiClient.post<AccountDeletionRequest>(
      "/auth/me/account-deletion-request",
      {},
    );

  return response.data;
}

export async function cancelMyAccountDeletionRequest(): Promise<
  AccountDeletionRequest
> {
  const response =
    await apiClient.put<AccountDeletionRequest>(
      "/auth/me/account-deletion-request/cancel",
      {},
    );

  return response.data;
}
