import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
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
  CheckCircle2,
  CircleHelp,
  MessageSquareText,
  Search,
} from "lucide-react";
import {
  getFeedbacksByTraining,
  getTrainerTrainings,
  markFeedbackInProgress,
  resolveFeedback,
} from "../../api/trainerApi";
import { resolveTrainerLearners } from "../../api/trainerLearnerOverviewApi";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import { useAuth } from "../../features/auth/AuthContext";
import type { AuthUser } from "../../types/auth";
import type { FeedbackResponse, TrainingResponse } from "../../types/trainer";

type HelpFilter = "ALL" | "YES" | "NO";

function learnerName(learner?: AuthUser): string {
  if (!learner) {
    return "Apprenant";
  }

  const fullName =
    learner.fullName ||
    learner.name ||
    [learner.firstName, learner.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  return fullName || learner.email || "Apprenant";
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
}

function feedbackStatusLabel(value: string): string {
  const labels: Record<string, string> = {
    OPEN: "A traiter",
    IN_PROGRESS: "En cours",
    RESOLVED: "Resolu",
    CLOSED: "Cloture",
  };

  return labels[value] || "A traiter";
}

function feedbackStatusColor(
  value: string,
): "default" | "warning" | "info" | "success" {
  if (value === "RESOLVED" || value === "CLOSED") {
    return "success";
  }

  if (value === "IN_PROGRESS") {
    return "info";
  }

  if (value === "OPEN") {
    return "warning";
  }

  return "default";
}

function difficultyLabel(value: string): string {
  const labels: Record<string, string> = {
    VERY_EASY: "Tres facile",
    EASY: "Facile",
    NORMAL: "Normale",
    HARD: "Difficile",
    VERY_HARD: "Tres difficile",
  };

  return labels[value] || "Non precisee";
}

export function TrainerFeedbacksPage() {
  const { user } = useAuth();

  const [trainings, setTrainings] = useState<TrainingResponse[]>([]);
  const [trainingId, setTrainingId] = useState<number>(0);
  const [feedbacks, setFeedbacks] = useState<FeedbackResponse[]>([]);
  const [learners, setLearners] = useState<Map<number, AuthUser>>(new Map());

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState("ALL");
  const [needHelpFilter, setNeedHelpFilter] =
    useState<HelpFilter>("ALL");
  const [search, setSearch] = useState("");
  const [responses, setResponses] =
    useState<Record<number, string>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load(nextTrainingId?: number) {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const loadedTrainings = await getTrainerTrainings(user.id);
      setTrainings(loadedTrainings);

      const currentTrainingId =
        nextTrainingId || trainingId || loadedTrainings[0]?.id || 0;

      setTrainingId(currentTrainingId);

      if (!currentTrainingId) {
        setFeedbacks([]);
        setLearners(new Map());
        return;
      }

      const loadedFeedbacks =
        await getFeedbacksByTraining(currentTrainingId);

      setFeedbacks(loadedFeedbacks);

      const learnerIds = Array.from(
        new Set(
          loadedFeedbacks.map((feedback) => feedback.learnerId),
        ),
      );

      const identities = learnerIds.length
        ? await resolveTrainerLearners(learnerIds)
        : [];

      setLearners(
        new Map(
          identities.map((learner) => [learner.id, learner]),
        ),
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user?.id]);

  const visibleFeedbacks = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");

    return feedbacks.filter((feedback) => {
      if (
        statusFilter !== "ALL" &&
        feedback.status !== statusFilter
      ) {
        return false;
      }

      if (
        difficultyFilter !== "ALL" &&
        feedback.difficultyLevel !== difficultyFilter
      ) {
        return false;
      }

      if (needHelpFilter === "YES" && !feedback.needHelp) {
        return false;
      }

      if (needHelpFilter === "NO" && feedback.needHelp) {
        return false;
      }

      if (query) {
        const learner = learners.get(feedback.learnerId);

        const searchable = [
          learnerName(learner),
          learner?.email,
          feedback.message,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fr");

        if (!searchable.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [
    feedbacks,
    learners,
    statusFilter,
    difficultyFilter,
    needHelpFilter,
    search,
  ]);

  async function handleAction(
    feedbackId: number,
    action: "IN_PROGRESS" | "RESOLVE",
  ) {
    setError("");
    setSuccess("");

    try {
      if (action === "IN_PROGRESS") {
        await markFeedbackInProgress(feedbackId);
        setSuccess("Feedback pris en charge.");
      } else {
        await resolveFeedback(
          feedbackId,
          responses[feedbackId]?.trim() ||
            "Reponse apportee par le formateur.",
        );
        setSuccess("Feedback resolu.");
      }

      await load(trainingId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            {"Chargement des feedbacks..."}
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow={"Accompagnement pedagogique"}
        title={"Feedbacks des apprenants"}
        description={
          "Traitez les difficultes et demandes d'aide privees liees a vos formations, sans melanger ces retours avec les avis publics."
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <SmartSectionCard
        title={"Selection et filtres"}
        description={
          "Choisissez une formation puis affinez la liste selon le besoin de suivi."
        }
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(5, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          <TextField
            select
            label={"Formation"}
            value={trainingId || ""}
            onChange={(event) =>
              void load(Number(event.target.value))
            }
            disabled={!trainings.length}
          >
            {trainings.map((training) => (
              <MenuItem key={training.id} value={training.id}>
                {training.title}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label={"Rechercher"}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={"Apprenant ou message"}
            slotProps={{
              input: {
                startAdornment: (
                  <Search
                    size={18}
                    aria-hidden="true"
                    style={{ marginRight: 8 }}
                  />
                ),
              },
            }}
          />

          <TextField
            select
            label={"Statut"}
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <MenuItem value="ALL">{"Tous les statuts"}</MenuItem>
            <MenuItem value="OPEN">{"A traiter"}</MenuItem>
            <MenuItem value="IN_PROGRESS">{"En cours"}</MenuItem>
            <MenuItem value="RESOLVED">{"Resolus"}</MenuItem>
            <MenuItem value="CLOSED">{"Clotures"}</MenuItem>
          </TextField>

          <TextField
            select
            label={"Difficulte"}
            value={difficultyFilter}
            onChange={(event) =>
              setDifficultyFilter(event.target.value)
            }
          >
            <MenuItem value="ALL">{"Toutes"}</MenuItem>
            <MenuItem value="VERY_EASY">{"Tres facile"}</MenuItem>
            <MenuItem value="EASY">{"Facile"}</MenuItem>
            <MenuItem value="NORMAL">{"Normale"}</MenuItem>
            <MenuItem value="HARD">{"Difficile"}</MenuItem>
            <MenuItem value="VERY_HARD">{"Tres difficile"}</MenuItem>
          </TextField>

          <TextField
            select
            label={"Demande d'aide"}
            value={needHelpFilter}
            onChange={(event) =>
              setNeedHelpFilter(event.target.value as HelpFilter)
            }
          >
            <MenuItem value="ALL">{"Toutes"}</MenuItem>
            <MenuItem value="YES">{"Aide demandee"}</MenuItem>
            <MenuItem value="NO">{"Sans demande"}</MenuItem>
          </TextField>
        </Box>
      </SmartSectionCard>

      <SmartSectionCard
        title={"Retours a traiter"}
        description={`${visibleFeedbacks.length} retour${
          visibleFeedbacks.length > 1 ? "s" : ""
        } correspondant aux filtres.`}
      >
        {!trainings.length ? (
          <Alert severity="info">
            {"Aucune formation n'est disponible dans votre espace formateur."}
          </Alert>
        ) : !visibleFeedbacks.length ? (
          <Box
            sx={{
              py: 5,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
            }}
          >
            <Stack spacing={1} sx={{ alignItems: "center", maxWidth: 480 }}>
              <MessageSquareText
                size={32}
                aria-hidden="true"
              />
              <Typography variant="h6">
                {"Aucun feedback a afficher"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {
                  "Aucun retour ne correspond actuellement a la formation et aux filtres selectionnes."
                }
              </Typography>
            </Stack>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table
              size="small"
              aria-label={"Feedbacks pedagogiques"}
              sx={{ minWidth: 980 }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>{"Apprenant"}</TableCell>
                  <TableCell>{"Difficulte"}</TableCell>
                  <TableCell>{"Besoin d'aide"}</TableCell>
                  <TableCell>{"Message"}</TableCell>
                  <TableCell>{"Recu le"}</TableCell>
                  <TableCell>{"Statut"}</TableCell>
                  <TableCell sx={{ minWidth: 260 }}>
                    {"Reponse et actions"}
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {visibleFeedbacks.map((feedback) => {
                  const learner = learners.get(feedback.learnerId);
                  const closed =
                    feedback.status === "RESOLVED" ||
                    feedback.status === "CLOSED";

                  return (
                    <TableRow key={feedback.id} hover>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {learnerName(learner)}
                          </Typography>
                          {learner?.email ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {learner.email}
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>

                      <TableCell>
                        {difficultyLabel(feedback.difficultyLevel)}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          icon={
                            feedback.needHelp ? (
                              <CircleHelp size={15} />
                            ) : (
                              <CheckCircle2 size={15} />
                            )
                          }
                          label={
                            feedback.needHelp
                              ? "Aide demandee"
                              : "Sans demande"
                          }
                          color={feedback.needHelp ? "warning" : "default"}
                          variant={
                            feedback.needHelp ? "filled" : "outlined"
                          }
                        />
                      </TableCell>

                      <TableCell sx={{ maxWidth: 340 }}>
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: "pre-wrap" }}
                        >
                          {feedback.message || "Aucun message"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {formatDate(feedback.createdAt)}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={feedbackStatusLabel(feedback.status)}
                          color={feedbackStatusColor(feedback.status)}
                        />
                      </TableCell>

                      <TableCell>
                        {closed ? (
                          <Stack spacing={0.5}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700 }}
                            >
                              {"Traitement termine"}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ whiteSpace: "pre-wrap" }}
                            >
                              {feedback.trainerResponse ||
                                "Reponse enregistree"}
                            </Typography>
                          </Stack>
                        ) : (
                          <Stack spacing={1}>
                            <TextField
                              fullWidth
                              size="small"
                              multiline
                              minRows={2}
                              label={"Reponse pedagogique"}
                              value={responses[feedback.id] || ""}
                              onChange={(event) =>
                                setResponses((current) => ({
                                  ...current,
                                  [feedback.id]: event.target.value,
                                }))
                              }
                            />

                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1}
                            >
                              {feedback.status === "OPEN" ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() =>
                                    void handleAction(
                                      feedback.id,
                                      "IN_PROGRESS",
                                    )
                                  }
                                >
                                  {"Prendre en charge"}
                                </Button>
                              ) : null}

                              <Button
                                size="small"
                                variant="contained"
                                onClick={() =>
                                  void handleAction(
                                    feedback.id,
                                    "RESOLVE",
                                  )
                                }
                              >
                                {"Resoudre"}
                              </Button>
                            </Stack>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SmartSectionCard>
    </Stack>
  );
}