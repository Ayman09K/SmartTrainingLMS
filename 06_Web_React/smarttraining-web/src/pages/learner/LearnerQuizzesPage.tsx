import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,  InputAdornment,
  LinearProgress,
  Radio,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileQuestion,
  GraduationCap,
  History,
  PlayCircle,
  RotateCcw,
  Search,
  Send,
  TimerReset,
} from "lucide-react";
import {
  Link,
  useOutletContext,
  useSearchParams,
} from "react-router-dom";
import {
  getLearnerQuiz,
  getLearnerQuizzesByTraining,
  getMyQuizAttempt,
  getMyQuizAttemptsForQuiz,
  startLearnerQuizAttempt,
  submitLearnerQuizAttempt,
} from "../../api/quizApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { getMyTrainings } from "../../api/trainingApi";
import { SmartPageHeader, SmartSectionCard } from "../../components/ui";
import type {
  LearnerQuestionResponse,
  LearnerQuizResponse,
  QuizAttemptFullResponse,
  QuizAttemptResponse,
  SubmittedAnswerRequest,
} from "../../types/evaluation";
import type { LearnerMyTrainingResponse } from "../../types/training";
// LEARNER_WEB_VISUAL_1_QUIZZES_DENSITY_SAFE_V1
interface QuizWithTraining {
  quiz: LearnerQuizResponse;
  training: LearnerMyTrainingResponse;
}

type SelectedAnswers = Record<number, SubmittedAnswerRequest>;

function attemptLabel(maxAttempts?: number | null): string {
  if (!maxAttempts || maxAttempts <= 0) {
    return "Tentatives non limitées";
  }

  return maxAttempts === 1
    ? "1 tentative maximum"
    : `${maxAttempts} tentatives maximum`;
}

function durationLabel(minutes?: number | null): string {
  if (!minutes || minutes <= 0) {
    return "Sans limite de temps";
  }

  return `${minutes} min`;
}

function normalizeQuizBackendDateTime(value: string): string {
  // Evaluation Service runs in UTC and serializes LocalDateTime without an
  // explicit offset. Browsers otherwise interpret that value as local time.
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    ? value
    : `${value}Z`;
}

function secondsRemaining(
  startedAt: string | null | undefined,
  limitMinutes: number | null | undefined,
): number | null {
  if (!startedAt || !limitMinutes || limitMinutes <= 0) {
    return null;
  }

  const started = new Date(normalizeQuizBackendDateTime(startedAt)).getTime();

  if (Number.isNaN(started)) {
    return null;
  }

  const deadline = started + limitMinutes * 60_000;

  return Math.max(
    0,
    Math.ceil((deadline - Date.now()) / 1000),
  );
}

