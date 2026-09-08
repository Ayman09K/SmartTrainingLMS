import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Route,
  Users,
} from "lucide-react";
import { getEnrollmentsByTrainingSafe } from "../../api/adminApi";
import {
  getAdminTrainings,
  getEnrollmentsByTraining,
  getTrainingsByTrainer,
} from "../../api/trainingApi";
import {
  getLearningPathLearnerProgress,
  getLearningPaths,
} from "../../api/learningPathApi";
import {
  getManageableQuizFull,
  getManageableQuizzesByTraining,
} from "../../api/quizAuthoringApi";
import {
  downloadLearningPathLearnersCsv,
  downloadLearningPathLearnersDetailCsv,
  downloadTrainingLearnersCsv,
  getManagedLearnerQuizAttempts,
  getManagedQuizAttemptDetail,
  getManagedQuizAttempts,
  type ManagedQuestionAnswerResponse,
  type ManagedQuizAttemptDetailResponse,
  type ManagedQuizAttemptResponse,
} from "../../api/reportingApi";
import {
  getTrainerLearnerOverview,
  resolveTrainerLearners,
  searchTrainerLearners,
} from "../../api/trainerLearnerOverviewApi";
import {
  getLearnerGroupMembers,
  getLearnerGroups,
} from "../../api/learnerGroupApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { useAuth } from "../../features/auth/AuthContext";
import type { AuthUser } from "../../types/auth";
import type { LearnerGroup } from "../../types/learnerGroup";
import type { EnrollmentResponse, TrainingResponse } from "../../types/training";
import type {
  LearningPathProgressResponse,
  LearningPathResponse,
} from "../../types/learningPath";
import type { TrainerLearnerOverviewResponse } from "../../types/trainerLearnerOverview";
import type {
  QuestionFullAuthoringResponse,
  QuizAuthoringResponse,
  QuizFullAuthoringResponse,
} from "../../types/quizAuthoring";
import {
  SmartEmptyState,
  SmartMetricCard,
  SmartPageHeader,
  SmartSectionCard,
  SmartStatusChip,
} from "../../components/ui";

type ReportingTab = "FORMATIONS" | "QUIZ" | "PARCOURS" | "APPRENANTS";

interface LearnerComparisonRow {
  learnerId: number;
  overview: TrainerLearnerOverviewResponse | null;
  attempts: ManagedQuizAttemptResponse[];
  error?: string;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
  }).format(date);
}

function scorePercent(attempt: ManagedQuizAttemptResponse): number | null {
  if (
    attempt.score == null ||
    attempt.totalPoints == null ||
    attempt.totalPoints <= 0
  ) {
    return null;
  }

  return Math.round((attempt.score * 100) / attempt.totalPoints);
}

function learnerName(user?: AuthUser): string {
  if (!user) {
    return "Apprenant inconnu";
  }

  const fullName =
    user.fullName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return fullName || user.email || `Apprenant #${user.id}`;
}

function attemptStatus(attempt: ManagedQuizAttemptResponse): {
  label: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
} {
  if (attempt.status === "STARTED") {
    return { label: "En cours", tone: "warning" };
  }

  if (attempt.status === "CANCELLED") {
    return { label: "Annulée", tone: "neutral" };
  }

  if (attempt.success === true) {
    return { label: "Réussie", tone: "success" };
  }

  if (attempt.success === false) {
    return { label: "Échouée", tone: "danger" };
  }

  return { label: "Soumise", tone: "info" };
}

function enrollmentTone(status?: string): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "COMPLETED") {
    return "success";
  }
  if (status === "CANCELLED") {
    return "neutral";
  }
  return "info";
}

function enrollmentStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "En cours",
    COMPLETED: "Terminée",
    CANCELLED: "Annulée",
  };

  return status ? labels[status] || "Statut inconnu" : "En cours";
}

function learningPathStatusLabel(status: string): string {
  if (status === "PUBLISHED") {
    return "Publiée";
  }
  if (status === "DRAFT") {
    return "Brouillon en cours";
  }
  if (status === "ARCHIVED") {
    return "Historique";
  }
  return status;
}

function learningPathOptionLabel(path: LearningPathResponse): string {
  const version =
    path.versionNumber == null ? "Version non numérotée" : `V${path.versionNumber}`;

  return `${path.title} — ${version} · ${learningPathStatusLabel(path.status)}`;
}

function parseIdList(value?: string | null): number[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isFinite(id));
}

function parseAnswerJson(value?: string | null): Record<string, unknown> | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function labelDisplayItem(
  items: Array<{ id: string; text: string }> | undefined,
  id: unknown,
): string {
  const normalized = String(id ?? "");
  return items?.find((item) => item.id === normalized)?.text || normalized;
}

function humanizeLearnerAnswer(
  answer: ManagedQuestionAnswerResponse,
  question?: QuestionFullAuthoringResponse,
): string {
  const optionIds = parseIdList(answer.selectedOptionIds);
  if (optionIds.length && question) {
    const labels = optionIds.map(
      (id) =>
        question.options.find((option) => option.id === id)?.content ||
        `Option #${id}`,
    );
    return labels.join(" ; ");
  }

  if (answer.answerText?.trim()) {
    return answer.answerText.trim();
  }

  const parsed = parseAnswerJson(answer.answerJson);
  if (!parsed) {
    return "Aucune réponse exploitable";
  }

  const blankAnswers = parsed.blankAnswers;
  if (Array.isArray(blankAnswers)) {
    return blankAnswers
      .map((entry) => {
        const value = entry as { blankId?: unknown; value?: unknown };
        return `${String(value.blankId ?? "")}: ${String(value.value ?? "")}`;
      })
      .join(" ; ");
  }

  const orderedItemIds = parsed.orderedItemIds;
  if (Array.isArray(orderedItemIds)) {
    const items = question?.typeConfig?.ordering?.items;
    return orderedItemIds.map((id) => labelDisplayItem(items, id)).join(" → ");
  }

  const matchingPairs = parsed.matchingPairs;
  if (Array.isArray(matchingPairs)) {
    const left = question?.typeConfig?.matching?.left;
    const right = question?.typeConfig?.matching?.right;
    return matchingPairs
      .map((pair) => {
        const value = pair as { leftId?: unknown; rightId?: unknown };
        return `${labelDisplayItem(left, value.leftId)} → ${labelDisplayItem(right, value.rightId)}`;
      })
      .join(" ; ");
  }

  const dragPlacements = parsed.dragPlacements;
  if (Array.isArray(dragPlacements)) {
    const items = question?.typeConfig?.dragDrop?.items;
    const zones = question?.typeConfig?.dragDrop?.zones;
    return dragPlacements
      .map((placement) => {
        const value = placement as { itemId?: unknown; zoneId?: unknown };
        return `${labelDisplayItem(items, value.itemId)} → ${labelDisplayItem(zones, value.zoneId)}`;
      })
      .join(" ; ");
  }

  if (parsed.numericValue != null) {
    return String(parsed.numericValue);
  }

  return JSON.stringify(parsed);
}

