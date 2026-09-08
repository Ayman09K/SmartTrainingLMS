import { apiClient } from "../../api/apiClient";
import type {
  AccountDeletionRequestStatus,
  AdminAccountDeletionRequest,
} from "../../types/accountDeletion";

export async function getAdminAccountDeletionRequests(
  status?: AccountDeletionRequestStatus,
): Promise<AdminAccountDeletionRequest[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await apiClient.get<AdminAccountDeletionRequest[]>(
    `/auth/admin/account-deletion-requests${query}`,
  );
  return response.data;
}

export async function startAdminAccountDeletionRequest(
  requestId: number,
): Promise<AdminAccountDeletionRequest> {
  const response = await apiClient.put<AdminAccountDeletionRequest>(
    `/auth/admin/account-deletion-requests/${requestId}/start`,
    {},
  );
  return response.data;
}

export async function rejectAdminAccountDeletionRequest(
  requestId: number,
  adminComment: string,
): Promise<AdminAccountDeletionRequest> {
  const response = await apiClient.put<AdminAccountDeletionRequest>(
    `/auth/admin/account-deletion-requests/${requestId}/reject`,
    { adminComment: adminComment.trim() },
  );
  return response.data;
}

export async function completeAdminAccountDeletionRequest(
  requestId: number,
  adminComment: string,
): Promise<AdminAccountDeletionRequest> {
  const response = await apiClient.put<AdminAccountDeletionRequest>(
    `/auth/admin/account-deletion-requests/${requestId}/complete`,
    {
      adminComment: adminComment.trim(),
      processingConfirmed: true,
    },
  );
  return response.data;
}
