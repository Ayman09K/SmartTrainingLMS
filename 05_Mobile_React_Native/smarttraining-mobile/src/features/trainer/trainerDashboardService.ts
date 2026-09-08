import { apiClient } from "../../api/apiClient";
import {
  TrainerAlertSummary,
  TrainerDashboardSummary,
  TrainerFeedbackSummary,
  TrainerInterventionSummary,
  TrainerSupportSessionSummary,
  TrainerTrainingSummary,
} from "../../types/trainerMobile";

export async function getTrainerDashboardSummary(
  trainerId: number,
): Promise<TrainerDashboardSummary> {
  const [
    trainingsResult,
    alertsResult,
    feedbacksResult,
    interventionsResult,
    sessionsResult,
  ] = await Promise.allSettled([
    apiClient.get<TrainerTrainingSummary[]>(
      `/trainings/trainer/${trainerId}`,
    ),
    apiClient.get<TrainerAlertSummary[]>(
      "/analytics/alerts/open",
    ),
    apiClient.get<TrainerFeedbackSummary[]>(
      "/analytics/feedbacks/open",
    ),
    apiClient.get<TrainerInterventionSummary[]>(
      `/analytics/interventions/trainer/${trainerId}`,
    ),
    apiClient.get<TrainerSupportSessionSummary[]>(
      "/support-sessions/trainer",
    ),
  ]);

  const degradedSections: string[] = [];

  const trainings =
    trainingsResult.status === "fulfilled"
      ? trainingsResult.value.data
      : [];
  if (trainingsResult.status === "rejected") {
    degradedSections.push("formations");
  }

  const alerts =
    alertsResult.status === "fulfilled"
      ? alertsResult.value.data
      : [];
  if (alertsResult.status === "rejected") {
    degradedSections.push("alertes");
  }

  const feedbacks =
    feedbacksResult.status === "fulfilled"
      ? feedbacksResult.value.data
      : [];
  if (feedbacksResult.status === "rejected") {
    degradedSections.push("feedbacks");
  }

  const interventions =
    interventionsResult.status === "fulfilled"
      ? interventionsResult.value.data
      : [];
  if (interventionsResult.status === "rejected") {
    degradedSections.push("interventions");
  }

  const sessions =
    sessionsResult.status === "fulfilled"
      ? sessionsResult.value.data
      : [];
  if (sessionsResult.status === "rejected") {
    degradedSections.push("séances");
  }

  return {
    trainings: trainings.length,
    publishedTrainings: trainings.filter(
      (item) => item.status === "PUBLISHED",
    ).length,
    openAlerts: alerts.filter(
      (item) => item.status === "OPEN",
    ).length,
    openFeedbacks: feedbacks.filter(
      (item) => item.status === "OPEN",
    ).length,
    plannedInterventions: interventions.filter(
      (item) => item.status === "PLANNED",
    ).length,
    scheduledSessions: sessions.filter(
      (item) => item.status === "SCHEDULED",
    ).length,
    degradedSections,
  };
}