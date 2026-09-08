import { getData } from "./apiClient";
import type {
  BiActivityPoint,
  BiDistribution,
  BiFilters,
  BiScope,
  BiSummary,
  BiTrainingMetric,
} from "../types/bi";

function queryString(filters: BiFilters): string {
  const params = new URLSearchParams();

  params.set("from", filters.from);
  params.set("to", filters.to);

  if (filters.trainingId) {
    params.set("trainingId", String(filters.trainingId));
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  return params.toString();
}

function path(
  scope: BiScope,
  resource:
    | "summary"
    | "trainings"
    | "activity"
    | "distributions",
  filters: BiFilters,
): string {
  return `/analytics/bi/${scope}/${resource}?${queryString(filters)}`;
}

export async function getBiSummary(
  scope: BiScope,
  filters: BiFilters,
): Promise<BiSummary> {
  return getData<BiSummary>(
    path(scope, "summary", filters),
  );
}

export async function getBiTrainings(
  scope: BiScope,
  filters: BiFilters,
): Promise<BiTrainingMetric[]> {
  return getData<BiTrainingMetric[]>(
    path(scope, "trainings", filters),
  );
}

export async function getBiActivity(
  scope: BiScope,
  filters: BiFilters,
): Promise<BiActivityPoint[]> {
  return getData<BiActivityPoint[]>(
    path(scope, "activity", filters),
  );
}

export async function getBiDistributions(
  scope: BiScope,
  filters: BiFilters,
): Promise<BiDistribution> {
  return getData<BiDistribution>(
    path(scope, "distributions", filters),
  );
}