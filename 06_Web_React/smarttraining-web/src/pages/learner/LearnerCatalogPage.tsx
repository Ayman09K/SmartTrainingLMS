import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Skeleton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  KeyRound,
  Search,
  Star,
} from "lucide-react";
import {
  createTrainingAccessRequest,
  enrollWithAccessCode,
  getCatalogTrainings,
  getEnrollmentsByLearner,
  getTrainingAccessRequestsByLearner,
  selfEnroll,
} from "../../api/trainingApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { SmartPageHeader } from "../../components/ui";
import { LearnerLearningPathCatalogSection } from "./LearnerLearningPathCatalogSection";
import { useAuth } from "../../features/auth/AuthContext";
import type {
  EnrollmentResponse,
  LearnerCatalogTrainingResponse,
  TrainingAccessRequestResponse,
} from "../../types/training";
// LEARNER_WEB_VISUAL_1_CATALOG_LOADING_SAFE_V1
function levelLabel(level?: string): string {
  if (level === "DEBUTANT") return "Débutant";
  if (level === "INTERMEDIAIRE") return "Intermédiaire";
  if (level === "AVANCE") return "Avancé";
  return level || "Tous niveaux";
}

function modeLabel(mode?: string): string {
  if (mode === "SELF_ENROLLMENT") return "Inscription libre";
  if (mode === "ACCESS_CODE") return "Code d’accès";
  if (mode === "ASSIGNMENT_ONLY") return "Accès sur demande";
  if (mode === "INVITATION") return "Sur invitation";
  return "Accès encadré";
}

function ratingLabel(training: LearnerCatalogTrainingResponse): string {
  if (!training.reviewCount) return "Pas encore d’avis";
  const rating = training.averageRating ?? 0;
  return `${rating.toFixed(1)} / 5 · ${training.reviewCount} avis`;
}

