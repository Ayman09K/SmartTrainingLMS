import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Divider,
  InputAdornment,
  LinearProgress,
  Skeleton,
  TextField,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowRight,
  Award,
  CalendarClock,
  CheckCircle2,
  Clock,
  Layers,
  LibraryBig,
  Search,
} from "lucide-react";
import {
  getLearningPathCatalog,
  getMyAssignedLearningPaths,
} from "../../api/learningPathApi";
import { getMyTrainings } from "../../api/trainingApi";
import { buildMediaUrl } from "../../api/apiConfig";
import { SmartPageHeader } from "../../components/ui";
import { TrainingCover } from "../../components/ux/RichPrimitives";
import type { LearnerMyTrainingResponse } from "../../types/training";

// LEARNER_WEB_VISUAL_1_MY_LEARNING_PATH_SINGLE_SAFE_V1
type AssignedLearningPath =
  Awaited<ReturnType<typeof getMyAssignedLearningPaths>>[number];

type CatalogLearningPath =
  Awaited<ReturnType<typeof getLearningPathCatalog>>[number];

function enrollmentLabel(status?: string): string {
  if (status === "COMPLETED") return "Terminée";
  if (status === "ACTIVE") return "En cours";
  if (status === "CANCELLED") return "Annulée";
  return "Disponible";
}

function enrollmentColor(
  status?: string,
): "default" | "success" | "warning" {
  if (status === "COMPLETED") return "success";
  if (status === "ACTIVE") return "warning";
  return "default";
}

function levelLabel(level?: string | null): string {
  if (level === "DEBUTANT") return "Débutant";
  if (level === "INTERMEDIAIRE") return "Intermédiaire";
  if (level === "AVANCE") return "Avancé";
  return level || "Formation";
}

function clampProgress(value?: number | null): number {
  return Math.min(100, Math.max(0, Math.round(value ?? 0)));
}

function formatDeadline(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function deadlineState(
  dueAt?: string | null,
  completed = false,
): {
  label: string;
  color: "default" | "success" | "warning" | "error" | "info";
} | null {
  if (!dueAt) {
    return null;
  }

  const due = new Date(dueAt);

  if (Number.isNaN(due.getTime())) {
    return {
      label: `Échéance : ${dueAt}`,
      color: "default",
    };
  }

  const formatted = formatDeadline(dueAt);

  if (completed) {
    return {
      label: `Échéance : ${formatted}`,
      color: "success",
    };
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
      label: `Échéance dans ${remainingDays} jour${
        remainingDays > 1 ? "s" : ""
      } · ${formatted}`,
      color: "warning",
    };
  }

  return {
    label: `À terminer avant le ${formatted}`,
    color: "info",
  };
}

function pathStatusLabel(
  path: AssignedLearningPath,
): string {
  if (path.completed) {
    return "Terminé";
  }

  if (path.overallProgressPercentage > 0) {
    return "En cours";
  }

  return "À commencer";
}

function pathStatusColor(
  path: AssignedLearningPath,
): "default" | "success" | "warning" {
  if (path.completed) {
    return "success";
  }

  if (path.overallProgressPercentage > 0) {
    return "warning";
  }

  return "default";
}

