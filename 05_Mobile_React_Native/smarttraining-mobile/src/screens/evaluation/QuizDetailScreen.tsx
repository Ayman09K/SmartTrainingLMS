import ScreenContainer from "../../components/ScreenContainer";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import { isAxiosError } from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppButton from "../../components/AppButton";
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
  onBack,
  backLabel = "Retour aux quiz",
}: QuizDetailScreenProps) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
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
  const expiryHandled = useRef(false);

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
  function requestBack(): void {
    if (activeAttempt) {
      const warning =
        "La tentative et le chronomètre continuent même si tu quittes cet écran. Les réponses non soumises ne sont pas enregistrées.";

      if (Platform.OS === "web") {
        const confirmed = confirmOnWeb(
          `Quitter le quiz ?

${warning}`,
        );

        if (confirmed) {
          onBack();
        }

        return;
      }

      Alert.alert(
        "Quitter le quiz ?",
        warning,
        [
          {
            text: "Rester",
            style: "cancel",
          },
          {
            text: "Quitter",
            onPress: onBack,
          },
        ],
      );

      return;
    }

    onBack();
  }
  if (loading) {
    return <LoadingState message="Chargement du quiz..." />;
  }

  if (!quiz) {
    return (
      <View style={styles.container}>
        <ErrorMessage
          message={error || "Quiz introuvable."}
          onRetry={refresh}
        />
        <AppButton
          title={backLabel}
          onPress={onBack}
          variant="secondary"
        />
      </View>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
        />
      }
    >
      <AppButton
        title={backLabel}
        onPress={requestBack}
        variant="secondary"
      />

      <Text style={styles.title}>{quiz.title}</Text>

      {quiz.description ? (
        <Text style={styles.description}>{quiz.description}</Text>
      ) : null}

      <View style={styles.rulesCard}>
        <Text style={styles.rulesTitle}>Règles du quiz</Text>
        <Text style={styles.rule}>
          Score requis : {quiz.passingScore} %
        </Text>
        <Text style={styles.rule}>
          Durée : {quiz.timeLimitMinutes} min
        </Text>
        <Text style={styles.rule}>
          Tentatives utilisées : {consumedAttempts} / {quiz.maxAttempts}
        </Text>
        <Text style={styles.rule}>
          {activeAttempt
            ? `Tentative en cours · ${remainingAttempts ?? 0} restante(s) après celle-ci`
            : `${remainingAttempts ?? 0} tentative(s) restante(s)`}
        </Text>
      </View>

      {error ? <ErrorMessage message={error} onRetry={refresh} /> : null}

      {activeAttempt ? (
        <>
          <View
            style={[
              styles.timerCard,
              secondsRemaining !== null &&
              secondsRemaining <= 60
                ? styles.timerDanger
                : null,
            ]}
          >
            <Text style={styles.timerLabel}>Temps restant</Text>
            <Text style={styles.timerValue}>
              {formatTime(secondsRemaining)}
            </Text>
            <Text style={styles.timerHelp}>
              Tentative démarrée le {formatAttemptDate(activeAttempt)}
            </Text>
          </View>

          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>
              Questions répondues
            </Text>
            <Text style={styles.progressValue}>
              {answeredCount} / {quiz.questions.length}
            </Text>
            <Text style={styles.progressHelp}>
              Les réponses non soumises ne sont pas enregistrées si tu
              quittes cette page.
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

          <AppButton
            title={
              submitting
                ? "Soumission en cours..."
                : "Soumettre le quiz"
            }
            onPress={requestSubmit}
            disabled={
              submitting ||
              (secondsRemaining !== null &&
                secondsRemaining <= 0)
            }
          />
        </>
      ) : (
        <View style={styles.startCard}>
          <Text style={styles.startTitle}>
            Prêt à commencer ?
          </Text>
          <Text style={styles.startText}>
            Le chrono démarre au lancement de la tentative.
          </Text>

          <AppButton
            title={
              starting
                ? "Démarrage en cours..."
                : "Commencer une tentative"
            }
            onPress={start}
            disabled={
              starting ||
              (remainingAttempts !== null &&
                remainingAttempts <= 0)
            }
          />
        </View>
      )}

      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Historique des tentatives</Text>

        {attempts.length === 0 ? (
          <Text style={styles.emptyHistory}>
            Aucune tentative pour ce quiz.
          </Text>
        ) : (
          attempts.map((attempt, index) => {
            const score = attempt.score ?? 0;
            const total = attempt.totalPoints ?? 0;

            return (
              <View key={attempt.id} style={styles.historyCard}>
                <View style={styles.historyTop}>
                  <Text style={styles.historyAttempt}>
                    Tentative {attempts.length - index}
                  </Text>
                  <Text style={styles.historyStatus}>
                    {attemptStatusLabel(attempt.status)}
                  </Text>
                </View>

                <Text style={styles.historyMeta}>
                  Début : {formatAttemptDate(attempt)}
                </Text>

                {attempt.status === "SUBMITTED" ? (
                  <Text style={styles.historyScore}>
                    Score : {score} / {total}
                    {attempt.success === true
                      ? " · Réussi"
                      : " · Non validé"}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function makeStyles(theme: ReturnType<typeof useSmartTrainingTheme>["theme"]) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 14,
    paddingBottom: theme.shape.cardPadding * 2,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 18,
  },
  description: {
    color: theme.colors.foregroundMuted,
    lineHeight: 21,
    marginTop: 8,
  },
  rulesCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: 18,
    marginTop: 18,
    marginBottom: 14,
    gap: 5,
  },
  rulesTitle: {
    color: theme.colors.foreground,
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 5,
  },
  rule: {
    color: theme.colors.foregroundSubtle,
    fontWeight: "700",
  },
  timerCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.shape.cardRadius,
    padding: 18,
    marginVertical: 14,
  },
  timerDanger: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  timerLabel: {
    color: theme.colors.foregroundSubtle,
    fontWeight: "800",
  },
  timerValue: {
    color: theme.colors.foreground,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 5,
  },
  timerHelp: {
    color: theme.colors.foregroundMuted,
    marginTop: 5,
  },
  progressCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.shape.cardRadius,
    padding: 18,
    marginBottom: 14,
  },
  progressTitle: {
    color: theme.colors.foreground,
    fontWeight: "900",
  },
  progressValue: {
    color: theme.colors.accent,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 5,
  },
  progressHelp: {
    color: theme.colors.foregroundMuted,
    lineHeight: 19,
    marginTop: 8,
  },
  startCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: theme.shape.cardPadding,
    marginVertical: 14,
  },
  startTitle: {
    color: theme.colors.foreground,
    fontSize: 19,
    fontWeight: "900",
  },
  startText: {
    color: theme.colors.foregroundMuted,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 18,
  },
  historySection: {
    marginTop: theme.shape.cardPadding,
  },
  historyTitle: {
    color: theme.colors.foreground,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 14,
  },
  emptyHistory: {
    color: theme.colors.foregroundMuted,
    textAlign: "center",
    padding: 18,
  },
  historyCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.controlRadius,
    padding: 14,
    marginBottom: 8,
  },
  historyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  historyAttempt: {
    color: theme.colors.foreground,
    fontWeight: "900",
  },
  historyStatus: {
    color: theme.colors.accent,
    fontWeight: "800",
  },
  historyMeta: {
    color: theme.colors.foregroundMuted,
    marginTop: 5,
  },
  historyScore: {
    color: theme.colors.foregroundSubtle,
    fontWeight: "800",
    marginTop: 8,
  },
});
}
