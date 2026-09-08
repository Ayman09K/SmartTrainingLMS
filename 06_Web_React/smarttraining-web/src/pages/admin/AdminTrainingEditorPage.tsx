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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  ArrowLeft,
  BookOpen,
  ImagePlus,
  Save,
  UserRound,
} from "lucide-react";
import { getAdminUsers } from "../../api/adminApi";
import {
  createTraining,
  getFullTrainingById,
  updateTraining,
  uploadTrainingCover,
} from "../../api/trainingApi";
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
import type { AuthUser } from "../../types/admin";
import type { TrainingCategoryResponse } from "../../types/trainingCategory";
import type {
  EnrollmentMode,
  FullTrainingResponse,
  TrainingLevel,
  TrainingRequest,
  TrainingVisibility,
} from "../../types/training";

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

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publi\u00e9e",
  ARCHIVED: "Archiv\u00e9e",
  DEBUTANT: "D\u00e9butant",
  INTERMEDIAIRE: "Interm\u00e9diaire",
  AVANCE: "Avanc\u00e9",
  ASSIGNMENT_ONLY: "Affectation",
  SELF_ENROLLMENT: "Auto-inscription",
  ACCESS_CODE: "Code d'acc\u00e8s",
  INVITATION: "Invitation",
  PRIVATE: "Priv\u00e9e",
  PUBLIC: "Publique",
  ASSIGNED_ONLY: "Affectation uniquement",
};

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

function userLabel(user: AuthUser): string {
  const name =
    user.fullName ||
    user.name ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

  return name ? `${name} \u2014 ${user.email}` : user.email;
}

function isAssignableTrainer(user: AuthUser): boolean {
  if (user.role !== "FORMATEUR") {
    return false;
  }

  if (user.enabled === false) {
    return false;
  }

  return (
    user.accountStatus !== "DISABLED" &&
    user.accountStatus !== "SUSPENDED"
  );
}

function label(value?: string | null): string {
  if (!value) return "-";
  return statusLabels[value] || value;
}

