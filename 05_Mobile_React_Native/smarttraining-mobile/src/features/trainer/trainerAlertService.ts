import { apiClient } from "../../api/apiClient";
import type {
  TrainerLearnerIdentity,
} from "../../types/trainerLearnerMobile";
import type {
  TrainerAlert,
  TrainerAlertDetailData,
  TrainerAlertListItem,
  TrainerRiskIndicator,
} from "../../types/trainerAlertMobile";
import {
  getTrainerTraining,
  getTrainerTrainings,
} from "./trainerTrainingService";

async function resolveLearners(
  learnerIds: number[],
): Promise<TrainerLearnerIdentity[]> {
  const unique = Array.from(new Set(learnerIds));

  if (unique.length === 0) {
    return [];
  }

  const chunks: number[][] = [];

  for (let index = 0; index < unique.length; index += 200) {
    chunks.push(unique.slice(index, index + 200));
  }

  const responses = await Promise.all(
    chunks.map((ids) =>
      apiClient.post<TrainerLearnerIdentity[]>(
        "/auth/directory/learners/resolve",
        { learnerIds: ids },
      ),
    ),
  );

  return responses.flatMap((response) => response.data);
}

function timestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function getTrainerAlerts(
  trainerId: number,
): Promise<TrainerAlertListItem[]> {
  const trainings = await getTrainerTrainings(trainerId);

  const responses = await Promise.all(
    trainings.map((training) =>
      apiClient.get<TrainerAlert[]>(
        `/analytics/alerts/training/${training.id}`,
      ),
    ),
  );

  const byId = new Map<number, TrainerAlert>();

  for (const response of responses) {
    for (const alert of response.data) {
      byId.set(alert.id, alert);
    }
  }

  const alerts = Array.from(byId.values()).sort(
    (a, b) =>
      timestamp(b.createdAt) - timestamp(a.createdAt),
  );

  const identities = await resolveLearners(
    alerts.map((item) => item.learnerId),
  );

  const identityById = new Map(
    identities.map((identity) => [identity.id, identity]),
  );

  const trainingById = new Map(
    trainings.map((training) => [training.id, training]),
  );

  return alerts.map((alert) => ({
    alert,
    learner: identityById.get(alert.learnerId) ?? null,
    training: trainingById.get(alert.trainingId) ?? null,
  }));
}

export async function getTrainerAlertDetail(
  alertId: number,
): Promise<TrainerAlertDetailData> {
  const alertResponse = await apiClient.get<TrainerAlert>(
    `/analytics/alerts/${alertId}`,
  );

  const alert = alertResponse.data;

  const [learnerResponse, training, riskResult] =
    await Promise.all([
      apiClient.get<TrainerLearnerIdentity>(
        `/auth/directory/learners/${alert.learnerId}`,
      ),
      getTrainerTraining(alert.trainingId),
      apiClient
        .get<TrainerRiskIndicator>(
          `/analytics/risk/learner/${alert.learnerId}/training/${alert.trainingId}`,
        )
        .then((response) => response.data)
        .catch(() => null),
    ]);

  return {
    alert,
    learner: learnerResponse.data,
    training,
    risk: riskResult,
  };
}

export async function markTrainerAlertInProgress(
  alertId: number,
): Promise<TrainerAlert> {
  const response = await apiClient.put<TrainerAlert>(
    `/analytics/alerts/${alertId}/in-progress`,
  );

  return response.data;
}

export async function resolveTrainerAlert(
  alertId: number,
): Promise<TrainerAlert> {
  const response = await apiClient.put<TrainerAlert>(
    `/analytics/alerts/${alertId}/resolve`,
  );

  return response.data;
}

export async function ignoreTrainerAlert(
  alertId: number,
): Promise<TrainerAlert> {
  const response = await apiClient.put<TrainerAlert>(
    `/analytics/alerts/${alertId}/ignore`,
  );

  return response.data;
}