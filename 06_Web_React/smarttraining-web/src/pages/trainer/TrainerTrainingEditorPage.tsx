import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
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
  ArrowLeft,
  BookOpen,
  ImagePlus,
  Save,
} from "lucide-react";
import {
  createTrainerTraining,
  getFullTrainingById,
  updateTrainerTraining,
  uploadTrainingCover,
} from "../../api/trainerApi";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  importPexelsTrainingCover,
  type PexelsCoverPhoto,
} from "../../api/pexelsCoverApi";
import { getActiveTrainingCategories } from "../../api/trainingCategoryApi";
import { buildMediaUrl } from "../../api/apiConfig";
import {
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import {
  ScormCreationModeSelector,
  ScormQuickCreatePanel,
} from "../../components/training/ScormQuickCreatePanel";
import { TrainingAuthoringNav } from "../../components/training/TrainingAuthoringNav";
import { PexelsCoverPicker } from "../../components/training/PexelsCoverPicker";
import { UnsavedChangesGuard } from "../../components/ux/UnsavedChangesGuard";
import { useAuth } from "../../features/auth/AuthContext";
import type {
  EnrollmentMode,
  FullTrainingResponse,
  TrainingLevel,
  TrainingRequest,
  TrainingVisibility,
} from "../../types/training";
import type { TrainingCategoryResponse } from "../../types/trainingCategory";

type TrainingForm = Omit<TrainingRequest, "trainerId" | "ownerId">;

const emptyForm: TrainingForm = {
  title: "",
  shortDescription: "",
  description: "",
  objectives: "",
  prerequisites: "",
  targetAudience: "",
  category: "",
  language: "fr",
  level: "DEBUTANT",
  estimatedDurationHours: 1,
  status: "DRAFT",
  visibility: "PRIVATE",
  enrollmentMode: "ASSIGNMENT_ONLY",
  accessCode: "",
  maxLearners: 30,
};

const valueLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publi\u00e9e",
  ARCHIVED: "Archiv\u00e9e",
  DEBUTANT: "D\u00e9butant",
  INTERMEDIAIRE: "Interm\u00e9diaire",
  AVANCE: "Avanc\u00e9",
  PRIVATE: "Priv\u00e9e",
  PUBLIC: "Publique",
  ASSIGNED_ONLY: "Affect\u00e9s uniquement",
  ASSIGNMENT_ONLY: "Affectation",
  SELF_ENROLLMENT: "Auto-inscription",
  ACCESS_CODE: "Code d'acc\u00e8s",
  INVITATION: "Invitation",
};

function displayValue(value?: string | null): string {
  if (!value) {
    return "Non renseign\u00e9";
  }

  return valueLabels[value] || value;
}

function statusColor(
  value?: string | null,
): "default" | "success" | "warning" {
  if (value === "PUBLISHED") {
    return "success";
  }

  if (value === "DRAFT") {
    return "warning";
  }

  return "default";
}

