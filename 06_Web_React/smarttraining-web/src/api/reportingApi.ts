import { apiClient } from "./apiClient";
import { getLearningPath } from "./learningPathApi";
import { getTrainingById } from "./trainingApi";


export interface ManagedQuizAttemptResponse {
  id: number;
  quizId: number;
  learnerId: number;
  status: "STARTED" | "SUBMITTED" | "CANCELLED" | string;
  startedAt?: string | null;
  submittedAt?: string | null;
  score?: number | null;
  totalPoints?: number | null;
  success?: boolean | null;
}

export interface ManagedQuestionAnswerResponse {
  id: number;
  attemptId: number;
  questionId: number;
  selectedOptionIds?: string | null;
  answerText?: string | null;
  answerJson?: string | null;
  correct?: boolean | null;
  pointsEarned?: number | null;
}

export interface ManagedQuizAttemptDetailResponse
  extends ManagedQuizAttemptResponse {
  answers: ManagedQuestionAnswerResponse[];
}

function exportDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function exportFilePart(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

  return normalized || "Sans-titre";
}

async function trainingExportFileName(
  trainingId: number,
): Promise<string | undefined> {
  try {
    const training = await getTrainingById(trainingId);
    return `SmartTraining_Formation_${exportFilePart(training.title)}_Participants_${exportDateStamp()}.csv`;
  } catch {
    return undefined;
  }
}

async function learningPathExportFileName(
  pathId: number,
  detail: boolean,
): Promise<string | undefined> {
  try {
    const path = await getLearningPath(pathId);
    return `SmartTraining_Parcours_${exportFilePart(path.title)}_${detail ? "Detail" : "Synthese"}_${exportDateStamp()}.csv`;
  } catch {
    return undefined;
  }
}

export async function getManagedQuizAttempts(
  quizId: number,
): Promise<ManagedQuizAttemptResponse[]> {
  if (!Number.isFinite(quizId) || quizId <= 0) {
    throw new Error("Quiz invalide pour le reporting.");
  }

  const response = await apiClient.get<ManagedQuizAttemptResponse[]>(
    `/attempts/quiz/${quizId}`,
  );
  return response.data;
}

export async function getManagedLearnerQuizAttempts(
  learnerId: number,
): Promise<ManagedQuizAttemptResponse[]> {
  if (!Number.isFinite(learnerId) || learnerId <= 0) {
    throw new Error("Apprenant invalide pour le reporting.");
  }

  const response = await apiClient.get<ManagedQuizAttemptResponse[]>(
    `/attempts/learner/${learnerId}`,
  );
  return response.data;
}

export async function getManagedQuizAttemptDetail(
  attemptId: number,
): Promise<ManagedQuizAttemptDetailResponse> {
  if (!Number.isFinite(attemptId) || attemptId <= 0) {
    throw new Error("Tentative invalide pour le reporting.");
  }

  const response = await apiClient.get<ManagedQuizAttemptDetailResponse>(
    `/attempts/${attemptId}`,
  );
  return response.data;
}

function fileNameFromDisposition(
  disposition?: string,
): string | undefined {
  if (!disposition) {
    return undefined;
  }

  const utf8Match = disposition.match(
    /filename\*=UTF-8''([^;]+)/i,
  );

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const simpleMatch = disposition.match(
    /filename="?([^";]+)"?/i,
  );

  return simpleMatch?.[1];
}

export async function downloadTrainingLearnersCsv(
  trainingId: number,
): Promise<void> {
  if (!Number.isFinite(trainingId) || trainingId <= 0) {
    throw new Error("Formation invalide pour l'export CSV.");
  }

  const preferredFileName = await trainingExportFileName(trainingId);

  const response = await apiClient.get<Blob>(
    `/enrollments/exports/trainings/${trainingId}/learners.csv`,
    {
      responseType: "blob",
      headers: {
        Accept: "text/csv",
      },
    },
  );

  const blob =
    response.data instanceof Blob
      ? response.data
      : new Blob([response.data], {
          type: "text/csv;charset=utf-8",
        });

  const disposition =
    response.headers["content-disposition"] as
      | string
      | undefined;

  const fileName =
    preferredFileName ||
    fileNameFromDisposition(disposition) ||
    `smarttraining-formation-${trainingId}-participants.csv`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  try {
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
async function downloadCsvFile(
  url: string,
  fallbackFileName: string,
  preferredFileName?: string,
): Promise<void> {
  const response = await apiClient.get<Blob>(url, {
    responseType: "blob",
    headers: {
      Accept: "text/csv",
    },
  });

  const blob =
    response.data instanceof Blob
      ? response.data
      : new Blob([response.data], {
          type: "text/csv;charset=utf-8",
        });

  const disposition =
    response.headers["content-disposition"] as
      | string
      | undefined;

  const fileName =
    preferredFileName ||
    fileNameFromDisposition(disposition) ||
    fallbackFileName;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  try {
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }
}

export async function downloadLearningPathLearnersCsv(
  pathId: number,
): Promise<void> {
  if (!Number.isFinite(pathId) || pathId <= 0) {
    throw new Error(
      "Parcours invalide pour l'export CSV.",
    );
  }

  const preferredFileName = await learningPathExportFileName(pathId, false);

  return downloadCsvFile(
    `/enrollments/exports/learning-paths/${pathId}/learners.csv`,
    `smarttraining-parcours-${pathId}-participants.csv`,
    preferredFileName,
  );
}

export async function downloadLearningPathLearnersDetailCsv(
  pathId: number,
): Promise<void> {
  if (!Number.isFinite(pathId) || pathId <= 0) {
    throw new Error(
      "Parcours invalide pour l'export CSV détail.",
    );
  }

  const preferredFileName = await learningPathExportFileName(pathId, true);

  return downloadCsvFile(
    `/enrollments/exports/learning-paths/${pathId}/learners-detail.csv`,
    `smarttraining-parcours-${pathId}-participants-detail.csv`,
    preferredFileName,
  );
}