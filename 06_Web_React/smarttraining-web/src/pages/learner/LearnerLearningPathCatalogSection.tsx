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
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  LibraryBig,
} from "lucide-react";
import { buildMediaUrl } from "../../api/apiConfig";
import { getApiErrorMessage } from "../../api/apiClient";
import { getLearningPathCatalog } from "../../api/learningPathApi";
import type { LearningPathCatalogResponse } from "../../types/learningPath";

// LEARNER_WEB_VISUAL_1_CATALOG_PATH_SINGLE_SAFE_V1
interface LearnerLearningPathCatalogSectionProps {
  query: string;
  visible: boolean;
}

function visibilityLabel(value?: string): string {
  if (value === "PUBLIC") return "Public";
  if (value === "ASSIGNED_ONLY") return "Affectés uniquement";
  if (value === "PRIVATE") return "Privé";
  return value || "Accès encadré";
}

export function LearnerLearningPathCatalogSection({
  query,
  visible,
}: LearnerLearningPathCatalogSectionProps) {
  const [paths, setPaths] = useState<LearningPathCatalogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPaths() {
      setLoading(true);
      setError("");

      try {
        const loaded = await getLearningPathCatalog();

        if (active) {
          setPaths(loaded);
        }
      } catch (err) {
        if (active) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPaths();

    return () => {
      active = false;
    };
  }, []);

  const visiblePaths = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLocaleLowerCase("fr");

    if (!normalizedQuery) {
      return paths;
    }

    return paths.filter((path) => {
      const haystack = [
        path.title,
        path.shortDescription,
        path.description,
        path.objectives,
        ...path.trainings.map(
          (training) => training.trainingTitle,
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr");

      return haystack.includes(normalizedQuery);
    });
  }, [paths, query]);

  if (!visible) {
    return null;
  }

  return (
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
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center" }}
          >
            <LibraryBig size={20} />
            <Typography variant="h6" sx={{ fontWeight: 850 }}>
              Parcours
            </Typography>
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Une séquence de formations organisée par votre équipe pédagogique.
          </Typography>
        </Box>

        <Chip
          label={`${visiblePaths.length} parcours`}
          variant="outlined"
        />
      </Stack>

      {loading ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {[0, 1].map((item) => (
            <Card
              key={item}
              variant="outlined"
              sx={{ overflow: "hidden", borderRadius: 3 }}
            >
              <Skeleton variant="rectangular" height={150} />
              <CardContent>
                <Stack spacing={1}>
                  <Skeleton variant="text" width="46%" />
                  <Skeleton variant="text" width="82%" height={28} />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="rounded" height={34} />
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : !visiblePaths.length ? (
        <Alert severity="info">
          Aucun parcours ne correspond à votre recherche.
        </Alert>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns:
              visiblePaths.length === 1
                ? "1fr"
                : {
                    xs: "1fr",
                    md: "repeat(2, minmax(0, 1fr))",
                    xl: "repeat(3, minmax(0, 1fr))",
                  },
            gap: 2,
          }}
        >
          {visiblePaths.map((path) => {
            const cover = buildMediaUrl(
              path.coverImageUrl || path.coverImagePath,
            );

            return (
              <Card
                key={path.id}
                variant="outlined"
                sx={{
                  height: "100%",
                  display: visiblePaths.length === 1 ? "grid" : "flex",
                  gridTemplateColumns:
                    visiblePaths.length === 1
                      ? {
                          xs: "1fr",
                          md: "minmax(280px, 0.82fr) minmax(0, 1.18fr)",
                        }
                      : undefined,
                  flexDirection: visiblePaths.length === 1 ? undefined : "column",
                  overflow: "hidden",
                  borderColor: path.assignedToMe
                    ? "primary.main"
                    : "divider",
                }}
              >
                {cover ? (
                  <CardMedia
                    component="img"
                    image={cover}
                    alt={path.title}
                    sx={{
                      width: "100%",
                      height:
                        visiblePaths.length === 1
                          ? { xs: 190, md: "100%" }
                          : undefined,
                      minHeight:
                        visiblePaths.length === 1
                          ? { md: 260 }
                          : undefined,
                      aspectRatio:
                        visiblePaths.length === 1
                          ? undefined
                          : "16 / 7",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      height:
                        visiblePaths.length === 1
                          ? { xs: 190, md: "100%" }
                          : undefined,
                      minHeight:
                        visiblePaths.length === 1
                          ? { md: 260 }
                          : undefined,
                      aspectRatio:
                        visiblePaths.length === 1
                          ? undefined
                          : "16 / 7",
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "action.hover",
                    }}
                  >
                    <LibraryBig size={42} />
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
                      icon={<LibraryBig size={14} />}
                      label="Parcours"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={visibilityLabel(path.visibility)}
                      variant="outlined"
                    />
                    <Chip
                      size="small"
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
                  </Stack>

                  <Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 850 }}
                    >
                      {path.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.75 }}
                    >
                      {path.shortDescription ||
                        path.description ||
                        "Découvrez les formations de ce parcours."}
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
                      <BookOpen size={16} />
                      <Typography variant="caption">
                        {path.totalTrainings} formation
                        {path.totalTrainings > 1 ? "s" : ""}
                      </Typography>
                    </Stack>

                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{ alignItems: "center" }}
                    >
                      <Clock3 size={16} />
                      <Typography variant="caption">
                        {path.estimatedDurationHours > 0
                          ? `${path.estimatedDurationHours} h`
                          : "Durée à découvrir"}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{ flexWrap: "wrap" }}
                  >
                    <Chip
                      size="small"
                      label={`${path.requiredTrainings} obligatoire${
                        path.requiredTrainings > 1 ? "s" : ""
                      }`}
                      variant="outlined"
                    />
                    {path.optionalTrainings > 0 ? (
                      <Chip
                        size="small"
                        label={`${path.optionalTrainings} facultative${
                          path.optionalTrainings > 1 ? "s" : ""
                        }`}
                        variant="outlined"
                      />
                    ) : null}
                  </Stack>

                  <Box sx={{ mt: "auto" }}>
                    {path.canStart ? (
                      <Stack spacing={1.25}>
                        <Alert
                          severity="success"
                          icon={<CheckCircle2 size={18} />}
                        >
                          Ce parcours vous est affecté.
                        </Alert>
                        <Button
                          component={Link}
                          to={`/learner/learning-paths/${path.id}`}
                          variant="contained"
                          endIcon={<ArrowRight size={16} />}
                        >
                          Ouvrir le parcours
                        </Button>
                      </Stack>
                    ) : (
                      <Stack spacing={1.25}>
                        <Alert severity="info">
                          Affectation requise pour démarrer ce parcours.
                        </Alert>
                        <Button
                          component={Link}
                          to={`/learner/learning-paths/${path.id}`}
                          variant="outlined"
                          endIcon={<ArrowRight size={16} />}
                        >
                          Découvrir le parcours
                        </Button>
                      </Stack>
                    )}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Stack>
  );
}