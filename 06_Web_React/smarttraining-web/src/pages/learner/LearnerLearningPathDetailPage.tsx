import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  LibraryBig,
} from "lucide-react";
import { buildMediaUrl } from "../../api/apiConfig";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  getLearningPathCatalogDetail,
  getMyLearningPathProgress,
} from "../../api/learningPathApi";
import type {
  LearningPathCatalogResponse,
  LearningPathProgressResponse,
  LearningPathStepResponse,
  LearningPathTrainingProgressResponse,
} from "../../types/learningPath";

function clampPercent(value?: number | null): number {
  if (value == null || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDueAt(value?: string | null): string | null {
  if (!value) {
    return null;
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

function stepProgressFor(
  progress: LearningPathProgressResponse | null,
  trainingId: number,
): LearningPathTrainingProgressResponse | null {
  if (!progress) {
    return null;
  }

  return (
    progress.trainings.find(
      (item) => item.trainingId === trainingId,
    ) || null
  );
}

function firstAvailableTraining(
  trainings: LearningPathStepResponse[],
): number | null {
  const first = trainings.find(
    (item) =>
      !item.trainingMissing &&
      String(item.trainingStatus || "").toUpperCase() === "PUBLISHED",
  );

  return first?.trainingId ?? null;
}

export function LearnerLearningPathDetailPage() {
  const { pathId } = useParams();
  const numericPathId = Number(pathId);

  const [path, setPath] =
    useState<LearningPathCatalogResponse | null>(null);
  const [progress, setProgress] =
    useState<LearningPathProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      if (!Number.isInteger(numericPathId) || numericPathId <= 0) {
        if (active) {
          setError("Ce parcours n'est pas disponible.");
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");

      try {
        const catalogDetail =
          await getLearningPathCatalogDetail(numericPathId);

        let learnerProgress: LearningPathProgressResponse | null = null;

        if (catalogDetail.assignedToMe) {
          learnerProgress =
            await getMyLearningPathProgress(numericPathId);
        }

        if (active) {
          setPath(catalogDetail);
          setProgress(learnerProgress);
        }
      } catch (err) {
        if (active) {
          setPath(null);
          setProgress(null);
          setError(getApiErrorMessage(err));
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
  }, [numericPathId]);

  const orderedTrainings = useMemo(
    () =>
      [...(path?.trainings || [])].sort(
        (a, b) => a.position - b.position || a.id - b.id,
      ),
    [path?.trainings],
  );

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
            Chargement du parcours...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !path) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">
          {error || "Ce parcours n'est pas disponible."}
        </Alert>
        <Button
          component={Link}
          to="/learner/catalog"
          variant="outlined"
          startIcon={<ArrowLeft size={17} />}
          sx={{ alignSelf: "flex-start" }}
        >
          Retour au catalogue
        </Button>
      </Stack>
    );
  }

  const cover = buildMediaUrl(
    path.coverImageUrl || path.coverImagePath,
  );

  const completionProgress = clampPercent(
    progress?.completionProgressPercentage,
  );
  const overallProgress = clampPercent(
    progress?.overallProgressPercentage,
  );

  const fallbackTrainingId =
    firstAvailableTraining(orderedTrainings);

  const startTrainingId =
    progress?.nextTrainingId || fallbackTrainingId;

  const pathDueAt = formatDueAt(progress?.pathDueAt);

  const primaryLabel = progress?.completed
    ? "Revoir le parcours"
    : progress && progress.overallProgressPercentage > 0
      ? "Reprendre le parcours"
      : "Commencer le parcours";

  const primaryTarget =
    path.canStart && startTrainingId
      ? `/learner/trainings/${startTrainingId}/play${
          progress?.completed ? "?replay=1" : ""
        }`
      : null;

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "flex-start" },
        }}
      >
        <Box>
          <Button
            component={Link}
            to="/learner/catalog"
            variant="text"
            startIcon={<ArrowLeft size={17} />}
            sx={{ mb: 1 }}
          >
            Catalogue
          </Button>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap", mb: 1 }}
          >
            <Chip
              icon={<LibraryBig size={14} />}
              label="Parcours"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={
                path.assignedToMe
                  ? "Affecté"
                  : "À découvrir"
              }
              color={
                path.assignedToMe
                  ? "success"
                  : "default"
              }
            />
            {pathDueAt ? (
              <Chip
                icon={<Clock3 size={14} />}
                label={`Échéance : ${pathDueAt}`}
                variant="outlined"
              />
            ) : null}
          </Stack>

          <Typography variant="h4" sx={{ fontWeight: 900 }}>
            {path.title}
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mt: 1, maxWidth: 880 }}
          >
            {path.shortDescription ||
              path.description ||
              "Un parcours structuré de formations."}
          </Typography>
        </Box>

        {primaryTarget ? (
          <Button
            component={Link}
            to={primaryTarget}
            variant="contained"
            endIcon={<ArrowRight size={17} />}
          >
            {primaryLabel}
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled
          >
            Affectation requise
          </Button>
        )}
      </Stack>

      {cover ? (
        <Card variant="outlined" sx={{ overflow: "hidden" }}>
          <CardMedia
            component="img"
            image={cover}
            alt={path.title}
            sx={{
              width: "100%",
              maxHeight: 330,
              objectFit: "contain",
            }}
          />
        </Card>
      ) : null}

      {!path.canStart ? (
        <Alert severity="info">
          Ce parcours est public et consultable, mais il doit vous être
          affecté avant de pouvoir démarrer ses formations.
        </Alert>
      ) : null}

      {progress ? (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{
                  justifyContent: "space-between",
                  alignItems: { xs: "stretch", sm: "center" },
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 850 }}>
                    Votre progression
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    Les formations facultatives enrichissent le parcours,
                    mais ne bloquent pas sa complétion lorsqu'il existe des
                    étapes obligatoires.
                  </Typography>
                </Box>

                <Chip
                  icon={
                    progress.completed ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <BookOpen size={15} />
                    )
                  }
                  label={
                    progress.completed
                      ? "Parcours terminé"
                      : `${progress.completedRequiredSteps}/${progress.requiredSteps || progress.totalSteps} obligatoires terminées`
                  }
                  color={
                    progress.completed ? "success" : "default"
                  }
                />
              </Stack>

              <Box>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 0.75,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Progression de complétion
                  </Typography>
                  <Typography variant="body2">
                    {completionProgress} %
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={completionProgress}
                  sx={{ height: 8, borderRadius: 99 }}
                />
              </Box>

              <Box>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 0.75,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    Progression globale, facultatives incluses
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {overallProgress} %
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={overallProgress}
                  sx={{
                    height: 5,
                    borderRadius: 99,
                    opacity: 0.7,
                  }}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {(path.description || path.objectives) ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 850 }}>
              Présentation
            </Typography>

            {path.description ? (
              <Typography
                color="text.secondary"
                sx={{ mt: 1, whiteSpace: "pre-line" }}
              >
                {path.description}
              </Typography>
            ) : null}

            {path.objectives ? (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 800 }}
                >
                  Objectifs
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ mt: 0.75, whiteSpace: "pre-line" }}
                >
                  {path.objectives}
                </Typography>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card variant="outlined">
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 850 }}>
                Formations du parcours
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {path.totalTrainings} formation
                {path.totalTrainings > 1 ? "s" : ""} ·{" "}
                {path.requiredTrainings} obligatoire
                {path.requiredTrainings > 1 ? "s" : ""}
                {path.optionalTrainings > 0
                  ? ` · ${path.optionalTrainings} facultative${
                      path.optionalTrainings > 1 ? "s" : ""
                    }`
                  : ""}
              </Typography>
            </Box>

            <Chip
              icon={<Clock3 size={14} />}
              label={
                path.estimatedDurationHours > 0
                  ? `${path.estimatedDurationHours} h estimées`
                  : "Durée à découvrir"
              }
              variant="outlined"
            />
          </Stack>

          <Stack spacing={1.25}>
            {orderedTrainings.map((training, index) => {
              const trainingProgress = stepProgressFor(
                progress,
                training.trainingId,
              );

              const percentage = clampPercent(
                trainingProgress?.progressPercentage,
              );

              const completed =
                trainingProgress?.progressPercentage != null &&
                trainingProgress.progressPercentage >= 100;

              return (
                <Card
                  key={training.id}
                  variant="outlined"
                  sx={{
                    borderColor: completed
                      ? "success.main"
                      : "divider",
                  }}
                >
                  <CardContent>
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={2}
                      sx={{
                        justifyContent: "space-between",
                        alignItems: { xs: "stretch", md: "center" },
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ alignItems: "flex-start", minWidth: 0 }}
                      >
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            display: "grid",
                            placeItems: "center",
                            flexShrink: 0,
                            bgcolor: completed
                              ? "success.main"
                              : "action.hover",
                            color: completed
                              ? "success.contrastText"
                              : "text.primary",
                            fontWeight: 800,
                          }}
                        >
                          {completed ? (
                            <CheckCircle2 size={18} />
                          ) : (
                            index + 1
                          )}
                        </Box>

                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800 }}>
                            {training.trainingTitle ||
                              `Formation ${index + 1}`}
                          </Typography>

                          <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            sx={{ flexWrap: "wrap", mt: 0.75 }}
                          >
                            <Chip
                              size="small"
                              label={
                                training.required
                                  ? "Obligatoire"
                                  : "Facultative"
                              }
                              color={
                                training.required
                                  ? "primary"
                                  : "default"
                              }
                              variant="outlined"
                            />

                            {path.canStart ? (
                              <Chip
                                size="small"
                                label={`${percentage} %`}
                                color={
                                  completed
                                    ? "success"
                                    : "default"
                                }
                              />
                            ) : null}

                            {training.estimatedDurationHours ? (
                              <Chip
                                size="small"
                                label={`${training.estimatedDurationHours} h`}
                                variant="outlined"
                              />
                            ) : null}
                          </Stack>
                        </Box>
                      </Stack>

                      {path.canStart ? (
                        <Button
                          component={Link}
                          to={`/learner/trainings/${training.trainingId}`}
                          variant={
                            training.trainingId ===
                            progress?.nextTrainingId
                              ? "contained"
                              : "outlined"
                          }
                          endIcon={<ArrowRight size={16} />}
                        >
                          {completed
                            ? "Revoir"
                            : percentage > 0
                              ? "Continuer"
                              : "Ouvrir"}
                        </Button>
                      ) : (
                        <Button variant="outlined" disabled>
                          Affectation requise
                        </Button>
                      )}
                    </Stack>

                    {path.canStart && percentage > 0 && !completed ? (
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{
                          height: 5,
                          borderRadius: 99,
                          mt: 1.5,
                        }}
                      />
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}