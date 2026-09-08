import { apiClient } from "../../api/apiClient";
import type {
  TrainerLearnerIdentity,
} from "../../types/trainerLearnerMobile";
import type {
  TrainerInterventionDetailData,
  TrainerInterventionListItem,
  TrainerInterventionRequest,
  TrainerInterventionResponse,
  TrainerLearnerTrainingOption,
  TrainerSupportSessionDetailData,
  TrainerSupportSessionListItem,
  TrainerSupportSessionRequest,
  TrainerSupportSessionResponse,
} from "../../types/trainerActionMobile";
import {
  getTrainerLearners,
} from "./trainerLearnerService";
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

export async function getTrainerLearnerTrainingOptions(
  trainerId: number,
): Promise<TrainerLearnerTrainingOption[]> {
  const [learners, trainings] = await Promise.all([
    getTrainerLearners(trainerId),
    getTrainerTrainings(trainerId),
  ]);

  const trainingById = new Map(
    trainings.map((training) => [training.id, training]),
  );

  const options: TrainerLearnerTrainingOption[] = [];

  for (const item of learners) {
    const learnerName =
      item.identity.fullName ||
      [item.identity.firstName, item.identity.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      item.identity.email;

    const trainingIds = Array.from(
      new Set(
        item.enrollments.map(
          (enrollment) => enrollment.trainingId,
        ),
      ),
    );

    for (const trainingId of trainingIds) {
      const training = trainingById.get(trainingId);

      if (!training) {
        continue;
      }

      options.push({
        learnerId: item.identity.id,
        trainingId,
        learnerName,
        learnerEmail: item.identity.email,
        trainingTitle: training.title,
      });
    }
  }

  return options.sort((a, b) => {
    const learnerCompare = a.learnerName.localeCompare(
      b.learnerName,
      "fr",
    );

    if (learnerCompare !== 0) {
      return learnerCompare;
    }

    return a.trainingTitle.localeCompare(
      b.trainingTitle,
      "fr",
    );
  });
}

export async function getTrainerInterventions(
  trainerId: number,
): Promise<TrainerInterventionListItem[]> {
  const [response, trainings] = await Promise.all([
    apiClient.get<TrainerInterventionResponse[]>(
      `/analytics/interventions/trainer/${trainerId}`,
    ),
    getTrainerTrainings(trainerId),
  ]);

  const interventions = response.data;
  const identities = await resolveLearners(
    interventions.map((item) => item.learnerId),
  );

  const identityById = new Map(
    identities.map((identity) => [identity.id, identity]),
  );

  const trainingById = new Map(
    trainings.map((training) => [training.id, training]),
  );

  return interventions
    .map((intervention) => ({
      intervention,
      learner:
        identityById.get(intervention.learnerId) ?? null,
      training:
        trainingById.get(intervention.trainingId) ?? null,
    }))
    .sort(
      (a, b) =>
        timestamp(b.intervention.createdAt) -
        timestamp(a.intervention.createdAt),
    );
}

export async function getTrainerInterventionDetail(
  interventionId: number,
): Promise<TrainerInterventionDetailData> {
  const response =
    await apiClient.get<TrainerInterventionResponse>(
      `/analytics/interventions/${interventionId}`,
    );

  const intervention = response.data;

  const [learnerResponse, training] = await Promise.all([
    apiClient.get<TrainerLearnerIdentity>(
      `/auth/directory/learners/${intervention.learnerId}`,
    ),
    getTrainerTraining(intervention.trainingId),
  ]);

  return {
    intervention,
    learner: learnerResponse.data,
    training,
  };
}

export async function createTrainerIntervention(
  request: TrainerInterventionRequest,
): Promise<TrainerInterventionResponse> {
  const response =
    await apiClient.post<TrainerInterventionResponse>(
      "/analytics/interventions",
      request,
    );

  return response.data;
}

export async function markTrainerInterventionDone(
  interventionId: number,
): Promise<TrainerInterventionResponse> {
  const response =
    await apiClient.put<TrainerInterventionResponse>(
      `/analytics/interventions/${interventionId}/done`,
    );

  return response.data;
}

export async function cancelTrainerIntervention(
  interventionId: number,
): Promise<TrainerInterventionResponse> {
  const response =
    await apiClient.put<TrainerInterventionResponse>(
      `/analytics/interventions/${interventionId}/cancel`,
    );

  return response.data;
}

export async function getTrainerSupportSessions(
  trainerId: number,
): Promise<TrainerSupportSessionListItem[]> {
  const [response, trainings] = await Promise.all([
    apiClient.get<TrainerSupportSessionResponse[]>(
      "/support-sessions/trainer",
    ),
    getTrainerTrainings(trainerId),
  ]);

  const sessions = response.data;
  const identities = await resolveLearners(
    sessions.map((item) => item.learnerId),
  );

  const identityById = new Map(
    identities.map((identity) => [identity.id, identity]),
  );

  const trainingById = new Map(
    trainings.map((training) => [training.id, training]),
  );

  return sessions
    .map((session) => ({
      session,
      learner:
        identityById.get(session.learnerId) ?? null,
      training:
        trainingById.get(session.trainingId) ?? null,
    }))
    .sort(
      (a, b) =>
        timestamp(b.session.scheduledAt) -
        timestamp(a.session.scheduledAt),
    );
}

export async function getTrainerSupportSessionDetail(
  sessionId: number,
): Promise<TrainerSupportSessionDetailData> {
  const response =
    await apiClient.get<TrainerSupportSessionResponse>(
      `/support-sessions/${sessionId}`,
    );

  const session = response.data;

  const [learnerResponse, training] = await Promise.all([
    apiClient.get<TrainerLearnerIdentity>(
      `/auth/directory/learners/${session.learnerId}`,
    ),
    getTrainerTraining(session.trainingId),
  ]);

  return {
    session,
    learner: learnerResponse.data,
    training,
  };
}

export async function createTrainerSupportSession(
  request: TrainerSupportSessionRequest,
): Promise<TrainerSupportSessionResponse> {
  const response =
    await apiClient.post<TrainerSupportSessionResponse>(
      "/support-sessions",
      request,
    );

  return response.data;
}

export async function completeTrainerSupportSession(
  sessionId: number,
): Promise<TrainerSupportSessionResponse> {
  const response =
    await apiClient.put<TrainerSupportSessionResponse>(
      `/support-sessions/${sessionId}/complete`,
    );

  return response.data;
}

export async function cancelTrainerSupportSession(
  sessionId: number,
): Promise<TrainerSupportSessionResponse> {
  const response =
    await apiClient.put<TrainerSupportSessionResponse>(
      `/support-sessions/${sessionId}/cancel`,
    );

  return response.data;
}