export function LearnerTrainingsPage() {
  const [trainings, setTrainings] =
    useState<LearnerMyTrainingResponse[]>([]);
  const [paths, setPaths] =
    useState<AssignedLearningPath[]>([]);
  const [pathCatalog, setPathCatalog] =
    useState<CatalogLearningPath[]>([]);
  const [trainingError, setTrainingError] = useState("");
  const [pathError, setPathError] = useState("");
  const [loading, setLoading] = useState(true);
  // LEARNER_MY_TRAININGS_SEARCH_PARITY_V1
  const [trainingSearch, setTrainingSearch] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      const [trainingResult, pathResult, catalogResult] =
        await Promise.allSettled([
          getMyTrainings(),
          getMyAssignedLearningPaths(),
          getLearningPathCatalog(),
        ]);

      if (!active) {
        return;
      }

      if (trainingResult.status === "fulfilled") {
        setTrainings(trainingResult.value);
        setTrainingError("");
      } else {
        setTrainings([]);
        setTrainingError(
          "Impossible de charger vos formations.",
        );
      }

      if (pathResult.status === "fulfilled") {
        setPaths(pathResult.value);
        setPathError("");
      } else {
        setPaths([]);
        setPathError(
          "Impossible de charger vos parcours affectés.",
        );
      }

      if (catalogResult.status === "fulfilled") {
        setPathCatalog(catalogResult.value);
      } else {
        setPathCatalog([]);
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const catalogById = useMemo(
    () =>
      new Map(
        pathCatalog.map((item) => [item.id, item]),
      ),
    [pathCatalog],
  );


  const filteredTrainings = useMemo(() => {
    const normalized = trainingSearch.trim().toLocaleLowerCase("fr");

    if (!normalized) {
      return trainings;
    }

    return trainings.filter((training) =>
      [training.title, training.shortDescription, training.category]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("fr")
            .includes(normalized),
        ),
    );
  }, [trainingSearch, trainings]);

  // LEARNER_MY_LEARNING_GLOBAL_SEARCH_PARITY_V2
  const filteredPaths = useMemo(() => {
    const normalized = trainingSearch.trim().toLocaleLowerCase("fr");

    if (!normalized) {
      return paths;
    }

    return paths.filter((path) => {
      const pathCatalogItem = catalogById.get(path.pathId);
      const values = [
        path.pathTitle,
        pathCatalogItem?.shortDescription,
        pathCatalogItem?.description,
        ...path.trainings.map((item) => item.trainingTitle),
      ];

      return values
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("fr")
            .includes(normalized),
        );
    });
  }, [catalogById, paths, trainingSearch]);
  if (loading) {
    return (
      <Stack spacing={2.5}>
        <Box>
          <Skeleton variant="text" width={120} height={18} />
          <Skeleton variant="text" width={260} height={38} />
          <Skeleton variant="text" width="56%" height={22} />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {[0, 1, 2].map((item) => (
            <Card
              key={item}
              variant="outlined"
              sx={{ overflow: "hidden", borderRadius: 3 }}
            >
              <Skeleton variant="rectangular" height={150} />
              <CardContent>
                <Stack spacing={1}>
                  <Skeleton variant="text" width="44%" />
                  <Skeleton variant="text" width="86%" height={28} />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="rounded" height={34} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={4}>
      <SmartPageHeader
        eyebrow="Mon apprentissage"
        title="Mon apprentissage"
        description="Retrouvez vos parcours affectés et vos formations, suivez votre progression et reprenez là où vous vous êtes arrêté."
        actions={
          <Button
            component={Link}
            to="/learner/certificates"
            variant="outlined"
            startIcon={<Award size={17} />}
          >
            Mes certificats
          </Button>
        }
      />

      <TextField
        type="search"
        fullWidth
        value={trainingSearch}
        onChange={(event) => setTrainingSearch(event.target.value)}
        label="Rechercher dans mon apprentissage"
        placeholder="Rechercher un parcours ou une formation"
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
      {pathError ? (
        <Alert severity="error">{pathError}</Alert>
      ) : null}

      <Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{
            alignItems: { sm: "center" },
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 900 }}
            >
              Mes parcours
            </Typography>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ mt: 0.5 }}
            >
              Vos parcours structurés, avec leur progression globale
              et leur prochaine étape.
            </Typography>
          </Box>

          <Chip
            icon={<LibraryBig size={15} />}
            label={`${filteredPaths.length} parcours`}
            variant="outlined"
          />
        </Stack>

        {!filteredPaths.length ? (
          <Alert severity="info">
            {trainingSearch.trim()
              ? "Aucun parcours ne correspond à votre recherche."
              : "Aucun parcours ne vous est actuellement affecté."}
          </Alert>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns:
                filteredPaths.length === 1
                  ? "1fr"
                  : {
                      xs: "1fr",
                      md: "repeat(2, minmax(0, 1fr))",
                      xl: "repeat(3, minmax(0, 1fr))",
                    },
              gap: 2,
            }}
          >
            {filteredPaths.map((path) => {
              const catalog = catalogById.get(path.pathId);
              const progress = clampProgress(
                path.overallProgressPercentage,
              );
              const deadline = deadlineState(
                path.pathDueAt,
                path.completed,
              );
              const cover = buildMediaUrl(
                catalog?.coverImageUrl ||
                  catalog?.coverImagePath,
              );
              const nextTraining =
                path.trainings.find(
                  (item) =>
                    item.trainingId ===
                    path.nextTrainingId,
                ) || null;

              return (
                <Card
                  key={path.pathId}
                  variant="outlined"
                  sx={{
                    height: "100%",
                    display: filteredPaths.length === 1 ? "grid" : "flex",
                    gridTemplateColumns:
                      filteredPaths.length === 1
                        ? {
                            xs: "1fr",
                            md: "minmax(280px, 0.8fr) minmax(0, 1.2fr)",
                          }
                        : undefined,
                    flexDirection: filteredPaths.length === 1 ? undefined : "column",
                    overflow: "hidden",
                  }}
                >
                  {cover ? (
                    <CardMedia
                      component="img"
                      image={cover}
                      alt={path.pathTitle}
                      sx={{
                        width: "100%",
                        height:
                          filteredPaths.length === 1
                            ? { xs: 190, md: "100%" }
                            : { xs: 140, sm: 125, md: 120 },
                        minHeight:
                          filteredPaths.length === 1
                            ? { md: 250 }
                            : undefined,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height:
                          filteredPaths.length === 1
                            ? { xs: 150, md: "100%" }
                            : { xs: 140, sm: 125, md: 120 },
                        minHeight:
                          filteredPaths.length === 1
                            ? { md: 250 }
                            : undefined,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "action.hover",
                        color: "text.secondary",
                      }}
                    >
                      <LibraryBig size={34} />
                    </Box>
                  )}

                  <CardContent
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      flexGrow: 1,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Chip
                        size="small"
                        color="primary"
                        variant="outlined"
                        icon={<LibraryBig size={14} />}
                        label="Parcours"
                      />
                      <Chip
                        size="small"
                        color={pathStatusColor(path)}
                        label={pathStatusLabel(path)}
                      />
                      {deadline ? (
                        <Chip
                          size="small"
                          color={deadline.color}
                          variant={
                            deadline.color === "error"
                              ? "filled"
                              : "outlined"
                          }
                          icon={<CalendarClock size={14} />}
                          label={deadline.label}
                        />
                      ) : null}
                    </Stack>

                    <Box>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 900 }}
                      >
                        {path.pathTitle}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.75 }}
                      >
                        {catalog?.shortDescription ||
                          catalog?.description ||
                          "Parcours de formation affecté à votre compte."}
                      </Typography>
                    </Box>

                    <Stack
                      direction="row"
                      spacing={2}
                      useFlexGap
                      sx={{
                        flexWrap: "wrap",
                        color: "text.secondary",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ alignItems: "center" }}
                      >
                        <Layers size={16} />
                        <Typography variant="caption">
                          {path.totalSteps} formation
                          {path.totalSteps > 1 ? "s" : ""}
                        </Typography>
                      </Stack>

                      {catalog?.estimatedDurationHours ? (
                        <Stack
                          direction="row"
                          spacing={0.75}
                          sx={{ alignItems: "center" }}
                        >
                          <Clock size={16} />
                          <Typography variant="caption">
                            {catalog.estimatedDurationHours} h
                          </Typography>
                        </Stack>
                      ) : null}
                    </Stack>

                    <Stack spacing={0.75}>
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
                          color="text.secondary"
                        >
                          Progression globale
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontWeight: 800 }}
                        >
                          {progress} %
                        </Typography>
                      </Stack>

                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: 8,
                          borderRadius: 999,
                        }}
                      />
                    </Stack>

                    {path.completed ? (
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{
                          alignItems: "center",
                          color: "success.main",
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <Typography variant="caption">
                          Parcours terminé
                        </Typography>
                      </Stack>
                    ) : nextTraining?.trainingTitle ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Prochaine étape :{" "}
                        <Box
                          component="span"
                          sx={{
                            color: "text.primary",
                            fontWeight: 800,
                          }}
                        >
                          {nextTraining.trainingTitle}
                        </Box>
                      </Typography>
                    ) : null}

                    <Button
                      component={Link}
                      to={`/learner/learning-paths/${path.pathId}`}
                      variant="contained"
                      endIcon={<ArrowRight size={17} />}
                      sx={{
                        mt: "auto",
                        alignSelf: "flex-start",
                      }}
                    >
                      {path.completed
                        ? "Revoir le parcours"
                        : progress > 0
                          ? "Reprendre le parcours"
                          : "Commencer le parcours"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      <Divider />

      {trainingError ? (
        <Alert severity="error">{trainingError}</Alert>
      ) : null}

      <Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{
            alignItems: { sm: "center" },
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 900 }}
            >
              Mes formations
            </Typography>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ mt: 0.5 }}
            >
              Vos formations individuelles et celles ouvertes par vos
              affectations.
            </Typography>
          </Box>

          <Chip
            label={`${trainings.length} formation${
              trainings.length > 1 ? "s" : ""
            }`}
            variant="outlined"
          />
        </Stack>

        {!trainings.length ? (
          <Alert severity="info">
            Aucune formation n'est actuellement disponible pour votre
            compte.
          </Alert>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(3, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            {filteredTrainings.map((training) => {
              const progress = clampProgress(
                training.progressPercentage,
              );
              const cover = buildMediaUrl(
                training.coverImageUrl,
              );
              const deadline = deadlineState(
                training.dueAt,
                training.enrollmentStatus === "COMPLETED",
              );

              return (
                <Card
                  key={training.id}
                  variant="outlined"
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <TrainingCover
                    title={training.title}
                    coverUrl={cover}
                  />

                  <CardContent
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      flexGrow: 1,
                    }}
                  >
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
                        color={enrollmentColor(
                          training.enrollmentStatus,
                        )}
                        label={enrollmentLabel(
                          training.enrollmentStatus,
                        )}
                      />
                      {deadline ? (
                        <Chip
                          size="small"
                          color={deadline.color}
                          icon={<CalendarClock size={14} />}
                          label={deadline.label}
                          variant={
                            deadline.color === "error"
                              ? "filled"
                              : "outlined"
                          }
                        />
                      ) : null}
                    </Stack>

                    <Box>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 850 }}
                      >
                        {training.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.75 }}
                      >
                        {training.shortDescription ||
                          "Formation disponible dans votre parcours SmartTraining AI."}
                      </Typography>
                    </Box>

                    <Stack
                      direction="row"
                      spacing={2}
                      useFlexGap
                      sx={{
                        flexWrap: "wrap",
                        color: "text.secondary",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ alignItems: "center" }}
                      >
                        <Clock size={16} />
                        <Typography variant="caption">
                          {training.estimatedDurationHours
                            ? `${training.estimatedDurationHours} h`
                            : "Durée non indiquée"}
                        </Typography>
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ alignItems: "center" }}
                      >
                        <Layers size={16} />
                        <Typography variant="caption">
                          {`${progress} % terminé`}
                        </Typography>
                      </Stack>
                    </Stack>

                    <Stack spacing={0.75}>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: 8,
                          borderRadius: 999,
                        }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {progress === 100
                          ? "Formation terminée"
                          : progress > 0
                            ? "Votre progression est enregistrée."
                            : "Vous pouvez commencer cette formation."}
                      </Typography>
                    </Stack>

                    <Button
                      component={Link}
                      to={`/learner/trainings/${training.id}`}
                      variant="contained"
                      endIcon={<ArrowRight size={17} />}
                      sx={{
                        mt: "auto",
                        alignSelf: "flex-start",
                      }}
                    >
                      {progress > 0 && progress < 100
                        ? "Reprendre"
                        : progress >= 100
                          ? "Revoir la formation"
                          : "Commencer"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>
    </Stack>
  );
}