function humanizeCorrectAnswer(question?: QuestionFullAuthoringResponse): string {
  if (!question) {
    return "—";
  }

  if (["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"].includes(question.type)) {
    const correct = question.options
      .filter((option) => option.correct)
      .map((option) => option.content);
    return correct.length ? correct.join(" ; ") : "—";
  }

  if (question.type === "FILL_BLANK") {
    const blanks = question.typeConfig?.fillBlank?.blanks || [];
    return (
      blanks
        .map((blank) => `${blank.id}: ${blank.accepted.join(" / ")}`)
        .join(" ; ") || "—"
    );
  }

  if (question.type === "ORDERING") {
    const items = [...(question.typeConfig?.ordering?.items || [])]
      .sort((a, b) => a.correctIndex - b.correctIndex)
      .map((item) => item.text);
    return items.join(" → ") || "—";
  }

  if (question.type === "MATCHING") {
    const config = question.typeConfig?.matching;
    if (!config) {
      return "—";
    }
    return config.pairs
      .map(
        (pair) =>
          `${labelDisplayItem(config.left, pair.leftId)} → ${labelDisplayItem(config.right, pair.rightId)}`,
      )
      .join(" ; ");
  }

  if (question.type === "DRAG_DROP") {
    const config = question.typeConfig?.dragDrop;
    if (!config) {
      return "—";
    }
    return config.placements
      .map(
        (placement) =>
          `${labelDisplayItem(config.items, placement.itemId)} → ${labelDisplayItem(config.zones, placement.zoneId)}`,
      )
      .join(" ; ");
  }

  if (question.type === "NUMERIC") {
    const numeric = question.typeConfig?.numeric;
    if (!numeric) {
      return "—";
    }
    return numeric.tolerance
      ? `${numeric.expected} ± ${numeric.tolerance}${numeric.unit ? ` ${numeric.unit}` : ""}`
      : `${numeric.expected}${numeric.unit ? ` ${numeric.unit}` : ""}`;
  }

  return "—";
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

function exportDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (!/[;"\r\n]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(fileName: string, rows: unknown[][]): void {
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}\r\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
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

function attemptNumbers(attempts: ManagedQuizAttemptResponse[]): Map<number, number> {
  const groups = new Map<string, ManagedQuizAttemptResponse[]>();
  for (const attempt of attempts) {
    const key = `${attempt.learnerId}:${attempt.quizId}`;
    const values = groups.get(key) || [];
    values.push(attempt);
    groups.set(key, values);
  }

  const result = new Map<number, number>();
  for (const values of groups.values()) {
    values
      .sort((a, b) => {
        const aTime = new Date(a.startedAt || 0).getTime();
        const bTime = new Date(b.startedAt || 0).getTime();
        return aTime - bTime || a.id - b.id;
      })
      .forEach((attempt, index) => result.set(attempt.id, index + 1));
  }
  return result;
}


interface QuizScopeStats {
  coveredQuizCount: number;
  attemptCount: number;
  succeededQuizCount: number;
  averageBestScore: number | null;
  lastActivity?: string | null;
}

function quizScopeStats(
  attempts: ManagedQuizAttemptResponse[],
): QuizScopeStats {
  const coveredQuizIds = new Set(attempts.map((attempt) => attempt.quizId));
  const succeededQuizIds = new Set(
    attempts
      .filter((attempt) => attempt.success === true)
      .map((attempt) => attempt.quizId),
  );

  const bestScoresByQuiz = new Map<number, number>();
  for (const attempt of attempts) {
    const score = scorePercent(attempt);
    if (score == null) {
      continue;
    }

    const current = bestScoresByQuiz.get(attempt.quizId);
    if (current == null || score > current) {
      bestScoresByQuiz.set(attempt.quizId, score);
    }
  }

  const bestScores = Array.from(bestScoresByQuiz.values());
  const averageBestScore = bestScores.length
    ? Math.round(
        bestScores.reduce((sum, value) => sum + value, 0) / bestScores.length,
      )
    : null;

  const lastActivity =
    attempts
      .map((attempt) => attempt.submittedAt || attempt.startedAt || null)
      .filter((value): value is string => Boolean(value))
      .sort(
        (left, right) =>
          new Date(right).getTime() - new Date(left).getTime(),
      )[0] || null;

  return {
    coveredQuizCount: coveredQuizIds.size,
    attemptCount: attempts.length,
    succeededQuizCount: succeededQuizIds.size,
    averageBestScore,
    lastActivity,
  };
}

export function ReportingResultsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportingTab>("FORMATIONS");

  const [trainings, setTrainings] = useState<TrainingResponse[]>([]);
  const [loadingTrainings, setLoadingTrainings] = useState(true);
  const [trainingLoadError, setTrainingLoadError] = useState("");

  const [formationTrainingId, setFormationTrainingId] = useState(0);
  const [formationEnrollments, setFormationEnrollments] = useState<EnrollmentResponse[]>([]);
  const [formationLearners, setFormationLearners] = useState<AuthUser[]>([]);
  const [formationLoading, setFormationLoading] = useState(false);
  const [formationError, setFormationError] = useState("");
  const [formationExporting, setFormationExporting] = useState(false);

  const [quizTrainingId, setQuizTrainingId] = useState(0);
  const [quizzes, setQuizzes] = useState<QuizAuthoringResponse[]>([]);
  const [quizId, setQuizId] = useState(0);
  const [attempts, setAttempts] = useState<ManagedQuizAttemptResponse[]>([]);
  const [quizLearners, setQuizLearners] = useState<AuthUser[]>([]);
  const [quizFull, setQuizFull] = useState<QuizFullAuthoringResponse | null>(null);
  const [quizSearch, setQuizSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [quizExporting, setQuizExporting] = useState<"summary" | "detail" | null>(null);

  const [paths, setPaths] = useState<LearningPathResponse[]>([]);
  const [pathId, setPathId] = useState(0);
  const [pathProgress, setPathProgress] = useState<LearningPathProgressResponse[]>([]);
  const [pathLearners, setPathLearners] = useState<AuthUser[]>([]);
  const [pathsLoading, setPathsLoading] = useState(true);
  const [pathProgressLoading, setPathProgressLoading] = useState(false);
  const [pathError, setPathError] = useState("");
  const [pathExporting, setPathExporting] = useState<"summary" | "detail" | null>(null);

  const [learnerQuery, setLearnerQuery] = useState("");
  const [learnerOptions, setLearnerOptions] = useState<AuthUser[]>([]);
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<number[]>([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState(0);
  const [learnerOverview, setLearnerOverview] = useState<TrainerLearnerOverviewResponse | null>(null);
  const [learnerAttempts, setLearnerAttempts] = useState<ManagedQuizAttemptResponse[]>([]);
  const [learnerQuizMeta, setLearnerQuizMeta] = useState<QuizFullAuthoringResponse[]>([]);
  const [learnerSearchLoading, setLearnerSearchLoading] = useState(false);
  const [learnerLoading, setLearnerLoading] = useState(false);
  const [learnerError, setLearnerError] = useState("");
  const [learnerGroups, setLearnerGroups] = useState<LearnerGroup[]>([]);
  const [learnerGroupId, setLearnerGroupId] = useState(0);
  const [learnerGroupsLoading, setLearnerGroupsLoading] = useState(false);
  const [learnerGroupAdding, setLearnerGroupAdding] = useState(false);
  const [learnerComparison, setLearnerComparison] = useState<LearnerComparisonRow[]>([]);
  const [learnerComparisonLoading, setLearnerComparisonLoading] = useState(false);
  const [learnerTrainingIds, setLearnerTrainingIds] = useState<number[]>([]);
  const [learnerScopeQuizzes, setLearnerScopeQuizzes] = useState<QuizAuthoringResponse[]>([]);
  const [learnerQuizIds, setLearnerQuizIds] = useState<number[]>([]);
  const [learnerScopeLoading, setLearnerScopeLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detail, setDetail] = useState<ManagedQuizAttemptDetailResponse | null>(null);
  const [detailQuiz, setDetailQuiz] = useState<QuizFullAuthoringResponse | null>(null);

  useEffect(() => {
    if (!user || !["FORMATEUR", "ADMIN"].includes(user.role)) {
      return;
    }

    let cancelled = false;
    setLoadingTrainings(true);
    setTrainingLoadError("");

    const request =
      user.role === "ADMIN" ? getAdminTrainings() : getTrainingsByTrainer(user.id);

    void request
      .then((items) => {
        if (cancelled) {
          return;
        }
        setTrainings(items);
        setFormationTrainingId((current) =>
          current && items.some((item) => item.id === current)
            ? current
            : (items[0]?.id ?? 0),
        );
        setQuizTrainingId((current) =>
          current && items.some((item) => item.id === current)
            ? current
            : (items[0]?.id ?? 0),
        );
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setTrainingLoadError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTrainings(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || !["FORMATEUR", "ADMIN"].includes(user.role)) {
      return;
    }

    let cancelled = false;
    setPathsLoading(true);
    setPathError("");

    void getLearningPaths()
      .then((items) => {
        if (cancelled) {
          return;
        }
        setPaths(items);
        setPathId((current) =>
          current && items.some((item) => item.id === current)
            ? current
            : (items[0]?.id ?? 0),
        );
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setPathError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPathsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setFormationEnrollments([]);
    setFormationLearners([]);
    setFormationError("");

    if (!formationTrainingId || !user) {
      return;
    }

    let cancelled = false;
    setFormationLoading(true);

    const request =
      user.role === "ADMIN"
        ? getEnrollmentsByTrainingSafe(formationTrainingId)
        : getEnrollmentsByTraining(formationTrainingId);

    void request
      .then(async (items) => {
        const learnerIds = [...new Set(items.map((item) => item.learnerId))];
        let identities: AuthUser[] = [];
        if (learnerIds.length) {
          try {
            identities = await resolveTrainerLearners(learnerIds);
          } catch {
            identities = [];
          }
        }

        if (!cancelled) {
          setFormationEnrollments(items);
          setFormationLearners(identities);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setFormationError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFormationLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [formationTrainingId, user]);

  useEffect(() => {
    setQuizzes([]);
    setQuizId(0);
    setAttempts([]);
    setQuizLearners([]);
    setQuizFull(null);
    setQuizError("");

    if (!quizTrainingId) {
      return;
    }

    let cancelled = false;
    setLoadingQuizzes(true);

    void getManageableQuizzesByTraining(quizTrainingId)
      .then((items) => {
        if (cancelled) {
          return;
        }
        setQuizzes(items);
        setQuizId((current) =>
          current && items.some((item) => item.id === current)
            ? current
            : (items[0]?.id ?? 0),
        );
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setQuizError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingQuizzes(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [quizTrainingId]);

  useEffect(() => {
    setAttempts([]);
    setQuizLearners([]);
    setQuizFull(null);
    setQuizError("");

    if (!quizId) {
      return;
    }

    let cancelled = false;
    setLoadingAttempts(true);

    void Promise.all([getManagedQuizAttempts(quizId), getManageableQuizFull(quizId)])
      .then(async ([attemptItems, fullQuiz]) => {
        const learnerIds = [
          ...new Set(attemptItems.map((attempt) => attempt.learnerId)),
        ];
        let learnerItems: AuthUser[] = [];

        if (learnerIds.length) {
          try {
            learnerItems = await resolveTrainerLearners(learnerIds);
          } catch {
            learnerItems = [];
          }
        }

        if (!cancelled) {
          setAttempts(attemptItems);
          setQuizFull(fullQuiz);
          setQuizLearners(learnerItems);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setQuizError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAttempts(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [quizId]);

  useEffect(() => {
    setPathProgress([]);
    setPathLearners([]);
    setPathError("");

    if (!pathId) {
      return;
    }

    let cancelled = false;
    setPathProgressLoading(true);

    void getLearningPathLearnerProgress(pathId)
      .then(async (items) => {
        const learnerIds = [...new Set(items.map((item) => item.learnerId))];
        let identities: AuthUser[] = [];
        if (learnerIds.length) {
          try {
            identities = await resolveTrainerLearners(learnerIds);
          } catch {
            identities = [];
          }
        }

        if (!cancelled) {
          setPathProgress(items);
          setPathLearners(identities);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setPathError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPathProgressLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathId]);

  useEffect(() => {
    if (activeTab !== "APPRENANTS" || !user) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLearnerSearchLoading(true);
      setLearnerError("");

      void searchTrainerLearners(learnerQuery.trim(), 50)
        .then((items) => {
          if (!cancelled) {
            setLearnerOptions((current) => {
              const byId = new Map(current.map((item) => [item.id, item]));
              items.forEach((item) => byId.set(item.id, item));
              return Array.from(byId.values());
            });
          }
        })
        .catch((requestError: unknown) => {
          if (!cancelled) {
            setLearnerError(getApiErrorMessage(requestError));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLearnerSearchLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, learnerQuery, user]);

  useEffect(() => {
    setLearnerScopeQuizzes([]);
    setLearnerQuizIds([]);
    setLearnerError("");

    if (activeTab !== "APPRENANTS" || !learnerTrainingIds.length) {
      return;
    }

    let cancelled = false;
    setLearnerScopeLoading(true);

    void Promise.all(
      learnerTrainingIds.map((trainingId) =>
        getManageableQuizzesByTraining(trainingId),
      ),
    )
      .then((groups) => {
        if (cancelled) {
          return;
        }

        const byId = new Map<number, QuizAuthoringResponse>();
        groups.flat().forEach((quiz) => byId.set(quiz.id, quiz));
        setLearnerScopeQuizzes(Array.from(byId.values()));
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setLearnerError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLearnerScopeLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, learnerTrainingIds]);

  useEffect(() => {
    if (activeTab !== "APPRENANTS" || !user) {
      return;
    }

    let cancelled = false;
    setLearnerGroupsLoading(true);

    void getLearnerGroups()
      .then((items) => {
        if (!cancelled) {
          setLearnerGroups(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLearnerGroups([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLearnerGroupsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, user]);

  useEffect(() => {
    if (!selectedLearnerIds.length) {
      setSelectedLearnerId(0);
      return;
    }

    setSelectedLearnerId((current) =>
      selectedLearnerIds.includes(current) ? current : selectedLearnerIds[0],
    );
  }, [selectedLearnerIds]);

  useEffect(() => {
    setLearnerComparison([]);

    if (!selectedLearnerIds.length || !learnerQuizIds.length) {
      return;
    }

    let cancelled = false;
    const quizScope = new Set(learnerQuizIds);
    setLearnerComparisonLoading(true);

    void Promise.all(
      selectedLearnerIds.map(async (learnerId): Promise<LearnerComparisonRow> => {
        const [overviewResult, attemptsResult] = await Promise.allSettled([
          getTrainerLearnerOverview(learnerId),
          getManagedLearnerQuizAttempts(learnerId),
        ]);

        const scopedAttempts =
          attemptsResult.status === "fulfilled"
            ? attemptsResult.value.filter((attempt) =>
                quizScope.has(attempt.quizId),
              )
            : [];

        return {
          learnerId,
          overview:
            overviewResult.status === "fulfilled" ? overviewResult.value : null,
          attempts: scopedAttempts,
          error:
            overviewResult.status === "rejected" &&
            attemptsResult.status === "rejected"
              ? "Résultats indisponibles"
              : undefined,
        };
      }),
    )
      .then((rows) => {
        if (!cancelled) {
          setLearnerComparison(rows);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLearnerComparisonLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedLearnerIds, learnerQuizIds]);

  useEffect(() => {
    setLearnerOverview(null);
    setLearnerAttempts([]);
    setLearnerQuizMeta([]);
    setLearnerError("");

    if (!selectedLearnerId || !learnerQuizIds.length) {
      return;
    }

    let cancelled = false;
    const quizScope = new Set(learnerQuizIds);
    setLearnerLoading(true);

    void Promise.allSettled([
      getTrainerLearnerOverview(selectedLearnerId),
      getManagedLearnerQuizAttempts(selectedLearnerId),
    ])
      .then(async ([overviewResult, attemptsResult]) => {
        if (cancelled) {
          return;
        }

        if (overviewResult.status === "fulfilled") {
          setLearnerOverview(overviewResult.value);
        }

        if (attemptsResult.status === "fulfilled") {
          const attemptItems = attemptsResult.value.filter((attempt) =>
            quizScope.has(attempt.quizId),
          );
          setLearnerAttempts(attemptItems);

          const quizResults = await Promise.allSettled(
            learnerQuizIds.map((id) => getManageableQuizFull(id)),
          );
          if (!cancelled) {
            setLearnerQuizMeta(
              quizResults
                .filter(
                  (result): result is PromiseFulfilledResult<QuizFullAuthoringResponse> =>
                    result.status === "fulfilled",
                )
                .map((result) => result.value),
            );
          }
        }

        if (
          overviewResult.status === "rejected" &&
          attemptsResult.status === "rejected"
        ) {
          setLearnerError(getApiErrorMessage(attemptsResult.reason));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLearnerLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedLearnerId, learnerQuizIds]);

  const formationLearnerById = useMemo(
    () => new Map(formationLearners.map((learner) => [learner.id, learner])),
    [formationLearners],
  );

  const quizLearnerById = useMemo(
    () => new Map(quizLearners.map((learner) => [learner.id, learner])),
    [quizLearners],
  );

  const pathLearnerById = useMemo(
    () => new Map(pathLearners.map((learner) => [learner.id, learner])),
    [pathLearners],
  );

  const trainingById = useMemo(
    () => new Map(trainings.map((training) => [training.id, training])),
    [trainings],
  );

  const learnerQuizById = useMemo(
    () => new Map(learnerQuizMeta.map((quiz) => [quiz.id, quiz])),
    [learnerQuizMeta],
  );

  const quizAttemptNumbers = useMemo(() => attemptNumbers(attempts), [attempts]);
  const learnerAttemptNumbers = useMemo(
    () => attemptNumbers(learnerAttempts),
    [learnerAttempts],
  );

  const filteredAttempts = useMemo(() => {
    const needle = quizSearch.trim().toLocaleLowerCase("fr-FR");

    return attempts.filter((attempt) => {
      const learner = quizLearnerById.get(attempt.learnerId);
      const haystack = `${learnerName(learner)} ${learner?.email || ""} ${attempt.learnerId}`
        .toLocaleLowerCase("fr-FR");

      const textMatches = !needle || haystack.includes(needle);
      const resultMatches =
        resultFilter === "ALL" ||
        (resultFilter === "SUCCESS" && attempt.success === true) ||
        (resultFilter === "FAILED" && attempt.success === false) ||
        (resultFilter === "STARTED" && attempt.status === "STARTED");

      return textMatches && resultMatches;
    });
  }, [attempts, quizLearnerById, quizSearch, resultFilter]);

  const selectedFormationTraining = trainingById.get(formationTrainingId);
  const selectedQuizTraining = trainingById.get(quizTrainingId);
  const selectedQuiz = quizzes.find((quiz) => quiz.id === quizId);
  const selectedPath = paths.find((path) => path.id === pathId);
  const selectedLearners = selectedLearnerIds
    .map((id) => learnerOptions.find((learner) => learner.id === id))
    .filter((learner): learner is AuthUser => Boolean(learner));
  const selectedLearner = learnerOptions.find((learner) => learner.id === selectedLearnerId);
  const selectedLearnerTrainings = learnerTrainingIds
    .map((id) => trainings.find((training) => training.id === id))
    .filter((training): training is TrainingResponse => Boolean(training));
  const selectedLearnerQuizzes = learnerQuizIds
    .map((id) => learnerScopeQuizzes.find((quiz) => quiz.id === id))
    .filter((quiz): quiz is QuizAuthoringResponse => Boolean(quiz));
  const comparisonByLearnerId = new Map(
    learnerComparison.map((row) => [row.learnerId, row]),
  );
  const focusedLearnerScopeStats = quizScopeStats(learnerAttempts);

  const formationCompleted = formationEnrollments.filter(
    (item) => item.status === "COMPLETED",
  ).length;
  const formationAverageProgress = formationEnrollments.length
    ? Math.round(
        formationEnrollments.reduce(
          (sum, item) => sum + (item.progressPercentage || 0),
          0,
        ) / formationEnrollments.length,
      )
    : null;
  const formationOverdue = formationEnrollments.filter((item) => {
    if (!item.dueAt || item.status === "COMPLETED") {
      return false;
    }
    const due = new Date(item.dueAt).getTime();
    return Number.isFinite(due) && due < Date.now();
  }).length;

  const submittedAttempts = attempts.filter((attempt) => attempt.status === "SUBMITTED");
  const uniqueQuizLearners = new Set(attempts.map((attempt) => attempt.learnerId)).size;
  const scorableAttempts = submittedAttempts.filter(
    (attempt) => scorePercent(attempt) != null,
  );
  const averageScore = scorableAttempts.length
    ? Math.round(
        scorableAttempts.reduce(
          (sum, attempt) => sum + (scorePercent(attempt) || 0),
          0,
        ) / scorableAttempts.length,
      )
    : null;
  const passRate = submittedAttempts.length
    ? Math.round(
        (submittedAttempts.filter((attempt) => attempt.success === true).length * 100) /
          submittedAttempts.length,
      )
    : null;

  const pathCompleted = pathProgress.filter((item) => item.completed).length;
  const pathAverageProgress = pathProgress.length
    ? Math.round(
        pathProgress.reduce(
          (sum, item) => sum + item.overallProgressPercentage,
          0,
        ) / pathProgress.length,
      )
    : null;
  const pathTotalSteps = pathProgress[0]?.totalSteps ?? null;

  async function openAttemptDetail(
    attempt: ManagedQuizAttemptResponse,
    fullQuiz?: QuizFullAuthoringResponse | null,
  ) {
    setDetailOpen(true);
    setDetail(null);
    setDetailQuiz(fullQuiz || null);
    setDetailError("");
    setDetailLoading(true);

    try {
      setDetail(await getManagedQuizAttemptDetail(attempt.id));
    } catch (requestError) {
      setDetailError(getApiErrorMessage(requestError));
    } finally {
      setDetailLoading(false);
    }
  }

  function quizSummaryRows(sourceAttempts: ManagedQuizAttemptResponse[]): unknown[][] {
    return [
      [
        "Formation",
        "Quiz",
        "Apprenant",
        "Email",
        "Tentative",
        "Statut",
        "Score %",
        "Score points",
        "Total points",
        "Début",
        "Soumission",
      ],
      ...sourceAttempts.map((attempt) => {
        const learner = quizLearnerById.get(attempt.learnerId);
        return [
          selectedQuizTraining?.title || "",
          selectedQuiz?.title || "",
          learnerName(learner),
          learner?.email || "",
          quizAttemptNumbers.get(attempt.id) || 1,
          attemptStatus(attempt).label,
          scorePercent(attempt),
          attempt.score,
          attempt.totalPoints,
          formatDateTime(attempt.startedAt),
          formatDateTime(attempt.submittedAt),
        ];
      }),
    ];
  }

  function attemptDetailRows(
    detailAttempt: ManagedQuizAttemptDetailResponse,
    fullQuiz: QuizFullAuthoringResponse | null,
    learner?: AuthUser,
    attemptNumber = 1,
  ): unknown[][] {
    return detailAttempt.answers.map((answer) => {
      const question = fullQuiz?.questions.find((item) => item.id === answer.questionId);
      return [
        trainingById.get(fullQuiz?.trainingId || 0)?.title || selectedQuizTraining?.title || "",
        fullQuiz?.title || selectedQuiz?.title || "",
        learnerName(learner),
        learner?.email || "",
        attemptNumber,
        formatDateTime(detailAttempt.startedAt),
        formatDateTime(detailAttempt.submittedAt),
        question?.content || `Question #${answer.questionId}`,
        humanizeLearnerAnswer(answer, question),
        humanizeCorrectAnswer(question),
        answer.correct === true ? "Correcte" : answer.correct === false ? "Incorrecte" : "Non évaluée",
        answer.pointsEarned ?? 0,
        question?.points ?? "",
      ];
    });
  }

  function exportQuizSummary() {
    if (!selectedQuiz || !selectedQuizTraining || !filteredAttempts.length) {
      return;
    }

    downloadCsv(
      `SmartTraining_Quiz_${exportFilePart(selectedQuiz.title)}_Synthese_${exportDateStamp()}.csv`,
      quizSummaryRows(filteredAttempts),
    );
  }

  async function exportQuizDetail() {
    if (!selectedQuiz || !selectedQuizTraining || !filteredAttempts.length) {
      return;
    }

    setQuizExporting("detail");
    setQuizError("");

    try {
      const details = await Promise.all(
        filteredAttempts.map((attempt) => getManagedQuizAttemptDetail(attempt.id)),
      );
      const rows: unknown[][] = [
        [
          "Formation",
          "Quiz",
          "Apprenant",
          "Email",
          "Tentative",
          "Début",
          "Soumission",
          "Question",
          "Réponse donnée",
          "Bonne réponse",
          "Résultat question",
          "Points obtenus",
          "Points maximum",
        ],
      ];

      details.forEach((detailAttempt) => {
        rows.push(
          ...attemptDetailRows(
            detailAttempt,
            quizFull,
            quizLearnerById.get(detailAttempt.learnerId),
            quizAttemptNumbers.get(detailAttempt.id) || 1,
          ),
        );
      });

      downloadCsv(
        `SmartTraining_Quiz_${exportFilePart(selectedQuiz.title)}_Reponses-detaillees_${exportDateStamp()}.csv`,
        rows,
      );
    } catch (requestError) {
      setQuizError(getApiErrorMessage(requestError));
    } finally {
      setQuizExporting(null);
    }
  }

  function exportCurrentAttempt() {
    if (!detail || !detailQuiz) {
      return;
    }

    const learner =
      quizLearnerById.get(detail.learnerId) ||
      learnerOptions.find((item) => item.id === detail.learnerId);
    const number =
      quizAttemptNumbers.get(detail.id) || learnerAttemptNumbers.get(detail.id) || 1;
    const rows: unknown[][] = [
      [
        "Formation",
        "Quiz",
        "Apprenant",
        "Email",
        "Tentative",
        "Début",
        "Soumission",
        "Question",
        "Réponse donnée",
        "Bonne réponse",
        "Résultat question",
        "Points obtenus",
        "Points maximum",
      ],
      ...attemptDetailRows(detail, detailQuiz, learner, number),
    ];

    downloadCsv(
      `SmartTraining_Quiz_${exportFilePart(detailQuiz.title)}_Tentative-${number}_${exportDateStamp()}.csv`,
      rows,
    );
  }

  async function addSelectedGroup() {
    if (!learnerGroupId) {
      return;
    }

    setLearnerGroupAdding(true);
    setLearnerError("");

    try {
      const members = await getLearnerGroupMembers(learnerGroupId);
      const memberIds = [...new Set(members.map((member) => member.learnerId))];

      let identities: AuthUser[] = [];
      if (memberIds.length) {
        try {
          identities = await resolveTrainerLearners(memberIds);
        } catch {
          identities = members.map((member) => ({
            id: member.learnerId,
            fullName: member.fullName || undefined,
            email: member.email || "",
            role: "APPRENANT",
          }));
        }
      }

      setLearnerOptions((current) => {
        const byId = new Map(current.map((item) => [item.id, item]));
        identities.forEach((item) => byId.set(item.id, item));
        return Array.from(byId.values());
      });

      setSelectedLearnerIds((current) => [
        ...new Set([...current, ...memberIds]),
      ]);
    } catch (requestError) {
      setLearnerError(getApiErrorMessage(requestError));
    } finally {
      setLearnerGroupAdding(false);
    }
  }

  function exportSelectedLearnersSummary() {
    if (!selectedLearnerIds.length || !learnerQuizIds.length) {
      return;
    }

    const rows: unknown[][] = [];

    for (const learnerId of selectedLearnerIds) {
      const learner = learnerOptions.find((item) => item.id === learnerId);
      const comparison = comparisonByLearnerId.get(learnerId);

      for (const quizId of learnerQuizIds) {
        const quiz = learnerScopeQuizzes.find((item) => item.id === quizId);
        const quizAttempts = (comparison?.attempts || [])
          .filter((attempt) => attempt.quizId === quizId)
          .slice()
          .sort((left, right) => {
            const leftTime = new Date(
              left.submittedAt || left.startedAt || 0,
            ).getTime();
            const rightTime = new Date(
              right.submittedAt || right.startedAt || 0,
            ).getTime();
            return rightTime - leftTime || right.id - left.id;
          });

        const scored = quizAttempts
          .map(scorePercent)
          .filter((value): value is number => value != null);
        const bestScore = scored.length ? Math.max(...scored) : null;
        const lastAttempt = quizAttempts[0];
        const lastScore = lastAttempt ? scorePercent(lastAttempt) : null;
        const status = quizAttempts.some((attempt) => attempt.success === true)
          ? "Réussi"
          : quizAttempts.some((attempt) => attempt.status === "SUBMITTED")
            ? "Non réussi"
            : quizAttempts.length
              ? "En cours"
              : "Non tenté";

        rows.push([
          learnerName(learner),
          learner?.email || "",
          trainingById.get(quiz?.trainingId || 0)?.title ||
            `Formation #${quiz?.trainingId || ""}`,
          quiz?.title || `Quiz #${quizId}`,
          quizAttempts.length,
          status,
          bestScore,
          lastScore,
          formatDateTime(lastAttempt?.submittedAt || lastAttempt?.startedAt),
        ]);
      }
    }

    downloadCsv(
      `SmartTraining_Resultats_Croises_${exportDateStamp()}.csv`,
      [
        [
          "Apprenant",
          "Email",
          "Formation",
          "Quiz",
          "Tentatives",
          "Statut",
          "Meilleur score (%)",
          "Dernier score (%)",
          "Dernière activité",
        ],
        ...rows,
      ],
    );
  }

  async function exportFormation() {
    if (!formationTrainingId) {
      return;
    }
    setFormationExporting(true);
    setFormationError("");
    try {
      await downloadTrainingLearnersCsv(formationTrainingId);
    } catch (requestError) {
      setFormationError(getApiErrorMessage(requestError));
    } finally {
      setFormationExporting(false);
    }
  }

  async function exportPath(kind: "summary" | "detail") {
    if (!pathId) {
      return;
    }
    setPathExporting(kind);
    setPathError("");
    try {
      if (kind === "detail") {
        await downloadLearningPathLearnersDetailCsv(pathId);
      } else {
        await downloadLearningPathLearnersCsv(pathId);
      }
    } catch (requestError) {
      setPathError(getApiErrorMessage(requestError));
    } finally {
      setPathExporting(null);
    }
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow="Reporting"
        title="Résultats & rapports"
        description="Un seul espace pour consulter et télécharger les résultats pédagogiques. Les tableaux de bord et indicateurs globaux restent dans Statistiques."
      />

      <SmartSectionCard>
        <Tabs
          value={activeTab}
          onChange={(_, value: ReportingTab) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab value="FORMATIONS" label="Formations" icon={<BookOpen size={18} />} iconPosition="start" />
          <Tab value="QUIZ" label="Quiz" icon={<ClipboardCheck size={18} />} iconPosition="start" />
          <Tab value="PARCOURS" label="Parcours" icon={<Route size={18} />} iconPosition="start" />
          <Tab value="APPRENANTS" label="Apprenants" icon={<Users size={18} />} iconPosition="start" />
        </Tabs>
      </SmartSectionCard>

      {trainingLoadError ? <Alert severity="error">{trainingLoadError}</Alert> : null}

      {activeTab === "FORMATIONS" ? (
        <SmartSectionCard
          title="Résultats formation"
          description="Participants, progression, statut et export CSV dans cette page."
        >
          <Stack spacing={2.5}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl fullWidth disabled={loadingTrainings}>
                <InputLabel id="formation-result-training-label">Formation</InputLabel>
                <Select
                  labelId="formation-result-training-label"
                  value={formationTrainingId || ""}
                  label="Formation"
                  onChange={(event) => setFormationTrainingId(Number(event.target.value))}
                >
                  {trainings.map((training) => (
                    <MenuItem key={training.id} value={training.id}>
                      {training.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                disabled={!formationTrainingId || formationExporting}
                onClick={() => void exportFormation()}
                sx={{ minWidth: { md: 240 } }}
              >
                {formationExporting ? "Export…" : "Télécharger CSV participants"}
              </Button>
            </Stack>

            {formationError ? <Alert severity="error">{formationError}</Alert> : null}

            {formationLoading ? (
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", py: 2 }}>
                <CircularProgress size={22} />
                <Typography color="text.secondary">Chargement des participants…</Typography>
              </Stack>
            ) : null}

            {selectedFormationTraining && !formationLoading ? (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      xl: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: 2,
                  }}
                >
                  <SmartMetricCard label="Participants" value={formationEnrollments.length} icon={<Users />} />
                  <SmartMetricCard label="Terminées" value={formationCompleted} icon={<ClipboardCheck />} />
                  <SmartMetricCard
                    label="Progression moyenne"
                    value={formationAverageProgress == null ? "—" : `${formationAverageProgress} %`}
                    icon={<BarChart3 />}
                  />
                  <SmartMetricCard label="En retard" value={formationOverdue} icon={<BookOpen />} />
                </Box>

                {!formationEnrollments.length ? (
                  <SmartEmptyState
                    icon={<Users />}
                    title="Aucun participant"
                    description="Aucune inscription n’est actuellement rattachée à cette formation."
                  />
                ) : (
                  <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Apprenant</TableCell>
                          <TableCell>Statut</TableCell>
                          <TableCell align="right">Progression</TableCell>
                          <TableCell>Inscription</TableCell>
                          <TableCell>Échéance</TableCell>
                          <TableCell>Complétion</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formationEnrollments.map((enrollment) => {
                          const learner = formationLearnerById.get(enrollment.learnerId);
                          return (
                            <TableRow key={enrollment.id} hover>
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                    {learnerName(learner)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {learner?.email || `ID ${enrollment.learnerId}`}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <SmartStatusChip
                                  label={enrollmentStatusLabel(enrollment.status)}
                                  tone={enrollmentTone(enrollment.status)}
                                />
                              </TableCell>
                              <TableCell align="right">
                                {Math.round(enrollment.progressPercentage || 0)} %
                              </TableCell>
                              <TableCell>{formatDate(enrollment.enrolledAt)}</TableCell>
                              <TableCell>{formatDate(enrollment.dueAt)}</TableCell>
                              <TableCell>{formatDate(enrollment.completedAt)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            ) : null}
          </Stack>
        </SmartSectionCard>
      ) : null}

      {activeTab === "QUIZ" ? (
        <SmartSectionCard
          title="Résultats Quiz"
          description="Choisissez une formation puis un quiz. Consultez les tentatives, ouvrez les réponses et téléchargez la synthèse ou le détail."
        >
          <Stack spacing={2.5}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                gap: 2,
              }}
            >
              <FormControl fullWidth disabled={loadingTrainings}>
                <InputLabel id="reporting-training-label">Formation</InputLabel>
                <Select
                  labelId="reporting-training-label"
                  value={quizTrainingId || ""}
                  label="Formation"
                  onChange={(event) => setQuizTrainingId(Number(event.target.value))}
                >
                  {trainings.map((training) => (
                    <MenuItem key={training.id} value={training.id}>
                      {training.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth disabled={!quizTrainingId || loadingQuizzes}>
                <InputLabel id="reporting-quiz-label">Quiz</InputLabel>
                <Select
                  labelId="reporting-quiz-label"
                  value={quizId || ""}
                  label="Quiz"
                  onChange={(event) => setQuizId(Number(event.target.value))}
                >
                  {quizzes.map((quiz) => (
                    <MenuItem key={quiz.id} value={quiz.id}>
                      {quiz.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {quizError ? <Alert severity="error">{quizError}</Alert> : null}

            {loadingTrainings || loadingQuizzes || loadingAttempts ? (
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", py: 2 }}>
                <CircularProgress size={22} />
                <Typography color="text.secondary">Chargement des résultats…</Typography>
              </Stack>
            ) : null}

            {!loadingTrainings && !trainings.length ? (
              <SmartEmptyState
                icon={<BookOpen />}
                title="Aucune formation disponible"
                description="Aucune formation exploitable n’est visible avec ce compte."
              />
            ) : null}

            {quizTrainingId && !loadingQuizzes && !quizzes.length ? (
              <SmartEmptyState
                icon={<ClipboardCheck />}
                title="Aucun quiz pour cette formation"
                description="Cette formation ne contient pas encore de quiz gérable."
              />
            ) : null}

            {selectedQuizTraining && selectedQuiz && !loadingAttempts ? (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      xl: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: 2,
                  }}
                >
                  <SmartMetricCard label="Tentatives" value={attempts.length} helper={selectedQuiz.title} icon={<ClipboardCheck />} />
                  <SmartMetricCard label="Apprenants" value={uniqueQuizLearners} helper="Apprenants uniques" icon={<Users />} />
                  <SmartMetricCard label="Score moyen" value={averageScore == null ? "—" : `${averageScore} %`} helper="Tentatives soumises" icon={<BarChart3 />} />
                  <SmartMetricCard label="Taux de réussite" value={passRate == null ? "—" : `${passRate} %`} helper="Tentatives soumises" icon={<BarChart3 />} />
                </Box>

                <Stack
                  direction={{ xs: "column", xl: "row" }}
                  spacing={2}
                  sx={{ alignItems: { xs: "stretch", xl: "center" } }}
                >
                  <TextField
                    fullWidth
                    label="Rechercher un apprenant"
                    value={quizSearch}
                    onChange={(event) => setQuizSearch(event.target.value)}
                    placeholder="Nom, e-mail ou identifiant"
                  />

                  <FormControl sx={{ minWidth: { xs: "100%", xl: 220 } }}>
                    <InputLabel id="reporting-result-filter-label">Résultat</InputLabel>
                    <Select
                      labelId="reporting-result-filter-label"
                      value={resultFilter}
                      label="Résultat"
                      onChange={(event) => setResultFilter(event.target.value)}
                    >
                      <MenuItem value="ALL">Tous</MenuItem>
                      <MenuItem value="SUCCESS">Réussis</MenuItem>
                      <MenuItem value="FAILED">Échoués</MenuItem>
                      <MenuItem value="STARTED">En cours</MenuItem>
                    </Select>
                  </FormControl>

                  <Button
                    variant="outlined"
                    disabled={!filteredAttempts.length || quizExporting !== null}
                    onClick={exportQuizSummary}
                    sx={{ minWidth: 180 }}
                  >
                    CSV synthèse
                  </Button>
                  <Button
                    variant="contained"
                    disabled={!filteredAttempts.length || quizExporting !== null}
                    onClick={() => void exportQuizDetail()}
                    sx={{ minWidth: 220 }}
                  >
                    {quizExporting === "detail" ? "Préparation…" : "CSV réponses détaillées"}
                  </Button>
                </Stack>

                {!attempts.length ? (
                  <SmartEmptyState
                    icon={<ClipboardCheck />}
                    title="Aucune tentative"
                    description="Aucun apprenant n’a encore démarré ce quiz."
                  />
                ) : filteredAttempts.length ? (
                  <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Apprenant</TableCell>
                          <TableCell>Tentative</TableCell>
                          <TableCell>Résultat</TableCell>
                          <TableCell align="right">Score</TableCell>
                          <TableCell>Début</TableCell>
                          <TableCell>Soumission</TableCell>
                          <TableCell align="right">Détail</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredAttempts
                          .slice()
                          .sort((a, b) => {
                            const aTime = new Date(a.submittedAt || a.startedAt || 0).getTime();
                            const bTime = new Date(b.submittedAt || b.startedAt || 0).getTime();
                            return bTime - aTime || b.id - a.id;
                          })
                          .map((attempt) => {
                            const learner = quizLearnerById.get(attempt.learnerId);
                            const status = attemptStatus(attempt);
                            const percent = scorePercent(attempt);

                            return (
                              <TableRow key={attempt.id} hover>
                                <TableCell>
                                  <Stack spacing={0.25}>
                                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                      {learnerName(learner)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {learner?.email || `ID ${attempt.learnerId}`}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>#{quizAttemptNumbers.get(attempt.id) || 1}</TableCell>
                                <TableCell>
                                  <SmartStatusChip label={status.label} tone={status.tone} />
                                </TableCell>
                                <TableCell align="right">{percent == null ? "—" : `${percent} %`}</TableCell>
                                <TableCell>{formatDateTime(attempt.startedAt)}</TableCell>
                                <TableCell>{formatDateTime(attempt.submittedAt)}</TableCell>
                                <TableCell align="right">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => void openAttemptDetail(attempt, quizFull)}
                                  >
                                    Voir détail
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <SmartEmptyState
                    icon={<Users />}
                    title="Aucun résultat pour ces filtres"
                    description="Modifiez la recherche ou le filtre de résultat."
                  />
                )}
              </>
            ) : null}
          </Stack>
        </SmartSectionCard>
      ) : null}

      {activeTab === "PARCOURS" ? (
        <SmartSectionCard
          title="Résultats parcours"
          description="Suivez les apprenants et téléchargez la synthèse ou le détail sans quitter cette page."
        >
          <Stack spacing={2.5}>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={2}>
              <FormControl fullWidth disabled={pathsLoading}>
                <InputLabel id="reporting-path-label">
                  Parcours / version
                </InputLabel>
                <Select
                  labelId="reporting-path-label"
                  value={pathId || ""}
                  label="Parcours / version"
                  onChange={(event) => setPathId(Number(event.target.value))}
                >
                  {[...paths]
                    .sort(
                      (left, right) =>
                        left.title.localeCompare(right.title, "fr") ||
                        (right.versionNumber ?? 0) -
                          (left.versionNumber ?? 0),
                    )
                    .map((path) => (
                      <MenuItem key={path.id} value={path.id}>
                        {learningPathOptionLabel(path)}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                disabled={!pathId || pathExporting !== null}
                onClick={() => void exportPath("summary")}
                sx={{ minWidth: 180 }}
              >
                {pathExporting === "summary" ? "Export…" : "CSV synthèse"}
              </Button>
              <Button
                variant="contained"
                disabled={!pathId || pathExporting !== null}
                onClick={() => void exportPath("detail")}
                sx={{ minWidth: 180 }}
              >
                {pathExporting === "detail" ? "Export…" : "CSV détail"}
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Les versions d’un même parcours sont affichées séparément pour
              permettre de consulter l’historique. Choisissez explicitement la
              version que vous souhaitez analyser.
            </Typography>

            {pathError ? <Alert severity="error">{pathError}</Alert> : null}

            {pathsLoading || pathProgressLoading ? (
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", py: 2 }}>
                <CircularProgress size={22} />
                <Typography color="text.secondary">Chargement des résultats parcours…</Typography>
              </Stack>
            ) : null}

            {!pathsLoading && !paths.length ? (
              <SmartEmptyState
                icon={<Route />}
                title="Aucun parcours disponible"
                description="Aucun parcours gérable n’est visible avec ce compte."
              />
            ) : null}

            {selectedPath && !pathProgressLoading ? (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      xl: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: 2,
                  }}
                >
                  <SmartMetricCard label="Apprenants" value={pathProgress.length} icon={<Users />} />
                  <SmartMetricCard label="Parcours terminés" value={pathCompleted} icon={<ClipboardCheck />} />
                  <SmartMetricCard label="Progression moyenne" value={pathAverageProgress == null ? "—" : `${pathAverageProgress} %`} icon={<BarChart3 />} />
                  <SmartMetricCard label="Étapes" value={pathTotalSteps == null ? "—" : pathTotalSteps} icon={<Route />} />
                </Box>

                {!pathProgress.length ? (
                  <SmartEmptyState
                    icon={<Users />}
                    title="Aucun apprenant affecté"
                    description="Aucun résultat apprenant n’est disponible pour ce parcours."
                  />
                ) : (
                  <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Apprenant</TableCell>
                          <TableCell align="right">Progression</TableCell>
                          <TableCell>Étapes terminées</TableCell>
                          <TableCell>Statut</TableCell>
                          <TableCell>Échéance</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pathProgress.map((item) => {
                          const learner = pathLearnerById.get(item.learnerId);
                          return (
                            <TableRow key={item.learnerId} hover>
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                    {learnerName(learner)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {learner?.email || `ID ${item.learnerId}`}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell align="right">{Math.round(item.overallProgressPercentage)} %</TableCell>
                              <TableCell>{item.completedSteps} / {item.totalSteps}</TableCell>
                              <TableCell>
                                <SmartStatusChip
                                  label={item.completed ? "Terminé" : "En cours"}
                                  tone={item.completed ? "success" : "info"}
                                />
                              </TableCell>
                              <TableCell>{formatDate(item.pathDueAt)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            ) : null}
          </Stack>
        </SmartSectionCard>
      ) : null}

      {activeTab === "APPRENANTS" ? (
        <SmartSectionCard
          title="Analyse croisée des apprenants"
          description="Définissez d’abord la population à analyser, puis choisissez une ou plusieurs formations et les Quiz à contrôler."
        >
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" color="text.secondary">
                1. Population
              </Typography>
              <Typography variant="h6">
                Qui souhaitez-vous analyser ?
              </Typography>
            </Box>

            <Autocomplete
              multiple
              options={learnerOptions}
              value={selectedLearners}
              inputValue={learnerQuery}
              loading={learnerSearchLoading}
              disableCloseOnSelect
              filterSelectedOptions
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) =>
                `${learnerName(option)}${option.email ? ` — ${option.email}` : ""}`
              }
              onInputChange={(_, value) => setLearnerQuery(value)}
              onChange={(_, values) =>
                setSelectedLearnerIds(values.map((learner) => learner.id))
              }
              noOptionsText="Aucun apprenant trouvé"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Rechercher et sélectionner des apprenants"
                  placeholder={
                    selectedLearnerIds.length
                      ? "Ajouter une autre personne…"
                      : "Tapez un nom ou un e-mail…"
                  }
                  helperText="Vous pouvez sélectionner plusieurs personnes."
                />
              )}
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "minmax(0, 1fr) auto auto",
                },
                gap: 1.5,
                alignItems: "center",
              }}
            >
              <FormControl fullWidth disabled={learnerGroupsLoading}>
                <InputLabel id="reporting-learner-group-label">
                  Ajouter un groupe à la sélection
                </InputLabel>
                <Select
                  labelId="reporting-learner-group-label"
                  value={learnerGroupId || ""}
                  label="Ajouter un groupe à la sélection"
                  onChange={(event) => setLearnerGroupId(Number(event.target.value))}
                >
                  {learnerGroups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name} — {group.memberCount} membre{group.memberCount > 1 ? "s" : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                disabled={!learnerGroupId || learnerGroupAdding}
                onClick={() => void addSelectedGroup()}
              >
                {learnerGroupAdding ? "Ajout…" : "Ajouter le groupe"}
              </Button>

              <Button
                variant="text"
                disabled={!selectedLearnerIds.length}
                onClick={() => {
                  setSelectedLearnerIds([]);
                  setSelectedLearnerId(0);
                  setLearnerGroupId(0);
                }}
              >
                Effacer la population
              </Button>
            </Box>

            <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2.5 }}>
              <Typography variant="overline" color="text.secondary">
                2. Périmètre pédagogique
              </Typography>
              <Typography variant="h6">
                Quels Quiz souhaitez-vous contrôler ?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vous pouvez croiser plusieurs apprenants ou groupes avec plusieurs formations et plusieurs Quiz.
              </Typography>
            </Box>

            <Autocomplete
              multiple
              options={trainings}
              value={selectedLearnerTrainings}
              disableCloseOnSelect
              filterSelectedOptions
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option.title}
              onChange={(_, values) => {
                setLearnerTrainingIds(values.map((training) => training.id));
                setLearnerQuizIds([]);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Formation(s)"
                  placeholder={
                    learnerTrainingIds.length
                      ? "Ajouter une formation…"
                      : "Choisissez une ou plusieurs formations…"
                  }
                  helperText="Les Quiz disponibles seront chargés à partir de ces formations."
                />
              )}
            />

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              sx={{ alignItems: { xs: "stretch", md: "flex-start" } }}
            >
              <Autocomplete
                multiple
                sx={{ flex: 1 }}
                options={learnerScopeQuizzes}
                value={selectedLearnerQuizzes}
                loading={learnerScopeLoading}
                disabled={!learnerTrainingIds.length}
                disableCloseOnSelect
                filterSelectedOptions
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) =>
                  `${trainingById.get(option.trainingId)?.title || `Formation #${option.trainingId}`} — ${option.title}`
                }
                onChange={(_, values) =>
                  setLearnerQuizIds(values.map((quiz) => quiz.id))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Quiz à contrôler"
                    placeholder={
                      learnerQuizIds.length
                        ? "Ajouter un autre Quiz…"
                        : "Choisissez un ou plusieurs Quiz…"
                    }
                    helperText={
                      learnerTrainingIds.length
                        ? "Aucun Quiz n’est choisi automatiquement."
                        : "Choisissez d’abord au moins une formation."
                    }
                  />
                )}
              />

              <Button
                variant="outlined"
                disabled={
                  !learnerScopeQuizzes.length ||
                  learnerScopeLoading ||
                  learnerQuizIds.length === learnerScopeQuizzes.length
                }
                onClick={() =>
                  setLearnerQuizIds(
                    learnerScopeQuizzes.map((quiz) => quiz.id),
                  )
                }
              >
                Tous les Quiz
              </Button>

              <Button
                variant="text"
                disabled={!learnerQuizIds.length}
                onClick={() => setLearnerQuizIds([])}
              >
                Effacer les Quiz
              </Button>
            </Stack>

            {learnerError ? <Alert severity="error">{learnerError}</Alert> : null}

            {!selectedLearnerIds.length ? (
              <SmartEmptyState
                icon={<Users />}
                title="Choisissez la population"
                description="Sélectionnez une ou plusieurs personnes, ou ajoutez un groupe."
              />
            ) : !learnerQuizIds.length ? (
              <SmartEmptyState
                icon={<ClipboardCheck />}
                title="Choisissez les Quiz à contrôler"
                description="La comparaison ne démarre qu’après une sélection explicite d’un ou plusieurs Quiz."
              />
            ) : (
              <>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  sx={{ alignItems: { xs: "stretch", md: "center" } }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">
                      Analyse de {selectedLearnerIds.length} apprenant
                      {selectedLearnerIds.length > 1 ? "s" : ""} ×{" "}
                      {learnerQuizIds.length} Quiz
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Les indicateurs ci-dessous ne concernent que le périmètre sélectionné.
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    disabled={learnerComparisonLoading}
                    onClick={exportSelectedLearnersSummary}
                  >
                    Télécharger les résultats
                  </Button>
                </Stack>

                {learnerComparisonLoading ? (
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: "center", py: 2 }}
                  >
                    <CircularProgress size={22} />
                    <Typography color="text.secondary">
                      Calcul des résultats croisés…
                    </Typography>
                  </Stack>
                ) : (
                  <TableContainer
                    sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Apprenant</TableCell>
                          <TableCell align="right">Quiz couverts</TableCell>
                          <TableCell align="right">Tentatives</TableCell>
                          <TableCell align="right">Quiz réussis</TableCell>
                          <TableCell align="right">Score moyen</TableCell>
                          <TableCell>Dernière activité</TableCell>
                          <TableCell align="right">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedLearnerIds.map((learnerId) => {
                          const learner = learnerOptions.find(
                            (item) => item.id === learnerId,
                          );
                          const comparison = comparisonByLearnerId.get(learnerId);
                          const stats = quizScopeStats(
                            comparison?.attempts || [],
                          );

                          return (
                            <TableRow
                              key={learnerId}
                              hover
                              selected={learnerId === selectedLearnerId}
                            >
                              <TableCell>
                                <Stack spacing={0.25}>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 800 }}
                                  >
                                    {learnerName(learner)}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {learner?.email || `ID ${learnerId}`}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell align="right">
                                {stats.coveredQuizCount} / {learnerQuizIds.length}
                              </TableCell>
                              <TableCell align="right">
                                {stats.attemptCount}
                              </TableCell>
                              <TableCell align="right">
                                {stats.succeededQuizCount}
                              </TableCell>
                              <TableCell align="right">
                                {stats.averageBestScore == null
                                  ? "—"
                                  : `${stats.averageBestScore} %`}
                              </TableCell>
                              <TableCell>
                                {formatDateTime(stats.lastActivity)}
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant={
                                    learnerId === selectedLearnerId
                                      ? "contained"
                                      : "outlined"
                                  }
                                  onClick={() => setSelectedLearnerId(learnerId)}
                                >
                                  Voir détail
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {selectedLearner && !learnerLoading ? (
                  <>
                    <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2.5 }}>
                      <Typography variant="overline" color="text.secondary">
                        Détail de l’apprenant — périmètre sélectionné
                      </Typography>
                      <Typography variant="h6">
                        {learnerName(selectedLearner)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedLearner.email || `ID ${selectedLearner.id}`}
                      </Typography>
                      {learnerOverview ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 0.5 }}
                        >
                          Contexte global : {learnerOverview.summary.totalTrainings} formation
                          {learnerOverview.summary.totalTrainings > 1 ? "s" : ""} — progression moyenne{" "}
                          {Math.round(learnerOverview.summary.averageProgress || 0)} %.
                        </Typography>
                      ) : null}
                    </Box>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, minmax(0, 1fr))",
                          xl: "repeat(4, minmax(0, 1fr))",
                        },
                        gap: 2,
                      }}
                    >
                      <SmartMetricCard
                        label="Quiz sélectionnés"
                        value={learnerQuizIds.length}
                        icon={<ClipboardCheck />}
                      />
                      <SmartMetricCard
                        label="Quiz tentés"
                        value={focusedLearnerScopeStats.coveredQuizCount}
                        icon={<ClipboardCheck />}
                      />
                      <SmartMetricCard
                        label="Quiz réussis"
                        value={focusedLearnerScopeStats.succeededQuizCount}
                        icon={<ClipboardCheck />}
                      />
                      <SmartMetricCard
                        label="Score moyen"
                        value={
                          focusedLearnerScopeStats.averageBestScore == null
                            ? "—"
                            : `${focusedLearnerScopeStats.averageBestScore} %`
                        }
                        icon={<BarChart3 />}
                      />
                    </Box>

                    <SmartSectionCard
                      title="Résultats Quiz"
                      description="Uniquement les tentatives correspondant aux Quiz sélectionnés ci-dessus."
                    >
                      {!learnerAttempts.length ? (
                        <SmartEmptyState
                          icon={<ClipboardCheck />}
                          title="Aucune tentative sur ce périmètre"
                          description="Cet apprenant n’a pas encore de tentative sur les Quiz sélectionnés."
                        />
                      ) : (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Formation</TableCell>
                                <TableCell>Quiz</TableCell>
                                <TableCell>Tentative</TableCell>
                                <TableCell>Résultat</TableCell>
                                <TableCell align="right">Score</TableCell>
                                <TableCell>Soumission</TableCell>
                                <TableCell align="right">Détail</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {learnerAttempts
                                .slice()
                                .sort((a, b) => {
                                  const aTime = new Date(
                                    a.submittedAt || a.startedAt || 0,
                                  ).getTime();
                                  const bTime = new Date(
                                    b.submittedAt || b.startedAt || 0,
                                  ).getTime();
                                  return bTime - aTime || b.id - a.id;
                                })
                                .map((attempt) => {
                                  const meta = learnerQuizById.get(attempt.quizId);
                                  const status = attemptStatus(attempt);
                                  return (
                                    <TableRow key={attempt.id} hover>
                                      <TableCell>
                                        {trainingById.get(meta?.trainingId || 0)?.title ||
                                          `Formation #${meta?.trainingId || ""}`}
                                      </TableCell>
                                      <TableCell>
                                        {meta?.title || `Quiz #${attempt.quizId}`}
                                      </TableCell>
                                      <TableCell>
                                        #{learnerAttemptNumbers.get(attempt.id) || 1}
                                      </TableCell>
                                      <TableCell>
                                        <SmartStatusChip
                                          label={status.label}
                                          tone={status.tone}
                                        />
                                      </TableCell>
                                      <TableCell align="right">
                                        {scorePercent(attempt) == null
                                          ? "—"
                                          : `${scorePercent(attempt)} %`}
                                      </TableCell>
                                      <TableCell>
                                        {formatDateTime(attempt.submittedAt)}
                                      </TableCell>
                                      <TableCell align="right">
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          disabled={!meta}
                                          onClick={() =>
                                            void openAttemptDetail(
                                              attempt,
                                              meta || null,
                                            )
                                          }
                                        >
                                          Voir détail
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </SmartSectionCard>
                  </>
                ) : null}
              </>
            )}
          </Stack>
        </SmartSectionCard>
      ) : null}

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Détail de la tentative</DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", py: 4 }}>
              <CircularProgress size={24} />
              <Typography>Chargement du détail…</Typography>
            </Stack>
          ) : null}

          {detailError ? <Alert severity="error">{detailError}</Alert> : null}

          {detail ? (
            <Stack spacing={2.5}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
                  gap: 1.5,
                }}
              >
                <SmartMetricCard
                  label="Apprenant"
                  value={
                    learnerName(
                      quizLearnerById.get(detail.learnerId) ||
                        learnerOptions.find((item) => item.id === detail.learnerId),
                    )
                  }
                />
                <SmartMetricCard
                  label="Score"
                  value={scorePercent(detail) == null ? "—" : `${scorePercent(detail)} %`}
                  helper={detail.totalPoints ? `${detail.score || 0} / ${detail.totalPoints} points` : undefined}
                />
                <SmartMetricCard
                  label="Résultat"
                  value={attemptStatus(detail).label}
                  helper={formatDateTime(detail.submittedAt)}
                />
              </Box>

              <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Question</TableCell>
                      <TableCell>Réponse donnée</TableCell>
                      <TableCell>Bonne réponse</TableCell>
                      <TableCell>Résultat</TableCell>
                      <TableCell align="right">Points</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.answers.map((answer) => {
                      const question = detailQuiz?.questions.find(
                        (item) => item.id === answer.questionId,
                      );
                      return (
                        <TableRow key={answer.id}>
                          <TableCell sx={{ minWidth: 220 }}>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {question?.content || `Question #${answer.questionId}`}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ minWidth: 220 }}>
                            {humanizeLearnerAnswer(answer, question)}
                          </TableCell>
                          <TableCell sx={{ minWidth: 220 }}>
                            {humanizeCorrectAnswer(question)}
                          </TableCell>
                          <TableCell>
                            <SmartStatusChip
                              label={
                                answer.correct === true
                                  ? "Correcte"
                                  : answer.correct === false
                                    ? "Incorrecte"
                                    : "Non évaluée"
                              }
                              tone={answer.correct === true ? "success" : answer.correct === false ? "danger" : "neutral"}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {answer.pointsEarned ?? 0}
                            {question?.points != null ? ` / ${question.points}` : ""}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {!detail.answers.length ? (
                <SmartEmptyState
                  icon={<ClipboardCheck />}
                  title="Aucune réponse enregistrée"
                  description="Cette tentative ne contient pas de détail de réponse."
                />
              ) : null}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Fermer</Button>
          <Button
            variant="contained"
            disabled={!detail || !detailQuiz}
            onClick={exportCurrentAttempt}
          >
            Télécharger cette tentative
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
