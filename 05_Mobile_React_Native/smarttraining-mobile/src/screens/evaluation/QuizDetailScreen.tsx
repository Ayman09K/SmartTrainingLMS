import { useNavigation } from "expo-router";
import ScreenContainer from "../../components/ScreenContainer";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import { isAxiosError } from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import QuestionBlock from "../../components/evaluation/QuestionBlock";
import {
  getMyQuizAttempt,
  getMyQuizAttemptsForQuiz,
  getQuizFullDetails,
  startQuizAttempt,
  submitQuizAttempt,
} from "../../features/evaluation/evaluationService";



import {
  Question,
  Quiz,
  QuizAttemptFullResponse,
  QuizAttemptResponse,
  SubmittedAnswerRequest,
} from "../../types/evaluation";

type Answers = Record<number, SubmittedAnswerRequest>;

const HISTORY_PAGE_SIZE = 3;

interface QuizDetailScreenProps {
  quizId: number;
  onResult: (result: QuizAttemptFullResponse, quiz: Quiz) => void;
  onBack: () => void;
  backLabel?: string;
}

function errorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data as
    | { message?: string; error?: string }
    | undefined;

  if (data?.message) return data.message;

  if (error.response?.status === 409) {
    return "Cette action n’est pas possible dans l’état actuel du quiz.";
  }

  if (error.response?.status === 403) {
    return "Ce quiz n’est pas accessible avec ton inscription actuelle.";
  }

  return fallback;
}

function normalizeQuizBackendDateTime(value: string): string {
  // Fallback for clients/responses where startedAtEpochMs is unavailable.
  // Evaluation timestamps without an offset are UTC, not device local time.
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    ? value
    : `${value}Z`;
}

