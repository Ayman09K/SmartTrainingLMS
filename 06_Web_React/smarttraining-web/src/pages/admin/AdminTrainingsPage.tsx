import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Archive,
  BookOpen,
  Edit3,
  Eye,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Send,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { getAdminUsers } from "../../api/adminApi";
import {
  archiveTraining,
  deleteTraining,
  getAdminTrainings,
  moveTrainingToDraft,
  publishTraining,
} from "../../api/trainingApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { buildMediaUrl } from "../../api/apiConfig";
import {
  SmartMetricCard,
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import { smartConfirm } from "../../components/ux/smartConfirmService";
import type { AuthUser, TrainingResponse } from "../../types/admin";

// WEB_VISUAL_4_ADMIN_TRAININGS_SAFE_V1

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publi\u00e9e",
  ARCHIVED: "Archiv\u00e9e",
  PUBLIC: "Publique",
  PRIVATE: "Priv\u00e9e",
  ASSIGNED_ONLY: "Affectation uniquement",
  SELF_ENROLLMENT: "Auto-inscription",
  ASSIGNMENT_ONLY: "Affectation",
  ACCESS_CODE: "Code d'acc\u00e8s",
  INVITATION: "Invitation",
  DEBUTANT: "D\u00e9butant",
  INTERMEDIAIRE: "Interm\u00e9diaire",
  AVANCE: "Avanc\u00e9",
};

function statusLabel(value?: string | null): string {
  if (!value) return "-";
  return statusLabels[value] || value;
}

function trainerName(user?: AuthUser): string {
  if (!user) {
    return "Formateur non r\u00e9solu";
  }

  return (
    user.fullName ||
    user.name ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    user.email ||
    "Formateur non renseign\u00e9"
  );
}

function trainingStatusColor(
  status?: string,
): "default" | "success" | "warning" | "info" {
  if (status === "PUBLISHED") return "success";
  if (status === "DRAFT") return "warning";
  if (status === "ARCHIVED") return "default";
  return "info";
}

