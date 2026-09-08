import { useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  DialogTitle,
  Divider,
  LinearProgress,
  Popover,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Archive,
  BookOpen,
  ChevronDown,
  Eye,
  GraduationCap,
  Pencil,
  MessageSquare,
  Plus,
  RotateCcw,
  Send,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import {
  archiveTraining,
  deleteTraining,
  getEnrollmentsByTraining,
  getTrainerTrainings,
  moveTrainingToDraft,
  publishTraining,
} from "../../api/trainerApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { buildMediaUrl } from "../../api/apiConfig";
import {
  SmartMetricCard,
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import { useAuth } from "../../features/auth/AuthContext";
import type {
  EnrollmentResponse,
  TrainingResponse,
} from "../../types/training";

interface TrainingMetrics {
  learners: number;
  averageProgress: number;
}

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publi\u00e9e",
  ARCHIVED: "Archiv\u00e9e",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  PUBLIC: "Publique",
  PRIVATE: "Priv\u00e9e",
  ASSIGNED_ONLY: "Affect\u00e9s uniquement",
  ASSIGNMENT_ONLY: "Affectation",
  SELF_ENROLLMENT: "Auto-inscription",
  ACCESS_CODE: "Code d'acc\u00e8s",
  INVITATION: "Invitation",
  DEBUTANT: "D\u00e9butant",
  INTERMEDIAIRE: "Interm\u00e9diaire",
  AVANCE: "Avanc\u00e9",
};

function statusLabel(value?: string | null): string {
  if (!value) {
    return "Non renseign\u00e9";
  }

  return statusLabels[value] || value;
}

function statusColor(
  status?: string | null,
): "default" | "success" | "warning" | "info" {
  if (status === "PUBLISHED") {
    return "success";
  }

  if (status === "DRAFT") {
    return "warning";
  }

  if (status === "ARCHIVED") {
    return "default";
  }

  return "info";
}

function averageProgress(
  enrollments: EnrollmentResponse[],
): number {
  if (!enrollments.length) {
    return 0;
  }

  const values = enrollments.map((item) =>
    Number.isFinite(item.progressPercentage)
      ? Number(item.progressPercentage)
      : 0,
  );

  return Math.round(
    values.reduce((sum, value) => sum + value, 0) /
      values.length,
  );
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Non disponible";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function coverUrl(training: TrainingResponse): string {
  return buildMediaUrl(
    training.coverImageUrl || training.coverImagePath,
  );
}

function ratingLabel(training: TrainingResponse): string {
  if (typeof training.averageRating !== "number") {
    return "-";
  }

  return training.averageRating.toFixed(1);
}

export function TrainerTrainingsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [trainings, setTrainings] =
    useState<TrainingResponse[]>([]);
  const [metrics, setMetrics] =
    useState<Record<number, TrainingMetrics>>({});

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] =
    useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");

  const [previewTraining, setPreviewTraining] =
    useState<TrainingResponse | null>(null);
  const [deleteCandidate, setDeleteCandidate] =
    useState<TrainingResponse | null>(null);

  const [actionsAnchor, setActionsAnchor] =
    useState<HTMLElement | null>(null);
  const [actionsTraining, setActionsTraining] =
    useState<TrainingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionTrainingId, setActionTrainingId] =
    useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function openActionsMenu(
    event: MouseEvent<HTMLButtonElement>,
    training: TrainingResponse,
  ) {
    setActionsAnchor(event.currentTarget);
    setActionsTraining(training);
  }

  function closeActionsMenu() {
    setActionsAnchor(null);
    setActionsTraining(null);
  }
  async function loadTrainings() {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const loaded = await getTrainerTrainings(user.id);
      setTrainings(loaded);

      const metricsEntries = await Promise.all(
        loaded.map(async (training) => {
          try {
            const enrollments =
              await getEnrollmentsByTraining(training.id);

            return [
              training.id,
              {
                learners: enrollments.length,
                averageProgress:
                  averageProgress(enrollments),
              },
            ] as const;
          } catch {
            return [
              training.id,
              {
                learners: 0,
                averageProgress: 0,
              },
            ] as const;
          }
        }),
      );

      setMetrics(Object.fromEntries(metricsEntries));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTrainings();
  }, [user?.id]);

  useEffect(() => {
    const flash = (
      location.state as { flash?: string } | null
    )?.flash;

    if (!flash) {
      return;
    }

    setSuccess(flash);
    navigate(location.pathname + location.search, {
      replace: true,
      state: null,
    });
  }, [
    location.pathname,
    location.search,
    location.state,
    navigate,
  ]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          trainings
            .map((training) => training.category?.trim())
            .filter(
              (value): value is string => Boolean(value),
            ),
        ),
      ).sort((a, b) => a.localeCompare(b, "fr")),
    [trainings],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLocaleLowerCase("fr");

    return trainings.filter((training) => {
      const matchesQuery =
        !normalizedQuery ||
        training.title
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery) ||
        (training.shortDescription || "")
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery) ||
        (training.category || "")
          .toLocaleLowerCase("fr")
          .includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "ALL" ||
        training.status === statusFilter;

      const matchesCategory =
        categoryFilter === "ALL" ||
        training.category === categoryFilter;

      const matchesLevel =
        levelFilter === "ALL" ||
        training.level === levelFilter;

      return (
        matchesQuery &&
        matchesStatus &&
        matchesCategory &&
        matchesLevel
      );
    });
  }, [
    trainings,
    query,
    statusFilter,
    categoryFilter,
    levelFilter,
  ]);

  const stats = useMemo(
    () => ({
      total: trainings.length,
      draft: trainings.filter(
        (training) => training.status === "DRAFT",
      ).length,
      published: trainings.filter(
        (training) => training.status === "PUBLISHED",
      ).length,
      archived: trainings.filter(
        (training) => training.status === "ARCHIVED",
      ).length,
    }),
    [trainings],
  );

  async function runAction(
    training: TrainingResponse,
    action: () => Promise<TrainingResponse>,
    message: string,
  ) {
    setActionTrainingId(training.id);
    setError("");
    setSuccess("");

    try {
      await action();
      setSuccess(message);
      await loadTrainings();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionTrainingId(null);
    }
  }

  // PATCH16_V2_A8C5Q: suppression Web autorisee pour les brouillons et les formations archivees.
  function requestPermanentDelete(
    training: TrainingResponse,
  ) {
    if (
      training.status !== "DRAFT" &&
      training.status !== "ARCHIVED"
    ) {
      setError(
        "Une formation publi\u00e9e doit d'abord \u00eatre archiv\u00e9e ou remise en brouillon avant sa suppression d\u00e9finitive.",
      );
      return;
    }

    setError("");
    setDeleteCandidate(training);
  }

  async function confirmPermanentDelete() {
    const training = deleteCandidate;

    if (!training) {
      return;
    }

    if (
      training.status !== "DRAFT" &&
      training.status !== "ARCHIVED"
    ) {
      setDeleteCandidate(null);
      setError(
        "Une formation publi\u00e9e doit d'abord \u00eatre archiv\u00e9e ou remise en brouillon avant sa suppression d\u00e9finitive.",
      );
      return;
    }

    setActionTrainingId(training.id);
    setError("");
    setSuccess("");

    try {
      await deleteTraining(training.id);
      setDeleteCandidate(null);
      setSuccess(
        "Formation supprim\u00e9e d\u00e9finitivement.",
      );
      await loadTrainings();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionTrainingId(null);
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 380,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Stack
          spacing={1.5}
          sx={{ alignItems: "center" }}
        >
          <CircularProgress size={32} />
          <Typography
            variant="body2"
            color="text.secondary"
          >
            {"Chargement de vos formations..."}
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow={"Pilotage p\u00e9dagogique"}
        title={"Mes formations"}
        description={
          "Cr\u00e9ez, organisez, publiez et suivez vos formations depuis un espace unique."
        }
        actions={
          <Button
            component={Link}
            to="/trainer/trainings/new"
            variant="contained"
            startIcon={<Plus size={17} />}
          >
            {"Cr\u00e9er une formation"}
          </Button>
        }
      />

      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : null}

      {success ? (
        <Alert
          severity="success"
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <SmartMetricCard
          label={"Total"}
          value={stats.total}
          icon={<GraduationCap size={20} />}
        />
        <SmartMetricCard
          label={"Brouillons"}
          value={stats.draft}
          icon={<Pencil size={20} />}
        />
        <SmartMetricCard
          label={"Publi\u00e9es"}
          value={stats.published}
          icon={<Send size={20} />}
        />
        <SmartMetricCard
          label={"Archiv\u00e9es"}
          value={stats.archived}
          icon={<Archive size={20} />}
        />
      </Box>

      <SmartSectionCard
        title={"Recherche et filtres"}
        description={
          "Retrouvez rapidement une formation par titre, cat\u00e9gorie, statut ou niveau."
        }
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(240px, 1.5fr) repeat(3, minmax(150px, 0.75fr))",
            },
            gap: 2,
          }}
        >
          <TextField
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            label={"Rechercher"}
            placeholder={
              "Titre, description ou cat\u00e9gorie"
            }
          />

          <TextField
            select
            label={"Statut"}
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <MenuItem value="ALL">{"Tous"}</MenuItem>
            <MenuItem value="DRAFT">
              {"Brouillons"}
            </MenuItem>
            <MenuItem value="PUBLISHED">
              {"Publi\u00e9es"}
            </MenuItem>
            <MenuItem value="ARCHIVED">
              {"Archiv\u00e9es"}
            </MenuItem>
          </TextField>

          <TextField
            select
            label={"Cat\u00e9gorie"}
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
          >
            <MenuItem value="ALL">
              {"Toutes"}
            </MenuItem>
            {categories.map((category) => (
              <MenuItem
                key={category}
                value={category}
              >
                {category}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label={"Niveau"}
            value={levelFilter}
            onChange={(event) =>
              setLevelFilter(event.target.value)
            }
          >
            <MenuItem value="ALL">
              {"Tous"}
            </MenuItem>
            <MenuItem value="DEBUTANT">
              {"D\u00e9butant"}
            </MenuItem>
            <MenuItem value="INTERMEDIAIRE">
              {"Interm\u00e9diaire"}
            </MenuItem>
            <MenuItem value="AVANCE">
              {"Avanc\u00e9"}
            </MenuItem>
          </TextField>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 2 }}
        >
          {`${filtered.length} formation${
            filtered.length > 1 ? "s" : ""
          } affich\u00e9e${
            filtered.length > 1 ? "s" : ""
          }`}
        </Typography>
      </SmartSectionCard>

      {filtered.length ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              xl: "repeat(2, minmax(0, 1fr))",
            },
            gap: 2.5,
          }}
        >
          {filtered.map((training) => {
            const trainingMetrics =
              metrics[training.id] || {
                learners: 0,
                averageProgress: 0,
              };

            const image = coverUrl(training);

            return (
              <Card
                key={training.id}
                variant="outlined"
                sx={{
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    minHeight: 190,
                    bgcolor: "action.hover",
                    display: "grid",
                    placeItems: "center",
                    overflow: "hidden",
                  }}
                >
                  {image ? (
                    <Box
                      component="img"
                      src={image}
                      alt={`Couverture ${training.title}`}
                      sx={{
                        width: "100%",
                        height: 190,
                        objectFit: "contain",
                        objectPosition: "center center",
                        display: "block",
                      }}
                    />
                  ) : (
                    <Stack
                      spacing={1}
                      sx={{
                        alignItems: "center",
                        color: "text.secondary",
                      }}
                    >
                      <GraduationCap
                        size={38}
                        aria-hidden="true"
                      />
                      <Typography variant="body2">
                        {"Aucune couverture"}
                      </Typography>
                    </Stack>
                  )}
                </Box>

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
                      label={statusLabel(
                        training.status,
                      )}
                      color={statusColor(
                        training.status,
                      )}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={
                        training.category ||
                        "Sans cat\u00e9gorie"
                      }
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={statusLabel(
                        training.level,
                      )}
                    />
                  </Stack>

                  <Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 800 }}
                    >
                      {training.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.75,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {training.shortDescription ||
                        training.description ||
                        "Aucune description disponible."}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(3, minmax(0, 1fr))",
                      },
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {"Participants"}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ alignItems: "center" }}
                      >
                        <Users
                          size={16}
                          aria-hidden="true"
                        />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700 }}
                        >
                          {trainingMetrics.learners}
                        </Typography>
                      </Stack>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {"Progression moyenne"}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700 }}
                      >
                        {`${trainingMetrics.averageProgress}%`}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {"Note moyenne"}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ alignItems: "center" }}
                      >
                        <Star
                          size={16}
                          aria-hidden="true"
                        />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700 }}
                        >
                          {`${ratingLabel(training)} (${training.reviewCount || 0})`}
                        </Typography>
                      </Stack>
                    </Box>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={Math.max(
                      0,
                      Math.min(
                        100,
                        trainingMetrics.averageProgress,
                      ),
                    )}
                    aria-label={`Progression moyenne ${training.title}`}
                    sx={{
                      height: 7,
                      borderRadius: 999,
                    }}
                  />

                  <Divider />

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(3, minmax(0, 1fr))",
                      },
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {"Visibilit\u00e9"}
                      </Typography>
                      <Typography variant="body2">
                        {statusLabel(
                          training.visibility,
                        )}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {"Inscription"}
                      </Typography>
                      <Typography variant="body2">
                        {statusLabel(
                          training.enrollmentMode,
                        )}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        {"Derni\u00e8re mise \u00e0 jour"}
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(
                          training.updatedAt ||
                            training.createdAt,
                        )}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider />

                  <Button
                    type="button"
                    variant="outlined"
                    fullWidth
                    endIcon={<ChevronDown size={16} />}
                    aria-haspopup="menu"
                    aria-controls={
                      actionsTraining?.id === training.id
                        ? "training-actions-menu"
                        : undefined
                    }
                    aria-expanded={
                      actionsTraining?.id === training.id
                        ? true
                        : undefined
                    }
                    onClick={(event) =>
                      openActionsMenu(event, training)
                    }
                    sx={{
                      minHeight: 40,
                      justifyContent: "space-between",
                      px: 1.5,
                      mt: "auto",
                    }}
                  >
                    {"Actions"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      ) : (
        <SmartSectionCard
          title={
            "Aucune formation ne correspond aux filtres"
          }
          description={
            "Modifiez vos crit\u00e8res de recherche ou cr\u00e9ez une nouvelle formation."
          }
        >
          <Stack
            spacing={2}
            sx={{
              alignItems: "center",
              textAlign: "center",
              py: 3,
            }}
          >
            <GraduationCap
              size={38}
              aria-hidden="true"
            />
            <Button
              component={Link}
              to="/trainer/trainings/new"
              variant="contained"
              startIcon={<Plus size={17} />}
            >
              {"Cr\u00e9er une formation"}
            </Button>
          </Stack>
        </SmartSectionCard>
      )}

      <Popover
        id="training-actions-menu"
        anchorEl={actionsAnchor}
        open={Boolean(actionsAnchor && actionsTraining)}
        onClose={closeActionsMenu}
        disableScrollLock
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            sx: {
              width: actionsAnchor
                ? actionsAnchor.getBoundingClientRect().width
                : 430,
              maxWidth: "calc(100vw - 24px)",
              p: 0.8,
              mt: 0.35,
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
              boxShadow: 4,
            },
          },
        }}
      >
        <Stack spacing={1}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns:
                actionsTraining?.status === "PUBLISHED"
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(3, minmax(0, 1fr))",
              gap: 0.65,
              "& > .MuiButton-root": {
                width: "100%",
                minWidth: 0,
                minHeight: 32,
                justifyContent: "center",
                whiteSpace: "nowrap",
              },
            }}
          >
            {actionsTraining?.status === "DRAFT" ? (
              <>
                <Button
                  type="button"
                  variant="contained"
                  size="small"
                  startIcon={<Pencil size={15} />}
                  onClick={() => {
                    const selected = actionsTraining;
                    closeActionsMenu();

                    if (selected) {
                      navigate(
                        `/trainer/trainings/${selected.id}/edit`,
                      );
                    }
                  }}
                >
                  {"Modifier"}
                </Button>

                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  startIcon={<BookOpen size={15} />}
                  onClick={() => {
                    const selected = actionsTraining;
                    closeActionsMenu();

                    if (selected) {
                      navigate(
                        `/trainer/trainings/${selected.id}/content`,
                      );
                    }
                  }}
                >
                  {"G\u00e9rer le contenu"}
                </Button>
              </>
            ) : null}

            <Button
              type="button"
              variant="outlined"
              size="small"
              startIcon={<Eye size={15} />}
              onClick={() => {
                const selected = actionsTraining;
                closeActionsMenu();

                if (selected) {
                  setPreviewTraining(selected);
                }
              }}
            >
              {"Pr\u00e9visualiser"}
            </Button>

            {actionsTraining?.status === "PUBLISHED" ? (
              <Button
                type="button"
                variant="contained"
                size="small"
                startIcon={<BookOpen size={15} />}
                onClick={() => {
                  const selected = actionsTraining;
                  closeActionsMenu();

                  if (selected) {
                    navigate(
                      `/trainer/trainings/${selected.id}/content?section=quiz`,
                    );
                  }
                }}
              >
                {"G\u00e9rer les quiz"}
              </Button>
            ) : null}

            <Button
              type="button"
              variant="outlined"
              size="small"
              startIcon={<Users size={15} />}
              onClick={() => {
                const selected = actionsTraining;
                closeActionsMenu();

                if (selected) {
                  navigate(
                    `/trainer/learners?trainingId=${selected.id}`,
                  );
                }
              }}
            >
              {"Apprenants"}
            </Button>

            <Button
              type="button"
              variant="outlined"
              size="small"
              startIcon={<MessageSquare size={15} />}
              onClick={() => {
                const selected = actionsTraining;
                closeActionsMenu();

                if (selected) {
                  navigate(
                    `/trainer/feedbacks?trainingId=${selected.id}`,
                  );
                }
              }}
            >
              {"Feedbacks"}
            </Button>
          </Box>

          <Divider />

          <Stack
            direction="row"
            spacing={0.65}
            useFlexGap
            sx={{
              flexWrap: "wrap",
              "& > .MuiButton-root": {
                flex: "1 1 175px",
                minWidth: 0,
                minHeight: 32,
                justifyContent: "center",
                whiteSpace: "nowrap",
              },
            }}
          >
            {actionsTraining?.status === "DRAFT" ? (
              <Button
                type="button"
                size="small"
                color="success"
                variant="outlined"
                startIcon={<Send size={15} />}
                disabled={
                  actionTrainingId === actionsTraining.id
                }
                onClick={() => {
                  const selected = actionsTraining;

                  if (!selected) {
                    return;
                  }

                  closeActionsMenu();
                  void runAction(
                    selected,
                    () => publishTraining(selected.id),
                    "Formation publi\u00e9e.",
                  );
                }}
              >
                {"Publier"}
              </Button>
            ) : null}

            {actionsTraining?.status === "PUBLISHED" ? (
              <Button
                type="button"
                size="small"
                variant="outlined"
                startIcon={<RotateCcw size={15} />}
                disabled={
                  actionTrainingId === actionsTraining.id
                }
                onClick={() => {
                  const selected = actionsTraining;

                  if (!selected) {
                    return;
                  }

                  closeActionsMenu();
                  void runAction(
                    selected,
                    async () => {
                      // WEB_TRAINING_DRAFT_DIRECT_EDIT_SAFE_V6 - preserved
                      const moved =
                        await moveTrainingToDraft(selected.id);
                      navigate(
                        `/trainer/trainings/${selected.id}/edit`,
                      );
                      return moved;
                    },
                    "Formation remise en brouillon.",
                  );
                }}
              >
                {"Remettre en brouillon"}
              </Button>
            ) : null}

            {actionsTraining?.status === "ARCHIVED" ? (
              <Button
                type="button"
                size="small"
                variant="outlined"
                startIcon={<RotateCcw size={15} />}
                disabled={
                  actionTrainingId === actionsTraining.id
                }
                onClick={() => {
                  const selected = actionsTraining;

                  if (!selected) {
                    return;
                  }

                  closeActionsMenu();
                  void runAction(
                    selected,
                    () => moveTrainingToDraft(selected.id),
                    "Formation d\u00e9sarchiv\u00e9e et remise en brouillon.",
                  );
                }}
              >
                {"D\u00e9sarchiver"}
              </Button>
            ) : null}

            {actionsTraining &&
            (actionsTraining.status === "DRAFT" ||
              actionsTraining.status === "PUBLISHED") ? (
              <Button
                type="button"
                size="small"
                color="error"
                variant="outlined"
                startIcon={<Archive size={15} />}
                disabled={
                  actionTrainingId === actionsTraining.id
                }
                onClick={() => {
                  const selected = actionsTraining;

                  if (!selected) {
                    return;
                  }

                  closeActionsMenu();
                  void runAction(
                    selected,
                    () => archiveTraining(selected.id),
                    "Formation archiv\u00e9e.",
                  );
                }}
              >
                {"Archiver"}
              </Button>
            ) : null}

            {actionsTraining &&
            (actionsTraining.status === "DRAFT" ||
              actionsTraining.status === "ARCHIVED") ? (
              <Button
                type="button"
                size="small"
                color="error"
                variant="contained"
                startIcon={<Trash2 size={15} />}
                disabled={
                  actionTrainingId === actionsTraining.id
                }
                onClick={() => {
                  const selected = actionsTraining;

                  if (!selected) {
                    return;
                  }

                  closeActionsMenu();
                  requestPermanentDelete(selected);
                }}
              >
                {"Supprimer d\u00e9finitivement"}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Popover>
      <Dialog
        open={Boolean(previewTraining)}
        onClose={() => setPreviewTraining(null)}
        maxWidth="md"
        fullWidth
      >
        {previewTraining ? (
          <>
            <DialogTitle>
              {"Pr\u00e9visualisation de la formation"}
            </DialogTitle>

            <DialogContent dividers>
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    minHeight: 220,
                    borderRadius: 2,
                    overflow: "hidden",
                    bgcolor: "action.hover",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {coverUrl(previewTraining) ? (
                    <Box
                      component="img"
                      src={coverUrl(
                        previewTraining,
                      )}
                      alt={`Couverture ${previewTraining.title}`}
                      sx={{
                        width: "100%",
                        maxHeight: 320,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <Stack
                      spacing={1}
                      sx={{
                        alignItems: "center",
                        color: "text.secondary",
                      }}
                    >
                      <GraduationCap
                        size={46}
                        aria-hidden="true"
                      />
                      <Typography variant="body2">
                        {"Aucune couverture"}
                      </Typography>
                    </Stack>
                  )}
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
                >
                  <Chip
                    size="small"
                    label={statusLabel(
                      previewTraining.status,
                    )}
                    color={statusColor(
                      previewTraining.status,
                    )}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={
                      previewTraining.category ||
                      "Sans cat\u00e9gorie"
                    }
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={statusLabel(
                      previewTraining.level,
                    )}
                  />
                </Stack>

                <Box>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 800 }}
                  >
                    {previewTraining.title}
                  </Typography>

                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{
                      mt: 1,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {previewTraining.description ||
                      previewTraining.shortDescription ||
                      "Aucune description compl\u00e8te."}
                  </Typography>
                </Box>

                {previewTraining.objectives ? (
                  <Box>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 800,
                        mb: 0.75,
                      }}
                    >
                      {"Objectifs p\u00e9dagogiques"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-wrap" }}
                    >
                      {previewTraining.objectives}
                    </Typography>
                  </Box>
                ) : null}
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button
                type="button"
                onClick={() =>
                  setPreviewTraining(null)
                }
              >
                {"Fermer"}
              </Button>

              {previewTraining.status === "DRAFT" ? (
                <Button
                  component={Link}
                  to={`/trainer/trainings/${previewTraining.id}/edit`}
                  variant="contained"
                  onClick={() =>
                    setPreviewTraining(null)
                  }
                >
                  {"Modifier"}
                </Button>
              ) : null}
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(deleteCandidate)}
        onClose={() => {
          if (!actionTrainingId) {
            setDeleteCandidate(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {
            "Supprimer d\u00e9finitivement cette formation ?"
          }
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="warning">
              {
                "Cette action est irr\u00e9versible. La formation et son contenu associ\u00e9 seront supprim\u00e9s."
              }
            </Alert>

            {deleteCandidate ? (
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 800 }}
                >
                  {deleteCandidate.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  {
                    "V\u00e9rifiez le titre avant de confirmer la suppression."
                  }
                </Typography>
              </Box>
            ) : null}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            type="button"
            disabled={Boolean(actionTrainingId)}
            onClick={() =>
              setDeleteCandidate(null)
            }
          >
            {"Annuler"}
          </Button>

          <Button
            type="button"
            color="error"
            variant="contained"
            startIcon={<Trash2 size={16} />}
            disabled={Boolean(actionTrainingId)}
            onClick={() =>
              void confirmPermanentDelete()
            }
          >
            {"Supprimer d\u00e9finitivement"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}