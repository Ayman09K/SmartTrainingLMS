import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  HelpCircle,
  Layers,
  ListChecks,
  LogOut,
  MoreVertical,
  Sparkles,
} from "lucide-react";

import {
  completeLearningLesson,
  completeLearningResource,
  getMyTrainingContent,
  selfUnenroll,
} from "../../api/trainingApi";
import { getMyTrainingEvents } from "../../api/analyticsApi";
import { getLearnerQuizzesByTraining } from "../../api/quizApi";
import { buildMediaUrl } from "../../api/apiConfig";
import { CourseOutline } from "../../components/learner/coursePlayer/CourseOutline";
import { LessonContent } from "../../components/learner/coursePlayer/LessonContent";
import { PlayerNavigation } from "../../components/learner/coursePlayer/PlayerNavigation";
import { PlayerProgress } from "../../components/learner/coursePlayer/PlayerProgress";
import { ResourceRenderer } from "../../components/learner/coursePlayer/ResourceRenderer";
import { WebAssistantDrawerPanel } from "../../components/assistant/WebAssistant";
import {
  buildCoursePlayerSteps,
  type CoursePlayerStep,
} from "../../components/learner/coursePlayer/coursePlayerModel";
import { SmartPageHeader } from "../../components/ui";
import { TrainingCover } from "../../components/ux/RichPrimitives";
import { useAuth } from "../../features/auth/AuthContext";
import type { LearningEventResponse } from "../../types/analytics";
import type { LearnerQuizResponse } from "../../types/evaluation";
import type { LearnerTrainingContentResponse } from "../../types/training";

function levelLabel(level?: string | null): string {
  if (level === "DEBUTANT") return "Débutant";
  if (level === "INTERMEDIAIRE") return "Intermédiaire";
  if (level === "AVANCE") return "Avancé";
  return level || "Formation";
}

function deadlineState(
  dueAt?: string | null,
  enrollmentStatus?: string,
): {
  label: string;
  color: "default" | "success" | "warning" | "error" | "info";
} | null {
  if (!dueAt) return null;

  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) {
    return { label: `Échéance : ${dueAt}`, color: "default" };
  }

  const formatted = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(due);

  if (enrollmentStatus === "COMPLETED") {
    return { label: `Échéance : ${formatted}`, color: "success" };
  }

  const remainingMs = due.getTime() - Date.now();

  if (remainingMs < 0) {
    return {
      label: `Échéance dépassée · ${formatted}`,
      color: "error",
    };
  }

  const remainingDays = Math.ceil(remainingMs / 86_400_000);

  if (remainingDays <= 3) {
    return {
      label: `Échéance dans ${remainingDays} jour${remainingDays > 1 ? "s" : ""} · ${formatted}`,
      color: "warning",
    };
  }

  return {
    label: `À terminer avant le ${formatted}`,
    color: "info",
  };
}

function readResumeStep(
  storageKey: string | null,
  steps: CoursePlayerStep[],
): string | null {
  if (!storageKey || typeof window === "undefined") return null;

  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved && steps.some((step) => step.key === saved)
      ? saved
      : null;
  } catch {
    return null;
  }
}

function writeResumeStep(
  storageKey: string | null,
  stepKey: string,
): void {
  if (!storageKey || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, stepKey);
  } catch {
    // La reprise locale est un confort UX. Elle ne doit jamais bloquer le player.
  }
}

function completedServerIds(events: LearningEventResponse[]): {
  lessonIds: Set<number>;
  resourceIds: Set<number>;
} {
  const lessonIds = new Set<number>();
  const resourceIds = new Set<number>();

  for (const event of events) {
    const type = String(event.eventType || "").toUpperCase();

    if (
      type === "LESSON_COMPLETED" &&
      typeof event.lessonId === "number"
    ) {
      lessonIds.add(event.lessonId);
    }

    if (
      type === "RESOURCE_COMPLETED" &&
      typeof event.resourceId === "number"
    ) {
      resourceIds.add(event.resourceId);
    }
  }

  return { lessonIds, resourceIds };
}

