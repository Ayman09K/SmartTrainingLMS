import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { CheckCircle2, Clock3 } from "lucide-react";
import {
  getAdminTrainingsSafe,
  getAdminUsers,
  getOpenFeedbacksSafe,
  markFeedbackInProgressAsAdmin,
  resolveFeedbackAsAdmin,
} from "../../api/adminApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { SmartPageHeader, SmartSectionCard } from "../../components/ui";
import { useAuth } from "../../features/auth/AuthContext";
import type {
  AuthUser,
  FeedbackResponse,
  TrainingResponse,
} from "../../types/admin";

const difficultyLabels: Record<string, string> = {
  VERY_EASY: "Tr\u00e8s facile",
  EASY: "Facile",
  NORMAL: "Normale",
  HARD: "Difficile",
  VERY_HARD: "Tr\u00e8s difficile",
};

const statusLabels: Record<string, string> = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  RESOLVED: "R\u00e9solu",
  CLOSED: "Clos",
};

function userName(user?: AuthUser): string {
  if (!user) return "Apprenant non r\u00e9solu";
  return (
    user.fullName ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    user.email ||
    "Nom non renseign\u00e9"
  );
}

export function AdminFeedbacksPage() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<FeedbackResponse[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [trainings, setTrainings] = useState<TrainingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const userById = useMemo(
    () => new Map(users.map((item) => [item.id, item])),
    [users],
  );

  const trainingById = useMemo(
    () => new Map(trainings.map((training) => [training.id, training])),
    [trainings],
  );

  async function loadFeedbacks() {
    setLoading(true);
    setError("");

    try {
      const [loadedFeedbacks, loadedUsers, loadedTrainings] =
        await Promise.all([
          getOpenFeedbacksSafe(),
          getAdminUsers(),
          getAdminTrainingsSafe(),
        ]);

      setFeedbacks(loadedFeedbacks);
      setUsers(loadedUsers);
      setTrainings(loadedTrainings);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeedbacks();
  }, []);

  async function handleAction(
    feedbackId: number,
    action: "IN_PROGRESS" | "RESOLVE",
  ) {
    setError("");
    setSuccess("");

    try {
      if (action === "IN_PROGRESS") {
        await markFeedbackInProgressAsAdmin(feedbackId);
        setSuccess("Feedback marqu\u00e9 en cours.");
      } else {
        await resolveFeedbackAsAdmin(
          feedbackId,
          user?.id || 1,
          "Feedback trait\u00e9 depuis la console admin.",
        );
        setSuccess("Feedback r\u00e9solu.");
      }

      await loadFeedbacks();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} sx={{ alignItems: "center", color: "text.secondary" }}>
          <CircularProgress size={32} />
          <Typography variant="body2">Chargement des feedbacks...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow="Suivi pédagogique"
        title="Feedbacks pédagogiques"
        description="Suivez les difficultés signalées par les apprenants et leur prise en charge."
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <SmartSectionCard
        title="Difficultés ouvertes"
        description={`${feedbacks.length} feedback(s) actuellement \u00e0 suivre.`}
      >
        {!feedbacks.length ? (
          <Alert severity="info">Aucun feedback ouvert.</Alert>
        ) : (
          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <TableContainer>
              <Table size="small" aria-label="Feedbacks pédagogiques">
                <TableHead>
                  <TableRow>
                    <TableCell>Apprenant</TableCell>
                    <TableCell>Formation</TableCell>
                    <TableCell>Difficulté</TableCell>
                    <TableCell>Besoin d'aide</TableCell>
                    <TableCell sx={{ minWidth: 260 }}>Message</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell sx={{ minWidth: 210 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {feedbacks.map((feedback) => {
                    const learner = userById.get(feedback.learnerId);
                    const training = trainingById.get(feedback.trainingId);

                    return (
                      <TableRow key={feedback.id} hover>
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
                          {training?.title || "Formation non r\u00e9solue"}
                        </TableCell>
                        <TableCell>
                          {difficultyLabels[feedback.difficultyLevel] ||
                            feedback.difficultyLevel}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={feedback.needHelp ? "Oui" : "Non"}
                            color={feedback.needHelp ? "warning" : "default"}
                            variant={feedback.needHelp ? "filled" : "outlined"}
                          />
                        </TableCell>
                        <TableCell>{feedback.message || "-"}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={
                              statusLabels[feedback.status] || feedback.status
                            }
                            color={
                              feedback.status === "RESOLVED"
                                ? "success"
                                : feedback.status === "IN_PROGRESS"
                                  ? "info"
                                  : "warning"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Clock3 size={16} />}
                              onClick={() =>
                                void handleAction(feedback.id, "IN_PROGRESS")
                              }
                            >
                              En cours
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckCircle2 size={16} />}
                              onClick={() =>
                                void handleAction(feedback.id, "RESOLVE")
                              }
                            >
                              Résoudre
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
      </SmartSectionCard>
    </Stack>
  );
}