export function LearnerCatalogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<LearnerCatalogTrainingResponse[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);
  const [requests, setRequests] = useState<TrainingAccessRequestResponse[]>([]);
  const [query, setQuery] = useState("");
  const [catalogType, setCatalogType] =
    useState<"ALL" | "FORMATION" | "PARCOURS">("ALL");
  const [category, setCategory] = useState("Toutes");
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [busyTrainingId, setBusyTrainingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
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
      const [catalog, myEnrollments, myRequests] = await Promise.all([
        getCatalogTrainings(),
        getEnrollmentsByLearner(user.id),
        getTrainingAccessRequestsByLearner(user.id),
      ]);

      setTrainings(catalog);
      setEnrollments(myEnrollments);
      setRequests(myRequests);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user?.id]);

  const enrolledTrainingIds = useMemo(
    () =>
      new Set(
        enrollments
          .filter((item) => item.status !== "CANCELLED")
          .map((item) => item.trainingId),
      ),
    [enrollments],
  );

  const pendingRequestIds = useMemo(
    () =>
      new Set(
        requests
          .filter((item) => item.status === "PENDING")
          .map((item) => item.trainingId),
      ),
    [requests],
  );

  const categories = useMemo(() => {
    const values = new Set(
      trainings
        .map((training) => training.category?.trim())
        .filter((value): value is string => Boolean(value)),
    );

    return ["Toutes", ...Array.from(values).sort((a, b) => a.localeCompare(b, "fr"))];
  }, [trainings]);

  const visibleTrainings = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");

    return trainings.filter((training) => {
      if (catalogType === "PARCOURS") {
        return false;
      }

      const categoryMatches =
        category === "Toutes" || training.category?.trim() === category;

      const haystack = [
        training.title,
        training.shortDescription,
        training.description,
        training.category,
        training.level,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr");

      const queryMatches =
        !normalizedQuery || haystack.includes(normalizedQuery);

      return categoryMatches && queryMatches;
    });
  }, [trainings, query, category, catalogType]);

  async function runAction(
    trainingId: number,
    action: () => Promise<unknown>,
    successMessage: string,
    openTrainingAfterSuccess = false,
  ) {
    setBusyTrainingId(trainingId);
    setError("");
    setSuccess("");

    try {
      await action();

      if (openTrainingAfterSuccess) {
        navigate(`/learner/trainings/${trainingId}`);
        return;
      }

      setSuccess(successMessage);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyTrainingId(null);
    }
  }

  if (loading) {
    return (
      <Stack spacing={2.5}>
        <Box>
          <Skeleton variant="text" width={88} height={18} />
          <Skeleton variant="text" width={220} height={38} />
          <Skeleton variant="text" width="58%" height={22} />
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
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Card
              key={item}
              variant="outlined"
              sx={{ overflow: "hidden", borderRadius: 3 }}
            >
              <Skeleton variant="rectangular" height={150} />
              <CardContent>
                <Stack spacing={1}>
                  <Skeleton variant="text" width="45%" />
                  <Skeleton variant="text" width="82%" height={28} />
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
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow={"D\u00e9couvrir"}
        title={"Catalogue"}
        description={
          "Explorez des formations et des parcours publiés. Un parcours public peut être consulté librement, mais il doit vous être affecté pour démarrer."
        }
        actions={
          <Chip
            icon={<BookOpen size={16} />}
            label="Formations & parcours"
            variant="outlined"
          />
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? (
        <Alert severity="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "minmax(0, 1fr) minmax(190px, 240px) minmax(220px, 300px)",
          },
          gap: 2,
          alignItems: "start",
        }}
      >
        <TextField
          label={"Rechercher"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={"Titre, thème, objectif ou niveau..."}
          fullWidth
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

        <TextField
          select
          label="Type de contenu"
          value={catalogType}
          onChange={(event) =>
            setCatalogType(
              event.target.value as "ALL" | "FORMATION" | "PARCOURS",
            )
          }
          fullWidth
        >
          <MenuItem value="ALL">Tout</MenuItem>
          <MenuItem value="FORMATION">Formations</MenuItem>
          <MenuItem value="PARCOURS">Parcours</MenuItem>
        </TextField>

        <TextField
          select
          label={"Cat\u00e9gorie"}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          disabled={catalogType === "PARCOURS"}
          fullWidth
        >
          {categories.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {!visibleTrainings.length && catalogType !== "PARCOURS" ? (
        <Alert severity="info">
          {
            "Aucune formation ne correspond à votre recherche. Modifiez les filtres ou affichez les parcours."
          }
        </Alert>
      ) : visibleTrainings.length ? (
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
          {visibleTrainings.map((training) => {
            const enrolled = enrolledTrainingIds.has(training.id);
            const pending = pendingRequestIds.has(training.id);
            const busy = busyTrainingId === training.id;
            const mode = training.enrollmentMode;

            return (
              <Card
                key={training.id}
                variant="outlined"
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {training.coverImageUrl ? (
                  <CardMedia
                    component="img"
                    image={training.coverImageUrl}
                    alt={training.title}
                    sx={{
                      aspectRatio: "16 / 7",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      aspectRatio: "16 / 7",
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "action.hover",
                    }}
                  >
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 900,
                        letterSpacing: "0.08em",
                        color: "primary.main",
                      }}
                    >
                      {training.title.slice(0, 2).toUpperCase()}
                    </Typography>
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
                      variant="outlined"
                      label={training.category?.trim() || "Formation"}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={levelLabel(training.level)}
                    />
                    <Chip
                      size="small"
                      label={modeLabel(mode)}
                    />
                  </Stack>

                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 850 }}>
                      {training.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.75 }}
                    >
                      {training.shortDescription ||
                        training.description ||
                        "D\u00e9couvrez les objectifs et le contenu de cette formation."}
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
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                      <Clock3 size={16} />
                      <Typography variant="caption">
                        {training.estimatedDurationHours
                          ? `${training.estimatedDurationHours} h`
                          : "Dur\u00e9e \u00e0 d\u00e9couvrir"}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                      <Star size={16} />
                      <Typography variant="caption">
                        {ratingLabel(training)}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Box sx={{ mt: "auto" }}>
                    {enrolled ? (
                      <Stack spacing={1.25}>
                        <Alert
                          severity="success"
                          icon={<CheckCircle2 size={18} />}
                        >
                          {"Vous \u00eates d\u00e9j\u00e0 inscrit \u00e0 cette formation."}
                        </Alert>
                        <Button
                          component={Link}
                          to={`/learner/trainings/${training.id}`}
                          variant="contained"
                          endIcon={<ArrowRight size={16} />}
                        >
                          {"Ouvrir la formation"}
                        </Button>
                      </Stack>
                    ) : pending ? (
                      <Alert severity="info">
                        {"Votre demande d'acc\u00e8s est en attente de traitement."}
                      </Alert>
                    ) : mode === "SELF_ENROLLMENT" ? (
                      <Button
                        type="button"
                        variant="contained"
                        disabled={busy}
                        startIcon={
                          busy ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <CheckCircle2 size={17} />
                          )
                        }
                        onClick={() =>
                          void runAction(
                            training.id,
                            () =>
                              selfEnroll({
                                learnerId: user?.id ?? 0,
                                trainingId: training.id,
                              }),
                            `Inscription \u00e0 \u00ab ${training.title} \u00bb confirm\u00e9e.`,
                            true,
                          )
                        }
                      >
                        {busy ? "Inscription..." : "S'inscrire"}
                      </Button>
                    ) : mode === "ACCESS_CODE" ? (
                      <Stack spacing={1.25}>
                        <TextField
                          label={"Code d'acc\u00e8s"}
                          value={codes[training.id] ?? ""}
                          onChange={(event) =>
                            setCodes((current) => ({
                              ...current,
                              [training.id]: event.target.value,
                            }))
                          }
                          placeholder={"Saisir le code"}
                          autoComplete="off"
                          fullWidth
                          slotProps={{
                            input: {
                              startAdornment: (
                                <InputAdornment position="start">
                                  <KeyRound size={17} />
                                </InputAdornment>
                              ),
                            },
                          }}
                        />
                        <Button
                          type="button"
                          variant="contained"
                          disabled={busy || !(codes[training.id] ?? "").trim()}
                          onClick={() =>
                            void runAction(
                              training.id,
                              () =>
                                enrollWithAccessCode({
                                  learnerId: user?.id ?? 0,
                                  trainingId: training.id,
                                  accessCode: (codes[training.id] ?? "").trim(),
                                }),
                              `Acc\u00e8s \u00e0 \u00ab ${training.title} \u00bb confirm\u00e9.`,
                              true,
                            )
                          }
                        >
                          {busy ? "V\u00e9rification..." : "Valider le code"}
                        </Button>
                      </Stack>
                    ) : mode === "ASSIGNMENT_ONLY" ? (
                      <Button
                        type="button"
                        variant="contained"
                        disabled={busy}
                        onClick={() =>
                          void runAction(
                            training.id,
                            () =>
                              createTrainingAccessRequest({
                                learnerId: user?.id ?? 0,
                                trainingId: training.id,
                                learnerMessage:
                                  "Je souhaite acc\u00e9der \u00e0 cette formation.",
                              }),
                            `Votre demande d'acc\u00e8s \u00e0 \u00ab ${training.title} \u00bb a \u00e9t\u00e9 envoy\u00e9e.`,
                          )
                        }
                      >
                        {busy ? "Envoi..." : "Demander l'acc\u00e8s"}
                      </Button>
                    ) : mode === "INVITATION" ? (
                      <Alert severity="info">
                        {
                          "Cette formation est accessible uniquement sur invitation."
                        }
                      </Alert>
                    ) : (
                      <Alert severity="info">
                        {"L'acc\u00e8s \u00e0 cette formation est g\u00e9r\u00e9 par votre formateur."}
                      </Alert>
                    )}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      ) : null}

      <LearnerLearningPathCatalogSection
        query={query}
        visible={catalogType !== "FORMATION"}
      />
    </Stack>
  );
}