function serverResumeStepKey(
  steps: CoursePlayerStep[],
  events: LearningEventResponse[],
): string | null {
  const { lessonIds, resourceIds } = completedServerIds(events);

  if (lessonIds.size === 0 && resourceIds.size === 0) {
    return null;
  }

  for (const step of steps) {
    if (step.kind === "QUIZ" || step.lessonId == null) {
      continue;
    }

    if (lessonIds.has(step.lessonId)) {
      continue;
    }

    if (
      step.kind === "RESOURCE" &&
      step.resourceId != null &&
      resourceIds.has(step.resourceId)
    ) {
      continue;
    }

    return step.key;
  }

  return null;
}

function fartherResumeStepKey(
  steps: CoursePlayerStep[],
  localKey: string | null,
  serverKey: string | null,
): string | null {
  if (!localKey) return serverKey;
  if (!serverKey) return localKey;

  const localIndex = steps.findIndex((step) => step.key === localKey);
  const serverIndex = steps.findIndex((step) => step.key === serverKey);

  if (localIndex < 0) return serverKey;
  if (serverIndex < 0) return localKey;

  return serverIndex > localIndex ? serverKey : localKey;
}

function resourceCompletionAllowed(step: CoursePlayerStep): boolean {
  return (
    step.kind === "RESOURCE" &&
    step.resource != null &&
    String(step.resource.type || "").toUpperCase() !== "SCORM"
  );
}

function resourceCompletesOnNext(step: CoursePlayerStep): boolean {
  if (!resourceCompletionAllowed(step)) return false;

  const type = String(step.resource?.type || "").toUpperCase();
  return type !== "VIDEO" && type !== "VIDEO_URL";
}

function isVideoResourceStep(step?: CoursePlayerStep | null): boolean {
  if (!step || step.kind !== "RESOURCE") return false;

  const type = String(step.resource?.type || "").toUpperCase();
  return type === "VIDEO" || type === "VIDEO_URL";
}

function resourceTypeLabel(type?: string | null): string {
  const normalized = String(type || "").toUpperCase();

  if (normalized === "TEXT") return "Leçon";
  if (normalized === "IMAGE") return "Image";
  if (normalized === "VIDEO" || normalized === "VIDEO_URL") return "Vidéo";
  if (normalized === "PDF" || normalized === "PDF_URL") return "PDF";
  if (normalized === "SCORM") return "Module interactif";
  if (normalized === "DOCUMENT") return "Document";
  if (normalized === "EXTERNAL_LINK") return "Lien externe";

  return "Ressource";
}

type LearnerTrainingDetailPageProps = {
  focused?: boolean;
};

