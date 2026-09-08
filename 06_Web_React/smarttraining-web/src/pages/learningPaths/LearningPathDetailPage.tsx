import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  Archive,
  ArrowLeft,
  GitBranch,
  Pencil,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import {
  archiveLearningPath,
  createLearningPathVersion,
  deleteLearningPath,
  getLearningPath,
  getLearningPathGroupAssignments,
  getLearningPathLearnerAssignments,
  getLearningPathSteps,
  getLearningPathVersions,
  publishLearningPath,
  unarchiveLearningPath,
} from "../../api/learningPathApi";
import { buildMediaUrl } from "../../api/apiConfig";
import { getApiErrorMessage } from "../../api/apiClient";
import { smartConfirm } from "../../components/ux/smartConfirmService";
import { LearningPathAssignmentPanel } from "./LearningPathAssignmentPanel";
import { LearningPathManagerProgressPanel } from "./LearningPathManagerProgressPanel";
import type {
  LearningPathResponse,
  LearningPathStepResponse,
} from "../../types/learningPath";

function visibilityLabel(value?: string): string {
  if (value === "PUBLIC") {
    return "Public";
  }

  if (value === "ASSIGNED_ONLY") {
    return "Affectés uniquement";
  }

  return "Privé";
}

function trainingStatusLabel(value?: string | null): string {
  if (value === "PUBLISHED") {
    return "Publiée";
  }

  if (value === "DRAFT") {
    return "Brouillon";
  }

  if (value === "ARCHIVED") {
    return "Archivée";
  }

  return value || "Statut inconnu";
}

// WEB_VISUAL_FINAL_A2_LEARNING_PATH_DETAIL_BALANCE_SAFE_V2
type DeleteAvailability =
  | "checking"
  | "allowed"
  | "blocked"
  | "unavailable";

