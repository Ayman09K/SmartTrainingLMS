import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Rating,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Eye, EyeOff } from "lucide-react";
import {
  getAdminTrainingsSafe,
  getAdminUsers,
  getReviewsByTrainingSafe,
  hideReviewAsAdmin,
  publishReviewAsAdmin,
} from "../../api/adminApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { SmartMetricCard, SmartPageHeader, SmartSectionCard } from "../../components/ui";
import type {
  AuthUser,
  TrainingReviewResponse,
  TrainingResponse,
} from "../../types/admin";

// WEB_VISUAL_6_ADMIN_REVIEWS_SAFE_V1

function userName(user?: AuthUser): string {
  if (!user) return "Apprenant non r\u00e9solu";
  return (
    user.fullName ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    user.email ||
    "Nom non renseign\u00e9"
  );
}

function statusLabel(value?: string): string {
  if (value === "PUBLISHED") return "Publi\u00e9";
  if (value === "HIDDEN") return "Masqu\u00e9";
  return value || "-";
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminReviewsPage() {
  const [trainings, setTrainings] = useState<TrainingResponse[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState<number>(0);
  const [reviews, setReviews] = useState<TrainingReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const selectedTraining = useMemo(
    () => trainings.find((training) => training.id === selectedTrainingId),
    [selectedTrainingId, trainings],
  );

  const reviewSummary = useMemo(() => {
    const published = reviews.filter((review) => review.status === "PUBLISHED").length;
    const hidden = reviews.filter((review) => review.status === "HIDDEN").length;
    const average = reviews.length
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
        reviews.length
      : 0;

    return {
      published,
      hidden,
      average,
    };
  }, [reviews]);

  async function load(trainingId?: number) {
    setLoading(true);
    setError("");

    try {
      const [loadedTrainings, loadedUsers] = await Promise.all([
        getAdminTrainingsSafe(),
        getAdminUsers(),
      ]);

      setTrainings(loadedTrainings);
      setUsers(loadedUsers);

      const currentTrainingId =
        trainingId || selectedTrainingId || loadedTrainings[0]?.id || 0;

      setSelectedTrainingId(currentTrainingId);

      if (currentTrainingId) {
        setReviews(await getReviewsByTrainingSafe(currentTrainingId, true));
      } else {
        setReviews([]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleModeration(
    reviewId: number,
    action: "HIDE" | "PUBLISH",
  ) {
    setError("");
    setSuccess("");

    try {
      if (action === "HIDE") {
        await hideReviewAsAdmin(reviewId);
        setSuccess("Avis masqu\u00e9.");
      } else {
        await publishReviewAsAdmin(reviewId);
        setSuccess("Avis republi\u00e9.");
      }

      await load(selectedTrainingId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} sx={{ alignItems: "center", color: "text.secondary" }}>
          <CircularProgress size={32} />
          <Typography variant="body2">Chargement des avis...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow="Qualité des formations"
        title="Avis apprenants"
        description="Consultez et modérez les avis publiés sur chaque formation."
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

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
          label="Avis"
          value={reviews.length}
          helper={selectedTraining?.title || "Formation sélectionnée"}
        />
        <SmartMetricCard
          label="Note moyenne"
          value={reviews.length ? `${reviewSummary.average.toFixed(1)}/5` : "-"}
          helper="Moyenne des avis affichés"
        />
        <SmartMetricCard
          label="Publiés"
          value={reviewSummary.published}
          helper="Visibles dans le catalogue"
          icon={<Eye size={20} />}
        />
        <SmartMetricCard
          label="Masqués"
          value={reviewSummary.hidden}
          helper="Conservés pour modération"
          icon={<EyeOff size={20} />}
        />
      </Box>

      <SmartSectionCard
        title="Avis par formation"
        description={`${reviews.length} avis trouv\u00e9(s) pour la formation s\u00e9lectionn\u00e9e.`}
      >
        <Stack spacing={2.5}>
          {trainings.length ? (
            <FormControl fullWidth sx={{ maxWidth: 620 }}>
              <InputLabel id="reviews-training-label">Formation</InputLabel>
              <Select
                labelId="reviews-training-label"
                label="Formation"
                value={selectedTrainingId}
                onChange={(event) => void load(Number(event.target.value))}
              >
                {trainings.map((training) => (
                  <MenuItem key={training.id} value={training.id}>
                    {training.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Alert severity="info">Aucune formation disponible.</Alert>
          )}

          {!reviews.length ? (
            <Alert severity="info">
              Aucun avis trouvé pour cette formation.
            </Alert>
          ) : (
            <Paper variant="outlined" sx={{ overflow: "hidden" }}>
              <TableContainer sx={{ maxHeight: 560 }}>
                <Table stickyHeader size="small" aria-label="Avis apprenants">
                  <TableHead>
                    <TableRow>
                      <TableCell>Apprenant</TableCell>
                      <TableCell>Note</TableCell>
                      <TableCell sx={{ minWidth: 280 }}>Commentaire</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell sx={{ minWidth: 190 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reviews.map((review) => {
                      const learner = userById.get(review.learnerId);

                      return (
                        <TableRow key={review.id} hover>
                          <TableCell>
                            <Stack spacing={0.25}>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                {userName(learner)}
                              </Typography>
                              {learner?.email ? (
                                <Typography variant="caption" color="text.secondary">
                                  {learner.email}
                                </Typography>
                              ) : null}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Rating
                                value={review.rating}
                                readOnly
                                size="small"
                                aria-label={`${review.rating} sur 5`}
                              />
                              <Typography variant="caption">
                                {review.rating}/5
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 420,
                                color: review.comment ? "text.primary" : "text.secondary",
                                lineHeight: 1.55,
                              }}
                            >
                              {review.comment || "Aucun commentaire"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={statusLabel(review.status)}
                              color={
                                review.status === "PUBLISHED"
                                  ? "success"
                                  : "default"
                              }
                              variant={
                                review.status === "PUBLISHED"
                                  ? "filled"
                                  : "outlined"
                              }
                            />
                          </TableCell>
                          <TableCell>{formatDate(review.createdAt)}</TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                              <Button
                                size="small"
                                variant={review.status === "PUBLISHED" ? "contained" : "outlined"}
                                color={review.status === "PUBLISHED" ? "warning" : "inherit"}
                                startIcon={<EyeOff size={16} />}
                                onClick={() =>
                                  void handleModeration(review.id, "HIDE")
                                }
                              >
                                Masquer
                              </Button>
                              <Button
                                size="small"
                                variant={review.status === "HIDDEN" ? "contained" : "outlined"}
                                startIcon={<Eye size={16} />}
                                onClick={() =>
                                  void handleModeration(review.id, "PUBLISH")
                                }
                              >
                                Publier
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Stack>
      </SmartSectionCard>
    </Stack>
  );
}