export function AdminTrainingsPage() {
  const [trainings, setTrainings] = useState<TrainingResponse[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");

  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const stats = useMemo(
    () => ({
      total: trainings.length,
      draft: trainings.filter((training) => training.status === "DRAFT").length,
      published: trainings.filter(
        (training) => training.status === "PUBLISHED",
      ).length,
      archived: trainings.filter(
        (training) => training.status === "ARCHIVED",
      ).length,
    }),
    [trainings],
  );


  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          trainings
            .map((training) => training.category?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b, "fr")),
    [trainings],
  );

  const levels = useMemo(
    () =>
      Array.from(
        new Set(
          trainings
            .map((training) => training.level?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b, "fr")),
    [trainings],
  );

  const visibleTrainings = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");

    return trainings.filter((training) => {
      const matchesQuery =
        !normalized ||
        [
          training.title,
          training.shortDescription,
          training.description,
          training.category,
          trainerName(userById.get(training.trainerId)),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(normalized);

      const matchesStatus =
        statusFilter === "ALL" || training.status === statusFilter;
      const matchesCategory =
        categoryFilter === "ALL" || training.category === categoryFilter;
      const matchesLevel =
        levelFilter === "ALL" || training.level === levelFilter;

      return matchesQuery && matchesStatus && matchesCategory && matchesLevel;
    });
  }, [
    categoryFilter,
    levelFilter,
    query,
    statusFilter,
    trainings,
    userById,
  ]);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [loadedTrainings, loadedUsers] = await Promise.all([
        getAdminTrainings(),
        getAdminUsers(),
      ]);

      setTrainings(loadedTrainings);
      setUsers(loadedUsers);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function runTrainingAction(
    trainingId: number,
    action: () => Promise<TrainingResponse | void>,
    message: string,
  ) {
    setActionLoadingId(trainingId);
    setError("");
    setSuccess("");

    try {
      await action();
      setSuccess(message);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function removeTraining(training: TrainingResponse) {
    const confirmed = await smartConfirm({
      title: "Supprimer définitivement la formation",
      description: `Supprimer définitivement la formation « ${training.title} » ? Cette action est irréversible.`,
      confirmLabel: "Supprimer",
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    await runTrainingAction(
      training.id,
      () => deleteTraining(training.id),
      "Formation supprim\u00e9e.",
    );
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack
          spacing={1.5}
          sx={{ alignItems: "center", color: "text.secondary" }}
        >
          <CircularProgress size={32} />
          <Typography variant="body2">
            Chargement du catalogue administrateur...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow="Catalogue LMS"
        title="Formations"
        description="Créez et administrez le cycle de vie des formations, leur contenu et leur publication."
        actions={
          <Button
            component={Link}
            to="/admin/trainings/new"
            variant="contained"
            startIcon={<Plus size={18} />}
          >
            Nouvelle formation
          </Button>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Box
        aria-label="Statistiques formations"
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
          label="Total"
          value={stats.total}
          helper="Formations dans le catalogue"
          icon={<BookOpen />}
        />
        <SmartMetricCard
          label="Brouillons"
          value={stats.draft}
          helper="Formations en préparation"
          icon={<Edit3 />}
        />
        <SmartMetricCard
          label="Publiées"
          value={stats.published}
          helper="Formations accessibles selon leurs règles"
          icon={<Send />}
        />
        <SmartMetricCard
          label="Archivées"
          value={stats.archived}
          helper="Formations retirées du cycle actif"
          icon={<Archive />}
        />
      </Box>


      <SmartSectionCard
        title="Recherche et filtres"
        description={`${visibleTrainings.length} formation(s) affichée(s) sur ${trainings.length}.`}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 2fr) repeat(3, minmax(150px, 0.8fr))",
            },
            gap: 2,
          }}
        >
          <TextField
            type="search"
            label="Rechercher"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Titre, description, catégorie ou formateur"
          />

          <TextField
            select
            label="Statut"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <MenuItem value="ALL">Tous</MenuItem>
            <MenuItem value="DRAFT">Brouillons</MenuItem>
            <MenuItem value="PUBLISHED">Publiées</MenuItem>
            <MenuItem value="ARCHIVED">Archivées</MenuItem>
          </TextField>

          <TextField
            select
            label="Catégorie"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <MenuItem value="ALL">Toutes</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Niveau"
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value)}
          >
            <MenuItem value="ALL">Tous</MenuItem>
            {levels.map((level) => (
              <MenuItem key={level} value={level}>
                {statusLabel(level)}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </SmartSectionCard>

      {trainings.length && !visibleTrainings.length ? (
        <Alert severity="info">
          Aucune formation ne correspond à la recherche ou aux filtres.
        </Alert>
      ) : null}

      {!trainings.length ? (
        <Card variant="outlined">
          <CardContent
            sx={{
              minHeight: 300,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
            }}
          >
            <Stack spacing={1.5} sx={{ alignItems: "center", maxWidth: 520 }}>
              <BookOpen size={44} />
              <Typography variant="h5">Aucune formation</Typography>
              <Typography color="text.secondary">
                Commencez par créer la première formation du catalogue.
              </Typography>
              <Button
                component={Link}
                to="/admin/trainings/new"
                variant="contained"
                startIcon={<Plus size={18} />}
              >
                Créer une formation
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : (
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
          {visibleTrainings.map((training) => {
            const trainer = userById.get(training.trainerId);
            const busy = actionLoadingId === training.id;
            const cover = training.coverImageUrl
              ? buildMediaUrl(training.coverImageUrl)
              : "";

            return (
              <Card
                key={training.id}
                variant="outlined"
                sx={{
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                  borderRadius: 3.5,
                  transition:
                    "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 4,
                    borderColor: "primary.light",
                  },
                }}
              >
                <Box sx={{ position: "relative" }}>
                  {cover ? (
                    <CardMedia
                      component="img"
                      height="180"
                      image={cover}
                      alt=""
                      sx={{ objectFit: "cover" }}
                    />
                  ) : (
                    <Box
                      sx={{
                        minHeight: 180,
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "action.hover",
                        color: "text.secondary",
                      }}
                    >
                      <Stack spacing={1} sx={{ alignItems: "center" }}>
                        <ImageIcon size={34} />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Couverture à ajouter
                        </Typography>
                      </Stack>
                    </Box>
                  )}

                  <Chip
                    size="small"
                    label={statusLabel(training.status)}
                    color={trainingStatusColor(training.status)}
                    sx={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      fontWeight: 800,
                    }}
                  />
                </Box>

                <CardContent sx={{ flex: 1, p: 2.5 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography
                        variant="overline"
                        color="primary.main"
                        sx={{ fontWeight: 900 }}
                      >
                        {training.category || "Cat\u00e9gorie non d\u00e9finie"}
                      </Typography>
                      <Typography component="h2" variant="h5">
                        {training.title}
                      </Typography>
                    </Box>

                    <Typography color="text.secondary">
                      {training.shortDescription ||
                        training.description ||
                        "Aucune description renseign\u00e9e."}
                    </Typography>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, minmax(0, 1fr))",
                        },
                        gap: 1.25,
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: "action.hover",
                        border: 1,
                        borderColor: "divider",
                      }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Formateur
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          sx={{ mt: 0.35, alignItems: "center" }}
                        >
                          <UserRound size={15} />
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {trainerName(trainer)}
                          </Typography>
                        </Stack>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Niveau
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.35, fontWeight: 800 }}>
                          {statusLabel(training.level)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Visibilité
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.35, fontWeight: 800 }}>
                          {statusLabel(training.visibility)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Inscription
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.35, fontWeight: 800 }}>
                          {statusLabel(training.enrollmentMode)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Durée
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.35, fontWeight: 800 }}>
                          {training.estimatedDurationHours ??
                            training.durationHours ??
                            "-"}{" "}
                          h
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Avis
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={0.6}
                          sx={{ mt: 0.35, alignItems: "center" }}
                        >
                          <Star size={15} />
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {training.averageRating ?? 0}/5 ·{" "}
                            {training.reviewCount ?? 0} avis
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>

                <Divider />

                <CardActions
                  sx={{
                    p: 2,
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 1.25,
                    alignItems: { xs: "stretch", sm: "center" },
                    justifyContent: "space-between",
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{ flexWrap: "wrap" }}
                  >
                    <Button
                      component={Link}
                      to={`/admin/trainings/${training.id}/content`}
                      size="small"
                      variant="contained"
                      startIcon={<BookOpen size={16} />}
                    >
                      Contenu
                    </Button>

                    <Button
                      component={Link}
                      to={`/admin/trainings/${training.id}/edit`}
                      size="small"
                      variant="outlined"
                      startIcon={<Edit3 size={16} />}
                    >
                      Modifier
                    </Button>

                    <Button
                      component={Link}
                      to={`/admin/trainings/${training.id}/content?preview=1`}
                      size="small"
                      variant="text"
                      startIcon={<Eye size={16} />}
                    >
                      Prévisualiser
                    </Button>
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={0.5}
                    useFlexGap
                    sx={{
                      flexWrap: "wrap",
                      justifyContent: { xs: "flex-start", sm: "flex-end" },
                    }}
                  >
                    {training.status !== "PUBLISHED" ? (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        disabled={busy}
                        startIcon={<Send size={15} />}
                        onClick={() =>
                          void runTrainingAction(
                            training.id,
                            () => publishTraining(training.id),
                            "Formation publiée.",
                          )
                        }
                      >
                        Publier
                      </Button>
                    ) : null}

                    {training.status !== "DRAFT" ? (
                      <Button
                        size="small"
                        variant="text"
                        disabled={busy}
                        startIcon={<RotateCcw size={15} />}
                        onClick={() =>
                          void runTrainingAction(
                            training.id,
                            () => moveTrainingToDraft(training.id),
                            "Formation remise en brouillon.",
                          )
                        }
                      >
                        Brouillon
                      </Button>
                    ) : null}

                    {training.status !== "ARCHIVED" ? (
                      <Button
                        size="small"
                        variant="text"
                        disabled={busy}
                        startIcon={<Archive size={15} />}
                        onClick={() =>
                          void runTrainingAction(
                            training.id,
                            () => archiveTraining(training.id),
                            "Formation archivée.",
                          )
                        }
                      >
                        Archiver
                      </Button>
                    ) : null}

                    <Button
                      size="small"
                      variant="text"
                      color="error"
                      disabled={busy}
                      startIcon={<Trash2 size={15} />}
                      onClick={() => void removeTraining(training)}
                    >
                      Supprimer
                    </Button>
                  </Stack>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}
    </Stack>
  );
}