export function LearningPathDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathId: pathIdParam } = useParams();
  const pathId = Number(pathIdParam);

  const basePath = location.pathname.startsWith("/admin")
    ? "/admin/learning-paths"
    : "/trainer/learning-paths";

  const [path, setPath] = useState<LearningPathResponse | null>(null);
  const [steps, setSteps] = useState<LearningPathStepResponse[]>([]);
  const [versions, setVersions] = useState<LearningPathResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteAvailability, setDeleteAvailability] =
    useState<DeleteAvailability>("checking");
  const [tab, setTab] = useState(0);

  async function reload() {
    if (!Number.isInteger(pathId) || pathId <= 0) {
      return;
    }

    const [loadedPath, loadedSteps, loadedVersions] =
      await Promise.all([
        getLearningPath(pathId),
        getLearningPathSteps(pathId),
        getLearningPathVersions(pathId),
      ]);

    setPath(loadedPath);
    setSteps(loadedSteps);
    setVersions(loadedVersions);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      if (!Number.isInteger(pathId) || pathId <= 0) {
        if (active) {
          setError("Identifiant de parcours invalide.");
          setLoading(false);
        }

        return;
      }

      try {
        const [loadedPath, loadedSteps, loadedVersions] =
          await Promise.all([
            getLearningPath(pathId),
            getLearningPathSteps(pathId),
            getLearningPathVersions(pathId),
          ]);

        if (active) {
          setPath(loadedPath);
          setSteps(loadedSteps);
          setVersions(loadedVersions);
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

    void load();

    return () => {
      active = false;
    };
  }, [pathId]);

  const deletePathId = path?.id;
  const deletePathStatus = path?.status;

  useEffect(() => {
    if (!deletePathId || deletePathStatus === "PUBLISHED") {
      setDeleteAvailability("unavailable");
      return;
    }

    const pathId = deletePathId;
    let active = true;
    setDeleteAvailability("checking");

    async function checkDeleteAvailability() {
      try {
        const [learnerAssignments, groupAssignments] =
          await Promise.all([
            getLearningPathLearnerAssignments(pathId),
            getLearningPathGroupAssignments(pathId),
          ]);

        if (active) {
          setDeleteAvailability(
            learnerAssignments.length + groupAssignments.length > 0
              ? "blocked"
              : "allowed",
          );
        }
      } catch {
        if (active) {
          setDeleteAvailability("unavailable");
        }
      }
    }

    void checkDeleteAvailability();

    return () => {
      active = false;
    };
  }, [deletePathId, deletePathStatus]);

  const stats = useMemo(() => {
    const required = steps.filter((step) => step.required).length;
    const duration = steps.reduce(
      (sum, step) =>
        sum + (step.estimatedDurationHours || 0),
      0,
    );

    return {
      total: steps.length,
      required,
      optional: steps.length - required,
      duration,
    };
  }, [steps]);

  const draftVersion = versions.find(
    (item) => item.status === "DRAFT",
  );

  const latestPublishedVersionNumber = Math.max(
    ...versions
      .filter((item) => item.status === "PUBLISHED")
      .map((item) => item.versionNumber || 1),
    path?.status === "PUBLISHED"
      ? path.versionNumber || 1
      : 0,
  );

  const isLatestPublished =
    path?.status === "PUBLISHED" &&
    (path.versionNumber || 1) === latestPublishedVersionNumber;

  async function createVersion() {
    if (!path || path.status !== "PUBLISHED") {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const created = await createLearningPathVersion(path.id);

      navigate(`${basePath}/${created.id}/edit`, {
        state: {
          flash: `Version V${created.versionNumber || 1} créée en brouillon.`,
        },
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function runAction(
    action: "publish" | "archive" | "unarchive" | "delete",
  ) {
    if (!path) {
      return;
    }

    if (
      action === "delete" &&
      !(await smartConfirm({
        title: "Supprimer définitivement le parcours",
        description: `Supprimer définitivement le parcours « ${path.title} » ?`,
        confirmLabel: "Supprimer",
        destructive: true,
      }))
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      if (action === "publish") {
        await publishLearningPath(path.id);
        setSuccess("Parcours publié.");
        await reload();
      } else if (action === "archive") {
        await archiveLearningPath(path.id);
        setSuccess("Parcours archivé.");
        await reload();
      } else if (action === "unarchive") {
        await unarchiveLearningPath(path.id);
        setSuccess("Parcours désarchivé.");
        await reload();
      } else {
        await deleteLearningPath(path.id);
        navigate(basePath, {
          replace: true,
        });
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!path) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error || "Parcours introuvable."}
        </Alert>
      </Box>
    );
  }

  const missingVersionNote =
    path.status === "DRAFT" &&
    (path.versionNumber || 1) > 1 &&
    !path.versionNote?.trim();

  const invalidForPublish =
    steps.length === 0 ||
    steps.some(
      (step) =>
        step.trainingMissing ||
        step.trainingStatus !== "PUBLISHED",
    ) ||
    missingVersionNote;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Button
        component={Link}
        to={basePath}
        startIcon={<ArrowLeft size={17} />}
        sx={{ mb: 2 }}
      >
        Retour aux parcours
      </Button>

      <Card
        variant="outlined"
        sx={{
          mb: 2.5,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: buildMediaUrl(
                path.coverImageUrl || path.coverImagePath,
              )
                ? "minmax(0, 1.25fr) minmax(320px, 0.75fr)"
                : "1fr",
            },
          }}
        >
          <Box
            sx={{
              p: { xs: 2.5, md: 3.5 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              gap: 0,
            }}
          >
            <Box>
              <Typography
                variant="overline"
                color="primary.main"
                sx={{ fontWeight: 900, letterSpacing: 1.15 }}
              >
                Parcours de formation · V{path.versionNumber || 1}
              </Typography>

              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  mt: 0.5,
                  fontSize: {
                    xs: "2rem",
                    md: "2.45rem",
                  },
                  lineHeight: 1.08,
                }}
              >
                {path.title}
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  mt: 1.25,
                  maxWidth: 760,
                  fontSize: "1rem",
                  lineHeight: 1.6,
                }}
              >
                {path.shortDescription ||
                  path.description ||
                  "Parcours structuré de formations."}
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: "wrap", mt: 2 }}
              >
                <Chip
                  label={
                    path.status === "DRAFT"
                      ? "Brouillon"
                      : path.status === "PUBLISHED"
                        ? "Publié"
                        : "Archivé"
                  }
                  color={
                    path.status === "PUBLISHED"
                      ? "success"
                      : path.status === "DRAFT"
                        ? "warning"
                        : "default"
                  }
                  sx={{ fontWeight: 800 }}
                />
                <Chip
                  label={visibilityLabel(path.visibility)}
                  variant="outlined"
                />
                {draftVersion && path.status === "PUBLISHED" ? (
                  <Chip
                    label={`V${draftVersion.versionNumber || 1} en préparation`}
                    color="warning"
                    variant="outlined"
                  />
                ) : null}
              </Stack>
            </Box>

            <Box
              sx={{
                mt: 3,
                pt: 2.5,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, minmax(0, 1fr))",
                    sm: "repeat(4, minmax(0, 1fr))",
                  },
                  gap: 1,
                  mb: 2.5,
                }}
              >
                {[
                  {
                    value: stats.total,
                    label: "Formations",
                  },
                  {
                    value: stats.required,
                    label: "Obligatoires",
                  },
                  {
                    value:
                      stats.duration > 0
                        ? `${stats.duration} h`
                        : "—",
                    label: "Durée estimée",
                  },
                  {
                    value: versions.length,
                    label:
                      versions.length > 1
                        ? "Versions"
                        : "Version",
                  },
                ].map((stat) => (
                  <Box
                    key={stat.label}
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      border: 1,
                      borderColor: "divider",
                      bgcolor: "action.hover",
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 900, lineHeight: 1.1 }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {stat.label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {path.status === "PUBLISHED" && draftVersion ? (
                  <Button
                    component={Link}
                    to={`${basePath}/${draftVersion.id}/edit`}
                    variant="contained"
                    startIcon={<GitBranch size={17} />}
                  >
                    Ouvrir le brouillon V
                    {draftVersion.versionNumber || 1}
                  </Button>
                ) : null}

                {path.status === "PUBLISHED" &&
                !draftVersion &&
                isLatestPublished ? (
                  <Button
                    variant="contained"
                    disabled={busy}
                    startIcon={<GitBranch size={17} />}
                    onClick={() => void createVersion()}
                  >
                    Créer une nouvelle version
                  </Button>
                ) : null}

                {path.status !== "ARCHIVED" ? (
                  <Button
                    component={Link}
                    to={`${basePath}/${path.id}/edit`}
                    variant="outlined"
                    startIcon={<Pencil size={17} />}
                  >
                    Modifier
                  </Button>
                ) : null}

                {path.status === "DRAFT" ? (
                  <Button
                    variant="contained"
                    disabled={busy || invalidForPublish}
                    startIcon={<Send size={17} />}
                    onClick={() => void runAction("publish")}
                  >
                    Publier
                  </Button>
                ) : null}

                {path.status === "PUBLISHED" ? (
                  <Button
                    variant="outlined"
                    disabled={busy}
                    startIcon={<Archive size={17} />}
                    onClick={() => void runAction("archive")}
                  >
                    Archiver
                  </Button>
                ) : null}

                {path.status === "ARCHIVED" ? (
                  <Button
                    variant="outlined"
                    disabled={busy}
                    startIcon={<RotateCcw size={17} />}
                    onClick={() =>
                      void runAction("unarchive")
                    }
                  >
                    Désarchiver
                  </Button>
                ) : null}

                {path.status !== "PUBLISHED" ? (
                  <Button
                        title={deleteAvailability === "blocked"
                          ? "Ce parcours a déjà été affecté. Archive et historique conservés."
                          : deleteAvailability === "unavailable"
                            ? "Impossible de vérifier l’historique des affectations."
                            : undefined
                        }
                    color="error"
                    variant="text"
                    disabled={busy || deleteAvailability !== "allowed"}
                    startIcon={<Trash2 size={17} />}
                    onClick={() => void runAction("delete")}
                  >
                        {deleteAvailability === "checking"
                          ? "Vérification..."
                          : deleteAvailability === "allowed"
                            ? "Supprimer"
                            : "Suppression indisponible"}
                      </Button>
                ) : null}
              </Stack>
            </Box>
          </Box>

          {buildMediaUrl(
            path.coverImageUrl || path.coverImagePath,
          ) ? (
            <CardMedia
              component="img"
              image={
                buildMediaUrl(
                  path.coverImageUrl ||
                    path.coverImagePath,
                ) || undefined
              }
              alt={path.title}
              sx={{
                width: "100%",
                height: {
                  xs: 220,
                  md: 280,
                  lg: 360,
                },
                objectFit: "contain",
                objectPosition: "center",
              }}
            />
          ) : null}
        </Box>
      </Card>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

      {path.status === "DRAFT" && invalidForPublish ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {missingVersionNote
            ? "Ajoutez une note de version avant de publier cette révision."
            : "Pour publier ce parcours, ajoutez au moins une formation et vérifiez que toutes ses formations sont publiées."}
        </Alert>
      ) : null}

      {path.status === "PUBLISHED" && !isLatestPublished ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Cette version V{path.versionNumber || 1} est historique.
          Les nouvelles affectations doivent utiliser la dernière
          version publiée.
        </Alert>
      ) : null}

      <Card
        variant="outlined"
        sx={{
          mb: 2.5,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, value: number) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            minHeight: 54,
            "& .MuiTab-root": {
              minHeight: 54,
              fontWeight: 800,
            },
          }}
        >
          <Tab label="Vue d'ensemble" />
          <Tab label="Affectations" />
          <Tab label="Progression" />
          <Tab label="Versions" />
        </Tabs>
      </Card>

      {tab === 0 ? (
        <>
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
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography
                  variant="overline"
                  color="primary.main"
                  sx={{ fontWeight: 900 }}
                >
                  Présentation
                </Typography>

                <Typography
                  variant="h6"
                  sx={{ fontWeight: 900, mt: 0.25 }}
                >
                  À propos de ce parcours
                </Typography>

                {path.shortDescription ? (
                  <Typography sx={{ fontWeight: 700, mt: 1.5 }}>
                    {path.shortDescription}
                  </Typography>
                ) : null}

                <Typography
                  color="text.secondary"
                  sx={{
                    mt: 1.25,
                    whiteSpace: "pre-line",
                    lineHeight: 1.7,
                  }}
                >
                  {path.description || "Aucune description."}
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography
                  variant="overline"
                  color="primary.main"
                  sx={{ fontWeight: 900 }}
                >
                  Objectifs pédagogiques
                </Typography>

                <Typography
                  variant="h6"
                  sx={{ fontWeight: 900, mt: 0.25 }}
                >
                  Compétences et résultats attendus
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{
                    mt: 1.5,
                    whiteSpace: "pre-line",
                    lineHeight: 1.7,
                  }}
                >
                  {path.objectives || "Aucun objectif renseigné."}
                </Typography>
              </CardContent>
            </Card>
          </Box>

      <Card
        variant="outlined"
        sx={{ mt: 2, borderRadius: 3 }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2} sx={{ justifyContent: "space-between", mb: 2 }}>
            <Box>
              <Typography
                variant="overline"
                color="primary.main"
                sx={{ fontWeight: 900 }}
              >
                Architecture du parcours
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Séquence de formations
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                {stats.required} obligatoire{stats.required > 1 ? "s" : ""} · {stats.optional}{" "}
                facultative{stats.optional > 1 ? "s" : ""}
                {stats.duration > 0
                  ? ` · ${stats.duration} h estimées`
                  : ""}
              </Typography>
            </Box>
          </Stack>

          {steps.length === 0 ? (
            <Alert severity="info">
              Aucune formation dans ce parcours.
            </Alert>
          ) : (
            <Stack spacing={1.25}>
              {steps.map((step) => (
                <Card
                  key={step.id}
                  variant="outlined"
                  sx={{ borderRadius: 2.5 }}
                >
                  <CardContent
                    sx={{
                      display: "flex",
                      alignItems: {
                        xs: "flex-start",
                        md: "center",
                      },
                      flexDirection: {
                        xs: "column",
                        md: "row",
                      },
                      gap: 2,
                      "&:last-child": { pb: 2 },
                    }}
                  >
                    <Chip
                      label={step.position}
                      size="small"
                      color="primary"
                    />

                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 800 }}>
                        {step.trainingTitle ||
                          `Formation #${step.trainingId}`}
                      </Typography>

                      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 0.75 }}>
                        <Chip
                          size="small"
                          label={
                            step.required
                              ? "Obligatoire"
                              : "Facultative"
                          }
                          color={
                            step.required
                              ? "primary"
                              : "default"
                          }
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={trainingStatusLabel(
                            step.trainingStatus,
                          )}
                          variant="outlined"
                        />
                        {step.trainingMissing ? (
                          <Chip
                            size="small"
                            color="error"
                            label="Formation introuvable"
                          />
                        ) : null}
                      </Stack>
                    </Box>

                    {step.estimatedDurationHours ? (
                      <Typography color="text.secondary">
                        {step.estimatedDurationHours} h
                      </Typography>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

        </>
      ) : null}

      {tab === 1 ? (
        <LearningPathAssignmentPanel
          pathId={path.id}
          enabled={path.status === "PUBLISHED"}
          status={path.status}
        />
      ) : null}

      {tab === 2 ? (
        <LearningPathManagerProgressPanel
          pathId={path.id}
          enabled={path.status === "PUBLISHED"}
        />
      ) : null}

      {tab === 3 ? (
        <Card variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{
                justifyContent: "space-between",
                alignItems: { xs: "stretch", md: "center" },
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Historique des versions
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  Une version publiée déjà utilisée reste stable. Les
                  évolutions se font dans une nouvelle version brouillon.
                </Typography>
              </Box>

              {path.status === "PUBLISHED" &&
              !draftVersion &&
              isLatestPublished ? (
                <Button
                  variant="contained"
                  disabled={busy}
                  startIcon={<GitBranch size={17} />}
                  onClick={() => void createVersion()}
                >
                  Créer une nouvelle version
                </Button>
              ) : null}
            </Stack>

            <Stack spacing={1.25}>
              {versions.map((version) => (
                <Card
                  key={version.id}
                  variant="outlined"
                  sx={{
                    borderColor:
                      version.id === path.id
                        ? "primary.main"
                        : "divider",
                  }}
                >
                  <CardContent
                    sx={{
                      display: "flex",
                      gap: 2,
                      alignItems: {
                        xs: "flex-start",
                        md: "center",
                      },
                      flexDirection: {
                        xs: "column",
                        md: "row",
                      },
                      "&:last-child": { pb: 2 },
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        sx={{ flexWrap: "wrap", mb: 0.75 }}
                      >
                        <Chip
                          size="small"
                          label={`V${version.versionNumber || 1}`}
                          color={
                            version.id === path.id
                              ? "primary"
                              : "default"
                          }
                        />
                        <Chip
                          size="small"
                          label={
                            version.status === "DRAFT"
                              ? "Brouillon"
                              : version.status === "PUBLISHED"
                                ? "Publié"
                                : "Archivé"
                          }
                          color={
                            version.status === "PUBLISHED"
                              ? "success"
                              : version.status === "DRAFT"
                                ? "warning"
                                : "default"
                          }
                          variant="outlined"
                        />
                        {version.id === path.id ? (
                          <Chip
                            size="small"
                            label="Version affichée"
                            variant="outlined"
                          />
                        ) : null}
                      </Stack>

                      <Typography sx={{ fontWeight: 800 }}>
                        {version.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 0.75,
                          whiteSpace: "pre-line",
                          lineHeight: 1.55,
                        }}
                      >
                        {(version.versionNumber || 1) === 1
                          ? "Version initiale"
                          : version.versionNote?.trim() ||
                            "Aucune note de version renseignée."}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.75 }}
                      >
                        {version.updatedAt || version.createdAt
                          ? `Mise à jour : ${new Date(
                              version.updatedAt ||
                                version.createdAt ||
                                "",
                            ).toLocaleString("fr-FR")}`
                          : "Date non disponible"}
                      </Typography>
                    </Box>

                    <Button
                      component={Link}
                      to={
                        version.status === "DRAFT"
                          ? `${basePath}/${version.id}/edit`
                          : `${basePath}/${version.id}`
                      }
                      variant={
                        version.status === "DRAFT"
                          ? "contained"
                          : "outlined"
                      }
                    >
                      {version.status === "DRAFT"
                        ? "Modifier"
                        : "Ouvrir"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Box>
  );
}
