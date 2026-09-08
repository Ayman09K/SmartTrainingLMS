import { apiClient } from "../../api/apiClient";
import {
  AdminAlertSummary,
  AdminFeedbackSummary,
} from "../../types/admin";

export async function getAdminOpenFeedbacks(): Promise<
  AdminFeedbackSummary[]
> {
  const response = await apiClient.get<AdminFeedbackSummary[]>(
    "/analytics/feedbacks/open",
  );
  return response.data;
}

export async function markAdminFeedbackInProgress(
  feedbackId: number,
): Promise<AdminFeedbackSummary> {
  const response = await apiClient.put<AdminFeedbackSummary>(
    `/analytics/feedbacks/${feedbackId}/in-progress`,
  );
  return response.data;
}

export async function resolveAdminFeedback(
  feedbackId: number,
  trainerResponse: string,
): Promise<AdminFeedbackSummary> {
  const normalized = trainerResponse.trim();
  const suffix = normalized
    ? `?trainerResponse=${encodeURIComponent(normalized)}`
    : "";

  const response = await apiClient.put<AdminFeedbackSummary>(
    `/analytics/feedbacks/${feedbackId}/resolve${suffix}`,
  );
  return response.data;
}

export async function getAdminOpenAlerts(): Promise<AdminAlertSummary[]> {
  const response = await apiClient.get<AdminAlertSummary[]>(
    "/analytics/alerts/open",
  );
  return response.data;
}

export async function markAdminAlertInProgress(
  alertId: number,
): Promise<AdminAlertSummary> {
  const response = await apiClient.put<AdminAlertSummary>(
    `/analytics/alerts/${alertId}/in-progress`,
  );
  return response.data;
}

export async function resolveAdminAlert(
  alertId: number,
): Promise<AdminAlertSummary> {
  const response = await apiClient.put<AdminAlertSummary>(
    `/analytics/alerts/${alertId}/resolve`,
  );
  return response.data;
}

export async function ignoreAdminAlert(
  alertId: number,
): Promise<AdminAlertSummary> {
  const response = await apiClient.put<AdminAlertSummary>(
    `/analytics/alerts/${alertId}/ignore`,
  );
  return response.data;
}