export function LearnerTrainingDetailPage({
  focused = false,
}: LearnerTrainingDetailPageProps) {
  const { trainingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const numericTrainingId = Number(trainingId);

  const [training, setTraining] =
    useState<LearnerTrainingContentResponse | null>(null);
  const [quizzes, setQuizzes] = useState<LearnerQuizResponse[]>([]);
  const [activeStepKey, setActiveStepKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [completionBusy, setCompletionBusy] = useState(false);
  const [error, setError] = useState("");
  const [quizWarning, setQuizWarning] = useState("");
  const [success, setSuccess] = useState("");
  const [resumeNotice, setResumeNotice] = useState("");
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [unenrollMenuAnchor, setUnenrollMenuAnchor] =
    useState<HTMLElement | null>(null);
  const [unenrollDialogOpen, setUnenrollDialogOpen] = useState(false);
  const [unenrollBusy, setUnenrollBusy] = useState(false);

  const resumeStorageKey = user?.id
    ? `smarttraining.course-player.resume.${user.id}.${numericTrainingId}`
    : null;

  const steps = useMemo(
    () =>
      training
        ? buildCoursePlayerSteps(training, quizzes)
        : [],
    [training, quizzes],
  );

  const activeStep =
    steps.find((step) => step.key === activeStepKey) ||
    steps[0] ||
    null;

  const activeModuleId = activeStep?.moduleId ?? null;
  const activeLessonId = activeStep?.lessonId ?? null;
  const activeResourceId = activeStep?.resourceId ?? null;
  const activeQuizId = activeStep?.quizId ?? null;
  const currentIndex = activeStep
    ? steps.findIndex((step) => step.key === activeStep.key)
    : -1;

  const loadCourse = useCallback(
    async (
      preferredStepKey?: string,
      options?: { showLoader?: boolean },
    ) => {
      const showLoader = options?.showLoader ?? true;
      if (!numericTrainingId) {
        setError("Cette formation n'est pas disponible.");
        setTraining(null);
        setLoading(false);
        return;
      }

      if (showLoader) {
        setLoading(true);
      }
      setError("");
      setQuizWarning("");

      try {
        const loadedTraining =
          await getMyTrainingContent(numericTrainingId);

        let loadedQuizzes: LearnerQuizResponse[] = [];

        try {
          loadedQuizzes =
            await getLearnerQuizzesByTraining(numericTrainingId);
        } catch {
          setQuizWarning(
            "Les évaluations sont momentanément indisponibles. Le reste du parcours reste accessible.",
          );
        }

        const loadedSteps = buildCoursePlayerSteps(
          loadedTraining,
          loadedQuizzes,
        );

        const preferred =
          preferredStepKey &&
          loadedSteps.some((step) => step.key === preferredStepKey)
            ? preferredStepKey
            : null;
        const replayRequested =
          new URLSearchParams(window.location.search).get("replay") === "1";
        const localResume =
          preferred || replayRequested
            ? null
            : readResumeStep(resumeStorageKey, loadedSteps);

        let serverResume: string | null = null;

        if (!preferred && !replayRequested) {
          try {
            const events =
              await getMyTrainingEvents(numericTrainingId);
            serverResume =
              serverResumeStepKey(loadedSteps, events);
          } catch {
            // Cross-device resume is a resilient enhancement.
            // Existing local resume remains available if Analytics is unavailable.
          }
        }

        const resumed =
          preferred || replayRequested
            ? null
            : fartherResumeStepKey(
                loadedSteps,
                localResume,
                serverResume,
              );

        const resumedFromServer =
          Boolean(serverResume) &&
          resumed === serverResume &&
          resumed !== localResume;

        const initialKey =
          preferred ||
          (replayRequested ? loadedSteps[0]?.key || "" : resumed) ||
          loadedSteps[0]?.key ||
          "";

        setTraining(loadedTraining);
        setQuizzes(loadedQuizzes);
        setActiveStepKey(initialKey);
        setResumeNotice(
          resumed
            ? resumedFromServer
              ? "Reprise de votre progression synchronisée."
              : "Reprise du dernier point consulté sur cet appareil."
            : "",
        );

        if (initialKey) {
          writeResumeStep(resumeStorageKey, initialKey);
        }
      } catch {
        setTraining(null);
        setQuizzes([]);
        setError(
          "Impossible de charger cette formation. Vérifiez qu'elle est toujours disponible dans votre parcours.",
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [numericTrainingId, resumeStorageKey],
  );

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  useEffect(() => {
    if (!focused || typeof document === "undefined") {
      return;
    }

    const syncFullscreen = () => {
      const fullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(fullscreen);

      if (fullscreen) {
        setAssistantOpen(false);
      }
    };

    syncFullscreen();
    document.addEventListener("fullscreenchange", syncFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, [focused]);

  const handleScormTerminal = useCallback(async () => {
    if (!activeStep?.key) return;

    await loadCourse(activeStep.key, { showLoader: false });
    setSuccess(
      "Module interactif terminé. Votre progression a été mise à jour.",
    );
  }, [activeStep?.key, loadCourse]);

  function selectStep(stepKey: string) {
    if (!steps.some((step) => step.key === stepKey)) return;

    setActiveStepKey(stepKey);
    setSuccess("");
    setResumeNotice("");
    writeResumeStep(resumeStorageKey, stepKey);
  }

  function goPrevious() {
    if (currentIndex > 0) {
      selectStep(steps[currentIndex - 1].key);
    }
  }

  async function goNext() {
    if (
      currentIndex < 0 ||
      currentIndex >= steps.length - 1 ||
      completionBusy
    ) {
      return;
    }

    const nextStep = steps[currentIndex + 1];

    if (activeStep?.kind === "RESOURCE" && resourceCompletesOnNext(activeStep)) {
      await completeActiveResource(
        nextStep.key,
        "Contenu consulté. Votre progression a été mise à jour.",
      );
      return;
    }

    if (activeStep?.kind === "LESSON") {
      const rule = String(
        activeStep.lesson?.completionRule || "",
      ).toUpperCase();

      if (rule === "OPENED" || rule === "MANUAL") {
        await completeActiveLesson(nextStep.key);
        return;
      }
    }

    selectStep(nextStep.key);
  }

  async function completeActiveLesson(nextStepKey?: string) {
    if (
      !activeLessonId ||
      activeStep?.kind !== "LESSON" ||
      completionBusy
    ) {
      return;
    }

    setCompletionBusy(true);
    setError("");
    setSuccess("");

    try {
      await completeLearningLesson(activeLessonId);
      await loadCourse(nextStepKey || activeStep.key);
      setSuccess(
        nextStepKey
          ? "Leçon consultée. Votre progression a été mise à jour."
          : "Leçon terminée. Votre progression a été mise à jour.",
      );
    } catch {
      setError(
        "Cette leçon n’a pas pu être terminée. Réessayez ou revenez-y plus tard.",
      );
    } finally {
      setCompletionBusy(false);
    }
  }

  async function completeActiveResource(
    nextStepKey?: string,
    successMessage = "Contenu terminé. Votre progression a été mise à jour.",
  ) {
    if (
      !activeStep ||
      !activeResourceId ||
      !resourceCompletionAllowed(activeStep) ||
      completionBusy
    ) {
      return;
    }

    setCompletionBusy(true);
    setError("");
    setSuccess("");

    try {
      await completeLearningResource(activeResourceId);

      const nextStep =
        currentIndex >= 0 ? steps[currentIndex + 1] || null : null;
      const lesson = activeStep.lesson;
      const rule = String(
        lesson?.completionRule || "",
      ).toUpperCase();
      const finishesLesson =
        Boolean(lesson) &&
        (!nextStep || nextStep.lessonId !== lesson?.id);
      const directLessonCompletion =
        !rule || rule === "MANUAL" || rule === "OPENED";

      if (lesson && finishesLesson && directLessonCompletion) {
        await completeLearningLesson(lesson.id);
      }

      await loadCourse(nextStepKey || activeStep.key);
      setSuccess(successMessage);
    } catch {
      setError(
        "Ce contenu n’a pas pu être enregistré. Réessayez dans quelques instants.",
      );
    } finally {
      setCompletionBusy(false);
    }
  }

  async function handleSelfUnenroll() {
    if (!training?.canSelfUnenroll || unenrollBusy) return;

    setUnenrollBusy(true);
    setError("");

    try {
      await selfUnenroll(numericTrainingId);
      setUnenrollDialogOpen(false);
      navigate("/learner/trainings", { replace: true });
    } catch {
      setError(
        "La d\u00E9sinscription n'a pas pu etre effectuee. Rechargez la page puis reessayez.",
      );
    } finally {
      setUnenrollBusy(false);
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 360,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={32} />
          <Typography color="text.secondary">
            {"Ouverture du parcours..."}
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (error && !training) {
    return (
      <Stack spacing={2.5}>
        <Alert severity="error">{error}</Alert>
        <Button
          component={Link}
          to="/learner/trainings"
          variant="outlined"
          startIcon={<ArrowLeft size={17} />}
          sx={{ alignSelf: "flex-start" }}
        >
          {"Retour aux formations"}
        </Button>
      </Stack>
    );
  }

  if (!training) {
    return (
      <Alert severity="info">
        {"Cette formation n'est pas disponible dans votre parcours."}
      </Alert>
    );
  }

  const lessonCount = training.modules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  );
  const deadline = deadlineState(
    training.dueAt,
    training.enrollmentStatus,
  );
  const cover = buildMediaUrl(training.coverImageUrl);
  const displayProgress = Math.min(
    100,
    Math.max(0, Math.round(training.progressPercentage ?? 0)),
  );
  const overviewModuleCount = training.modules.length;

  // PATCH16_A8C5I_COURSE_CONTENT_CLARITY_V1
  const activeResourceType =
    activeStep?.kind === "RESOURCE"
      ? String(activeStep.resource?.type || "").toUpperCase()
      : "";
  const isTextResourceStep = activeResourceType === "TEXT";
  const isStandaloneScormStep =
    activeResourceType === "SCORM" &&
    overviewModuleCount === 1 &&
    lessonCount === 1;
  const focusedStepTitle =
    activeStep?.kind === "RESOURCE"
      ? isStandaloneScormStep
        ? training.title
        : isTextResourceStep
          ? activeStep.lesson?.title || activeStep.title
          : activeStep.resource?.title || activeStep.title
      : activeStep?.title || "Contenu pédagogique";
  const focusedStepDescription =
    activeStep?.kind === "RESOURCE"
      ? isTextResourceStep
        ? activeStep.lesson?.description || ""
        : activeStep.resource?.description || ""
      : activeStep?.subtitle || "";

  const savedResumeStepKey =
    steps.length > 0
      ? readResumeStep(resumeStorageKey, steps)
      : null;
  const savedResumeIndex = savedResumeStepKey
    ? steps.findIndex((step) => step.key === savedResumeStepKey)
    : -1;
  const hasSavedResumePoint =
    savedResumeIndex > 0 && savedResumeIndex < steps.length;

  if (!focused) {
    return (
      <Stack spacing={2.5}>
        <SmartPageHeader
          eyebrow={"Ma formation"}
          title={training.title}
          description={
            training.description ||
            training.shortDescription ||
            "Consultez les informations de la formation puis lancez votre apprentissage."
          }
          actions={
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
            >
              <Button
                component={Link}
                to="/learner/trainings"
                variant="outlined"
                startIcon={<ArrowLeft size={17} />}
              >
                {"Mes formations"}
              </Button>
              {quizzes.length > 0 ? (
                <Button
                  component={Link}
                  to={`/learner/quizzes?trainingId=${training.id}`}
                  variant="outlined"
                  startIcon={<ListChecks size={17} />}
                >
                  {quizzes.length === 1
                    ? "Voir le quiz"
                    : `Voir les ${quizzes.length} quiz`}
                </Button>
              ) : null}
              <Button
                component={Link}
                to={`/learner/feedbacks?trainingId=${training.id}`}
                variant="outlined"
                startIcon={<HelpCircle size={17} />}
              >
                {"Avis & aide"}
              </Button>
              {training.canSelfUnenroll ? (
                <>
                  <Tooltip title={"Plus d'actions"}>
                    <IconButton
                      aria-label={"Plus d'actions"}
                      onClick={(event) =>
                        setUnenrollMenuAnchor(event.currentTarget)
                      }
                    >
                      <MoreVertical size={20} />
                    </IconButton>
                  </Tooltip>
                  <Menu
                    anchorEl={unenrollMenuAnchor}
                    open={Boolean(unenrollMenuAnchor)}
                    onClose={() => setUnenrollMenuAnchor(null)}
                  >
                    <MenuItem
                      sx={{ color: "error.main" }}
                      onClick={() => {
                        setUnenrollMenuAnchor(null);
                        setError("");
                        setUnenrollDialogOpen(true);
                      }}
                    >
                      <LogOut size={17} style={{ marginRight: 10 }} />
                      {"Se d\u00E9sinscrire"}
                    </MenuItem>
                  </Menu>
                </>
              ) : null}
            </Stack>
          }
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: "minmax(260px, 420px) minmax(0, 1fr)",
            },
            gap: 2.5,
            alignItems: "start",
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", sm: 520, lg: 420 },
              borderRadius: 3,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <TrainingCover
              title={training.title}
              coverUrl={cover}
            />
          </Box>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
                >
                  <Chip
                    size="small"
                    variant="outlined"
                    label={levelLabel(training.level)}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    icon={<Layers size={14} />}
                    label={`${overviewModuleCount} module${overviewModuleCount > 1 ? "s" : ""}`}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    icon={<BookOpen size={14} />}
                    label={`${lessonCount} leçon${lessonCount > 1 ? "s" : ""}`}
                  />
                  {quizzes.length > 0 ? (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${quizzes.length} quiz`}
                    />
                  ) : null}
                  {deadline ? (
                    <Chip
                      size="small"
                      color={deadline.color}
                      variant={deadline.color === "error" ? "filled" : "outlined"}
                      icon={<CalendarClock size={14} />}
                      label={deadline.label}
                    />
                  ) : null}
                </Stack>

                <PlayerProgress
                  progressPercentage={training.progressPercentage}
                />

                {displayProgress >= 100 ? (
                  <Alert severity="success" variant="outlined">
                    {"Formation terminée. Votre progression a été enregistrée par SmartTraining."}
                  </Alert>
                ) : resumeNotice ? (
                  <Alert severity="info" variant="outlined">
                    {resumeNotice}
                  </Alert>
                ) : null}

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1.25}
                  sx={{
                    alignItems: { xs: "stretch", sm: "center" },
                  }}
                >
                  <Button
                    component={Link}
                    to={
                      displayProgress >= 100
                        ? `/learner/trainings/${training.id}/play?replay=1`
                        : `/learner/trainings/${training.id}/play`
                    }
                    variant="contained"
                    size="large"
                    startIcon={<BookOpen size={18} />}
                    sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
                  >
                    {displayProgress >= 100
                      ? "Revoir depuis le début"
                      : hasSavedResumePoint
                        ? `Reprendre — étape ${savedResumeIndex + 1}/${steps.length}`
                        : "Commencer la formation"}
                  </Button>

                  {displayProgress < 100 && hasSavedResumePoint ? (
                    <Button
                      component={Link}
                      to={`/learner/trainings/${training.id}/play?replay=1`}
                      variant="outlined"
                      size="large"
                      sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
                    >
                      {"Recommencer depuis le début"}
                    </Button>
                  ) : null}
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {
                    "Le mode apprentissage affiche uniquement le contenu utile. Les informations, la progression et le bilan restent disponibles sur cette page."
                  }
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Dialog
          open={unenrollDialogOpen}
          onClose={() => {
            if (!unenrollBusy) setUnenrollDialogOpen(false);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{"Se d\u00E9sinscrire de cette formation ?"}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {
                "Vous perdrez l'acces a la formation, mais votre progression, vos resultats et vos certificats resteront conserves. Vous pourrez vous reinscrire plus tard et reprendre votre progression."
              }
            </DialogContentText>
            {error ? (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setUnenrollDialogOpen(false)}
              disabled={unenrollBusy}
            >
              {"Annuler"}
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => void handleSelfUnenroll()}
              disabled={unenrollBusy}
            >
              {unenrollBusy ? "D\u00E9sinscription..." : "Se d\u00E9sinscrire"}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: "background.default",
        px: { xs: 1, sm: 2, lg: 3 },
        py: { xs: 1, sm: 2 },
        pb: { xs: 13, sm: 12 },
        mr: {
          xs: 0,
          md:
            assistantOpen && !isFullscreen
              ? "408px"
              : 0,
        },
        transition: (theme) =>
          theme.transitions.create("margin-right", {
            duration: theme.transitions.duration.shorter,
          }),
      }}
    >
      <WebAssistantDrawerPanel
        open={assistantOpen && !isFullscreen}
        onClose={() => setAssistantOpen(false)}
        topOffset={0}
        trainingId={numericTrainingId}
        lessonId={activeLessonId}
        contextLabel={
          activeLessonId
            ? "Contexte : leçon en cours"
            : "Contexte : formation en cours"
        }
      />

      <Stack spacing={1.5} sx={{ maxWidth: 1600, mx: "auto" }}>
        <Card
          variant="outlined"
          sx={{
            borderRadius: 3,
            bgcolor: "background.paper",
            boxShadow: 1,
          }}
        >
          <CardContent sx={{ py: 1.75, px: { xs: 1.5, sm: 2.5 } }}>
            <Stack spacing={1.25}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={1.25}
                sx={{
                  alignItems: { xs: "stretch", md: "center" },
                  justifyContent: "space-between",
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center", minWidth: 0 }}
                >
                  <Button
                    component={Link}
                    to={`/learner/trainings/${training.id}`}
                    variant="outlined"
                    size="small"
                    startIcon={<ArrowLeft size={16} />}
                  >
                    {"Quitter"}
                  </Button>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="subtitle1"
                      noWrap
                      sx={{ fontWeight: 900 }}
                    >
                      {training.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {steps.length
                        ? `Étape ${Math.max(1, currentIndex + 1)} sur ${steps.length}`
                        : "Parcours"}
                    </Typography>
                  </Box>
                </Stack>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  {!isFullscreen ? (
                    <Tooltip title="Assistant SmartTraining">
                      <IconButton
                        aria-label={
                          assistantOpen
                            ? "Fermer l’Assistant SmartTraining"
                            : "Ouvrir l’Assistant SmartTraining"
                        }
                        color={assistantOpen ? "primary" : "default"}
                        onClick={() =>
                          setAssistantOpen((current) => !current)
                        }
                        sx={{
                          border: 1,
                          borderColor: assistantOpen
                            ? "primary.main"
                            : "divider",
                          bgcolor: assistantOpen
                            ? "action.selected"
                            : "background.paper",
                        }}
                      >
                        <Sparkles size={18} />
                      </IconButton>
                    </Tooltip>
                  ) : null}

                  <Chip
                    size="small"
                    label={`${displayProgress} %`}
                    color={displayProgress >= 100 ? "success" : "default"}
                  />
                  <Button
                    type="button"
                    size="small"
                    variant="outlined"
                    onClick={() => setOutlineOpen((value) => !value)}
                  >
                    {outlineOpen ? "Masquer le sommaire" : "Sommaire"}
                  </Button>
                </Stack>
              </Stack>

              <PlayerProgress
                progressPercentage={training.progressPercentage}
              />
            </Stack>
          </CardContent>
        </Card>

        {resumeNotice ? (
          <Alert severity="info">{resumeNotice}</Alert>
        ) : null}
        {quizWarning ? (
          <Alert severity="warning">{quizWarning}</Alert>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}

        {displayProgress >= 100 ? (
          <Alert
            severity="success"
            variant="outlined"
            action={
              <Button
                component={Link}
                to={`/learner/trainings/${training.id}`}
                color="inherit"
                size="small"
              >
                {"Voir mon bilan"}
              </Button>
            }
          >
            {"Formation terminée. Bravo pour votre progression !"}
          </Alert>
        ) : null}

        {!steps.length ? (
          <Alert severity="info">
            {"Aucun contenu pédagogique n'est disponible pour cette formation."}
          </Alert>
        ) : (
          <>
            {outlineOpen ? (
              <Card variant="outlined">
                <CardContent>
                  <Typography
                    variant="subtitle1"
                    sx={{ mb: 1.5, fontWeight: 900 }}
                  >
                    {"Sommaire"}
                  </Typography>
                  <CourseOutline
                    training={training}
                    steps={steps}
                    activeStepKey={activeStep?.key || ""}
                    onSelect={(stepKey) => {
                      selectStep(stepKey);
                      setOutlineOpen(false);
                    }}
                  />
                </CardContent>
              </Card>
            ) : null}

            <Card
              variant="outlined"
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                bgcolor: "background.paper",
                boxShadow: 1,
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3, lg: 4 } }}>
                <Stack
                  spacing={2.5}
                  sx={{
                    width: "100%",
                    maxWidth: 1180,
                    mx: "auto",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ justifyContent: "space-between" }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="overline"
                        color="text.secondary"
                      >
                        {activeStep?.kind === "LESSON"
                          ? "Leçon"
                          : activeStep?.kind === "RESOURCE"
                            ? resourceTypeLabel(activeResourceType)
                            : "Quiz"}
                      </Typography>
                      <Typography
                        variant="h5"
                        component="h1"
                        sx={{
                          fontWeight: 900,
                          fontSize: { xs: "1.35rem", sm: "1.6rem" },
                          lineHeight: 1.25,
                        }}
                      >
                        {focusedStepTitle}
                      </Typography>
                      {focusedStepDescription ? (
                        <Typography
                          variant="body1"
                          color="text.secondary"
                          sx={{ mt: 0.75, maxWidth: 960, lineHeight: 1.65 }}
                        >
                          {focusedStepDescription}
                        </Typography>
                      ) : null}
                    </Box>

                    {activeModuleId && !isStandaloneScormStep ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={activeStep?.module?.title || "Module"}
                      />
                    ) : null}
                  </Stack>

                  <Divider />

                  {activeStep?.kind === "LESSON" &&
                  activeStep.lesson ? (
                    <LessonContent
                      lesson={activeStep.lesson}
                      busy={completionBusy}
                      onComplete={() => void completeActiveLesson()}
                    />
                  ) : null}

                  {activeStep?.kind === "RESOURCE" &&
                  activeStep.resource ? (
                    <Stack spacing={2}>
                      {isTextResourceStep && activeStep.lesson?.objective ? (
                        <Alert severity="info" sx={{ maxWidth: 960 }}>
                          <strong>{"Votre objectif : "}</strong>
                          {activeStep.lesson.objective}
                        </Alert>
                      ) : null}

                      {isTextResourceStep && activeStep.lesson?.content ? (
                        <Box
                          sx={{
                            maxWidth: 960,
                            px: { xs: 0.5, sm: 1 },
                            py: 0.5,
                          }}
                        >
                          <Typography
                            variant="body1"
                            sx={{
                              whiteSpace: "pre-line",
                              fontSize: { xs: "1rem", sm: "1.075rem" },
                              lineHeight: 1.8,
                            }}
                          >
                            {activeStep.lesson.content}
                          </Typography>
                        </Box>
                      ) : null}

                      {isTextResourceStep ? (
                        <>
                          <Divider sx={{ maxWidth: 960 }} />
                          <Typography
                            variant="h6"
                            component="h2"
                            sx={{ maxWidth: 960, fontWeight: 900 }}
                          >
                            {activeStep.resource.title}
                          </Typography>
                        </>
                      ) : null}

                      <Box
                        sx={
                          isTextResourceStep
                            ? {
                                maxWidth: 960,
                                "& > div": {
                                  borderLeft: "4px solid",
                                  borderColor: "primary.main",
                                },
                                "& p": {
                                  fontSize: { xs: "1rem", sm: "1.075rem" },
                                  lineHeight: 1.8,
                                },
                              }
                            : undefined
                        }
                      >
                        <ResourceRenderer
                          trainingId={training.id}
                          resource={activeStep.resource}
                          onScormTerminal={handleScormTerminal}
                          onVideoEnded={() => {
                            void completeActiveResource(
                              undefined,
                              "Vidéo terminée. Votre progression a été mise à jour.",
                            );
                          }}
                        />
                      </Box>

                      {isVideoResourceStep(activeStep) ? (
                        <Alert severity="info" sx={{ maxWidth: 960 }}>
                          {
                            "Regardez la vidéo jusqu’à la fin pour valider cette étape."
                          }
                        </Alert>
                      ) : null}
                    </Stack>
                  ) : null}

                  {activeStep?.kind === "QUIZ" &&
                  activeQuizId &&
                  activeStep.quiz ? (
                    <ResourceRenderer
                      trainingId={training.id}
                      quiz={activeStep.quiz}
                    />
                  ) : null}
                </Stack>
              </CardContent>
            </Card>

            <PlayerNavigation
              currentIndex={currentIndex}
              totalSteps={steps.length}
              onPrevious={goPrevious}
              onNext={goNext}
              desktopRightOffset={
                assistantOpen && !isFullscreen ? 408 : 0
              }
              finishHref={`/learner/trainings/${training.id}`}
              finishLabel="Voir mon bilan"
              finishReady={
                (training.progressPercentage ?? 0) >= 100
              }
              onFinish={
                activeStep?.kind === "LESSON" &&
                String(
                  activeStep.lesson?.completionRule || "",
                ).toUpperCase() === "MANUAL"
                  ? () => {
                      void completeActiveLesson();
                    }
                  : activeStep?.kind === "RESOURCE" &&
                      resourceCompletesOnNext(activeStep)
                    ? () => {
                        void completeActiveResource();
                      }
                    : undefined
              }
              finishBusy={completionBusy}
              navigationBusy={completionBusy}
              lastStepHref={
                activeStep?.kind === "QUIZ" && activeQuizId
                  ? `/learner/quizzes?trainingId=${training.id}&quizId=${activeQuizId}`
                  : undefined
              }
              lastStepLabel={
                activeStep?.kind === "QUIZ"
                  ? "Accéder au quiz final"
                  : undefined
              }
            />
          </>
        )}
      </Stack>
    </Box>
  );
}
