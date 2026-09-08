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
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Plus,
  Save,
  Trash2,
  ImagePlus,
} from "lucide-react";
import {
  addLearningPathStep,
  createLearningPath,
  deleteLearningPath,
  getLearningPath,
  getLearningPathGroupAssignments,
  getLearningPathLearnerAssignments,
  getLearningPathSteps,
  removeLearningPathStep,
  reorderLearningPathSteps,
  updateLearningPath,
  updateLearningPathStepRequired,
  uploadLearningPathCover,
} from "../../api/learningPathApi";
import {
  getAdminTrainings,
  getAllTrainings,
} from "../../api/trainingApi";
import { buildMediaUrl } from "../../api/apiConfig";
import { getApiErrorMessage } from "../../api/apiClient";
import { smartConfirm } from "../../components/ux/smartConfirmService";
import { useAuth } from "../../features/auth/AuthContext";
import type {
  LearningPathRequest,
  LearningPathResponse,
  LearningPathStepResponse,
} from "../../types/learningPath";
import type {
  TrainingResponse,
  TrainingVisibility,
} from "../../types/training";

const emptyForm: LearningPathRequest = {
  title: "",
  shortDescription: "",
  description: "",
  objectives: "",
  versionNote: "",
  visibility: "PRIVATE",
};

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

function learningPathStatusLabel(value?: string | null): string {
  if (value === "PUBLISHED") {
    return "Publié";
  }

  if (value === "DRAFT") {
    return "Brouillon";
  }

  if (value === "ARCHIVED") {
    return "Archivé";
  }

  return value || "Statut inconnu";
}

function learningPathVisibilityLabel(value?: string | null): string {
  if (value === "PUBLIC") {
    return "Public";
  }

  if (value === "ASSIGNED_ONLY") {
    return "Affectés uniquement";
  }

  if (value === "PRIVATE") {
    return "Privé";
  }

  return value || "Visibilité inconnue";
}

interface PendingLearningPathStep {
  trainingId: number;
  required: boolean;
}