function formatRemaining(seconds: number | null): string {
  if (seconds === null) {
    return "Sans limite";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

function isAnswered(
  question: LearnerQuestionResponse,
  selected: SelectedAnswers,
): boolean {
  const answer = selected[question.id];

  if (!answer) {
    return false;
  }

  if (
    question.type === "SINGLE_CHOICE" ||
    question.type === "MULTIPLE_CHOICE" ||
    question.type === "TRUE_FALSE"
  ) {
    return (answer.selectedOptionIds ?? []).length > 0;
  }

  if (question.type === "FILL_BLANK") {
    const blankIds = question.typeConfig?.blankIds ?? [];
    const answers = answer.blankAnswers ?? [];

    return (
      blankIds.length > 0 &&
      blankIds.every((blankId) =>
        answers.some(
          (entry) =>
            entry.blankId === blankId &&
            entry.value.trim().length > 0,
        ),
      )
    );
  }

  if (question.type === "ORDERING") {
    const configured = question.typeConfig?.orderingItems ?? [];
    const ids = answer.orderedItemIds ?? [];

    return (
      configured.length > 0 &&
      ids.length === configured.length &&
      new Set(ids).size === configured.length &&
      ids.every((id) => configured.some((item) => item.id === id))
    );
  }

  if (question.type === "MATCHING") {
    const left = question.typeConfig?.matchingLeft ?? [];
    const right = question.typeConfig?.matchingRight ?? [];
    const pairs = answer.matchingPairs ?? [];
    const leftIds = new Set(left.map((item) => item.id));
    const rightIds = new Set(right.map((item) => item.id));

    return (
      left.length > 0 &&
      right.length > 0 &&
      pairs.length === left.length &&
      new Set(pairs.map((pair) => pair.leftId)).size === left.length &&
      new Set(pairs.map((pair) => pair.rightId)).size === left.length &&
      pairs.every(
        (pair) =>
          leftIds.has(pair.leftId) &&
          rightIds.has(pair.rightId),
      )
    );
  }

  if (question.type === "DRAG_DROP") {
    const items = question.typeConfig?.dragItems ?? [];
    const zones = question.typeConfig?.dragZones ?? [];
    const placements = answer.dragPlacements ?? [];
    const itemIds = new Set(items.map((item) => item.id));
    const zoneIds = new Set(zones.map((zone) => zone.id));

    return (
      items.length > 0 &&
      zones.length > 0 &&
      placements.length === items.length &&
      new Set(placements.map((entry) => entry.itemId)).size ===
        items.length &&
      placements.every(
        (entry) =>
          itemIds.has(entry.itemId) &&
          zoneIds.has(entry.zoneId),
      )
    );
  }

  return (
    typeof answer.numericValue === "number" &&
    Number.isFinite(answer.numericValue)
  );
}
function normalizeQuestionType(
  question: LearnerQuestionResponse,
): "radio" | "checkbox" {
  return question.type === "MULTIPLE_CHOICE"
    ? "checkbox"
    : "radio";
}

function scorePercentage(
  attempt: QuizAttemptResponse,
): number {
  const score = attempt.score ?? 0;
  const total = attempt.totalPoints ?? 0;

  if (total <= 0) {
    return 0;
  }

  return Math.round((score * 100) / total);
}

function attemptStatusLabel(
  status: QuizAttemptResponse["status"],
): string {
  if (status === "STARTED") {
    return "En cours";
  }

  if (status === "SUBMITTED") {
    return "Terminée";
  }

  return "Expirée";
}

function attemptDateLabel(attempt: QuizAttemptResponse): string {
  const raw =
    attempt.submittedAt ||
    attempt.startedAt;

  if (!raw) {
    return "Date indisponible";
  }

  const date = new Date(normalizeQuizBackendDateTime(raw));

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function selectedOptionLabels(
  question: LearnerQuestionResponse,
  selectedOptionIds?: number[],
): string {
  if (!selectedOptionIds?.length) {
    return "Aucune réponse";
  }

  const labels = question.options
    .filter((option) => selectedOptionIds.includes(option.id))
    .map((option) => option.content);

  return labels.length > 0
    ? labels.join(", ")
    : selectedOptionIds.join(", ");
}

function displayItemLabel(
  items: { id: string; text: string }[] | undefined,
  id: string,
): string {
  return items?.find((item) => item.id === id)?.text || id;
}

function formatLearnerAnswer(
  question: LearnerQuestionResponse,
  answer?: SubmittedAnswerRequest | null,
): string {
  if (!answer) return "Aucune réponse enregistrée";

  if (answer.selectedOptionIds?.length) {
    return selectedOptionLabels(question, answer.selectedOptionIds);
  }

  if (answer.answerText?.trim()) {
    return answer.answerText.trim();
  }

  if (answer.blankAnswers?.length) {
    return answer.blankAnswers
      .map((item) => `${item.blankId} : ${item.value}`)
      .join(" · ");
  }

  if (answer.orderedItemIds?.length) {
    return answer.orderedItemIds
      .map((id) =>
        displayItemLabel(question.typeConfig?.orderingItems, id),
      )
      .join(" → ");
  }

  if (answer.matchingPairs?.length) {
    return answer.matchingPairs
      .map(
        (pair) =>
          `${displayItemLabel(
            question.typeConfig?.matchingLeft,
            pair.leftId,
          )} → ${displayItemLabel(
            question.typeConfig?.matchingRight,
            pair.rightId,
          )}`,
      )
      .join(" · ");
  }

  if (answer.dragPlacements?.length) {
    return answer.dragPlacements
      .map(
        (placement) =>
          `${displayItemLabel(
            question.typeConfig?.dragItems,
            placement.itemId,
          )} → ${displayItemLabel(
            question.typeConfig?.dragZones,
            placement.zoneId,
          )}`,
      )
      .join(" · ");
  }

  if (answer.numericValue !== undefined && answer.numericValue !== null) {
    return `${answer.numericValue}${
      question.typeConfig?.numericUnit
        ? ` ${question.typeConfig.numericUnit}`
        : ""
    }`;
  }

  return "Réponse enregistrée";
}

function formatCorrectAnswer(
  question: LearnerQuestionResponse,
  correctAnswer: import("../../types/evaluation").LearnerCorrectAnswerResponse,
): string {
  if (correctAnswer.options?.length) {
    return correctAnswer.options.map((option) => option.content).join(", ");
  }

  const config = correctAnswer.typeConfig;
  if (!config) return "Correction disponible";

  if (question.type === "FILL_BLANK" && config.fillBlank?.blanks?.length) {
    return config.fillBlank.blanks
      .map((blank) => `${blank.id} : ${blank.accepted.join(" / ")}`)
      .join(" · ");
  }

  if (question.type === "ORDERING" && config.ordering?.items?.length) {
    return [...config.ordering.items]
      .sort((a, b) => a.correctIndex - b.correctIndex)
      .map((item) => item.text)
      .join(" → ");
  }

  if (question.type === "MATCHING" && config.matching?.pairs?.length) {
    return config.matching.pairs
      .map(
        (pair) =>
          `${displayItemLabel(config.matching?.left, pair.leftId)} → ${displayItemLabel(
            config.matching?.right,
            pair.rightId,
          )}`,
      )
      .join(" · ");
  }

  if (question.type === "DRAG_DROP" && config.dragDrop?.placements?.length) {
    return config.dragDrop.placements
      .map(
        (placement) =>
          `${displayItemLabel(config.dragDrop?.items, placement.itemId)} → ${displayItemLabel(
            config.dragDrop?.zones,
            placement.zoneId,
          )}`,
      )
      .join(" · ");
  }

  if (question.type === "NUMERIC" && config.numeric) {
    return `${config.numeric.expected} ± ${config.numeric.tolerance}${
      config.numeric.unit ? ` ${config.numeric.unit}` : ""
    }`;
  }

  return "Correction disponible";
}

function durationSecondsLabel(seconds?: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes} min ${String(rest).padStart(2, "0")} s`;
}

export function LearnerQuizzesPage() {
  const { setAssistantSuppressed } = useOutletContext<{
    setAssistantSuppressed: (suppressed: boolean) => void;
  }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<QuizWithTraining[]>([]);
  const [trainings, setTrainings] = useState<LearnerMyTrainingResponse[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attemptNotice, setAttemptNotice] = useState("");

  const [activeQuiz, setActiveQuiz] =
    useState<LearnerQuizResponse | null>(null);
  const [activeAttempt, setActiveAttempt] =
    useState<QuizAttemptResponse | null>(null);
  const [selectedAnswers, setSelectedAnswers] =
    useState<SelectedAnswers>({});
  const [playerLoading, setPlayerLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] =
    useState<number | null>(null);
  const [activeResult, setActiveResult] =
    useState<QuizAttemptFullResponse | null>(null);
  const [history, setHistory] =
    useState<QuizAttemptResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const trainingFilter = Number(searchParams.get("trainingId") || 0);
  const quizFilter = Number(searchParams.get("quizId") || 0);
  const attemptFilter = Number(searchParams.get("attemptId") || 0);
  const historyView = searchParams.get("view") === "history";
  const hasCourseReturn = trainingFilter > 0 && quizFilter > 0;
  const trainingReturnHref =
    trainingFilter > 0
      ? `/learner/trainings/${trainingFilter}/play`
      : "/learner/trainings";

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const myTrainings = await getMyTrainings();

        const quizGroups = await Promise.all(
          myTrainings.map(async (training) => ({
            training,
            quizzes: await getLearnerQuizzesByTraining(training.id),
          })),
        );

        if (!active) {
          return;
        }

        setTrainings(myTrainings);
        setItems(
          quizGroups.flatMap(({ training, quizzes }) =>
            quizzes.map((quiz) => ({
              quiz,
              training,
            })),
          ),
        );
      } catch {
        if (active) {
          setError(
            "Impossible de charger vos quiz. Vérifiez que le service d’évaluation est disponible.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!activeAttempt || !activeQuiz) {
      setRemainingSeconds(null);
      return;
    }

    const update = () => {
      setRemainingSeconds(
        secondsRemaining(
          activeAttempt.startedAt,
          activeQuiz.timeLimitMinutes,
        ),
      );
    };

    update();

    const timer = window.setInterval(update, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeAttempt, activeQuiz]);

  useEffect(() => {
    if (
      remainingSeconds !== 0 ||
      !activeAttempt ||
      activeAttempt.status !== "STARTED"
    ) {
      return;
    }

    const attemptId = activeAttempt.id;
    let active = true;

    async function confirmExpiration() {
      try {
        const refreshed = await getMyQuizAttempt(attemptId);

        if (!active) {
          return;
        }

        setActiveAttempt(refreshed);

        if (refreshed.status === "CANCELLED") {
          setError(
            "Le temps imparti est écoulé. Cette tentative a été clôturée.",
          );
        }
      } catch {
        if (active) {
          setError(
            "Le temps imparti est écoulé. Rechargez la page avant de continuer.",
          );
        }
      }
    }

    void confirmExpiration();

    return () => {
      active = false;
    };
  }, [remainingSeconds, activeAttempt]);

  useEffect(() => {
    setAssistantSuppressed(
      activeAttempt?.status === "STARTED",
    );

    return () => {
      setAssistantSuppressed(false);
    };
  }, [activeAttempt?.status, setAssistantSuppressed]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("fr");

    return items.filter(({ quiz, training }) => {
      if (trainingFilter && training.id !== trainingFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        quiz.title,
        quiz.description || "",
        training.title,
      ].some((value) =>
        value.toLocaleLowerCase("fr").includes(normalizedSearch),
      );
    });
  }, [items, search, trainingFilter]);

  const filteredTraining =
    trainings.find((training) => training.id === trainingFilter) || null;

  const answeredCount = useMemo(
    () =>
      activeQuiz?.questions.filter((question) =>
        isAnswered(question, selectedAnswers),
      ).length || 0,
    [activeQuiz, selectedAnswers],
  );

  const questionCount = activeQuiz?.questions.length || 0;
  const expired =
    activeAttempt?.status === "CANCELLED" ||
    remainingSeconds === 0;

  const consumedAttempts = history.filter(
    (attempt) => attempt.status === "SUBMITTED",
  ).length;

  const canStartAnotherAttempt =
    !activeQuiz?.maxAttempts ||
    activeQuiz.maxAttempts <= 0 ||
    consumedAttempts < activeQuiz.maxAttempts;
  const startedAttempt =
    history.find((attempt) => attempt.status === "STARTED") || null;

  async function refreshHistory(quizId: number) {
    const attempts = await getMyQuizAttemptsForQuiz(quizId);
    setHistory(attempts);
    return attempts;
  }

  async function openQuiz(quizId: number) {
    setPlayerLoading(true);
    setError("");
    setAttemptNotice("");

    let loadedQuiz: LearnerQuizResponse | null = null;
    let loadedAttempts: QuizAttemptResponse[] = [];

    try {
      loadedQuiz = await getLearnerQuiz(quizId);
      loadedAttempts = await getMyQuizAttemptsForQuiz(quizId);

      const started =
        loadedAttempts.find((attempt) => attempt.status === "STARTED") || null;

      let attempt = started;

      if (started) {
        attempt = await getMyQuizAttempt(started.id);
      }

      if (!attempt || attempt.status !== "STARTED") {
        const consumed = loadedAttempts.filter(
          (item) => item.status === "SUBMITTED",
        ).length;

        if (
          loadedQuiz.maxAttempts &&
          loadedQuiz.maxAttempts > 0 &&
          consumed >= loadedQuiz.maxAttempts
        ) {
          setActiveQuiz(loadedQuiz);
          setActiveAttempt(null);
          setActiveResult(null);
          setHistory(loadedAttempts);
          setSelectedAnswers({});

          setAttemptNotice(
            loadedQuiz.maxAttempts === 1
              ? "Vous avez utilisé votre tentative autorisée. Consultez l’historique."
              : `Vous avez utilisé vos ${loadedQuiz.maxAttempts} tentatives autorisées. Consultez l’historique.`,
          );

          setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set("quizId", String(quizId));
            next.set("view", "history");
            next.delete("attemptId");
            return next;
          });

          return;
        }

        attempt = await startLearnerQuizAttempt(quizId);
      }

      setActiveQuiz(loadedQuiz);
      setActiveAttempt(attempt);
      setActiveResult(null);
      setHistory(loadedAttempts);
      setSelectedAnswers({});

      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("quizId", String(quizId));
        next.delete("view");
        next.delete("attemptId");
        return next;
      });
    } catch (caught) {
      const message = getApiErrorMessage(caught);
      const normalized = message.toLocaleLowerCase("fr");

      const attemptLimitConflict =
        normalized.includes("409") ||
        (
          normalized.includes("tentative") &&
          (
            normalized.includes("maximum") ||
            normalized.includes("maximal") ||
            normalized.includes("atteint") ||
            normalized.includes("épuis")
          )
        );

      if (attemptLimitConflict) {
        if (loadedQuiz) {
          setActiveQuiz(loadedQuiz);
          setActiveAttempt(null);
          setActiveResult(null);
          setHistory(loadedAttempts);
          setSelectedAnswers({});

          setSearchParams((current) => {
            const next = new URLSearchParams(current);
            next.set("quizId", String(quizId));
            next.set("view", "history");
            next.delete("attemptId");
            return next;
          });
        }

        setError("");
        setAttemptNotice(
          loadedQuiz?.maxAttempts && loadedQuiz.maxAttempts > 0
            ? loadedQuiz.maxAttempts === 1
              ? "Vous avez utilisé votre tentative autorisée. Consultez l’historique."
              : `Vous avez utilisé vos ${loadedQuiz.maxAttempts} tentatives autorisées. Consultez l’historique.`
            : "Le nombre maximal de tentatives est atteint. Consultez l’historique.",
        );
      } else {
        setError(message || "Impossible de démarrer ce quiz.");
      }
    } finally {
      setPlayerLoading(false);
    }
  }

  async function openHistory(quizId: number) {
    setHistoryLoading(true);
    setError("");
    setAttemptNotice("");

    try {
      const [quiz, attempts] = await Promise.all([
        getLearnerQuiz(quizId),
        getMyQuizAttemptsForQuiz(quizId),
      ]);

      setActiveQuiz(quiz);
      setActiveAttempt(null);
      setActiveResult(null);
      setHistory(attempts);
      setSelectedAnswers({});

      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("quizId", String(quizId));
        next.set("view", "history");
        next.delete("attemptId");
        return next;
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Impossible de charger l’historique de ce quiz.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openAttemptResult(
    quizId: number,
    attemptId: number,
  ) {
    setPlayerLoading(true);
    setError("");

    try {
      const [quiz, attempt, attempts] = await Promise.all([
        getLearnerQuiz(quizId),
        getMyQuizAttempt(attemptId),
        getMyQuizAttemptsForQuiz(quizId),
      ]);

      setActiveQuiz(quiz);
      setActiveAttempt(attempt);
      setActiveResult(attempt);
      setHistory(attempts);
      setSelectedAnswers({});

      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("quizId", String(quizId));
        next.set("attemptId", String(attemptId));
        next.delete("view");
        return next;
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Impossible de charger cette tentative.",
      );
    } finally {
      setPlayerLoading(false);
    }
  }

  function closeQuiz() {
    setActiveQuiz(null);
    setActiveAttempt(null);
    setActiveResult(null);
    setHistory([]);
    setSelectedAnswers({});
    setRemainingSeconds(null);
    setError("");

    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("quizId");
      next.delete("attemptId");
      next.delete("view");
      return next;
    });
  }

  function changeAnswer(answer: SubmittedAnswerRequest): void {
    if (expired || submitting) {
      return;
    }

    setSelectedAnswers((current) => ({
      ...current,
      [answer.questionId]: answer,
    }));
  }

  function chooseOption(
    question: LearnerQuestionResponse,
    optionId: number,
  ) {
    if (expired || submitting) {
      return;
    }

    const previous =
      selectedAnswers[question.id]?.selectedOptionIds ?? [];

    const next =
      question.type === "MULTIPLE_CHOICE"
        ? previous.includes(optionId)
          ? previous.filter((id) => id !== optionId)
          : [...previous, optionId]
        : [optionId];

    changeAnswer({
      questionId: question.id,
      selectedOptionIds: next,
    });
  }

  function updateBlank(
    question: LearnerQuestionResponse,
    blankId: string,
    value: string,
  ): void {
    const blankIds = question.typeConfig?.blankIds ?? [];
    const current = new Map(
      (
        selectedAnswers[question.id]?.blankAnswers ?? []
      ).map((item) => [item.blankId, item.value]),
    );

    current.set(blankId, value);

    changeAnswer({
      questionId: question.id,
      blankAnswers: blankIds.map((id) => ({
        blankId: id,
        value: current.get(id) ?? "",
      })),
    });
  }

  function currentOrderingIds(
    question: LearnerQuestionResponse,
  ): string[] {
    const configured = question.typeConfig?.orderingItems ?? [];
    const current =
      selectedAnswers[question.id]?.orderedItemIds ?? [];

    return current.length === configured.length && current.length > 0
      ? current
      : configured.map((item) => item.id);
  }

  function setOrdering(
    question: LearnerQuestionResponse,
    ids: string[],
  ): void {
    changeAnswer({
      questionId: question.id,
      orderedItemIds: ids,
    });
  }

  function moveOrdering(
    question: LearnerQuestionResponse,
    from: number,
    delta: -1 | 1,
  ): void {
    const ids = currentOrderingIds(question);
    const to = from + delta;

    if (to < 0 || to >= ids.length) {
      return;
    }

    const next = [...ids];
    [next[from], next[to]] = [next[to], next[from]];
    setOrdering(question, next);
  }

  function setMatching(
    question: LearnerQuestionResponse,
    leftId: string,
    rightId: string,
  ): void {
    const previous =
      selectedAnswers[question.id]?.matchingPairs ?? [];

    const filtered = previous.filter(
      (pair) =>
        pair.leftId !== leftId &&
        pair.rightId !== rightId,
    );

    changeAnswer({
      questionId: question.id,
      matchingPairs: [...filtered, { leftId, rightId }],
    });
  }

  function setDragPlacement(
    question: LearnerQuestionResponse,
    itemId: string,
    zoneId: string,
  ): void {
    const previous =
      selectedAnswers[question.id]?.dragPlacements ?? [];

    changeAnswer({
      questionId: question.id,
      dragPlacements: [
        ...previous.filter((entry) => entry.itemId !== itemId),
        { itemId, zoneId },
      ],
    });
  }

  function setNumeric(
    question: LearnerQuestionResponse,
    rawValue: string,
  ): void {
    const normalized = rawValue.trim().replace(",", ".");
    const parsed = Number(normalized);

    changeAnswer({
      questionId: question.id,
      answerText: rawValue,
      numericValue:
        normalized.length > 0 && Number.isFinite(parsed)
          ? parsed
          : undefined,
    });
  }

  function sanitizeSubmissionAnswer(
    question: LearnerQuestionResponse,
    answer: SubmittedAnswerRequest,
  ): SubmittedAnswerRequest {
    if (
      question.type === "SINGLE_CHOICE" ||
      question.type === "MULTIPLE_CHOICE" ||
      question.type === "TRUE_FALSE"
    ) {
      return {
        questionId: question.id,
        selectedOptionIds: answer.selectedOptionIds ?? [],
      };
    }

    if (question.type === "FILL_BLANK") {
      return {
        questionId: question.id,
        blankAnswers: (answer.blankAnswers ?? []).map((entry) => ({
          blankId: entry.blankId,
          value: entry.value,
        })),
      };
    }

    if (question.type === "ORDERING") {
      return {
        questionId: question.id,
        orderedItemIds: [...(answer.orderedItemIds ?? [])],
      };
    }

    if (question.type === "MATCHING") {
      return {
        questionId: question.id,
        matchingPairs: (answer.matchingPairs ?? []).map((pair) => ({
          leftId: pair.leftId,
          rightId: pair.rightId,
        })),
      };
    }

    if (question.type === "DRAG_DROP") {
      return {
        questionId: question.id,
        dragPlacements: (answer.dragPlacements ?? []).map((entry) => ({
          itemId: entry.itemId,
          zoneId: entry.zoneId,
        })),
      };
    }

    return {
      questionId: question.id,
      numericValue: answer.numericValue,
    };
  }

  function renderQuestionAnswer(
    question: LearnerQuestionResponse,
  ) {
    const answer =
      selectedAnswers[question.id] ?? {
        questionId: question.id,
      };

    if (
      question.type === "SINGLE_CHOICE" ||
      question.type === "MULTIPLE_CHOICE" ||
      question.type === "TRUE_FALSE"
    ) {
      return (
        <Stack spacing={1}>
          {question.options.map((option) => {
            const checked = (
              answer.selectedOptionIds ?? []
            ).includes(option.id);
            const controlType = normalizeQuestionType(question);

            return (
              <Box
                key={option.id}
                sx={{
                  border: 1,
                  borderColor: checked
                    ? "primary.main"
                    : "divider",
                  borderRadius: 2,
                  px: 1.25,
                  bgcolor: checked
                    ? "action.selected"
                    : "background.paper",
                }}
              >
                <FormControlLabel
                  sx={{
                    width: "100%",
                    m: 0,
                    py: 0.5,
                    alignItems: "flex-start",
                  }}
                  control={
                    controlType === "checkbox" ? (
                      <Checkbox
                        name={`question-${question.id}`}
                        checked={checked}
                        disabled={expired || submitting}
                        onChange={() =>
                          chooseOption(question, option.id)
                        }
                      />
                    ) : (
                      <Radio
                        name={`question-${question.id}`}
                        checked={checked}
                        disabled={expired || submitting}
                        onChange={() =>
                          chooseOption(question, option.id)
                        }
                      />
                    )
                  }
                  label={
                    <Typography variant="body2" sx={{ pt: 1 }}>
                      {option.content}
                    </Typography>
                  }
                />
              </Box>
            );
          })}
        </Stack>
      );
    }

    if (question.type === "FILL_BLANK") {
      const blankIds = question.typeConfig?.blankIds ?? [];

      if (!blankIds.length) {
        return (
          <Alert severity="warning">
            {"Configuration du texte \u00e0 trous indisponible."}
          </Alert>
        );
      }

      return (
        <Stack spacing={1.25}>
          <Typography variant="body2" color="text.secondary">
            {"Compl\u00e9tez chaque champ."}
          </Typography>

          {blankIds.map((blankId, index) => (
            <TextField
              key={blankId}
              label={`Trou ${index + 1}`}
              value={
                answer.blankAnswers?.find(
                  (entry) => entry.blankId === blankId,
                )?.value ?? ""
              }
              disabled={expired || submitting}
              onChange={(event) =>
                updateBlank(
                  question,
                  blankId,
                  event.target.value,
                )
              }
              fullWidth
            />
          ))}
        </Stack>
      );
    }

    if (question.type === "ORDERING") {
      const configured =
        question.typeConfig?.orderingItems ?? [];

      if (!configured.length) {
        return (
          <Alert severity="warning">
            {"Configuration de l\u2019ordonnancement indisponible."}
          </Alert>
        );
      }

      const ids = currentOrderingIds(question);
      const savedIds = answer.orderedItemIds ?? [];
      const orderingSaved =
        savedIds.length === ids.length &&
        ids.every((id, index) => savedIds[index] === id);

      return (
        <Stack spacing={1.25}>
          <Typography variant="body2" color="text.secondary">
            {
              "Placez les \u00e9l\u00e9ments dans l\u2019ordre attendu puis confirmez."
            }
          </Typography>

          {ids.map((id, index) => {
            const item = configured.find(
              (candidate) => candidate.id === id,
            );

            return (
              <Box
                key={id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: 1,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <Chip
                  size="small"
                  label={index + 1}
                  color="primary"
                  variant="outlined"
                />
                <Typography sx={{ flex: 1, fontWeight: 700 }}>
                  {item?.text ?? id}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={
                    expired || submitting || index === 0
                  }
                  onClick={() =>
                    moveOrdering(question, index, -1)
                  }
                >
                  Monter
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={
                    expired ||
                    submitting ||
                    index === ids.length - 1
                  }
                  onClick={() =>
                    moveOrdering(question, index, 1)
                  }
                >
                  Descendre
                </Button>
              </Box>
            );
          })}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ alignItems: { sm: "center" } }}
          >
            <Button
              size="small"
              variant={orderingSaved ? "outlined" : "contained"}
              disabled={expired || submitting || orderingSaved}
              onClick={() => setOrdering(question, ids)}
              sx={{ alignSelf: "flex-start" }}
            >
              {orderingSaved
                ? "Ordre enregistré"
                : "Valider cet ordre"}
            </Button>

            <Typography variant="caption" color="text.secondary">
              {
                "Les déplacements sont enregistrés automatiquement."
              }
            </Typography>
          </Stack>
        </Stack>
      );
    }

    if (question.type === "MATCHING") {
      const left = question.typeConfig?.matchingLeft ?? [];
      const right = question.typeConfig?.matchingRight ?? [];

      if (!left.length || !right.length) {
        return (
          <Alert severity="warning">
            {"Configuration d\u2019association indisponible."}
          </Alert>
        );
      }

      return (
        <Stack spacing={1.25}>
          <Typography variant="body2" color="text.secondary">
            {
              "Pour chaque \u00e9l\u00e9ment de gauche, cliquez sur la proposition correspondante."
            }
          </Typography>

          {left.map((leftItem) => {
            const selectedRightId =
              answer.matchingPairs?.find(
                (pair) => pair.leftId === leftItem.id,
              )?.rightId;

            return (
              <Box
                key={leftItem.id}
                sx={{
                  p: 1.25,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <Typography sx={{ mb: 1, fontWeight: 800 }}>
                  {leftItem.text}
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
                >
                  {right.map((rightItem) => (
                    <Button
                      key={rightItem.id}
                      size="small"
                      variant={
                        selectedRightId === rightItem.id
                          ? "contained"
                          : "outlined"
                      }
                      disabled={expired || submitting}
                      onClick={() =>
                        setMatching(
                          question,
                          leftItem.id,
                          rightItem.id,
                        )
                      }
                    >
                      {rightItem.text}
                    </Button>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      );
    }

    if (question.type === "DRAG_DROP") {
      const items = question.typeConfig?.dragItems ?? [];
      const zones = question.typeConfig?.dragZones ?? [];

      if (!items.length || !zones.length) {
        return (
          <Alert severity="warning">
            {
              "Configuration de glisser-déposer indisponible."
            }
          </Alert>
        );
      }

      const placements = answer.dragPlacements ?? [];
      const placedItemIds = new Set(
        placements.map((entry) => entry.itemId),
      );
      const unassignedItems = items.filter(
        (item) => !placedItemIds.has(item.id),
      );

      const renderDraggableItem = (
        item: { id: string; text: string },
      ) => (
        <Box
          key={item.id}
          draggable={!expired && !submitting}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(
              "text/plain",
              item.id,
            );
          }}
          sx={{
            px: 1.25,
            py: 0.9,
            border: 1,
            borderColor: "primary.main",
            borderRadius: 2,
            bgcolor: "background.paper",
            cursor:
              expired || submitting ? "default" : "grab",
            userSelect: "none",
            fontWeight: 800,
            boxShadow: 1,
          }}
        >
          {item.text}
        </Box>
      );

      return (
        <Stack spacing={1.5}>
          <Alert severity="info">
            {
              "Glissez chaque élément vers la zone cible correspondante."
            }
          </Alert>

          <Box>
            <Typography
              variant="subtitle2"
              sx={{ mb: 0.75, fontWeight: 850 }}
            >
              Éléments à placer
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                flexWrap: "wrap",
                minHeight: 46,
                p: 1,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                bgcolor: "action.hover",
              }}
            >
              {unassignedItems.length > 0 ? (
                unassignedItems.map(renderDraggableItem)
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ alignSelf: "center" }}
                >
                  {
                    "Tous les éléments sont placés. Vous pouvez encore les déplacer entre les zones."
                  }
                </Typography>
              )}
            </Stack>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 1.25,
            }}
          >
            {zones.map((zone) => {
              const assignedItems = items.filter((item) =>
                placements.some(
                  (entry) =>
                    entry.itemId === item.id &&
                    entry.zoneId === zone.id,
                ),
              );

              return (
                <Box
                  key={zone.id}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const itemId =
                      event.dataTransfer.getData(
                        "text/plain",
                      );

                    if (
                      itemId &&
                      items.some(
                        (item) => item.id === itemId,
                      )
                    ) {
                      setDragPlacement(
                        question,
                        itemId,
                        zone.id,
                      );
                    }
                  }}
                  sx={{
                    minHeight: 116,
                    p: 1.25,
                    border: 2,
                    borderStyle: "dashed",
                    borderColor: "primary.main",
                    borderRadius: 2.5,
                    bgcolor: "background.paper",
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, fontWeight: 900 }}
                  >
                    {zone.text}
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{ flexWrap: "wrap" }}
                  >
                    {assignedItems.length > 0 ? (
                      assignedItems.map(
                        renderDraggableItem,
                      )
                    ) : (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Déposez un élément ici
                      </Typography>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Stack>
      );
    }
    const rawNumeric =
      answer.answerText ??
      (answer.numericValue !== undefined
        ? String(answer.numericValue)
        : "");

    return (
      <TextField
        type="number"
        label="Réponse numérique"
        value={rawNumeric}
        disabled={expired || submitting}
        onChange={(event) =>
          setNumeric(question, event.target.value)
        }
        helperText={
          question.typeConfig?.numericUnit
            ? `Unit\u00e9 attendue : ${question.typeConfig.numericUnit}`
            : undefined
        }
        slotProps={{ htmlInput: { step: "any" } }}
        fullWidth
      />
    );
  }
  async function submitQuiz(confirmed = false) {
    if (!activeQuiz || !activeAttempt) {
      return;
    }

    if (expired) {
      setError(
        "Le temps imparti est écoulé. Cette tentative ne peut plus être soumise.",
      );
      return;
    }

    if (!confirmed) {
      setSubmitConfirmOpen(true);
      return;
    }

    setSubmitConfirmOpen(false);
    const answers: SubmittedAnswerRequest[] =
      activeQuiz.questions.map((question) =>
        sanitizeSubmissionAnswer(
          question,
          selectedAnswers[question.id] ?? {
            questionId: question.id,
          },
        ),
      );

    setSubmitting(true);
    setError("");

    try {
      const result = await submitLearnerQuizAttempt(
        activeAttempt.id,
        { answers },
      );

      setActiveAttempt(result);
      setActiveResult(result);
      await refreshHistory(activeQuiz.id);

      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set("quizId", String(activeQuiz.id));
        next.set("attemptId", String(result.id));
        next.delete("view");
        return next;
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Impossible de soumettre cette tentative.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (
      !quizFilter ||
      activeQuiz ||
      playerLoading ||
      historyLoading ||
      loading
    ) {
      return;
    }

    const exists = items.some(({ quiz }) => quiz.id === quizFilter);

    if (!exists) {
      return;
    }

    if (attemptFilter) {
      void openAttemptResult(quizFilter, attemptFilter);
      return;
    }

    if (historyView) {
      void openHistory(quizFilter);
      return;
    }

    void openHistory(quizFilter);
  }, [
    quizFilter,
    attemptFilter,
    historyView,
    activeQuiz,
    playerLoading,
    historyLoading,
    loading,
    items,
  ]);

  if (loading) {
    return (
      <Stack spacing={2.5}>
        <Box>
          <Skeleton variant="text" width={90} height={18} />
          <Skeleton variant="text" width={210} height={38} />
          <Skeleton variant="text" width="58%" height={22} />
        </Box>

        <Skeleton variant="rounded" height={48} />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 1.5,
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Card key={item} variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack spacing={1.25}>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Skeleton variant="rounded" width="54%" height={24} />
                    <Skeleton variant="rounded" width={76} height={24} />
                  </Stack>
                  <Skeleton variant="text" width="80%" height={28} />
                  <Skeleton variant="text" width="100%" />
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 0.75,
                    }}
                  >
                    {[0, 1, 2].map((meta) => (
                      <Skeleton key={meta} variant="rounded" height={52} />
                    ))}
                  </Box>
                  <Skeleton variant="rounded" height={36} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Stack>
    );
  }

  if (
    activeQuiz &&
    activeAttempt &&
    activeAttempt.status !== "STARTED"
  ) {
    const result = activeResult;
    const percentage = result?.scorePercent ?? 0;
    const passed = result?.passed === true;

    return (
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: { sm: "center" },
          }}
        >
          <Button
            type="button"
            variant="text"
            startIcon={<ArrowLeft size={18} />}
            onClick={closeQuiz}
          >
            {"Mes quiz"}
          </Button>

          <Button
            type="button"
            variant="outlined"
            startIcon={<History size={17} />}
            onClick={() => void openHistory(activeQuiz.id)}
          >
            {"Historique"}
          </Button>
        </Stack>

        <Card
          variant="outlined"
          sx={{
            borderColor:
              activeAttempt.status === "CANCELLED"
                ? "warning.main"
                : passed
                  ? "success.main"
                  : "error.main",
          }}
        >
          <CardContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "auto minmax(0, 1fr) auto",
                },
                gap: 2.5,
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  width: 58,
                  height: 58,
                  borderRadius: 3,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "action.hover",
                  color:
                    activeAttempt.status === "CANCELLED"
                      ? "warning.main"
                      : passed
                        ? "success.main"
                        : "error.main",
                }}
              >
                {activeAttempt.status === "CANCELLED" ? (
                  <TimerReset size={31} />
                ) : (
                  <CheckCircle2 size={31} />
                )}
              </Box>

              <Box>
                <Typography
                  variant="overline"
                  color="primary.main"
                  sx={{ fontWeight: 850 }}
                >
                  {"Résultat"}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>
                  {activeAttempt.status === "CANCELLED"
                    ? "Tentative expirée"
                    : passed
                      ? "Quiz réussi"
                      : "Seuil de réussite non atteint"}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {activeQuiz.title}
                </Typography>
              </Box>

              <Stack
                spacing={0.25}
                sx={{
                  minWidth: { md: 190 },
                  alignItems: { xs: "flex-start", md: "flex-end" },
                }}
              >
                {activeAttempt.status === "SUBMITTED" && result ? (
                  <>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>
                      {percentage} %
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {`${result.earnedPoints} / ${result.maxPoints} points`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {`Seuil : ${activeQuiz.passingScore ?? 0} %`}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>
                      {"Expirée"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {"Aucun score validé"}
                    </Typography>
                  </>
                )}
              </Stack>
            </Box>
          </CardContent>
        </Card>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {result ? (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr 1fr",
                  md: "repeat(4, minmax(0, 1fr))",
                },
                gap: 1.25,
              }}
            >
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    {"Tentative"}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {result.attemptNumber}
                  </Typography>
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    {"Durée"}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {durationSecondsLabel(result.durationSeconds)}
                  </Typography>
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    {"Points"}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {`${result.earnedPoints}/${result.maxPoints}`}
                  </Typography>
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    {"Tentatives restantes"}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {result.remainingAttempts}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {result.globalFeedback ? (
              <Alert severity={result.passed ? "success" : "info"}>
                {result.globalFeedback}
              </Alert>
            ) : null}

            <SmartSectionCard
              title={"Vos réponses"}
              description={
                "Le détail et la correction sont fournis par le backend selon la politique du quiz."
              }
            >
              <Stack spacing={1.5}>
                {result.questionResults.map((questionResult, index) => {
                  const question =
                    activeQuiz.questions.find(
                      (item) => item.id === questionResult.questionId,
                    ) || activeQuiz.questions[index];
                  const statusColor =
                    questionResult.status === "CORRECT"
                      ? "success"
                      : questionResult.status === "PARTIAL"
                        ? "warning"
                        : "error";
                  const statusLabel =
                    questionResult.status === "CORRECT"
                      ? "Correcte"
                      : questionResult.status === "PARTIAL"
                        ? "Partiellement correcte"
                        : "Incorrecte";

                  return (
                    <Card
                      key={questionResult.questionId}
                      variant="outlined"
                      sx={{
                        borderLeftWidth: 4,
                        borderLeftColor:
                          questionResult.status === "CORRECT"
                            ? "success.main"
                            : questionResult.status === "PARTIAL"
                              ? "warning.main"
                              : "error.main",
                      }}
                    >
                      <CardContent>
                        <Stack spacing={1.5}>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            sx={{
                              justifyContent: "space-between",
                              alignItems: { sm: "center" },
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontWeight: 800 }}
                            >
                              {`Question ${index + 1} · ${questionResult.type}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {`${questionResult.pointsEarned} / ${questionResult.maxPoints} point${
                                questionResult.maxPoints > 1 ? "s" : ""
                              }`}
                            </Typography>
                          </Stack>

                          <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>
                            {questionResult.prompt}
                          </Typography>

                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: "action.hover",
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontWeight: 800 }}
                            >
                              {"Votre réponse"}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.35 }}>
                              {question
                                ? formatLearnerAnswer(
                                    question,
                                    questionResult.learnerAnswer,
                                  )
                                : "Réponse enregistrée"}
                            </Typography>
                          </Box>

                          <Chip
                            size="small"
                            color={statusColor}
                            label={statusLabel}
                            sx={{ alignSelf: "flex-start" }}
                          />

                          {questionResult.feedback ? (
                            <Alert severity="info">{questionResult.feedback}</Alert>
                          ) : null}

                          {questionResult.explanation ? (
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontWeight: 800 }}
                              >
                                {"Explication"}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 0.35 }}>
                                {questionResult.explanation}
                              </Typography>
                            </Box>
                          ) : null}

                          {questionResult.correctAnswer && question ? (
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: "success.main",
                                color: "success.contrastText",
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 900 }}>
                                {"Correction autorisée"}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 0.35 }}>
                                {formatCorrectAnswer(
                                  question,
                                  questionResult.correctAnswer,
                                )}
                              </Typography>
                            </Box>
                          ) : null}
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </SmartSectionCard>
          </>
        ) : (
          <Alert severity="info">
            {"Le détail du résultat est en cours de chargement."}
          </Alert>
        )}

        <SmartSectionCard
          title={"Mes tentatives"}
          description={
            activeQuiz.maxAttempts
              ? `${consumedAttempts} tentative(s) utilis\u00e9e(s) sur ${activeQuiz.maxAttempts}.`
              : `${consumedAttempts} tentative(s) utilis\u00e9e(s).`
          }
        >
          <Stack spacing={1.25}>
            {history.map((attempt) => (
              <Card key={attempt.id} variant="outlined">
                <CardContent>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{
                      justifyContent: "space-between",
                      alignItems: { sm: "center" },
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                        {attemptStatusLabel(attempt.status)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {attemptDateLabel(attempt)}
                      </Typography>
                    </Box>

                    <Box>
                      {attempt.status === "SUBMITTED" ? (
                        <>
                          <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                            {`${scorePercentage(attempt)} %`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {`${attempt.score ?? 0} / ${attempt.totalPoints ?? 0} pts`}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {"Sans score"}
                        </Typography>
                      )}
                    </Box>

                    {attempt.status !== "STARTED" ? (
                      <Button
                        type="button"
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          void openAttemptResult(
                            activeQuiz.id,
                            attempt.id,
                          )
                        }
                      >
                        {"Consulter"}
                      </Button>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </SmartSectionCard>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ justifyContent: "flex-end" }}
        >
          {hasCourseReturn ? (
            <Button
              component={Link}
              to={trainingReturnHref}
              variant="text"
              startIcon={<ArrowLeft size={18} />}
            >
              {"Retour à la formation"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="text"
              startIcon={<ArrowLeft size={18} />}
              onClick={closeQuiz}
            >
              {"Retour à mes quiz"}
            </Button>
          )}

          {canStartAnotherAttempt ? (
            <Button
              type="button"
              variant="contained"
              startIcon={<RotateCcw size={18} />}
              onClick={() => {
                setActiveQuiz(null);
                setActiveAttempt(null);
                setActiveResult(null);
                void openQuiz(activeQuiz.id);
              }}
            >
              {"Nouvelle tentative"}
            </Button>
          ) : (
            <Alert severity="info">
              {"Nombre maximal de tentatives atteint."}
            </Alert>
          )}
        </Stack>
      </Stack>
    );
  }

  if (activeQuiz && !activeAttempt) {
    return (
      <Stack spacing={3}>
        {hasCourseReturn ? (
          <Button
            component={Link}
            to={trainingReturnHref}
            variant="text"
            startIcon={<ArrowLeft size={18} />}
            sx={{ alignSelf: "flex-start" }}
          >
            {"Retour à la formation"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="text"
            startIcon={<ArrowLeft size={18} />}
            onClick={closeQuiz}
            sx={{ alignSelf: "flex-start" }}
          >
            {"Mes quiz"}
          </Button>
        )}

        <Card variant="outlined">
          <CardContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "minmax(0, 1fr) auto",
                },
                gap: 2.5,
                alignItems: "center",
              }}
            >
              <Box>
                <Typography
                  variant="overline"
                  color="primary.main"
                  sx={{ fontWeight: 850 }}
                >
                  {hasCourseReturn ? "Quiz final" : "Historique"}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>
                  {activeQuiz.title}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {hasCourseReturn
                    ? "Consultez les informations du quiz. Aucune tentative et aucun chronomètre ne démarrent avant votre clic sur le bouton ci-dessous."
                    : "Consultez vos tentatives précédentes sans en démarrer une nouvelle."}
                </Typography>
              </Box>

              <Stack
                spacing={0.25}
                sx={{ alignItems: { xs: "flex-start", md: "flex-end" } }}
              >
                <Typography variant="h4" sx={{ fontWeight: 900 }}>
                  {consumedAttempts}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {"Tentative(s) utilis\u00e9e(s)"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {`Maximum : ${activeQuiz.maxAttempts ?? "\u2014"}`}
                </Typography>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        {attemptNotice ? (
          <Alert
            severity="warning"
            onClose={() => setAttemptNotice("")}
          >
            {attemptNotice}
          </Alert>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}

        {history.length === 0 ? (
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
                <FileQuestion size={28} />
                <Typography variant="h6" sx={{ fontWeight: 850 }}>
                  {"Aucune tentative"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {"Vous n'avez pas encore pass\u00e9 ce quiz."}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={1.25}>
            {history.map((attempt) => (
              <Card key={attempt.id} variant="outlined">
                <CardContent>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{
                      justifyContent: "space-between",
                      alignItems: { sm: "center" },
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                        {attemptStatusLabel(attempt.status)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {attemptDateLabel(attempt)}
                      </Typography>
                    </Box>

                    <Box>
                      {attempt.status === "SUBMITTED" ? (
                        <>
                          <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                            {`${scorePercentage(attempt)} %`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {`${attempt.score ?? 0} / ${attempt.totalPoints ?? 0} pts`}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {attempt.status === "STARTED"
                            ? "Tentative en cours"
                            : "Sans score"}
                        </Typography>
                      )}
                    </Box>

                    <Button
                      type="button"
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        if (attempt.status === "STARTED") {
                          void openQuiz(activeQuiz.id);
                        } else {
                          void openAttemptResult(
                            activeQuiz.id,
                            attempt.id,
                          );
                        }
                      }}
                    >
                      {attempt.status === "STARTED"
                        ? "Reprendre"
                        : "Consulter"}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}

        <Box>
          {startedAttempt || canStartAnotherAttempt ? (
            <Button
              type="button"
              variant="contained"
              startIcon={
                startedAttempt ? (
                  <RotateCcw size={18} />
                ) : (
                  <PlayCircle size={18} />
                )
              }
              onClick={() => {
                setActiveQuiz(null);
                void openQuiz(activeQuiz.id);
              }}
            >
              {startedAttempt
                ? "Reprendre la tentative en cours"
                : "Commencer une tentative"}
            </Button>
          ) : (
            <Alert severity="info">
              {"Nombre maximal de tentatives atteint."}
            </Alert>
          )}
        </Box>
      </Stack>
    );
  }

  if (
    activeQuiz &&
    activeAttempt &&
    activeAttempt.status === "STARTED"
  ) {
    const answerProgress =
      questionCount > 0
        ? Math.round((answeredCount * 100) / questionCount)
        : 0;

    return (
      <Stack spacing={3} sx={{ pb: 10 }}>
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            py: 1.25,
            bgcolor: "background.default",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{
              justifyContent: "space-between",
              alignItems: { sm: "center" },
            }}
          >
            {hasCourseReturn ? (
              <Button
                component={Link}
                to={trainingReturnHref}
                variant="text"
                startIcon={<ArrowLeft size={18} />}
                disabled={submitting}
              >
                {"Retour à la formation"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="text"
                startIcon={<ArrowLeft size={18} />}
                onClick={closeQuiz}
                disabled={submitting}
              >
                {"Mes quiz"}
              </Button>
            )}

            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap", alignItems: "center" }}
            >
              <Chip
                label={`${answeredCount} / ${questionCount} r\u00e9pondue${answeredCount > 1 ? "s" : ""}`}
                variant="outlined"
              />
              <Chip
                icon={<Clock3 size={16} />}
                label={formatRemaining(remainingSeconds)}
                color={
                  remainingSeconds !== null &&
                  remainingSeconds <= 30
                    ? "error"
                    : "success"
                }
                variant="outlined"
              />
            </Stack>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={answerProgress}
            sx={{ mt: 1 }}
          />
        </Box>

        <Card variant="outlined">
          <CardContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  lg: "minmax(0, 1.4fr) minmax(240px, 0.6fr)",
                },
                gap: 3,
              }}
            >
              <Box>
                <Typography
                  variant="overline"
                  color="primary.main"
                  sx={{ fontWeight: 850 }}
                >
                  {"\u00c9valuation en cours"}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>
                  {activeQuiz.title}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  {activeQuiz.description ||
                    "R\u00e9pondez aux questions puis soumettez votre tentative."}
                </Typography>
              </Box>

              <Stack spacing={1}>
                <Chip
                  label={`R\u00e9ussite : ${activeQuiz.passingScore ?? 0} %`}
                  variant="outlined"
                />
                <Chip
                  label={`Tentatives : ${attemptLabel(activeQuiz.maxAttempts)}`}
                  variant="outlined"
                />
                <Chip
                  label={`Temps : ${durationLabel(activeQuiz.timeLimitMinutes)}`}
                  variant="outlined"
                />
              </Stack>
            </Box>
          </CardContent>
        </Card>

        {hasCourseReturn && !expired ? (
          <Alert
            severity={
              activeQuiz.timeLimitMinutes &&
              activeQuiz.timeLimitMinutes > 0
                ? "warning"
                : "info"
            }
          >
            {activeQuiz.timeLimitMinutes &&
            activeQuiz.timeLimitMinutes > 0
              ? "Cette tentative est d\u00e9j\u00e0 commenc\u00e9e. Vous pouvez revenir \u00e0 la formation, mais le chronom\u00e8tre continuera jusqu\u2019\u00e0 la soumission ou l\u2019expiration."
              : "Cette tentative est d\u00e9j\u00e0 commenc\u00e9e. Vous pouvez revenir \u00e0 la formation et la reprendre plus tard : ce quiz est sans limite de temps."}
          </Alert>
        ) : null}

        {error ? <Alert severity="error">{error}</Alert> : null}

        {expired ? (
          <Alert severity="error" icon={<TimerReset size={20} />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
              {"Temps \u00e9coul\u00e9"}
            </Typography>
            <Typography variant="body2">
              {
                "La tentative est cl\u00f4tur\u00e9e. Revenez \u00e0 la liste pour consulter son statut."
              }
            </Typography>
          </Alert>
        ) : null}

        <Stack spacing={2}>
          {activeQuiz.questions.map((question, index) => (
            <Card key={question.id} variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="primary.main"
                      sx={{ fontWeight: 850 }}
                    >
                      {`Question ${index + 1}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {`${question.points ?? 0} point${
                        (question.points ?? 0) > 1 ? "s" : ""
                      }`}
                    </Typography>
                  </Stack>

                  <Typography variant="h6" sx={{ fontWeight: 850 }}>
                    {question.content}
                  </Typography>

                  <Divider />

                  {renderQuestionAnswer(question)}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Card
          variant="outlined"
          sx={{
            position: "sticky",
            bottom: 12,
            zIndex: 4,
          }}
        >
          <CardContent>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{
                justifyContent: "space-between",
                alignItems: { md: "center" },
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                  {`${answeredCount} question(s) r\u00e9pondue(s) sur ${questionCount}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {
                    "Les r\u00e9ponses ne sont plus modifiables apr\u00e8s soumission."
                  }
                </Typography>
              </Box>

              <Button
                type="button"
                variant="contained"
                disabled={submitting || expired}
                startIcon={
                  submitting ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Send size={18} />
                  )
                }
                onClick={() => void submitQuiz()}
              >
                {submitting
                  ? "Soumission..."
                  : "Soumettre le quiz"}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Dialog
          open={submitConfirmOpen}
          onClose={() => {
            if (!submitting) {
              setSubmitConfirmOpen(false);
            }
          }}
          aria-labelledby="quiz-submit-confirm-title"
          aria-describedby="quiz-submit-confirm-description"
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle id="quiz-submit-confirm-title">
            {"Confirmer la soumission"}
          </DialogTitle>

          <DialogContent>
            <DialogContentText id="quiz-submit-confirm-description">
              {answeredCount !== questionCount
                ? `Vous avez r\u00e9pondu \u00e0 ${answeredCount} question(s) sur ${questionCount}. Voulez-vous vraiment soumettre maintenant ?`
                : "Confirmer la soumission d\u00e9finitive de vos r\u00e9ponses ?"}
            </DialogContentText>
          </DialogContent>

          <DialogActions>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => setSubmitConfirmOpen(false)}
            >
              {"Annuler"}
            </Button>

            <Button
              type="button"
              variant="contained"
              disabled={submitting}
              startIcon={
                submitting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <Send size={17} />
                )
              }
              onClick={() => void submitQuiz(true)}
            >
              {submitting
                ? "Soumission..."
                : "Soumettre d\u00e9finitivement"}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader        eyebrow={"\u00c9valuations"}
        title={"Mes quiz"}
        description={
          "Retrouvez les \u00e9valuations disponibles dans vos formations, commencez une tentative ou consultez votre historique."
        }
        actions={
          <Button
            component={Link}
            to="/learner/trainings"
            variant="outlined"
            startIcon={<GraduationCap size={17} />}
          >
            {"Mes formations"}
          </Button>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      {filteredTraining ? (
        <Alert
          severity="info"
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RotateCcw size={15} />}
              onClick={() => setSearchParams({})}
            >
              {"Voir tous mes quiz"}
            </Button>
          }
        >
          <Typography variant="caption" sx={{ display: "block" }}>
            {"Formation s\u00e9lectionn\u00e9e"}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
            {filteredTraining.title}
          </Typography>
        </Alert>
      ) : null}

      <TextField
        type="search"
        fullWidth
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={"Rechercher un quiz ou une formation"}
        label={"Rechercher dans mes quiz"}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} />
              </InputAdornment>
            ),
          },
        }}
      />

      {items.length === 0 && !error ? (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
              <FileQuestion size={28} />
              <Typography variant="h6" sx={{ fontWeight: 850 }}>
                {"Aucun quiz disponible"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {
                  "Vos formations ne contiennent actuellement aucun quiz publi\u00e9."
                }
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
              <Search size={28} />
              <Typography variant="h6" sx={{ fontWeight: 850 }}>
                {"Aucun r\u00e9sultat"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {
                  "Aucun quiz ne correspond \u00e0 votre recherche ou \u00e0 cette formation."
                }
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 1.5,
          }}
        >
          {filteredItems.map(({ quiz, training }) => (
            <Card
              key={quiz.id}
              variant="outlined"
              sx={{ height: "100%", borderRadius: 3 }}
            >
              <CardContent sx={{ height: "100%", p: 2 }}>
                <Stack spacing={1.5} sx={{ height: "100%" }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                    }}
                  >
                    <Chip
                      size="small"
                      icon={<GraduationCap size={14} />}
                      label={training.title}
                      variant="outlined"
                      sx={{
                        maxWidth: "78%",
                        "& .MuiChip-label": {
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        },
                      }}
                    />
                    <Chip
                      size="small"
                      icon={<CheckCircle2 size={14} />}
                      label={"Disponible"}
                      color="success"
                      variant="outlined"
                    />
                  </Stack>

                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      {quiz.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        minHeight: "2.8em",
                      }}
                    >
                      {quiz.description ||
                        "\u00c9valuation disponible dans votre parcours."}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(3, minmax(0, 1fr))",
                      },
                      gap: 1,
                    }}
                  >
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2.25,
                        bgcolor: "action.hover",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {"Seuil de r\u00e9ussite"}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                        {`${quiz.passingScore ?? 0} %`}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2.25,
                        bgcolor: "action.hover",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {"Tentatives"}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                        {attemptLabel(quiz.maxAttempts)}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2.25,
                        bgcolor: "action.hover",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {"Dur\u00e9e"}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ alignItems: "center", mt: 0.25 }}
                      >
                        <Clock3 size={15} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                          {durationLabel(quiz.timeLimitMinutes)}
                        </Typography>
                      </Stack>
                    </Box>
                  </Box>

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ mt: "auto" }}
                  >
                    <Button
                      type="button"
                      size="small"
                      variant="contained"
                      disabled={playerLoading || historyLoading}
                      startIcon={
                        playerLoading ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <PlayCircle size={18} />
                        )
                      }
                      onClick={() => void openQuiz(quiz.id)}
                      sx={{ flex: 1 }}
                    >
                      {playerLoading
                        ? "Ouverture..."
                        : "Commencer le quiz"}
                    </Button>

                    <Button
                      type="button"
                      size="small"
                      variant="outlined"
                      disabled={playerLoading || historyLoading}
                      startIcon={<History size={17} />}
                      onClick={() => void openHistory(quiz.id)}
                    >
                      {"Historique"}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Stack>
  );
}
