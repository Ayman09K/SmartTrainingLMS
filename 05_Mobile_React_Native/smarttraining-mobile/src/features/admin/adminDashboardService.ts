import { apiClient } from "../../api/apiClient";
import {
  AdminAlertSummary,
  AdminDashboardSummary,
  AdminFeedbackSummary,
  AdminTrainerRequestSummary,
  AdminTrainingSummary,
  AdminUserSummary,
} from "../../types/admin";

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const [
    usersResult,
    trainingsResult,
    trainerRequestsResult,
    feedbacksResult,
    alertsResult,
  ] = await Promise.allSettled([
    apiClient.get<AdminUserSummary[]>("/auth/admin/users"),
    apiClient.get<AdminTrainingSummary[]>("/trainings/admin"),
    apiClient.get<AdminTrainerRequestSummary[]>(
      "/auth/admin/trainer-requests?status=PENDING",
    ),
    apiClient.get<AdminFeedbackSummary[]>("/analytics/feedbacks/open"),
    apiClient.get<AdminAlertSummary[]>("/analytics/alerts/open"),
  ]);

  const degradedSections: string[] = [];

  const users =
    usersResult.status === "fulfilled"
      ? usersResult.value.data
      : [];
  if (usersResult.status === "rejected") {
    degradedSections.push("utilisateurs");
  }

  const trainings =
    trainingsResult.status === "fulfilled"
      ? trainingsResult.value.data
      : [];
  if (trainingsResult.status === "rejected") {
    degradedSections.push("formations");
  }

  const trainerRequests =
    trainerRequestsResult.status === "fulfilled"
      ? trainerRequestsResult.value.data
      : [];
  if (trainerRequestsResult.status === "rejected") {
    degradedSections.push("demandes formateur");
  }

  const feedbacks =
    feedbacksResult.status === "fulfilled"
      ? feedbacksResult.value.data
      : [];
  if (feedbacksResult.status === "rejected") {
    degradedSections.push("feedbacks");
  }

  const alerts =
    alertsResult.status === "fulfilled"
      ? alertsResult.value.data
      : [];
  if (alertsResult.status === "rejected") {
    degradedSections.push("alertes");
  }

  return {
    users: users.length,
    activeUsers: users.filter(
      (item) =>
        item.accountStatus === "ACTIVE" ||
        (item.accountStatus == null && item.enabled === true),
    ).length,
    trainings: trainings.length,
    publishedTrainings: trainings.filter(
      (item) => item.status === "PUBLISHED",
    ).length,
    pendingTrainerRequests: trainerRequests.filter(
      (item) => item.status === "PENDING",
    ).length,
    openFeedbacks: feedbacks.filter(
      (item) => item.status === "OPEN",
    ).length,
    openAlerts: alerts.filter(
      (item) => item.status === "OPEN",
    ).length,
    degradedSections,
  };
}