export function AdminTrainingEditorPage() {
  const { trainingId: trainingIdParam } = useParams();
  const navigate = useNavigate();

  const creating = trainingIdParam === undefined;
  const trainingId = trainingIdParam ? Number(trainingIdParam) : 0;

  const [training, setTraining] = useState<FullTrainingResponse | null>(null);
  const [trainers, setTrainers] = useState<AuthUser[]>([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState<number>(0);
  const [form, setForm] = useState<TrainingForm>(emptyForm);
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(
    () => JSON.stringify({ form: emptyForm, trainerId: 0 }),
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [selectedPexelsPhoto, setSelectedPexelsPhoto] =
    useState<PexelsCoverPhoto | null>(null);
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
  const previewUrl = useMemo(() => {
    if (selectedPexelsPhoto) {
      return (
        selectedPexelsPhoto.landscapeUrl ||
        selectedPexelsPhoto.previewUrl ||
        ""
      );
    }

    if (coverFile) {
      return URL.createObjectURL(coverFile);
    }

    return form.coverImageUrl ? buildMediaUrl(form.coverImageUrl) : "";
  }, [coverFile, form.coverImageUrl, selectedPexelsPhoto]);

  const isDirty =
    JSON.stringify({ form, trainerId: selectedTrainerId }) !== savedFormSnapshot ||
    coverFile !== null || selectedPexelsPhoto !== null;

  useEffect(() => {
    return () => {
      if (coverFile && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [coverFile, previewUrl]);


  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!creating && (!Number.isInteger(trainingId) || trainingId <= 0)) {
        setError("Formation introuvable.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [users, loadedTraining] = await Promise.all([
          getAdminUsers(),
          creating
            ? Promise.resolve<FullTrainingResponse | null>(null)
            : getFullTrainingById(trainingId),
        ]);

        if (cancelled) {
          return;
        }

        const loadedTrainers = users.filter(isAssignableTrainer);
        setTrainers(loadedTrainers);

        if (loadedTraining) {
          const nextForm = mapTraining(loadedTraining);
          setTraining(loadedTraining);
          setForm(nextForm);
          setSelectedTrainerId(loadedTraining.trainerId);
          setSavedFormSnapshot(
            JSON.stringify({ form: nextForm, trainerId: loadedTraining.trainerId }),
          );
        } else if (loadedTrainers.length === 1) {
          const nextTrainerId = loadedTrainers[0].id;
          setSelectedTrainerId(nextTrainerId);
          setSavedFormSnapshot(
            JSON.stringify({ form: emptyForm, trainerId: nextTrainerId }),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [creating, trainingId]);

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
    setSelectedPexelsPhoto(null);
    setCoverFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTrainerId) {
      setError("Choisissez le formateur responsable de la formation.");
      return;
    }

    if (!form.title.trim()) {
      setError("Le titre de la formation est obligatoire.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const request: TrainingRequest = {
        ...form,
        title: form.title.trim(),
        shortDescription: buildShortDescription(
          form.description || "",
          form.shortDescription || "",
        ),
        description: (form.description || "").trim(),
        category: form.category?.trim() || undefined,
        trainerId: selectedTrainerId,
        ownerId: selectedTrainerId,
        status: creating ? "DRAFT" : form.status,
        accessCode:
          form.enrollmentMode === "ACCESS_CODE"
            ? form.accessCode?.trim() || undefined
            : undefined,
      };

      const saved = creating
        ? await createTraining(request)
        : await updateTraining(trainingId, request);

      if (selectedPexelsPhoto) {
        await importPexelsTrainingCover(
          saved.id,
          selectedPexelsPhoto.id,
        );
      } else if (coverFile) {
        await uploadTrainingCover(saved.id, coverFile);
      }

      setSuccess(
        creating
          ? "Formation cr\u00e9\u00e9e en brouillon."
          : "Formation mise \u00e0 jour.",
      );
      setSelectedPexelsPhoto(null);
      setCoverFile(null);

      if (creating) {
        navigate(`/admin/trainings/${saved.id}/edit`, { replace: true });
      } else {
        const refreshed = await getFullTrainingById(saved.id);
        const nextForm = mapTraining(refreshed);
        setTraining(refreshed);
        setForm(nextForm);
        setSelectedTrainerId(refreshed.trainerId);
        setSavedFormSnapshot(
          JSON.stringify({
            form: nextForm,
            trainerId: refreshed.trainerId,
          }),
        );
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: 420, display: "grid", placeItems: "center" }}>
        <Stack
          spacing={1.5}
          sx={{ alignItems: "center", color: "text.secondary" }}
        >
          <CircularProgress size={32} />
          <Typography variant="body2">
            Chargement de la formation...
          </Typography>
        </Stack>
      </Box>
    );
  }

  const currentTrainerMissing =
    selectedTrainerId > 0 &&
    !trainers.some((trainer) => trainer.id === selectedTrainerId);

  return (
    <Box
      component={creating && creationMode === "SCORM" ? "div" : "form"}
      onSubmit={
        creating && creationMode === "SCORM"
          ? undefined
          : handleSubmit
      }
      sx={{ display: "grid", gap: 3 }}
    >
      <SmartPageHeader
        eyebrow="Administration du catalogue"
        title={creating ? "Nouvelle formation" : "Modifier la formation"}
        description="Renseignez l'identité pédagogique, le formateur responsable et les règles d'accès."
        actions={
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Button
              component={Link}
              to="/admin/trainings"
              variant="outlined"
              startIcon={<ArrowLeft size={18} />}
            >
              Retour aux formations
            </Button>

            {!creating && training ? (
              <Button
                component={Link}
                to={`/admin/trainings/${training.id}/content`}
                variant="outlined"
                startIcon={<BookOpen size={18} />}
              >
                Gérer le contenu
              </Button>
            ) : null}
          </Box>
        }
      />

      {!creating && training ? (
        <TrainingAuthoringNav
          context="admin"
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
          adminContext
          onCreated={(createdTrainingId) =>
            navigate(
              `/admin/trainings/${createdTrainingId}/edit`,
              {
                replace: true,
                state: { createdFromScorm: true },
              },
            )
          }
        />
      ) : (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "minmax(0, 1fr) 330px",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Stack spacing={3}>
      <UnsavedChangesGuard when={isDirty && !saving} />
          <SmartSectionCard
            title="Identité de la formation"
            description="Informations présentées dans le catalogue et les espaces apprenants."
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
                label="Titre"
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                required
                fullWidth
                sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
              />

              <TextField
                label="Description de la formation"
                value={form.description || ""}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                helperText="Le résumé affiché dans les cartes est généré automatiquement."
                multiline
                minRows={4}
                fullWidth
                sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
              />

              <TextField
                label="Objectifs pédagogiques"
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
                select
                label="Langue"
                value={form.language || "fr"}
                onChange={(event) =>
                  updateField("language", event.target.value)
                }
                fullWidth
              >
                <MenuItem value="fr">Français</MenuItem>
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="ar">Arabe</MenuItem>
              </TextField>

              <TextField
                label="Prérequis"
                value={form.prerequisites || ""}
                onChange={(event) =>
                  updateField("prerequisites", event.target.value)
                }
                multiline
                minRows={3}
                fullWidth
                sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
              />

              <TextField
                label="Public cible"
                value={form.targetAudience || ""}
                onChange={(event) =>
                  updateField("targetAudience", event.target.value)
                }
                multiline
                minRows={3}
                fullWidth
                sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
              />
            </Box>
          </SmartSectionCard>

          <SmartSectionCard
            title="Paramètres pédagogiques"
            description="Configurez le niveau, la durée estimée et la capacité d'accueil."
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              <TextField
                select
                label="Niveau"
                value={form.level}
                onChange={(event) =>
                  updateField("level", event.target.value as TrainingLevel)
                }
                fullWidth
              >
                <MenuItem value="DEBUTANT">Débutant</MenuItem>
                <MenuItem value="INTERMEDIAIRE">Intermédiaire</MenuItem>
                <MenuItem value="AVANCE">Avancé</MenuItem>
              </TextField>

              <TextField
                type="number"
                label="Durée estimée (heures)"
                value={form.estimatedDurationHours ?? 1}
                onChange={(event) =>
                  updateField(
                    "estimatedDurationHours",
                    Math.max(1, Number(event.target.value) || 1),
                  )
                }
                fullWidth
                slotProps={{
                  htmlInput: {
                    min: 1,
                    step: 1,
                  },
                }}
              />

              <TextField
                type="number"
                label="Participants maximum"
                value={form.maxLearners ?? 30}
                onChange={(event) =>
                  updateField(
                    "maxLearners",
                    Math.max(1, Number(event.target.value) || 1),
                  )
                }
                fullWidth
                slotProps={{
                  htmlInput: {
                    min: 1,
                    step: 1,
                  },
                }}
              />
            </Box>
          </SmartSectionCard>

          <SmartSectionCard
            title="Accès à la formation"
            description="Définissez la visibilité et le mode d'inscription."
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
                label="Visibilité"
                value={form.visibility || "PRIVATE"}
                onChange={(event) =>
                  updateField(
                    "visibility",
                    event.target.value as TrainingVisibility,
                  )
                }
                fullWidth
              >
                <MenuItem value="PRIVATE">Privée</MenuItem>
                <MenuItem value="PUBLIC">Publique</MenuItem>
                <MenuItem value="ASSIGNED_ONLY">
                  Affectation uniquement
                </MenuItem>
              </TextField>

              <TextField
                select
                label="Mode d'inscription"
                value={form.enrollmentMode || "ASSIGNMENT_ONLY"}
                onChange={(event) =>
                  updateField(
                    "enrollmentMode",
                    event.target.value as EnrollmentMode,
                  )
                }
                fullWidth
              >
                <MenuItem value="ASSIGNMENT_ONLY">Affectation</MenuItem>
                <MenuItem value="SELF_ENROLLMENT">Auto-inscription</MenuItem>
                <MenuItem value="ACCESS_CODE">Code d'accès</MenuItem>
                <MenuItem value="INVITATION">Invitation</MenuItem>
              </TextField>

              {form.enrollmentMode === "ACCESS_CODE" ? (
                <TextField
                  label="Code d'accès"
                  value={form.accessCode || ""}
                  onChange={(event) =>
                    updateField("accessCode", event.target.value)
                  }
                  fullWidth
                  sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
                />
              ) : null}
            </Box>
          </SmartSectionCard>

          <SmartSectionCard
            title="Formateur responsable"
            description="Associez la formation à un compte formateur actif."
          >
            <Stack spacing={1.5}>
              <FormControl fullWidth>
                <InputLabel id="admin-training-trainer-label">
                  Formateur
                </InputLabel>
                <Select
                  labelId="admin-training-trainer-label"
                  label="Formateur"
                  value={selectedTrainerId || ""}
                  onChange={(event) =>
                    setSelectedTrainerId(Number(event.target.value) || 0)
                  }
                  required
                >
                  <MenuItem value="">Choisir un formateur</MenuItem>

                  {currentTrainerMissing ? (
                    <MenuItem value={selectedTrainerId}>
                      Formateur actuellement associé
                    </MenuItem>
                  ) : null}

                  {trainers.map((trainer) => (
                    <MenuItem value={trainer.id} key={trainer.id}>
                      {userLabel(trainer)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {!trainers.length ? (
                <Alert severity="warning">
                  Aucun compte formateur actif n'est disponible. Créez ou
                  activez un formateur avant de créer la formation.
                </Alert>
              ) : null}
            </Stack>
          </SmartSectionCard>
        </Stack>

        <Stack spacing={2.5} sx={{ position: { xl: "sticky" }, top: { xl: 88 } }}>
          <Card variant="outlined">
            {previewUrl ? (
              <CardMedia
                component="img"
                image={previewUrl}
                alt=""
                sx={{
                  height: 190,
                  objectFit: "contain",
                  bgcolor: "action.hover",
                }}
              />
            ) : (
              <Box
                sx={{
                  height: 190,
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "action.hover",
                  color: "text.secondary",
                }}
              >
                <Stack spacing={1} sx={{ alignItems: "center" }}>
                  <ImagePlus size={38} />
                  <Typography variant="body2">
                    Aucune couverture
                  </Typography>
                </Stack>
              </Box>
            )}

            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="h6">Couverture</Typography>

                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<ImagePlus size={17} />}
                >
                  Choisir une image
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
                    setCoverFile(null);
                    setSelectedPexelsPhoto(photo);
                    setError("");
                  }}
                />

                <Typography variant="caption" color="text.secondary">
                  L'image sera envoyée après l'enregistrement de la formation.
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
                <Typography variant="h6">Résumé</Typography>
                <Divider />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 1.25,
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Statut
                  </Typography>
                  <Chip
                    size="small"
                    label={label(form.status || "DRAFT")}
                    color={
                      form.status === "PUBLISHED"
                        ? "success"
                        : form.status === "DRAFT"
                          ? "warning"
                          : "default"
                    }
                  />

                  <Typography variant="body2" color="text.secondary">
                    Niveau
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {label(form.level)}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Durée
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {form.estimatedDurationHours ?? 1} h
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Inscription
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 800, textAlign: "right" }}
                  >
                    {label(form.enrollmentMode || "ASSIGNMENT_ONLY")}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Visibilité
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 800, textAlign: "right" }}
                  >
                    {label(form.visibility || "PRIVATE")}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Button
            type="submit"
            variant="contained"
            size="large"
            startIcon={<Save size={18} />}
            disabled={saving || !selectedTrainerId}
            fullWidth
          >
            {saving
              ? "Enregistrement..."
              : creating
                ? "Cr\u00e9er le brouillon"
                : "Enregistrer les modifications"}
          </Button>

          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              color: "text.secondary",
            }}
          >
            <UserRound size={16} />
            <Typography variant="caption">
              Le formateur choisi devient responsable de la formation.
            </Typography>
          </Box>
        </Stack>
      </Box>
      )}
    </Box>
  );
}