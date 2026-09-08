import { apiClient } from "../../api/apiClient";
import {
  getTrainerTrainingEnrollments,
  getTrainerTrainings,
} from "./trainerTrainingService";
import type {
  TrainerEnrollment,
} from "../../types/trainerMobile";
import type {
  TrainerLearner360Data,
  TrainerLearnerIdentity,
  TrainerLearnerListItem,
  TrainerLearnerOverviewResponse,
} from "../../types/trainerLearnerMobile";

function safeProgress(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function averageProgress(
  enrollments: TrainerEnrollment[],
): number {
  if (enrollments.length === 0) {
    return 0;
  }

  const total = enrollments.reduce(
    (sum, item) => sum + safeProgress(item.progressPercentage),
    0,
  );

  return Math.round(total / enrollments.length);
}

function isCompleted(item: TrainerEnrollment): boolean {
  return (
    item.status === "COMPLETED" ||
    safeProgress(item.progressPercentage) >= 100
  );
}

async function resolveLearners(
  learnerIds: number[],
): Promise<TrainerLearnerIdentity[]> {
  if (learnerIds.length === 0) {
    return [];
  }

  const unique = Array.from(new Set(learnerIds));
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

export async function getTrainerLearners(
  trainerId: number,
): Promise<TrainerLearnerListItem[]> {
  const trainings = await getTrainerTrainings(trainerId);

  const enrollmentGroups = await Promise.all(
    trainings.map(async (training) => ({
      trainingId: training.id,
      enrollments:
        await getTrainerTrainingEnrollments(training.id),
    })),
  );

  const enrollmentsByLearner =
    new Map<number, TrainerEnrollment[]>();

  for (const group of enrollmentGroups) {
    for (const enrollment of group.enrollments) {
      const current =
        enrollmentsByLearner.get(enrollment.learnerId) ?? [];

      current.push(enrollment);
      enrollmentsByLearner.set(
        enrollment.learnerId,
        current,
      );
    }
  }

  const learnerIds = Array.from(enrollmentsByLearner.keys());
  const identities = await resolveLearners(learnerIds);
  const identityById = new Map(
    identities.map((identity) => [identity.id, identity]),
  );

  return learnerIds
    .map((learnerId) => {
      const identity = identityById.get(learnerId);
      const enrollments =
        enrollmentsByLearner.get(learnerId) ?? [];

      if (!identity) {
        return null;
      }

      const trainingIds = Array.from(
        new Set(enrollments.map((item) => item.trainingId)),
      );

      return {
        identity,
        enrollments,
        trainingIds,
        trainingsCount: trainingIds.length,
        completedTrainings:
          enrollments.filter(isCompleted).length,
        averageProgress: averageProgress(enrollments),
      };
    })
    .filter(
      (item): item is TrainerLearnerListItem =>
        item !== null,
    )
    .sort((a, b) => {
      const nameA = (
        a.identity.fullName ||
        `${a.identity.firstName ?? ""} ${a.identity.lastName ?? ""}` ||
        a.identity.email
      ).trim();

      const nameB = (
        b.identity.fullName ||
        `${b.identity.firstName ?? ""} ${b.identity.lastName ?? ""}` ||
        b.identity.email
      ).trim();

      return nameA.localeCompare(nameB, "fr");
    });
}

export async function getTrainerLearner360(
  trainerId: number,
  learnerId: number,
): Promise<TrainerLearner360Data> {
  const [
    identityResponse,
    overviewResponse,
    trainings,
  ] = await Promise.all([
    apiClient.get<TrainerLearnerIdentity>(
      `/auth/directory/learners/${learnerId}`,
    ),
    apiClient.get<TrainerLearnerOverviewResponse>(
      `/analytics/trainer/learners/${learnerId}/overview`,
    ),
    getTrainerTrainings(trainerId),
  ]);

  return {
    identity: identityResponse.data,
    overview: overviewResponse.data,
    trainings,
  };
}