function buildShortDescription(
  description: string,
  fallback = "",
): string {
  const normalized = (description || fallback)
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177).trimEnd()}…`;
}

function mapTraining(training: FullTrainingResponse): TrainingForm {
  return {
    title: training.title || "",
    shortDescription: training.shortDescription || "",
    description: training.description || training.shortDescription || "",
    objectives: training.objectives || "",
    prerequisites: training.prerequisites || "",
    targetAudience: training.targetAudience || "",
    category: training.category || "",
    categoryId: training.categoryId,
    language: training.language || "fr",
    coverImageUrl: training.coverImageUrl,
    coverImagePath: training.coverImagePath,
    level: (training.level as TrainingLevel) || "DEBUTANT",
    estimatedDurationHours:
      training.estimatedDurationHours ?? training.durationHours ?? 1,
    status: (training.status as TrainingRequest["status"]) || "DRAFT",
    visibility:
      (training.visibility as TrainingVisibility) || "PRIVATE",
    enrollmentMode:
      (training.enrollmentMode as EnrollmentMode) || "ASSIGNMENT_ONLY",
    accessCode: training.accessCode || "",
    maxLearners: training.maxLearners ?? 30,
  };
}

export function TrainerTrainingEditorPage() {
  const { trainingId: trainingIdParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const creating = !trainingIdParam;
  const trainingId = trainingIdParam ? Number(trainingIdParam) : 0;

  const [training, setTraining] = useState<FullTrainingResponse | null>(null);
  const [form, setForm] = useState<TrainingForm>(emptyForm);
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(
    () => JSON.stringify(emptyForm),
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [selectedPexelsPhoto, setSelectedPexelsPhoto] =
    useState<PexelsCoverPhoto | null>(null);
  const [localCoverPreview, setLocalCoverPreview] = useState("");
  const [loading, setLoading] = useState(!creating);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [categories, setCategories] = useState<TrainingCategoryResponse[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [creationMode, setCreationMode] =
    useState<"MANUAL" | "SCORM">("MANUAL");


  useEffect(() => {
    let cancelled = false;

    setCategoriesLoading(true);

    getActiveTrainingCategories()
      .then((loadedCategories) => {
        if (!cancelled) {
          setCategories(loadedCategories);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);
  const existingCover = useMemo(
    () =>
      buildMediaUrl(
        training?.coverImageUrl ||
          training?.coverImagePath ||
          form.coverImageUrl ||
          form.coverImagePath,
      ),
    [
      training?.coverImageUrl,
      training?.coverImagePath,
      form.coverImageUrl,
      form.coverImagePath,
    ],
  );

  const previewCover =
    selectedPexelsPhoto?.landscapeUrl ||
    selectedPexelsPhoto?.previewUrl ||
    localCoverPreview ||
    existingCover;
  const isDirty =
    JSON.stringify(form) !== savedFormSnapshot || coverFile !== null || selectedPexelsPhoto !== null;

  useEffect(() => {
    if (creating || !user?.id) {
      setLoading(false);
      return;
    }

    if (!Number.isInteger(trainingId) || trainingId <= 0) {
      setError("Formation introuvable.");
      setLoading(false);
      return;
    }

    setLoading(true);

    getFullTrainingById(trainingId)
      .then((loaded) => {
        if (
          user.role === "FORMATEUR" &&
          loaded.trainerId !== user.id
        ) {
          setError(
            "Cette formation n'est pas disponible dans votre espace formateur.",
          );
          return;
        }

        const nextForm = mapTraining(loaded);
        setTraining(loaded);
        setForm(nextForm);
        setSavedFormSnapshot(JSON.stringify(nextForm));
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [creating, trainingId, user?.id, user?.role]);

  useEffect(() => {
    return () => {
      if (localCoverPreview) {
        URL.revokeObjectURL(localCoverPreview);
      }
    };
  }, [localCoverPreview]);


  function updateField<K extends keyof TrainingForm>(
    field: K,
    value: TrainingForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setCoverFile(null);
      setLocalCoverPreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Le fichier de couverture doit \u00eatre une image.");
      event.target.value = "";
      return;
    }

    const preview = URL.createObjectURL(file);

    if (localCoverPreview) {
      URL.revokeObjectURL(localCoverPreview);
    }

    setError("");
    setSelectedPexelsPhoto(null);
    setCoverFile(file);
    setLocalCoverPreview(preview);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user?.id) {
      setError("Votre session formateur est indisponible.");
      return;
    }

    if (!form.title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }

    if (!form.category?.trim()) {
      setError("La cat\u00e9gorie doit \u00eatre renseign\u00e9e.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (creating) {
        const created = await createTrainerTraining(user.id, {
          ...form,
          title: form.title.trim(),
          shortDescription: buildShortDescription(
            form.description || "",
            form.shortDescription || "",
          ),
          description: (form.description || "").trim(),
          category: form.category.trim(),
          status: "DRAFT",
        });

        if (selectedPexelsPhoto) {
          await importPexelsTrainingCover(
            created.id,
            selectedPexelsPhoto.id,
          );
        } else if (coverFile) {
          await uploadTrainingCover(created.id, coverFile);
        }

        setSelectedPexelsPhoto(null);
        setCoverFile(null);
        setLocalCoverPreview("");

        navigate(`/trainer/trainings/${created.id}/edit`, {
          replace: true,
          state: { created: true },
        });

        return;
      }

      if (!training) {
        setError("Formation introuvable.");
        return;
      }

      await updateTrainerTraining(training.id, {
        ...form,
        trainerId: training.trainerId,
        ownerId: training.ownerId ?? user.id,
        title: form.title.trim(),
        shortDescription: buildShortDescription(
          form.description || "",
          form.shortDescription || "",
        ),
        description: (form.description || "").trim(),
        category: form.category.trim(),
      });

      if (selectedPexelsPhoto) {
        await importPexelsTrainingCover(
          training.id,
          selectedPexelsPhoto.id,
        );
      } else if (coverFile) {
        await uploadTrainingCover(training.id, coverFile);
      }

      setSelectedPexelsPhoto(null);
      const refreshed = await getFullTrainingById(training.id);
      const nextForm = mapTraining(refreshed);
      setTraining(refreshed);
      setForm(nextForm);
      setSavedFormSnapshot(JSON.stringify(nextForm));
      setCoverFile(null);
      setLocalCoverPreview("");
      setSuccess("Formation enregistr\u00e9e.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
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
            {"Chargement de la formation..."}
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <UnsavedChangesGuard when={isDirty && !saving} />
      <SmartPageHeader
        eyebrow={creating ? "Nouvelle formation" : "\u00c9dition formation"}
        title={creating ? "Cr\u00e9er une formation" : form.title}
        description={
          "Structurez l'identit\u00e9, le positionnement p\u00e9dagogique et les r\u00e8gles d'acc\u00e8s avant de construire le contenu."
        }
        actions={
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
          >
            <Button
              component={Link}
              to="/trainer/trainings"
              variant="outlined"
              startIcon={<ArrowLeft size={17} />}
            >
              {"Retour aux formations"}
            </Button>

            {!creating && training ? (
              <Button
                component={Link}
                to={`/trainer/trainings/${training.id}/content`}
                variant="contained"
                startIcon={<BookOpen size={17} />}
              >
                {"G\u00e9rer le contenu"}
              </Button>
            ) : null}
          </Stack>
        }
      />

      {!creating && training ? (
        <TrainingAuthoringNav
          context="trainer"
          trainingId={training.id}
          activeStep="overview"
          status={training.status}
        />
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      {creating ? (
        <ScormCreationModeSelector
          mode={creationMode}
          onChange={setCreationMode}
        />
      ) : null}

      {creating && creationMode === "SCORM" ? (
        <ScormQuickCreatePanel
          categories={categories}
          categoriesLoading={categoriesLoading}
          onCreated={(createdTrainingId) =>
            navigate(
              `/trainer/trainings/${createdTrainingId}/edit`,
              {
                replace: true,
                state: { createdFromScorm: true },
              },
            )
          }
        />
      ) : (
      <Box
        component="form"
        onSubmit={save}
        sx={{ display: "grid", gap: 3 }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              xl: "minmax(0, 1.55fr) minmax(320px, 0.65fr)",
            },
            gap: 3,
            alignItems: "start",
          }}
        >
          <Stack spacing={3}>
            <SmartSectionCard
              title={"Identit\u00e9 de la formation"}
              description={
                "Pr\u00e9sentez clairement la formation telle qu'elle appara\u00eetra dans le catalogue et les espaces apprenants."
              }
            >
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
                <TextField
                  label={"Titre"}
                  value={form.title}
                  onChange={(event) =>
                    updateField("title", event.target.value)
                  }
                  required
                  fullWidth
                  sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
                />

                <TextField
                  label={"Description de la formation"}
                  value={form.description || ""}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  helperText={
                    "Le r\u00e9sum\u00e9 affich\u00e9 dans les cartes est g\u00e9n\u00e9r\u00e9 automatiquement."
                  }
                  multiline
                  minRows={4}
                  fullWidth
                  sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
                />

                <TextField
                  select
                  label={"\u0043\u0061\u0074\u00e9\u0067\u006f\u0072\u0069\u0065"}
                  value={form.categoryId ?? ""}
                  onChange={(event) => {
                    const categoryId = Number(event.target.value);
                    const selectedCategory = categories.find(
                      (category) => category.id === categoryId,
                    );

                    setForm((current) => ({
                      ...current,
                      categoryId:
                        Number.isInteger(categoryId) && categoryId > 0
                          ? categoryId
                          : undefined,
                      category: selectedCategory?.name || current.category,
                    }));
                  }}
                  required
                  fullWidth
                  disabled={categoriesLoading}
                >
                  <MenuItem value="">
                    {categoriesLoading
                      ? "Chargement..."
                      : "Choisir une categorie"}
                  </MenuItem>

                  {form.categoryId &&
                  !categories.some(
                    (category) => category.id === form.categoryId,
                  ) ? (
                    <MenuItem value={form.categoryId} disabled>
                      {`${form.category || "Categorie actuelle"} (historique)`}
                    </MenuItem>
                  ) : null}

                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label={"Langue"}
                  value={form.language || ""}
                  onChange={(event) =>
                    updateField("language", event.target.value)
                  }
                  placeholder={"fr"}
                  fullWidth
                />
              </Box>
            </SmartSectionCard>

            <SmartSectionCard
              title={"Positionnement p\u00e9dagogique"}
              description={
                "Pr\u00e9cisez les objectifs, le public vis\u00e9 et les pr\u00e9requis pour cadrer le parcours."
              }
            >
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
                <TextField
                  label={"Objectifs p\u00e9dagogiques"}
                  value={form.objectives || ""}
                  onChange={(event) =>
                    updateField("objectives", event.target.value)
                  }
                  multiline
                  minRows={3}
                  fullWidth
                  sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
                />

                <TextField
                  label={"Pr\u00e9requis"}
                  value={form.prerequisites || ""}
                  onChange={(event) =>
                    updateField("prerequisites", event.target.value)
                  }
                  multiline
                  minRows={3}
                  fullWidth
                />

                <TextField
                  label={"Public cible"}
                  value={form.targetAudience || ""}
                  onChange={(event) =>
                    updateField("targetAudience", event.target.value)
                  }
                  multiline
                  minRows={3}
                  fullWidth
                />

                <TextField
                  select
                  label={"Niveau"}
                  value={form.level || "DEBUTANT"}
                  onChange={(event) =>
                    updateField(
                      "level",
                      event.target.value as TrainingLevel,
                    )
                  }
                  fullWidth
                >
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

                <TextField
                  type="number"
                  label={"Dur\u00e9e estim\u00e9e (heures)"}
                  value={form.estimatedDurationHours ?? 0}
                  onChange={(event) =>
                    updateField(
                      "estimatedDurationHours",
                      Number(event.target.value),
                    )
                  }
                  fullWidth
                  slotProps={{
                    htmlInput: {
                      min: 0,
                      step: 1,
                    },
                  }}
                />
              </Box>
            </SmartSectionCard>

            <SmartSectionCard
              title={"Acc\u00e8s et diffusion"}
              description={
                "D\u00e9finissez comment les participants pourront d\u00e9couvrir et rejoindre cette formation."
              }
            >
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
                <TextField
                  select
                  label={"Visibilit\u00e9"}
                  value={form.visibility || "PRIVATE"}
                  onChange={(event) =>
                    updateField(
                      "visibility",
                      event.target.value as TrainingVisibility,
                    )
                  }
                  fullWidth
                >
                  <MenuItem value="PRIVATE">
                    {"Priv\u00e9e"}
                  </MenuItem>
                  <MenuItem value="PUBLIC">
                    {"Publique"}
                  </MenuItem>
                  <MenuItem value="ASSIGNED_ONLY">
                    {"Affect\u00e9s uniquement"}
                  </MenuItem>
                </TextField>

                <TextField
                  select
                  label={"Mode d'inscription"}
                  value={form.enrollmentMode || "ASSIGNMENT_ONLY"}
                  onChange={(event) =>
                    updateField(
                      "enrollmentMode",
                      event.target.value as EnrollmentMode,
                    )
                  }
                  fullWidth
                >
                  <MenuItem value="ASSIGNMENT_ONLY">
                    {"Affectation"}
                  </MenuItem>
                  <MenuItem value="SELF_ENROLLMENT">
                    {"Auto-inscription"}
                  </MenuItem>
                  <MenuItem value="ACCESS_CODE">
                    {"Code d'acc\u00e8s"}
                  </MenuItem>
                  <MenuItem value="INVITATION">
                    {"Invitation"}
                  </MenuItem>
                </TextField>

                {form.enrollmentMode === "ACCESS_CODE" ? (
                  <TextField
                    label={"Code d'acc\u00e8s"}
                    value={form.accessCode || ""}
                    onChange={(event) =>
                      updateField("accessCode", event.target.value)
                    }
                    fullWidth
                  />
                ) : null}

                <TextField
                  type="number"
                  label={"Nombre maximal de participants"}
                  value={form.maxLearners ?? 0}
                  onChange={(event) =>
                    updateField(
                      "maxLearners",
                      Number(event.target.value),
                    )
                  }
                  fullWidth
                  slotProps={{
                    htmlInput: {
                      min: 0,
                      step: 1,
                    },
                  }}
                />
              </Box>
            </SmartSectionCard>
          </Stack>

          <Stack
            spacing={2.5}
            sx={{
              position: { xl: "sticky" },
              top: { xl: 88 },
            }}
          >
            <Card variant="outlined">
              {previewCover ? (
                <CardMedia
                  component="img"
                  image={previewCover}
                  alt=""
                  sx={{
                    height: 210,
                    objectFit: "contain",
                    bgcolor: "action.hover",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    height: 210,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "action.hover",
                    color: "text.secondary",
                  }}
                >
                  <Stack
                    spacing={1}
                    sx={{
                      alignItems: "center",
                      textAlign: "center",
                      px: 2,
                    }}
                  >
                    <ImagePlus size={40} aria-hidden="true" />
                    <Typography variant="body2">
                      {"Ajoutez une couverture pour identifier la formation."}
                    </Typography>
                  </Stack>
                </Box>
              )}

              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant="h6">
                    {"Couverture"}
                  </Typography>

                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<ImagePlus size={17} />}
                  >
                    {"Choisir une image"}
                    <Box
                      component="input"
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      sx={{
                        clip: "rect(0 0 0 0)",
                        clipPath: "inset(50%)",
                        height: 1,
                        overflow: "hidden",
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        whiteSpace: "nowrap",
                        width: 1,
                      }}
                    />
                  </Button>

                  <PexelsCoverPicker
                    selectedPhoto={selectedPexelsPhoto}
                    initialQuery={form.title}
                    onSelect={(photo) => {
                      if (localCoverPreview) {
                        URL.revokeObjectURL(localCoverPreview);
                      }
                      setCoverFile(null);
                      setLocalCoverPreview("");
                      setSelectedPexelsPhoto(photo);
                      setError("");
                    }}
                  />

                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    {
                      "L'image sera enregistr\u00e9e avec la formation lors de la sauvegarde."
                    }
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card
              id="authoring-publication"
              variant="outlined"
              sx={{ scrollMarginTop: 96 }}
            >
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography variant="h6">
                    {"R\u00e9sum\u00e9"}
                  </Typography>
                  <Divider />

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 1.25,
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {"Statut"}
                    </Typography>
                    <Chip
                      size="small"
                      label={displayValue(form.status || "DRAFT")}
                      color={statusColor(form.status)}
                    />

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {"Niveau"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 800 }}
                    >
                      {displayValue(form.level)}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {"Acc\u00e8s"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 800, textAlign: "right" }}
                    >
                      {displayValue(form.enrollmentMode)}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {"Capacit\u00e9"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 800 }}
                    >
                      {form.maxLearners ?? 0}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>

        <Divider />

        <Stack
          direction={{ xs: "column-reverse", sm: "row" }}
          spacing={1.25}
          sx={{
            justifyContent: "flex-end",
            alignItems: { xs: "stretch", sm: "center" },
          }}
        >
          <Button
            component={Link}
            to="/trainer/trainings"
            variant="outlined"
            disabled={saving}
          >
            {/* WEB_TRAINING_EDITOR_BOTTOM_RETURN_SAFE_V6 */}
            {creating ? "Annuler" : "Retour aux formations"}
          </Button>

          <Button
            type="submit"
            variant="contained"
            startIcon={
              saving ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Save size={17} />
              )
            }
            disabled={saving}
          >
            {saving
              ? "Enregistrement..."
              : creating
                ? "Cr\u00e9er le brouillon"
                : "Enregistrer les modifications"}
          </Button>
        </Stack>
      </Box>
      )}
    </Stack>
  );
}