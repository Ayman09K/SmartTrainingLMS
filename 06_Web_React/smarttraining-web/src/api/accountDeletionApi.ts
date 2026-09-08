import { apiClient } from "./apiClient";

export type AccountDeletionRequestStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export interface AccountDeletionRequestResponse {
  id: number;
  status: AccountDeletionRequestStatus;
  requestedAt: string;
  processingStartedAt?: string | null;
  updatedAt?: string | null;
  processedAt?: string | null;
  adminComment?: string | null;
  active: boolean;
}

export interface AccountDeletionAdminResponse {
  id: number;
  userId: number;
  requesterName: string;
  email: string;
  role: string;
  status: AccountDeletionRequestStatus;
  requestedAt: string;
  processingStartedAt?: string | null;
  updatedAt?: string | null;
  processedAt?: string | null;
  adminComment?: string | null;
  handledByEmail?: string | null;
}

export async function getMyAccountDeletionRequest(): Promise<
  AccountDeletionRequestResponse | null
> {
  const response =
    await apiClient.get<AccountDeletionRequestResponse | undefined>(
      "/auth/me/account-deletion-request",
    );

  return response.status === 204 || !response.data ? null : response.data;
}

export async function requestMyAccountDeletion(): Promise<
  AccountDeletionRequestResponse
> {
  const response =
    await apiClient.post<AccountDeletionRequestResponse>(
      "/auth/me/account-deletion-request",
      {},
    );

  return response.data;
}

export async function cancelMyAccountDeletionRequest(): Promise<
  AccountDeletionRequestResponse
> {
  const response =
    await apiClient.put<AccountDeletionRequestResponse>(
      "/auth/me/account-deletion-request/cancel",
      {},
    );

  return response.data;
}

export async function getAdminAccountDeletionRequests(
  status?: AccountDeletionRequestStatus,
): Promise<AccountDeletionAdminResponse[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await apiClient.get<AccountDeletionAdminResponse[]>(
    `/auth/admin/account-deletion-requests${query}`,
  );

  return response.data;
}

export async function startAdminAccountDeletionRequest(
  requestId: number,
): Promise<AccountDeletionAdminResponse> {
  const response = await apiClient.put<AccountDeletionAdminResponse>(
    `/auth/admin/account-deletion-requests/${requestId}/start`,
    {},
  );

  return response.data;
}

export async function rejectAdminAccountDeletionRequest(
  requestId: number,
  adminComment: string,
): Promise<AccountDeletionAdminResponse> {
  const response = await apiClient.put<AccountDeletionAdminResponse>(
    `/auth/admin/account-deletion-requests/${requestId}/reject`,
    { adminComment: adminComment.trim() },
  );

  return response.data;
}

export async function completeAdminAccountDeletionRequest(
  requestId: number,
  adminComment: string,
): Promise<AccountDeletionAdminResponse> {
  const response = await apiClient.put<AccountDeletionAdminResponse>(
    `/auth/admin/account-deletion-requests/${requestId}/complete`,
    {
      adminComment: adminComment.trim(),
      processingConfirmed: true,
    },
  );

  return response.data;
}
