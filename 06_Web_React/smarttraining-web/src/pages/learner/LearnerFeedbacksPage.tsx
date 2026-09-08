import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Rating,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { HelpCircle, MessageSquare, Star } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  createFeedback,
  createTrainingReview,
  getMyFeedbacks,
  getMyReviews,
  updateMyFeedback,
} from "../../api/analyticsApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { getMyTrainings } from "../../api/trainingApi";
import { SmartPageHeader, SmartSectionCard } from "../../components/ui";
import { useAuth } from "../../features/auth/AuthContext";
import type {
  DifficultyLevel,
  FeedbackResponse,
  FeedbackStatus,
  TrainingReviewResponse,
} from "../../types/analytics";
import type { LearnerMyTrainingResponse } from "../../types/training";
const difficultyOptions: Array<{ value: DifficultyLevel; label: string }> = [
  { value: "VERY_EASY", label: "Très facile" },
  { value: "EASY", label: "Facile" },
  { value: "NORMAL", label: "Adaptée" },
  { value: "HARD", label: "Difficile" },
  { value: "VERY_HARD", label: "Très difficile" },
];

function feedbackStatusLabel(status: FeedbackStatus): string {
  if (status === "OPEN") return "Envoyé";
  if (status === "IN_PROGRESS") return "Pris en charge";
  if (status === "RESOLVED") return "Résolu";
  if (status === "CLOSED") return "Clos";
  return status;
}

function difficultyLabel(value: DifficultyLevel): string {
  return difficultyOptions.find((item) => item.value === value)?.label ?? value;
}

