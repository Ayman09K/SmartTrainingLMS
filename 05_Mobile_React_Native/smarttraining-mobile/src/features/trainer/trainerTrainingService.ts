import { apiClient } from "../../api/apiClient";
import {
  TrainerEnrollment,
  TrainerTraining,
  TrainerTrainingListItem,
  TrainerTrainingMetrics,
} from "../../types/trainerMobile";

function clampProgress(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

export function computeTrainingMetrics(
  enrollments: TrainerEnrollment[],
): TrainerTrainingMetrics {
  if (enrollments.length === 0) {
    return {
      learners: 0,
      averageProgress: 0,
    };
  }

  const total = enrollments.reduce(
    (sum, item) => sum + clampProgress(item.progressPercentage),
    0,
  );

  return {
    learners: enrollments.length,
    averageProgress: Math.round(total / enrollments.length),
  };
}

export async function getTrainerTrainings(
  trainerId: number,
): Promise<TrainerTraining[]> {
  const response = await apiClient.get<TrainerTraining[]>(
    `/trainings/trainer/${trainerId}`,
  );

  return response.data;
}

export async function getTrainerTraining(
  trainingId: number,
): Promise<TrainerTraining> {
  const response = await apiClient.get<TrainerTraining>(
    `/trainings/${trainingId}`,
  );

  return response.data;
}

export async function getTrainerTrainingEnrollments(
  trainingId: number,
): Promise<TrainerEnrollment[]> {
  const response = await apiClient.get<TrainerEnrollment[]>(
    `/enrollments/training/${trainingId}`,
  );

  return response.data;
}

export async function getTrainerTrainingList(
  trainerId: number,
): Promise<TrainerTrainingListItem[]> {
  const trainings = await getTrainerTrainings(trainerId);

  const items = await Promise.all(
    trainings.map(async (training) => {
      const enrollments =
        await getTrainerTrainingEnrollments(training.id);

      return {
        training,
        metrics: computeTrainingMetrics(enrollments),
      };
    }),
  );

  return items;
}

export async function getTrainerTrainingDetail(
  trainingId: number,
): Promise<{
  training: TrainerTraining;
  enrollments: TrainerEnrollment[];
  metrics: TrainerTrainingMetrics;
}> {
  const [training, enrollments] = await Promise.all([
    getTrainerTraining(trainingId),
    getTrainerTrainingEnrollments(trainingId),
  ]);

  return {
    training,
    enrollments,
    metrics: computeTrainingMetrics(enrollments),
  };
}