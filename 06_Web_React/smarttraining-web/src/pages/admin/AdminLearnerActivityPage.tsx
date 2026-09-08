import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  Activity,
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  Gauge,
  RefreshCw,
} from "lucide-react";
import { getAdminUsers } from "../../api/adminApi";
import { getApiErrorMessage, getData } from "../../api/apiClient";
import { getProgressByLearner } from "../../api/analyticsApi";
import {
  getManagedLearnerQuizAttempts,
  type ManagedQuizAttemptResponse,
} from "../../api/reportingApi";
import { getTrainingsByLearner } from "../../api/trainingApi";
import type { AuthUser } from "../../types/admin";
import type {
  LearnerProgressResponse,
  LearningEventResponse,
} from "../../types/analytics";
import type { TrainingResponse } from "../../types/training";

type LoadResult<T> = {
  data: T;
  error: string;
};

async function loadSafe<T>(
  promise: Promise<T>,
  fallback: T,
): Promise<LoadResult<T>> {
  try {
    return {
      data: await promise,
      error: "",
    };
  } catch (error) {
    return {
      data: fallback,
      error: getApiErrorMessage(error),
    };
  }
}

function userName(user?: AuthUser | null): string {
  if (!user) {
    return "Apprenant";
  }

  return (
    user.fullName ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    user.email
  );
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
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function numericDate(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateInRange(
  value: string | null | undefined,
  from: string,
  to: string,
): boolean {
  if (!from && !to) {
    return true;
  }

  const valueMs = numericDate(value);

  if (!valueMs) {
    return false;
  }

  if (from) {
    const fromMs = new Date(`${from}T00:00:00`).getTime();
    if (valueMs < fromMs) {
      return false;
    }
  }

  if (to) {
    const toMs = new Date(`${to}T23:59:59.999`).getTime();
    if (valueMs > toMs) {
      return false;
    }
  }

  return true;
}

function eventLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    TRAINING_OPENED: "Formation ouverte",
    MODULE_OPENED: "Module ouvert",
    LESSON_OPENED: "Leçon ouverte",
    LESSON_COMPLETED: "Leçon terminée",
    RESOURCE_OPENED: "Ressource ouverte",
    RESOURCE_COMPLETED: "Ressource terminée",
    VIDEO_OPENED: "Vidéo ouverte",
    PDF_OPENED: "PDF ouvert",
    SCORM_OPENED: "Module SCORM ouvert",
    SCORM_FAILED: "Module SCORM échoué",
    SCORM_PASSED: "Module SCORM réussi",
    SCORM_COMPLETED: "Module SCORM terminé",
    SCORM_COMMITTED: "Progression SCORM enregistrée",
    SCORM_STARTED: "Module SCORM démarré",
    QUIZ_STARTED: "Quiz démarré",
    QUIZ_SUBMITTED: "Quiz soumis",
    QUIZ_PASSED: "Quiz réussi",
    QUIZ_FAILED: "Quiz échoué",
    SCORE_RECORDED: "Score enregistré",
    REVIEW_CREATED: "Avis publié",
    FEEDBACK_CREATED: "Feedback envoyé",
    HELP_REQUESTED: "Demande d'aide",
  };

  return value ? labels[value] || "Activité pédagogique" : "Activité pédagogique";
}

function isTechnicalEvent(event: LearningEventResponse): boolean {
  return event.eventType === "SCORM_COMMITTED";
}

function progressStatusLabel(
  status?: string | null,
  percentage?: number | null,
): string {
  const value = Number(percentage ?? 0);

  if (status === "COMPLETED" || value >= 100) {
    return "Terminée";
  }

  if (status === "AT_RISK") {
    return "À surveiller";
  }

  if (status === "IN_PROGRESS" || value > 0) {
    return "En cours";
  }

  return "Non commencée";
}

function attemptStatusLabel(status?: string | null): string {
  if (status === "SUBMITTED") {
    return "Terminée";
  }

  if (status === "CANCELLED") {
    return "Annulée / expirée";
  }

  if (status === "STARTED") {
    return "En cours";
  }

  return status || "—";
}

function percent(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return `${Math.round(value)} %`;
}

