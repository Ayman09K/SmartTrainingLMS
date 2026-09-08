import { apiClient } from "../../api/apiClient";
import { AdminTrainerRequestSummary } from "../../types/admin";

export async function getAdminTrainerRequests(): Promise<
  AdminTrainerRequestSummary[]
> {
  const response = await apiClient.get<AdminTrainerRequestSummary[]>(
    "/auth/admin/trainer-requests",
  );
  return response.data;
}

export async function approveAdminTrainerRequest(
  requestId: number,
  adminComment: string,
): Promise<AdminTrainerRequestSummary> {
  const response = await apiClient.put<AdminTrainerRequestSummary>(
    `/auth/admin/trainer-requests/${requestId}/approve`,
    { adminComment: adminComment.trim() || null },
  );
  return response.data;
}

export async function rejectAdminTrainerRequest(
  requestId: number,
  adminComment: string,
): Promise<AdminTrainerRequestSummary> {
  const response = await apiClient.put<AdminTrainerRequestSummary>(
    `/auth/admin/trainer-requests/${requestId}/reject`,
    { adminComment: adminComment.trim() || null },
  );
  return response.data;
}