function formatDate(value?: string): string {
  if (!value) return "Date non disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function LearnerFeedbacksPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [trainings, setTrainings] = useState<LearnerMyTrainingResponse[]>([]);
  const [reviews, setReviews] = useState<TrainingReviewResponse[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackResponse[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [difficultyLevel, setDifficultyLevel] =
    useState<DifficultyLevel>("NORMAL");
  const [needHelp, setNeedHelp] = useState(false);
  const [message, setMessage] = useState("");
  const [editingFeedbackId, setEditingFeedbackId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingReview, setSavingReview] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [trainingItems, reviewItems, feedbackItems] = await Promise.all([
        getMyTrainings(),
        getMyReviews(),
        getMyFeedbacks(),
      ]);

      setTrainings(trainingItems);
      setReviews(reviewItems);
      setFeedbacks(feedbackItems);

      const requestedId = Number(searchParams.get("trainingId"));
      const requestedAvailable = trainingItems.some(
        (item) => item.id === requestedId,
      );

      setSelectedTrainingId(
        requestedAvailable ? requestedId : (trainingItems[0]?.id ?? 0),
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

  const selectedTraining = useMemo(
    () => trainings.find((item) => item.id === selectedTrainingId),
    [trainings, selectedTrainingId],
  );

  const existingReview = useMemo(
    () => reviews.find((item) => item.trainingId === selectedTrainingId),
    [reviews, selectedTrainingId],
  );

  const selectedFeedbacks = useMemo(
    () =>
      feedbacks
        .filter((item) => item.trainingId === selectedTrainingId)
        .sort((a, b) => {
          const aTime = new Date(a.createdAt ?? 0).getTime();
          const bTime = new Date(b.createdAt ?? 0).getTime();
          return bTime - aTime;
        }),
    [feedbacks, selectedTrainingId],
  );

  useEffect(() => {
    setRating(existingReview?.rating ?? 0);
    setComment(existingReview?.comment ?? "");
    setDifficultyLevel("NORMAL");
    setNeedHelp(false);
    setMessage("");
    setEditingFeedbackId(null);
    setSuccess("");
  }, [selectedTrainingId, existingReview?.id]);

  function changeTraining(value: string) {
    const id = Number(value);
    setSelectedTrainingId(id);

    if (id) {
      setSearchParams({ trainingId: String(id) }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();

    if (!user || !selectedTrainingId || rating < 1 || rating > 5) {
      setError("Choisissez une note de 1 à 5 étoiles.");
      return;
    }

    setSavingReview(true);
    setError("");
    setSuccess("");

    try {
      const saved = await createTrainingReview({
        learnerId: user.id,
        trainingId: selectedTrainingId,
        rating,
        comment: comment.trim() || undefined,
      });

      setReviews((current) => [
        saved,
        ...current.filter((item) => item.trainingId !== selectedTrainingId),
      ]);

      setSuccess(
        existingReview
          ? "Votre avis a été mis à jour."
          : "Votre avis a été publié.",
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSavingReview(false);
    }
  }

  function editFeedback(feedback: FeedbackResponse) {
    if (feedback.status !== "OPEN") {
      setError(
        "Ce retour ne peut plus être modifié car il est déjà pris en charge.",
      );
      return;
    }

    setEditingFeedbackId(feedback.id);
    setDifficultyLevel(feedback.difficultyLevel);
    setNeedHelp(feedback.needHelp);
    setMessage(feedback.message ?? "");
    setError("");
    setSuccess("Modification du retour en cours.");
  }

  function cancelFeedbackEdit() {
    setEditingFeedbackId(null);
    setDifficultyLevel("NORMAL");
    setNeedHelp(false);
    setMessage("");
    setError("");
    setSuccess("");
  }

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !selectedTrainingId) {
      setError("Choisissez une formation.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const submittedDifficulty = String(
      formData.get("difficultyLevel") ?? difficultyLevel,
    ) as DifficultyLevel;
    const submittedNeedHelp = formData.get("needHelp") === "on";
    const submittedMessage = String(formData.get("message") ?? "").trim();

    if (submittedNeedHelp && submittedMessage.length < 3) {
      setError("Expliquez brièvement l’aide dont vous avez besoin.");
      return;
    }

    setSavingFeedback(true);
    setError("");
    setSuccess("");

    try {
      const wasEditing = editingFeedbackId !== null;
      const saved = wasEditing
        ? await updateMyFeedback(editingFeedbackId, {
            difficultyLevel: submittedDifficulty,
            needHelp: submittedNeedHelp,
            message: submittedMessage || undefined,
          })
        : await createFeedback({
            learnerId: user.id,
            trainingId: selectedTrainingId,
            difficultyLevel: submittedDifficulty,
            needHelp: submittedNeedHelp,
            message: submittedMessage || undefined,
          });

      const savedMessage = saved.message?.trim() ?? "";
      const valuesConfirmed =
        saved.difficultyLevel === submittedDifficulty &&
        saved.needHelp === submittedNeedHelp &&
        savedMessage === submittedMessage;

      if (!valuesConfirmed) {
        throw new Error(
          "Le serveur n’a pas confirmé exactement les modifications saisies.",
        );
      }

      setFeedbacks((current) =>
        wasEditing
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );

      setEditingFeedbackId(null);
      setDifficultyLevel("NORMAL");
      setNeedHelp(false);
      setMessage("");

      setSuccess(
        wasEditing
          ? "Votre retour a été modifié et confirmé."
          : submittedNeedHelp
            ? "Votre demande d’aide a été envoyée au formateur."
            : "Votre retour pédagogique a été envoyé.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : getApiErrorMessage(err),
      );
    } finally {
      setSavingFeedback(false);
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 320,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={30} />
          <Typography color="text.secondary">
            {"Chargement de vos avis et retours..."}
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow={"Votre exp\u00e9rience d'apprentissage"}
        title={"Mes avis et demandes d'aide"}
        description={
          "Partagez votre avis sur vos formations et signalez une difficult\u00e9 lorsque vous avez besoin d'un accompagnement p\u00e9dagogique."
        }
        actions={
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Chip
              icon={<Star size={15} />}
              label={`${reviews.length} avis`}
              variant="outlined"
            />
            <Chip
              icon={<MessageSquare size={15} />}
              label={`${feedbacks.length} retour${feedbacks.length > 1 ? "s" : ""}`}
              variant="outlined"
            />
          </Stack>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      {trainings.length === 0 ? (
        <SmartSectionCard
          title={"Aucune formation disponible"}
          description={
            "Vous pourrez publier un avis ou demander de l'aide d\u00e8s qu'une formation sera disponible dans votre espace."
          }
        >
          <Alert severity="info">
            {"Aucune formation n'est actuellement disponible pour cette action."}
          </Alert>
        </SmartSectionCard>
      ) : (
        <>
          <SmartSectionCard
            title={"Formation concern\u00e9e"}
            description={
              "Les avis et demandes d'aide sont toujours rattach\u00e9s \u00e0 l'une de vos formations."
            }
          >
            <TextField
              select
              fullWidth
              label={"Formation"}
              value={selectedTrainingId || ""}
              onChange={(event) => changeTraining(event.target.value)}
            >
              {trainings.map((training) => (
                <MenuItem key={training.id} value={training.id}>
                  {training.title}
                </MenuItem>
              ))}
            </TextField>
          </SmartSectionCard>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(0, 1fr) minmax(0, 1fr)",
              },
              gap: 3,
              alignItems: "start",
            }}
          >
            <SmartSectionCard
              title={"Mon avis sur la formation"}
              description={
                existingReview
                  ? "Vous pouvez mettre \u00e0 jour l'avis d\u00e9j\u00e0 publi\u00e9 pour cette formation."
                  : "Votre avis aide les autres apprenants \u00e0 mieux comprendre l'exp\u00e9rience propos\u00e9e."
              }
            >
              <Box component="form" onSubmit={submitReview}>
                <Stack spacing={2.25}>
                  {selectedTraining ? (
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {selectedTraining.title}
                    </Typography>
                  ) : null}

                  <Box>
                    <Typography
                      component="label"
                      variant="body2"
                      sx={{ display: "block", mb: 0.75, fontWeight: 750 }}
                    >
                      {"Note"}
                    </Typography>
                    <Rating
                      name="rating"
                      value={rating}
                      onChange={(_, nextValue) => setRating(nextValue ?? 0)}
                      size="large"
                    />
                  </Box>

                  <TextField
                    name="comment"
                    label={"Commentaire"}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    multiline
                    minRows={4}
                    fullWidth
                    placeholder={"Partagez votre exp\u00e9rience sur cette formation..."}
                  />

                  {existingReview ? (
                    <Alert severity="info" icon={<Star size={18} />}>
                      {`Avis actuel : ${existingReview.rating}/5 - ${
                        existingReview.status === "HIDDEN"
                          ? "masqu\u00e9 par la mod\u00e9ration"
                          : "publi\u00e9"
                      }.`}
                    </Alert>
                  ) : null}

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={savingReview || rating < 1 || !selectedTrainingId}
                    startIcon={
                      savingReview ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Star size={17} />
                      )
                    }
                    sx={{ alignSelf: "flex-start" }}
                  >
                    {savingReview
                      ? "Enregistrement..."
                      : existingReview
                        ? "Mettre \u00e0 jour mon avis"
                        : "Publier mon avis"}
                  </Button>
                </Stack>
              </Box>
            </SmartSectionCard>

            <SmartSectionCard
              title={
                editingFeedbackId
                  ? "Modifier mon retour"
                  : "Faire un retour ou demander de l'aide"
              }
              description={
                "Indiquez votre niveau de difficult\u00e9 et pr\u00e9cisez si vous souhaitez attirer l'attention de votre formateur."
              }
            >
              <Box component="form" onSubmit={submitFeedback}>
                <Stack spacing={2}>
                  <TextField
                    select
                    fullWidth
                    name="difficultyLevel"
                    label={"Niveau de difficult\u00e9"}
                    value={difficultyLevel}
                    onChange={(event) =>
                      setDifficultyLevel(event.target.value as DifficultyLevel)
                    }
                  >
                    {difficultyOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <FormControlLabel
                    control={
                      <Checkbox
                        name="needHelp"
                        checked={needHelp}
                        onChange={(_, checked) => setNeedHelp(checked)}
                      />
                    }
                    label={"J'ai besoin d'aide"}
                  />

                  <TextField
                    name="message"
                    label={"Mon retour ou mon besoin"}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    multiline
                    minRows={5}
                    fullWidth
                    placeholder={
                      "D\u00e9crivez votre retour, votre difficult\u00e9 ou l'aide dont vous avez besoin..."
                    }
                  />

                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ alignItems: { sm: "center" } }}
                  >
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={savingFeedback || !selectedTrainingId}
                      startIcon={
                        savingFeedback ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <HelpCircle size={17} />
                        )
                      }
                    >
                      {savingFeedback
                        ? "Enregistrement..."
                        : editingFeedbackId
                          ? "Enregistrer les modifications"
                          : needHelp
                            ? "Envoyer ma demande d'aide"
                            : "Envoyer mon retour"}
                    </Button>

                    {editingFeedbackId ? (
                      <Button
                        type="button"
                        variant="text"
                        disabled={savingFeedback}
                        onClick={cancelFeedbackEdit}
                      >
                        {"Annuler la modification"}
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
              </Box>
            </SmartSectionCard>
          </Box>

          <SmartSectionCard
            title={"Suivi de mes retours"}
            description={
              "Retrouvez l'\u00e9tat de traitement de vos demandes et les r\u00e9ponses de votre formateur."
            }
          >
            {selectedFeedbacks.length === 0 ? (
              <Alert severity="info">
                {"Aucun retour p\u00e9dagogique envoy\u00e9 pour cette formation."}
              </Alert>
            ) : (
              <Stack spacing={1.5}>
                {selectedFeedbacks.map((feedback) => (
                  <Card key={feedback.id} variant="outlined">
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          sx={{
                            justifyContent: "space-between",
                            alignItems: { sm: "flex-start" },
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
                              label={feedbackStatusLabel(feedback.status)}
                              color={
                                feedback.status === "RESOLVED"
                                  ? "success"
                                  : feedback.status === "IN_PROGRESS"
                                    ? "warning"
                                    : feedback.status === "CLOSED"
                                      ? "default"
                                      : "info"
                              }
                            />
                            <Chip
                              size="small"
                              variant="outlined"
                              label={difficultyLabel(feedback.difficultyLevel)}
                            />
                            {feedback.needHelp ? (
                              <Chip
                                size="small"
                                icon={<HelpCircle size={14} />}
                                label={"Aide demand\u00e9e"}
                                variant="outlined"
                              />
                            ) : null}
                          </Stack>

                          <Typography variant="caption" color="text.secondary">
                            {formatDate(feedback.createdAt)}
                          </Typography>
                        </Stack>

                        {feedback.message ? (
                          <Typography variant="body2">
                            {feedback.message}
                          </Typography>
                        ) : null}

                        {feedback.status === "OPEN" ? (
                          <Button
                            type="button"
                            size="small"
                            variant="outlined"
                            onClick={() => editFeedback(feedback)}
                            sx={{ alignSelf: "flex-start" }}
                          >
                            {"Modifier mon retour"}
                          </Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {
                              "La modification est verrouill\u00e9e d\u00e8s que votre retour est pris en charge."
                            }
                          </Typography>
                        )}

                        {feedback.trainerResponse ? (
                          <Alert severity="success">
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 800, mb: 0.25 }}
                            >
                              {"R\u00e9ponse du formateur"}
                            </Typography>
                            <Typography variant="body2">
                              {feedback.trainerResponse}
                            </Typography>
                          </Alert>
                        ) : feedback.needHelp ? (
                          <Alert severity="info">
                            {
                              "Votre demande est enregistr\u00e9e. La r\u00e9ponse du formateur appara\u00eetra ici lorsqu'elle sera disponible."
                            }
                          </Alert>
                        ) : null}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </SmartSectionCard>
        </>
      )}
    </Stack>
  );
}