// PATCH19_R1_QUIZ_ALPHA_FIX_V1
function attemptStartedAtMs(attempt: QuizAttemptResponse): number | null {
  const portableEpoch = (
    attempt as QuizAttemptResponse & { startedAtEpochMs?: number | null }
  ).startedAtEpochMs;

  if (
    typeof portableEpoch === "number" &&
    Number.isFinite(portableEpoch)
  ) {
    return portableEpoch;
  }

  if (!attempt.startedAt) {
    return null;
  }

  const parsed = new Date(normalizeQuizBackendDateTime(attempt.startedAt)).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function secondsFromAttempt(
  attempt: QuizAttemptResponse,
  quiz: Quiz,
): number | null {
  if (quiz.timeLimitMinutes <= 0) {
    return null;
  }

  const started = attemptStartedAtMs(attempt);

  if (started === null) {
    return null;
  }

  const deadline = started + quiz.timeLimitMinutes * 60_000;
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return "Sans limite";

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function attemptStatusLabel(status: QuizAttemptResponse["status"]): string {
  if (status === "SUBMITTED") return "Terminé";
  if (status === "CANCELLED") return "Expiré / annulé";
  return "En cours";
}

function confirmOnWeb(message: string): boolean {
  if (Platform.OS !== "web") {
    return false;
  }

  if (
    typeof globalThis !== "undefined" &&
    "confirm" in globalThis &&
    typeof globalThis.confirm === "function"
  ) {
    return globalThis.confirm(message);
  }

  return true;
}
function formatDate(value?: string | null): string {
  if (!value) return "Date indisponible";

  const date = new Date(normalizeQuizBackendDateTime(value));

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatAttemptDate(attempt: QuizAttemptResponse): string {
  const started = attemptStartedAtMs(attempt);

  if (started === null) {
    return formatDate(attempt.startedAt);
  }

  return new Date(started).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function isAnswerComplete(
  question: Question,
  answer?: SubmittedAnswerRequest,
): boolean {
  if (!answer) return false;

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
            entry.blankId === blankId && entry.value.trim().length > 0,
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
        (pair) => leftIds.has(pair.leftId) && rightIds.has(pair.rightId),
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
        (entry) => itemIds.has(entry.itemId) && zoneIds.has(entry.zoneId),
      )
    );
  }

  return (
    typeof answer.numericValue === "number" &&
    Number.isFinite(answer.numericValue)
  );
}

function sanitizeSubmissionAnswer(
  question: Question,
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

export default function QuizDetailScreen({
  quizId,
  onResult,
}: QuizDetailScreenProps) {
  const { theme } = useSmartTrainingTheme();
  const navigation = useNavigation();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttemptResponse[]>([]);
  const [activeAttempt, setActiveAttempt] =
    useState<QuizAttemptResponse | null>(null);
  const [selected, setSelected] = useState<Answers>({});
  const [secondsRemaining, setSecondsRemaining] =
    useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const expiryHandled = useRef(false);
  const allowNextRemoval = useRef(false);

  useEffect(() => {
    let active = true;

    void Promise.all([
      getQuizFullDetails(quizId),
      getMyQuizAttemptsForQuiz(quizId),
    ])
      .then(([quizData, attemptData]) => {
        if (!active) return;

        const current =
          attemptData.find((attempt) => attempt.status === "STARTED") ?? null;

        setQuiz(quizData);
        setAttempts(attemptData);
        setHistoryPage(1);
        setActiveAttempt(current);
        setSecondsRemaining(
          current ? secondsFromAttempt(current, quizData) : null,
        );
        setSelected((currentAnswers) =>
          current
            ? { ...currentAnswers }
            : {},
        );
        setError("");
        expiryHandled.current = false;
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            errorMessage(loadError, "Impossible de charger ce quiz."),
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [quizId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (!activeAttempt || allowNextRemoval.current) {
        allowNextRemoval.current = false;
        return;
      }

      event.preventDefault();

      const warning =
        "La tentative et le chronomètre continuent même si tu quittes cet écran. Les réponses non soumises ne sont pas enregistrées.";

      const leave = () => {
        allowNextRemoval.current = true;
        navigation.dispatch(event.data.action);
      };

      if (Platform.OS === "web") {
        const confirmed = confirmOnWeb(`Quitter le quiz ?\n\n${warning}`);
        if (confirmed) leave();
        return;
      }

      Alert.alert("Quitter le quiz ?", warning, [
        { text: "Rester", style: "cancel" },
        { text: "Quitter", onPress: leave },
      ]);
    });

    return unsubscribe;
  }, [activeAttempt, navigation]);

  useEffect(() => {
    if (!quiz || !activeAttempt) {
      return;
    }

    const timer = setInterval(() => {
      const remaining = secondsFromAttempt(activeAttempt, quiz);
      setSecondsRemaining(remaining);

      if (
        remaining === 0 &&
        !expiryHandled.current
      ) {
        expiryHandled.current = true;

        void getMyQuizAttempt(activeAttempt.id)
          .then((updated) => {
            if (updated.status !== "STARTED") {
              setActiveAttempt(null);
              setSelected({});
              setError(
                "Le temps imparti est écoulé. Cette tentative a été clôturée.",
              );

              return getMyQuizAttemptsForQuiz(quizId).then(setAttempts);
            }

            // The backend is authoritative. If it still reports STARTED,

            // allow the next timer tick to check again instead of freezing at 00:00.

            expiryHandled.current = false;

            return undefined;
          })
          .catch(() => {
            setError(
              "Le temps est écoulé. Actualise l’écran pour confirmer le statut de la tentative.",
            );
          });
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [activeAttempt, quiz, quizId]);

  const consumedAttempts = useMemo(
    () =>
      attempts.filter(
        (attempt) => attempt.status === "SUBMITTED",
      ).length,
    [attempts],
  );

  const remainingAttempts = useMemo(() => {
    if (!quiz || quiz.maxAttempts <= 0) {
      return null;
    }

    const reservedCurrent = activeAttempt ? 1 : 0;

    return Math.max(
      0,
      quiz.maxAttempts - consumedAttempts - reservedCurrent,
    );
  }, [activeAttempt, consumedAttempts, quiz]);

  const answeredCount = useMemo(() => {
    if (!quiz) return 0;

    return quiz.questions.filter((question) =>
      isAnswerComplete(question, selected[question.id]),
    ).length;
  }, [quiz, selected]);

  const historyTotalPages = Math.max(
    1,
    Math.ceil(attempts.length / HISTORY_PAGE_SIZE),
  );
  const safeHistoryPage = Math.min(historyPage, historyTotalPages);

  const visibleAttempts = useMemo(() => {
    const start = (safeHistoryPage - 1) * HISTORY_PAGE_SIZE;
    return attempts.slice(start, start + HISTORY_PAGE_SIZE);
  }, [attempts, safeHistoryPage]);

  async function refresh(): Promise<void> {
    try {
      setRefreshing(true);
      setError("");

      const [quizData, attemptData] = await Promise.all([
        getQuizFullDetails(quizId),
        getMyQuizAttemptsForQuiz(quizId),
      ]);

      const current =
        attemptData.find((attempt) => attempt.status === "STARTED") ?? null;

      setQuiz(quizData);
      setAttempts(attemptData);
      setHistoryPage(1);
      setActiveAttempt(current);
      setSecondsRemaining(
          current ? secondsFromAttempt(current, quizData) : null,
        );
        setSelected((currentAnswers) =>
          current
            ? { ...currentAnswers }
            : {},
        );
      expiryHandled.current = false;
    } catch (refreshError: unknown) {
      setError(
        errorMessage(refreshError, "Impossible d’actualiser ce quiz."),
      );
    } finally {
      setRefreshing(false);
    }
  }

  function changeAnswer(answer: SubmittedAnswerRequest): void {
    setSelected((current) => ({
      ...current,
      [answer.questionId]: answer,
    }));
  }

  async function start(): Promise<void> {
    if (!quiz || activeAttempt) return;

    if (remainingAttempts !== null && remainingAttempts <= 0) {
      setError("Le nombre maximum de tentatives est atteint.");
      return;
    }

    try {
      setStarting(true);
      setError("");

      const attempt = await startQuizAttempt({
        quizId: quiz.id,
      });

      setActiveAttempt(attempt);
      setSelected({});
      setSecondsRemaining(secondsFromAttempt(attempt, quiz));
      setAttempts((current) => [attempt, ...current]);
      expiryHandled.current = false;
    } catch (startError: unknown) {
      setError(
        errorMessage(
          startError,
          "Impossible de démarrer une nouvelle tentative.",
        ),
      );

      await refresh();
    } finally {
      setStarting(false);
    }
  }

  async function submitConfirmed(): Promise<void> {
    if (!quiz || !activeAttempt) return;

    if (
      secondsRemaining !== null &&
      secondsRemaining <= 0
    ) {
      setError("Le temps imparti est écoulé.");
      await refresh();
      return;
    }

    if (answeredCount !== quiz.questions.length) {
      Alert.alert(
        "Quiz incomplet",
        "Réponds à toutes les questions avant de soumettre.",
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const result = await submitQuizAttempt(
        activeAttempt.id,
        {
          answers: quiz.questions.map((question) =>
            sanitizeSubmissionAnswer(
              question,
              selected[question.id] ?? { questionId: question.id },
            ),
          ),
        },
      );

      setActiveAttempt(null);
      setSelected({});
      onResult(result, quiz);
    } catch (submitError: unknown) {
      setError(
        errorMessage(
          submitError,
          "Impossible de soumettre le quiz.",
        ),
      );

      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function requestSubmit(): void {
    if (!quiz || !activeAttempt) return;

    if (Platform.OS === "web") {
      const confirmed = confirmOnWeb(
        "Soumettre le quiz ?\n\nAprès l’envoi, tes réponses ne pourront plus être modifiées.",
      );

      if (confirmed) {
        void submitConfirmed();
      }

      return;
    }

    Alert.alert(
      "Soumettre le quiz ?",
      "Après l’envoi, tes réponses ne pourront plus être modifiées.",
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Soumettre",
          onPress: () => {
            void submitConfirmed();
          },
        },
      ],
    );
  }
  if (loading) {
    return <LoadingState message="Chargement du quiz..." />;
  }

  if (!quiz) {
    return (
      <ScreenContainer
        edges={["left", "right", "bottom"]}
        style={{ padding: 14, backgroundColor: theme.colors.background }}
      >
        <View className="flex-1 justify-center">
          <ErrorMessage
            message={error || "Quiz introuvable."}
            onRetry={refresh}
          />
        </View>
      </ScreenContainer>
    );
  }

  const hasTimeLimit = quiz.timeLimitMinutes > 0;
  const dangerTimer =
    secondsRemaining !== null && secondsRemaining <= 60;

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-[14px] pb-9 pt-3"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[760px] self-center">
          <View
            className="relative overflow-hidden rounded-[26px] px-4 pb-4 pt-4"
            style={{
              backgroundColor: "#172554",
              shadowColor: "#0F172A",
              shadowOpacity: 0.18,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 5,
            }}
          >
            <View className="absolute -right-12 -top-14 h-44 w-44 rounded-full bg-violet-500/20" />
            <View className="absolute right-20 top-20 h-24 w-24 rounded-full bg-blue-400/10" />
            <View className="absolute -left-12 bottom-2 h-36 w-36 rounded-full bg-indigo-300/10" />

            <View className="flex-row items-start gap-3">
              <View className="min-w-0 flex-1">
                <Text
                  maxFontSizeMultiplier={1}
                  className="text-[11px] font-black uppercase tracking-[2px]"
                  style={{ color: "#C7D2FE" }}
                >
                  Quiz interactif
                </Text>
                <Text className="mt-2 text-[25px] font-black leading-[30px]"
                  style={{ color: "#FFFFFF" }}>
                  {quiz.title}
                </Text>
                {quiz.description ? (
                  <Text className="mt-2 text-[13px] leading-[20px]"
                    style={{ color: "rgba(255,255,255,0.74)" }}>
                    {quiz.description}
                  </Text>
                ) : null}
              </View>

              <View className="h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-white/10">
                <Text
                  maxFontSizeMultiplier={1}
                  className="text-[28px] font-black"
                  style={{ color: "#C7D2FE" }}
                >
                  &lt;/&gt;
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row rounded-[18px] bg-white/10 px-1 py-2.5">
              <View className="min-w-0 flex-1 items-center border-r border-white/10 px-1">
                <Text maxFontSizeMultiplier={1} className="text-[16px] font-black" style={{ color: "#FFFFFF" }}>
                  {quiz.questions.length}
                </Text>
                <Text maxFontSizeMultiplier={1} className="mt-0.5 text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Questions
                </Text>
              </View>
              <View className="min-w-0 flex-1 items-center border-r border-white/10 px-1">
                <Text maxFontSizeMultiplier={1} className="text-[16px] font-black" style={{ color: "#FFFFFF" }}>
                  {hasTimeLimit ? `${quiz.timeLimitMinutes} min` : "Libre"}
                </Text>
                <Text maxFontSizeMultiplier={1} className="mt-0.5 text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Durée
                </Text>
              </View>
              <View className="min-w-0 flex-1 items-center border-r border-white/10 px-1">
                <Text maxFontSizeMultiplier={1} className="text-[16px] font-black" style={{ color: "#FFFFFF" }}>
                  {quiz.passingScore}%
                </Text>
                <Text maxFontSizeMultiplier={1} className="mt-0.5 text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Score requis
                </Text>
              </View>
              <View className="min-w-0 flex-1 items-center px-1">
                <Text maxFontSizeMultiplier={1} className="text-[16px] font-black" style={{ color: "#FFFFFF" }}>
                  {quiz.maxAttempts}
                </Text>
                <Text maxFontSizeMultiplier={1} className="mt-0.5 text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.65)" }}>
                  Tentatives max
                </Text>
              </View>
            </View>
          </View>

          {error ? (
            <View className="mt-4">
              <ErrorMessage message={error} onRetry={refresh} />
            </View>
          ) : null}

          {activeAttempt ? (
            <>
              <View
                className="mt-5 overflow-hidden rounded-[24px] border"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: dangerTimer ? "#FCA5A5" : theme.colors.border,
                  shadowColor: theme.colors.shadow,
                  shadowOpacity: 0.04,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 1,
                }}
              >
                <View className="flex-row items-stretch">
                  <View
                    className="min-w-0 flex-[1.15] px-4 py-4"
                    style={{ backgroundColor: dangerTimer ? "#FEF2F2" : theme.colors.surface }}
                  >
                    <Text
                      maxFontSizeMultiplier={1}
                      numberOfLines={1}
                      className="text-[10px] font-black uppercase tracking-[1.2px]"
                      style={{ color: dangerTimer ? "#DC2626" : theme.colors.foregroundMuted }}
                    >
                      Temps restant
                    </Text>
                    <Text
                      maxFontSizeMultiplier={1}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.78}
                      className="mt-1 text-[28px] font-black leading-[31px]"
                      style={{ color: dangerTimer ? "#DC2626" : theme.colors.foreground }}
                    >
                      {formatTime(secondsRemaining)}
                    </Text>
                  </View>

                  <View
                    className="w-px self-stretch"
                    style={{ backgroundColor: theme.colors.border }}
                  />

                  <View className="min-w-0 flex-1 px-4 py-4">
                    <Text
                      maxFontSizeMultiplier={1}
                      numberOfLines={1}
                      className="text-[10px] font-black uppercase tracking-[1.2px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Progression
                    </Text>
                    <Text
                      maxFontSizeMultiplier={1}
                      numberOfLines={1}
                      className="mt-1 text-[28px] font-black leading-[31px]"
                      style={{ color: theme.colors.accent }}
                    >
                      {answeredCount}/{quiz.questions.length}
                    </Text>
                  </View>
                </View>

                <View
                  className="h-1.5 w-full"
                  style={{ backgroundColor: theme.colors.surfaceSoft }}
                >
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${quiz.questions.length > 0 ? Math.min(100, (answeredCount / quiz.questions.length) * 100) : 0}%`,
                      backgroundColor: theme.colors.accent,
                    }}
                  />
                </View>
              </View>

              <View
                className="mt-3 rounded-[18px] px-4 py-3"
                style={{ backgroundColor: theme.colors.surfaceSoft }}
              >
                <Text
                  className="text-[12px] leading-[18px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Tentative démarrée le {formatAttemptDate(activeAttempt)}. Les réponses non soumises ne sont pas enregistrées si tu quittes cette page.
                </Text>
              </View>

              <View className="mb-3 mt-6">
                <Text
                  className="text-[24px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Questions
                </Text>
                <Text
                  className="mt-1 text-[14px] leading-[21px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Réponds à toutes les questions avant de soumettre.
                </Text>
              </View>

              {quiz.questions.map((question, questionIndex) => (
                <QuestionBlock
                  key={question.id}
                  question={{ ...question, orderIndex: questionIndex + 1 }}
                  answer={
                    selected[question.id] ?? { questionId: question.id }
                  }
                  onChange={changeAnswer}
                />
              ))}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Soumettre le quiz"
                onPress={requestSubmit}
                disabled={
                  submitting ||
                  (secondsRemaining !== null && secondsRemaining <= 0)
                }
                className="mt-1 items-center rounded-[18px] px-4 py-4 active:opacity-85 disabled:opacity-50"
                style={{ backgroundColor: theme.colors.accent }}
              >
                <Text
                  className="text-[16px] font-black"
                  style={{ color: theme.colors.accentForeground }}
                >
                  {submitting ? "Soumission en cours..." : "Soumettre le quiz"}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <View
                className="mt-5 rounded-[26px] border p-4"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.shadow,
                  shadowOpacity: 0.045,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 7 },
                  elevation: 2,
                }}
              >
                <View className="mb-3 flex-row items-center gap-3">
                  <View
                    className="h-11 w-11 items-center justify-center rounded-[14px]"
                    style={{ backgroundColor: theme.colors.surfaceSoft }}
                  >
                    <Text className="text-[20px]" style={{ color: theme.colors.accent }}>▤</Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-[20px] font-black"
                      style={{ color: theme.colors.foreground }}
                    >
                      Règles du quiz
                    </Text>
                    <Text
                      className="mt-0.5 text-[12px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Tout ce qu’il faut savoir avant de commencer.
                    </Text>
                  </View>
                </View>

                <View
                  className="overflow-hidden rounded-[18px]"
                  style={{ backgroundColor: theme.colors.surfaceSoft }}
                >
                  <View className="flex-row items-center border-b px-4 py-3.5" style={{ borderColor: theme.colors.border }}>
                    <Text className="mr-3 text-[18px]" style={{ color: "#16A34A" }}>✓</Text>
                    <Text className="flex-1 text-[13px] font-bold" style={{ color: theme.colors.foreground }}>
                      Réponds à toutes les questions
                    </Text>
                  </View>
                  <View className="flex-row items-center border-b px-4 py-3.5" style={{ borderColor: theme.colors.border }}>
                    <Text className="mr-3 text-[18px]" style={{ color: "#F59E0B" }}>◷</Text>
                    <Text className="flex-1 text-[13px] font-bold" style={{ color: theme.colors.foreground }}>
                      {hasTimeLimit ? `Le temps est limité à ${quiz.timeLimitMinutes} minutes` : "Aucune limite de temps"}
                    </Text>
                  </View>
                  <View className="flex-row items-center border-b px-4 py-3.5" style={{ borderColor: theme.colors.border }}>
                    <Text className="mr-3 text-[18px]" style={{ color: "#0EA5E9" }}>↻</Text>
                    <Text className="flex-1 text-[13px] font-bold" style={{ color: theme.colors.foreground }}>
                      {quiz.maxAttempts} tentative{quiz.maxAttempts > 1 ? "s" : ""} maximum
                    </Text>
                  </View>
                  <View className="flex-row items-center px-4 py-3.5">
                    <Text className="mr-3 text-[18px]" style={{ color: "#EAB308" }}>★</Text>
                    <Text className="flex-1 text-[13px] font-bold" style={{ color: theme.colors.foreground }}>
                      Obtiens au moins {quiz.passingScore}% pour réussir
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row gap-2">
                  <View
                    className="min-w-0 flex-1 rounded-[15px] px-3 py-2.5"
                    style={{ backgroundColor: theme.colors.surfaceSoft }}
                  >
                    <Text className="text-[10px] font-bold" style={{ color: theme.colors.foregroundMuted }}>
                      Utilisées
                    </Text>
                    <Text className="mt-0.5 text-[16px] font-black" style={{ color: theme.colors.foreground }}>
                      {consumedAttempts}/{quiz.maxAttempts}
                    </Text>
                  </View>
                  <View
                    className="min-w-0 flex-1 rounded-[15px] px-3 py-2.5"
                    style={{ backgroundColor: theme.colors.surfaceSoft }}
                  >
                    <Text className="text-[10px] font-bold" style={{ color: theme.colors.foregroundMuted }}>
                      Restantes
                    </Text>
                    <Text className="mt-0.5 text-[16px] font-black" style={{ color: theme.colors.accent }}>
                      {remainingAttempts ?? 0}
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Commencer une tentative"
                onPress={() => void start()}
                disabled={
                  starting ||
                  (remainingAttempts !== null && remainingAttempts <= 0)
                }
                className="mt-4 flex-row items-center justify-center rounded-[18px] px-4 py-4 active:opacity-85 disabled:opacity-50"
                style={{ backgroundColor: theme.colors.accent }}
              >
                <Text
                  className="mr-2 text-[18px] font-black"
                  style={{ color: theme.colors.accentForeground }}
                >
                  ▶
                </Text>
                <Text
                  className="text-[16px] font-black"
                  style={{ color: theme.colors.accentForeground }}
                >
                  {starting ? "Démarrage en cours..." : "Commencer une tentative"}
                </Text>
              </Pressable>
            </>
          )}

          <View className="mb-3 mt-7 flex-row items-end justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text
                className="text-[22px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Historique des tentatives
              </Text>
              <Text
                className="mt-1 text-[13px] leading-[19px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Consulte tes essais précédents et leurs résultats.
              </Text>
            </View>
            <View
              className="h-9 min-w-9 items-center justify-center rounded-full px-2.5"
              style={{ backgroundColor: theme.colors.surfaceSoft }}
            >
              <Text
                maxFontSizeMultiplier={1}
                className="text-[13px] font-black"
                style={{ color: theme.colors.accent }}
              >
                {attempts.length}
              </Text>
            </View>
          </View>

          {attempts.length === 0 ? (
            <View
              className="rounded-[22px] border px-4 py-5"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                className="text-center text-[13px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Aucune tentative pour ce quiz.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {visibleAttempts.map((attempt, index) => {
                const score = attempt.score ?? 0;
                const total = attempt.totalPoints ?? 0;
                const submitted = attempt.status === "SUBMITTED";
                const success = attempt.success === true;
                const statusColor = submitted
                  ? success
                    ? "#16A34A"
                    : "#DC2626"
                  : attempt.status === "STARTED"
                    ? "#F59E0B"
                    : "#DC2626";

                return (
                  <View
                    key={attempt.id}
                    className="rounded-[22px] border p-4"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="min-w-0 flex-1">
                        <Text
                          className="text-[16px] font-black"
                          style={{ color: theme.colors.foreground }}
                        >
                          Tentative {attempts.length - ((safeHistoryPage - 1) * HISTORY_PAGE_SIZE + index)}
                        </Text>
                        <Text
                          className="mt-1 text-[12px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {formatAttemptDate(attempt)}
                        </Text>
                      </View>

                      <View
                        className="rounded-full px-3 py-1.5"
                        style={{ backgroundColor: `${statusColor}15` }}
                      >
                        <Text
                          maxFontSizeMultiplier={1}
                          className="text-[10px] font-black"
                          style={{ color: statusColor }}
                        >
                          {attemptStatusLabel(attempt.status)}
                        </Text>
                      </View>
                    </View>

                    {submitted ? (
                      <View
                        className="mt-3 flex-row items-center justify-between rounded-[15px] px-3 py-2.5"
                        style={{ backgroundColor: theme.colors.surfaceSoft }}
                      >
                        <Text
                          className="text-[12px] font-bold"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          Score
                        </Text>
                        <Text
                          className="text-[14px] font-black"
                          style={{ color: statusColor }}
                        >
                          {score}/{total} · {success ? "Réussi" : "Non validé"}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}

              {historyTotalPages > 1 ? (
                <View
                  className="mt-1 flex-row items-center justify-between rounded-[18px] border px-3 py-2.5"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Page précédente des tentatives"
                    disabled={safeHistoryPage <= 1}
                    onPress={() => setHistoryPage((current) => Math.max(1, current - 1))}
                    className="h-10 w-10 items-center justify-center rounded-[12px] disabled:opacity-30"
                    style={{ backgroundColor: theme.colors.surfaceSoft }}
                  >
                    <Text
                      maxFontSizeMultiplier={1}
                      className="text-[22px] font-black"
                      style={{ color: theme.colors.foreground }}
                    >
                      ‹
                    </Text>
                  </Pressable>

                  <Text
                    maxFontSizeMultiplier={1}
                    className="text-[12px] font-extrabold"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Page {safeHistoryPage} sur {historyTotalPages}
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Page suivante des tentatives"
                    disabled={safeHistoryPage >= historyTotalPages}
                    onPress={() =>
                      setHistoryPage((current) =>
                        Math.min(historyTotalPages, current + 1),
                      )
                    }
                    className="h-10 w-10 items-center justify-center rounded-[12px] disabled:opacity-30"
                    style={{ backgroundColor: theme.colors.surfaceSoft }}
                  >
                    <Text
                      maxFontSizeMultiplier={1}
                      className="text-[22px] font-black"
                      style={{ color: theme.colors.foreground }}
                    >
                      ›
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