export function LearningPathEditorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { pathId: pathIdParam } = useParams();

  const creating = !pathIdParam;
  const pathId = pathIdParam ? Number(pathIdParam) : null;

  const basePath = location.pathname.startsWith("/admin")
    ? "/admin/learning-paths"
    : "/trainer/learning-paths";

  const [path, setPath] = useState<LearningPathResponse | null>(null);
  const [form, setForm] = useState<LearningPathRequest>(emptyForm);
  const [steps, setSteps] = useState<LearningPathStepResponse[]>([]);
  const [pendingSteps, setPendingSteps] =
    useState<PendingLearningPathStep[]>([]);
  const [trainings, setTrainings] = useState<TrainingResponse[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [selectedRequired, setSelectedRequired] = useState(true);
  const [hasAssignments, setHasAssignments] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(!creating);
  const [saving, setSaving] = useState(false);
  const [stepBusy, setStepBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const metadataEditable =
    creating ||
    path?.status === "DRAFT" ||
    path?.status === "PUBLISHED";

  const stepsEditable =
    creating ||
    path?.status === "DRAFT" ||
    (path?.status === "PUBLISHED" && !hasAssignments);

  const editable = metadataEditable;

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const loadedTrainings =
          user?.role === "ADMIN"
            ? await getAdminTrainings()
            : await getAllTrainings();

        const manageableTrainings =
          user?.role === "ADMIN"
            ? loadedTrainings
            : loadedTrainings.filter(
                (training) =>
                  training.trainerId === user?.id ||
                  training.ownerId === user?.id,
              );

        if (active) {
          setTrainings(
            manageableTrainings.filter(
              (training) => training.status !== "ARCHIVED",
            ),
          );
        }

        if (!creating && pathId) {
          const [
            loadedPath,
            loadedSteps,
            learnerAssignments,
            groupAssignments,
          ] = await Promise.all([
            getLearningPath(pathId),
            getLearningPathSteps(pathId),
            getLearningPathLearnerAssignments(pathId),
            getLearningPathGroupAssignments(pathId),
          ]);

          if (active) {
            setPath(loadedPath);
            setSteps(loadedSteps);
            setHasAssignments(
              learnerAssignments.length > 0 ||
                groupAssignments.length > 0,
            );
            setForm({
              title: loadedPath.title,
              shortDescription: loadedPath.shortDescription || "",
              description: loadedPath.description || loadedPath.shortDescription || "",
              objectives: loadedPath.objectives || "",
              versionNote: loadedPath.versionNote || "",
              visibility: loadedPath.visibility || "PRIVATE",
            });
          }
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
  }, [
    creating,
    pathId,
    user?.id,
    user?.role,
  ]);

  const selectedIds = useMemo(
    () =>
      new Set([
        ...steps.map((step) => step.trainingId),
        ...pendingSteps.map((step) => step.trainingId),
      ]),
    [pendingSteps, steps],
  );

  const availableTrainings = useMemo(
    () =>
      trainings.filter(
        (training) => !selectedIds.has(training.id),
      ),
    [selectedIds, trainings],
  );

  useEffect(() => {
    if (!coverFile) {
      return;
    }

    const preview = URL.createObjectURL(coverFile);
    setCoverPreview(preview);

    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [coverFile]);

  function currentCoverUrl(): string | null {
    if (coverPreview) {
      return coverPreview;
    }

    return buildMediaUrl(
      path?.coverImageUrl || path?.coverImagePath,
    );
  }

  function updateField<K extends keyof LearningPathRequest>(
    key: K,
    value: LearningPathRequest[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveMetadata() {
    const title = form.title.trim();

    if (!title) {
      setError("Le titre du parcours est obligatoire.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const request: LearningPathRequest = {
      ...form,
      title,
      shortDescription: (form.description?.trim() || "").slice(0, 500),
      description: form.description?.trim() || "",
      objectives: form.objectives?.trim() || "",
      versionNote: form.versionNote?.trim() || null,
    };

    try {
      if (creating) {
        if (pendingSteps.length === 0) {
          setError(
            "Ajoutez au moins une formation avant de créer le parcours.",
          );
          return;
        }

        const created = await createLearningPath(request);

        try {
          for (const pendingStep of pendingSteps) {
            await addLearningPathStep(created.id, pendingStep);
          }

          if (coverFile) {
            await uploadLearningPathCover(
              created.id,
              coverFile,
            );
          }
        } catch (stepError) {
          try {
            await deleteLearningPath(created.id);
          } catch {
            // Best-effort cleanup: original step error remains authoritative.
          }

          throw stepError;
        }

        navigate(`${basePath}/${created.id}`, {
          replace: true,
          state: {
            flash: "Parcours créé avec ses formations.",
          },
        });

        return;
      }

      if (!pathId) {
        return;
      }

      await updateLearningPath(pathId, request);

      if (coverFile) {
        await uploadLearningPathCover(
          pathId,
          coverFile,
        );
      }

      navigate(`${basePath}/${pathId}`, {
        replace: true,
      });

      return;
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const flash = (
      location.state as { flash?: string } | null
    )?.flash;

    if (!flash) {
      return;
    }

    setSuccess(flash);
    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [
    location.pathname,
    location.state,
    navigate,
  ]);

  async function addStep() {
    if (!selectedTrainingId) {
      return;
    }

    const trainingId = Number(selectedTrainingId);

    if (!Number.isInteger(trainingId) || trainingId <= 0) {
      setError("Formation invalide.");
      return;
    }

    if (creating) {
      setPendingSteps((current) => [
        ...current,
        {
          trainingId,
          required: selectedRequired,
        },
      ]);
      setSelectedTrainingId("");
      setSelectedRequired(true);
      setError("");
      return;
    }

    if (!pathId) {
      return;
    }

    setStepBusy(true);
    setError("");
    setSuccess("");

    try {
      await addLearningPathStep(pathId, {
        trainingId,
        required: selectedRequired,
      });

      setSteps(await getLearningPathSteps(pathId));
      setSelectedTrainingId("");
      setSelectedRequired(true);
      setSuccess("Formation ajoutée au parcours.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setStepBusy(false);
    }
  }

  function changePendingRequired(
    index: number,
    required: boolean,
  ) {
    setPendingSteps((current) =>
      current.map((step, currentIndex) =>
        currentIndex === index
          ? { ...step, required }
          : step,
      ),
    );
  }

  function removePendingStep(index: number) {
    setPendingSteps((current) =>
      current.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    );
  }

  function movePendingStep(
    index: number,
    direction: -1 | 1,
  ) {
    setPendingSteps((current) => {
      const nextIndex = index + direction;

      if (
        nextIndex < 0 ||
        nextIndex >= current.length
      ) {
        return current;
      }

      const ordered = [...current];
      const selected = ordered[index];
      ordered[index] = ordered[nextIndex];
      ordered[nextIndex] = selected;

      return ordered;
    });
  }

  async function changeRequired(
    step: LearningPathStepResponse,
    required: boolean,
  ) {
    if (!pathId) {
      return;
    }

    setStepBusy(true);
    setError("");

    try {
      await updateLearningPathStepRequired(
        pathId,
        step.id,
        { required },
      );

      setSteps(await getLearningPathSteps(pathId));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setStepBusy(false);
    }
  }

  async function removeStep(step: LearningPathStepResponse) {
    if (!pathId) {
      return;
    }

    const confirmed = await smartConfirm({
      title: "Retirer la formation du parcours",
      description: `Retirer « ${step.trainingTitle || `Formation #${step.trainingId}`} » du parcours ?`,
      confirmLabel: "Retirer",
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    setStepBusy(true);
    setError("");

    try {
      await removeLearningPathStep(pathId, step.id);
      setSteps(await getLearningPathSteps(pathId));
      setSuccess("Formation retirée du parcours.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setStepBusy(false);
    }
  }

  async function moveStep(index: number, direction: -1 | 1) {
    if (!pathId) {
      return;
    }

    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= steps.length) {
      return;
    }

    const ordered = [...steps];
    const current = ordered[index];
    ordered[index] = ordered[nextIndex];
    ordered[nextIndex] = current;

    setStepBusy(true);
    setError("");

    try {
      const reordered = await reorderLearningPathSteps(
        pathId,
        {
          stepIds: ordered.map((step) => step.id),
        },
      );

      setSteps(reordered);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setStepBusy(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2} sx={{ justifyContent: "space-between", alignItems: {xs: "stretch", md: "center"}, mb: 3 }}>
        <Box>
          <Button
            component={Link}
            to={basePath}
            startIcon={<ArrowLeft size={17} />}
            sx={{ mb: 1 }}
          >
            Retour aux parcours
          </Button>

          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {creating ? "Créer un parcours" : "Modifier le parcours"}
          </Typography>

          {!creating && path ? (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip label={learningPathStatusLabel(path.status)} size="small" />
              <Chip
                label={learningPathVisibilityLabel(path.visibility)}
                size="small"
                variant="outlined"
              />
            </Stack>
          ) : null}
        </Box>

        <Button
          variant="contained"
          startIcon={<Save size={18} />}
          disabled={!editable || saving}
          onClick={() => void saveMetadata()}
        >
          {saving
            ? "Enregistrement..."
            : creating
              ? "Créer le parcours"
              : "Enregistrer les modifications"}
        </Button>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {success ? <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert> : null}

      {path?.status === "ARCHIVED" ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Ce parcours est archivé et reste en lecture seule.
        </Alert>
      ) : null}

      {path?.status === "PUBLISHED" && hasAssignments ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Les informations générales restent modifiables. La séquence
          des formations est verrouillée car ce parcours a déjà été
          affecté à des apprenants ou à un groupe.
        </Alert>
      ) : null}

      {path?.status === "PUBLISHED" && !hasAssignments ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Ce parcours est publié mais n'a encore aucune affectation :
          vous pouvez encore ajuster ses informations et sa séquence.
        </Alert>
      ) : null}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            Informations générales
          </Typography>

          <Stack spacing={2}>
            <TextField
              label="Titre"
              required
              value={form.title}
              disabled={!editable}
              slotProps={{ htmlInput: { maxLength: 150 } }}
              onChange={(event) =>
                updateField("title", event.target.value)
              }
            />


            <TextField
              label="Description du parcours"
              multiline
              minRows={4}
              value={form.description || ""}
              disabled={!editable}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
            />

            <TextField
              label="Objectifs"
              multiline
              minRows={3}
              value={form.objectives || ""}
              disabled={!editable}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
              onChange={(event) =>
                updateField("objectives", event.target.value)
              }
            />

            {!creating &&
            path?.status === "DRAFT" &&
            (path.versionNumber || 1) > 1 ? (
              <TextField
                label="Note de version / Changements apportés"
                multiline
                minRows={3}
                value={form.versionNote || ""}
                disabled={!editable}
                required
                slotProps={{
                  htmlInput: { maxLength: 1500 },
                }}
                helperText={`${(form.versionNote || "").length}/1500 · Exemple : ajout d’une formation, nouvel ordre, mise à jour des objectifs. Cette note sera visible dans l’historique des versions.`}
                onChange={(event) =>
                  updateField(
                    "versionNote",
                    event.target.value,
                  )
                }
              />
            ) : null}

            <TextField
              select
              label="Visibilité"
              value={form.visibility || "PRIVATE"}
              disabled={!editable}
              onChange={(event) =>
                updateField(
                  "visibility",
                  event.target.value as TrainingVisibility,
                )
              }
            >
              <MenuItem value="PRIVATE">Privé</MenuItem>
              <MenuItem value="ASSIGNED_ONLY">
                Affectés uniquement
              </MenuItem>
              <MenuItem value="PUBLIC">Public</MenuItem>
            </TextField>

            <Box>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 800, mb: 1 }}
              >
                Identité visuelle du parcours
              </Typography>

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                sx={{ alignItems: { md: "center" } }}
              >
                <Box
                  sx={{
                    width: { xs: "100%", md: 260 },
                    height: 140,
                    borderRadius: 2,
                    overflow: "hidden",
                    bgcolor: "action.hover",
                    border: "1px solid",
                    borderColor: "divider",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {currentCoverUrl() ? (
                    <Box
                      component="img"
                      src={currentCoverUrl() || undefined}
                      alt="Couverture du parcours"
                      sx={{
                        maxWidth: "100%",
                        maxHeight: 140,
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                        display: "block",
                        mx: "auto",
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
                      <ImagePlus size={28} />
                      <Typography variant="caption">
                        Aucune couverture
                      </Typography>
                    </Stack>
                  )}
                </Box>

                <Box>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<ImagePlus size={17} />}
                    disabled={!editable}
                  >
                    {currentCoverUrl()
                      ? "Remplacer la couverture"
                      : "Ajouter une couverture"}
                    <input
                      hidden
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => {
                        const file =
                          event.target.files?.[0] || null;

                        if (file) {
                          setCoverFile(file);
                        }

                        event.currentTarget.value = "";
                      }}
                    />
                  </Button>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    PNG, JPEG ou WebP. La même politique de taille
                    et de sécurité que les couvertures Formation
                    est appliquée.
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Formations du parcours
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            Sélectionnez les formations, indiquez celles qui sont
            obligatoires et définissez leur ordre avant de créer ou
            mettre à jour le parcours.
          </Typography>

          {stepsEditable ? (
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{
                alignItems: {
                  xs: "stretch",
                  md: "center",
                },
                mb: 3,
              }}
            >
              <TextField
                select
                fullWidth
                label="Ajouter une formation existante"
                value={selectedTrainingId}
                onChange={(event) =>
                  setSelectedTrainingId(event.target.value)
                }
              >
                {availableTrainings.length === 0 ? (
                  <MenuItem value="" disabled>
                    Aucune formation disponible
                  </MenuItem>
                ) : (
                  availableTrainings.map((training) => (
                    <MenuItem
                      key={training.id}
                      value={String(training.id)}
                    >
                      {training.title} ·{" "}
                      {trainingStatusLabel(training.status)}
                    </MenuItem>
                  ))
                )}
              </TextField>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedRequired}
                    onChange={(event) =>
                      setSelectedRequired(
                        event.target.checked,
                      )
                    }
                  />
                }
                label="Obligatoire"
              />

              <Button
                variant="contained"
                startIcon={<Plus size={17} />}
                disabled={
                  stepBusy || !selectedTrainingId
                }
                onClick={() => void addStep()}
                sx={{ whiteSpace: "nowrap" }}
              >
                Ajouter
              </Button>
            </Stack>
          ) : null}

          {creating ? (
            pendingSteps.length === 0 ? (
              <Alert severity="info">
                Ajoutez au moins une formation. Le parcours et ses
                formations seront enregistrés ensemble au clic sur
                « Créer le parcours ».
              </Alert>
            ) : (
              <Stack spacing={1.25}>
                {pendingSteps.map((step, index) => {
                  const training = trainings.find(
                    (item) =>
                      item.id === step.trainingId,
                  );

                  return (
                    <Card
                      key={step.trainingId}
                      variant="outlined"
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
                          label={index + 1}
                          size="small"
                          color="primary"
                        />

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800 }}>
                            {training?.title ||
                              "Formation sélectionnée"}
                          </Typography>
                          <Chip
                            size="small"
                            label={trainingStatusLabel(
                              training?.status,
                            )}
                            variant="outlined"
                            sx={{ mt: 0.75 }}
                          />
                        </Box>

                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={step.required}
                              onChange={(event) =>
                                changePendingRequired(
                                  index,
                                  event.target.checked,
                                )
                              }
                            />
                          }
                          label="Obligatoire"
                        />

                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Monter">
                            <span>
                              <IconButton
                                size="small"
                                disabled={index === 0}
                                onClick={() =>
                                  movePendingStep(index, -1)
                                }
                              >
                                <ArrowUp size={18} />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Descendre">
                            <span>
                              <IconButton
                                size="small"
                                disabled={
                                  index ===
                                  pendingSteps.length - 1
                                }
                                onClick={() =>
                                  movePendingStep(index, 1)
                                }
                              >
                                <ArrowDown size={18} />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Retirer">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                removePendingStep(index)
                              }
                            >
                              <Trash2 size={18} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )
          ) : steps.length === 0 ? (
            <Alert severity="warning">
              Le parcours ne contient encore aucune formation.
            </Alert>
          ) : (
            <Stack spacing={1.25}>
              {steps.map((step, index) => (
                <Card
                  key={step.id}
                  variant="outlined"
                  sx={{
                    bgcolor: step.trainingMissing
                      ? "action.hover"
                      : "background.paper",
                  }}
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

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800 }}>
                        {step.trainingTitle ||
                          "Formation indisponible"}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        sx={{ flexWrap: "wrap", mt: 0.75 }}
                      >
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
                            label="Formation introuvable"
                            color="error"
                          />
                        ) : null}
                        {step.estimatedDurationHours ? (
                          <Chip
                            size="small"
                            label={`${step.estimatedDurationHours} h`}
                            variant="outlined"
                          />
                        ) : null}
                      </Stack>
                    </Box>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={Boolean(step.required)}
                          disabled={
                            !stepsEditable || stepBusy
                          }
                          onChange={(event) =>
                            void changeRequired(
                              step,
                              event.target.checked,
                            )
                          }
                        />
                      }
                      label="Obligatoire"
                    />

                    {stepsEditable ? (
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Monter">
                          <span>
                            <IconButton
                              size="small"
                              disabled={
                                stepBusy || index === 0
                              }
                              onClick={() =>
                                void moveStep(index, -1)
                              }
                            >
                              <ArrowUp size={18} />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title="Descendre">
                          <span>
                            <IconButton
                              size="small"
                              disabled={
                                stepBusy ||
                                index === steps.length - 1
                              }
                              onClick={() =>
                                void moveStep(index, 1)
                              }
                            >
                              <ArrowDown size={18} />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title="Retirer">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={stepBusy}
                              onClick={() =>
                                void removeStep(step)
                              }
                            >
                              <Trash2 size={18} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