function scoreLabel(score?: number | null, total?: number | null): string {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "—";
  }

  if (typeof total === "number" && Number.isFinite(total) && total > 0) {
    return `${score} / ${total}`;
  }

  return String(score);
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <Card variant="outlined" sx={{ minWidth: 0, height: "100%" }}>
      <CardContent>
        <Typography
          variant="overline"
          sx={{ color: "text.secondary", fontWeight: 800 }}
        >
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.25 }}>
          {value}
        </Typography>
        {helper ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {helper}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function AdminLearnerActivityPage() {
  const navigate = useNavigate();
  const { learnerId: learnerIdParam } = useParams();

  const learnerId = Number(learnerIdParam);

  const [learner, setLearner] = useState<AuthUser | null>(null);
  const [trainings, setTrainings] = useState<TrainingResponse[]>([]);
  const [progress, setProgress] = useState<LearnerProgressResponse[]>([]);
  const [events, setEvents] = useState<LearningEventResponse[]>([]);
  const [attempts, setAttempts] = useState<ManagedQuizAttemptResponse[]>([]);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [includeTechnicalEvents, setIncludeTechnicalEvents] = useState(false);
  const [eventLimit, setEventLimit] = useState(20);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [partialWarning, setPartialWarning] = useState("");

  async function loadActivity(mode: "initial" | "refresh" = "initial") {
    if (!Number.isFinite(learnerId) || learnerId <= 0) {
      setError("Identifiant apprenant invalide.");
      setLoading(false);
      return;
    }

    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setPartialWarning("");

    try {
      const users = await getAdminUsers();
      const target = users.find((item) => item.id === learnerId) || null;

      if (!target) {
        throw new Error("Utilisateur introuvable.");
      }

      if (target.role !== "APPRENANT") {
        throw new Error(
          "Cette vue d'activité est réservée aux comptes apprenants.",
        );
      }

      setLearner(target);

      const [trainingResult, progressResult, eventResult, attemptResult] =
        await Promise.all([
          loadSafe(getTrainingsByLearner(learnerId), []),
          loadSafe(getProgressByLearner(learnerId), []),
          loadSafe(
            getData<LearningEventResponse[]>(
              `/analytics/events/learner/${learnerId}`,
            ),
            [],
          ),
          loadSafe(getManagedLearnerQuizAttempts(learnerId), []),
        ]);

      setTrainings(trainingResult.data);
      setProgress(progressResult.data);
      setEvents(eventResult.data);
      setAttempts(attemptResult.data);

      const warnings = [
        trainingResult.error
          ? `Formations : ${trainingResult.error}`
          : "",
        progressResult.error
          ? `Progression : ${progressResult.error}`
          : "",
        eventResult.error
          ? `Activité : ${eventResult.error}`
          : "",
        attemptResult.error
          ? `Quiz : ${attemptResult.error}`
          : "",
      ].filter(Boolean);

      setPartialWarning(warnings.join(" • "));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadActivity();
    // learnerId is the resolved route identity for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnerId]);

  const trainingById = useMemo(
    () => new Map(trainings.map((training) => [training.id, training])),
    [trainings],
  );

  const visibleProgress = useMemo(
    () =>
      [...progress]
        .filter((item) =>
          dateInRange(
            item.lastActivityAt ?? item.updatedAt,
            fromDate,
            toDate,
          ),
        )
        .sort(
          (a, b) =>
            numericDate(b.lastActivityAt ?? b.updatedAt) -
            numericDate(a.lastActivityAt ?? a.updatedAt),
        ),
    [fromDate, progress, toDate],
  );

  const filteredEvents = useMemo(
    () =>
      [...events]
        .filter(
          (event) =>
            dateInRange(event.eventDate, fromDate, toDate) &&
            (includeTechnicalEvents || !isTechnicalEvent(event)),
        )
        .sort(
          (a, b) =>
            numericDate(b.eventDate) - numericDate(a.eventDate),
        ),
    [events, fromDate, includeTechnicalEvents, toDate],
  );

  const visibleEvents = useMemo(
    () => filteredEvents.slice(0, eventLimit),
    [eventLimit, filteredEvents],
  );

  const hiddenTechnicalEventCount = useMemo(
    () =>
      events.filter(
        (event) =>
          isTechnicalEvent(event) &&
          dateInRange(event.eventDate, fromDate, toDate),
      ).length,
    [events, fromDate, toDate],
  );

  useEffect(() => {
    setEventLimit(20);
  }, [fromDate, includeTechnicalEvents, toDate]);

  const visibleAttempts = useMemo(
    () =>
      [...attempts]
        .filter((attempt) =>
          dateInRange(
            attempt.submittedAt ?? attempt.startedAt,
            fromDate,
            toDate,
          ),
        )
        .sort(
          (a, b) =>
            numericDate(b.submittedAt ?? b.startedAt) -
            numericDate(a.submittedAt ?? a.startedAt),
        ),
    [attempts, fromDate, toDate],
  );

  const averageProgress = useMemo(() => {
    const values = progress
      .map((item) => item.progressPercentage)
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      );

    if (!values.length) {
      return 0;
    }

    return Math.round(
      values.reduce((total, value) => total + value, 0) / values.length,
    );
  }, [progress]);

  const averageScore = useMemo(() => {
    const values = progress
      .map((item) => item.averageScore)
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      );

    if (!values.length) {
      return null;
    }

    return Math.round(
      values.reduce((total, value) => total + value, 0) / values.length,
    );
  }, [progress]);

  const completedTrainings = useMemo(
    () =>
      progress.filter(
        (item) =>
          item.status === "COMPLETED" ||
          Number(item.progressPercentage ?? 0) >= 100,
      ).length,
    [progress],
  );

  const lastActivityAt = useMemo(() => {
    const candidates = [
      ...events.map((item) => item.eventDate),
      ...progress.map((item) => item.lastActivityAt),
      ...attempts.map((item) => item.submittedAt ?? item.startedAt),
    ]
      .map((value) => ({
        value,
        time: numericDate(value),
      }))
      .filter((item) => item.time > 0)
      .sort((a, b) => b.time - a.time);

    return candidates[0]?.value ?? null;
  }, [attempts, events, progress]);

  const hasDateFilter = Boolean(fromDate || toDate);

  if (loading) {
    return (
      <Stack
        spacing={2}
        sx={{
          minHeight: 360,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">
          Chargement de l'activité apprenant...
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "center" },
        }}
      >
        <Box>
          <Button
            variant="text"
            startIcon={<ArrowLeft size={17} />}
            onClick={() => navigate("/admin/users")}
            sx={{ mb: 0.5 }}
          >
            Retour aux utilisateurs
          </Button>

          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            Activité de {userName(learner)}
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {learner?.email} • vue directe par apprenant, sans choisir une
            formation au préalable.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            refreshing ? (
              <CircularProgress size={16} />
            ) : (
              <RefreshCw size={17} />
            )
          }
          disabled={refreshing}
          onClick={() => void loadActivity("refresh")}
        >
          Actualiser
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {partialWarning ? (
        <Alert severity="warning">
          Certaines données n'ont pas pu être chargées : {partialWarning}
        </Alert>
      ) : null}

      {!error ? (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(5, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            <MetricCard
              label="Formations"
              value={trainings.length}
              helper={`${completedTrainings} terminée(s)`}
            />
            <MetricCard
              label="Progression moyenne"
              value={`${averageProgress} %`}
            />
            <MetricCard
              label="Score moyen"
              value={averageScore === null ? "—" : `${averageScore} %`}
            />
            <MetricCard
              label="Événements"
              value={events.length}
              helper={
                hasDateFilter
                  ? `${visibleEvents.length} dans la période`
                  : "Historique d'activité"
              }
            />
            <MetricCard
              label="Dernière activité"
              value={lastActivityAt ? formatDateTime(lastActivityAt) : "—"}
            />
          </Box>

          <Card variant="outlined">
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                sx={{
                  alignItems: { xs: "stretch", md: "end" },
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <CalendarDays size={19} />
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      Filtrer l'activité par date
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Le filtre s'applique à la progression datée, aux événements
                    et aux tentatives de quiz.
                  </Typography>
                </Box>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{ alignItems: { xs: "stretch", sm: "center" } }}
                >
                  <TextField
                    size="small"
                    type="date"
                    label="Du"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="Au"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <Button
                    variant="text"
                    disabled={!hasDateFilter}
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                  >
                    Réinitialiser
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", mb: 0.5 }}
              >
                <BookOpenCheck size={20} />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Formations et progression
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Les formations de l'apprenant sont affichées directement avec
                leur progression et leur dernière activité.
              </Typography>
            </CardContent>

            <Divider />

            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Formation</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>Progression</TableCell>
                    <TableCell>Leçons</TableCell>
                    <TableCell>Quiz</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Dernière activité</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!visibleProgress.length ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 2 }}
                        >
                          {hasDateFilter
                            ? "Aucune progression datée dans cette période."
                            : "Aucune progression enregistrée pour cet apprenant."}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleProgress.map((item) => {
                      const percentage = Math.max(
                        0,
                        Math.min(100, Math.round(item.progressPercentage ?? 0)),
                      );

                      return (
                        <TableRow key={item.id ?? item.trainingId} hover>
                          <TableCell sx={{ fontWeight: 800 }}>
                            {trainingById.get(item.trainingId)?.title ||
                              `Formation #${item.trainingId}`}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              variant="outlined"
                              label={progressStatusLabel(
                                item.status,
                                item.progressPercentage,
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                {percentage} %
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={percentage}
                              />
                            </Stack>
                          </TableCell>
                          <TableCell>
                            {item.completedLessons ?? 0} / {item.totalLessons ?? 0}
                          </TableCell>
                          <TableCell>
                            {item.completedQuizzes ?? 0} / {item.totalQuizzes ?? 0}
                          </TableCell>
                          <TableCell>{percent(item.averageScore)}</TableCell>
                          <TableCell>
                            {formatDateTime(
                              item.lastActivityAt ?? item.updatedAt,
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.5}
                sx={{
                  alignItems: { xs: "stretch", md: "center" },
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center", mb: 0.5 }}
                  >
                    <Activity size={20} />
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      Activité récente
                    </Typography>
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    {visibleEvents.length} activité(s) affichée(s) sur{" "}
                    {filteredEvents.length}
                    {hasDateFilter ? " dans la période sélectionnée" : ""}.
                    {!includeTechnicalEvents && hiddenTechnicalEventCount > 0
                      ? ` ${hiddenTechnicalEventCount} commit(s) SCORM technique(s) masqué(s).`
                      : ""}
                  </Typography>
                </Box>

                {hiddenTechnicalEventCount > 0 ? (
                  <Button
                    size="small"
                    variant="text"
                    onClick={() =>
                      setIncludeTechnicalEvents((current) => !current)
                    }
                  >
                    {includeTechnicalEvents
                      ? "Masquer les événements techniques"
                      : "Afficher les événements techniques"}
                  </Button>
                ) : null}
              </Stack>
            </CardContent>

            <Divider />

            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Formation</TableCell>
                    <TableCell>Événement</TableCell>
                    <TableCell>Détail</TableCell>
                    <TableCell>Progression</TableCell>
                    <TableCell>Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!visibleEvents.length ? (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 2 }}
                        >
                          Aucune activité dans cette période.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleEvents.map((event) => (
                      <TableRow key={event.id} hover>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {formatDateTime(event.eventDate)}
                        </TableCell>
                        <TableCell>
                          {event.trainingId
                            ? trainingById.get(event.trainingId)?.title ||
                              `Formation #${event.trainingId}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={eventLabel(event.eventType)}
                          />
                        </TableCell>
                        <TableCell>{event.description || "—"}</TableCell>
                        <TableCell>
                          {percent(event.progressPercentage)}
                        </TableCell>
                        <TableCell>
                          {scoreLabel(event.score, event.totalPoints)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {visibleEvents.length < filteredEvents.length ? (
              <>
                <Divider />
                <Box
                  sx={{
                    p: 1.5,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setEventLimit((current) => current + 20)}
                  >
                    Afficher 20 de plus
                  </Button>
                </Box>
              </>
            ) : null}
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", mb: 0.5 }}
              >
                <ClipboardCheck size={20} />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Tentatives de quiz
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {visibleAttempts.length} tentative(s)
                {hasDateFilter ? " dans la période sélectionnée" : ""}.
              </Typography>
            </CardContent>

            <Divider />

            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Quiz</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Résultat</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!visibleAttempts.length ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 2 }}
                        >
                          Aucune tentative de quiz dans cette période.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleAttempts.map((attempt, attemptIndex) => (
                      <TableRow
                        key={`${attempt.quizId}-${attempt.startedAt ?? attempt.submittedAt ?? "no-date"}-${attemptIndex}`}
                        hover
                      >
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {formatDateTime(
                            attempt.submittedAt ?? attempt.startedAt,
                          )}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>
                          Quiz #{attempt.quizId}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={attemptStatusLabel(attempt.status)}
                          />
                        </TableCell>
                        <TableCell>
                          {scoreLabel(attempt.score, attempt.totalPoints)}
                        </TableCell>
                        <TableCell>
                          {attempt.success === true ? (
                            <Chip size="small" label="Réussi" />
                          ) : attempt.success === false ? (
                            <Chip size="small" variant="outlined" label="Échoué" />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Gauge size={20} />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Lecture rapide
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Cette fiche regroupe l'activité d'un seul apprenant. Pour une
                analyse comparative de plusieurs apprenants ou de plusieurs
                formations, utilisez l'espace Résultats & rapports.
              </Typography>
            </CardContent>
          </Card>
        </>
      ) : null}
    </Stack>
  );
}