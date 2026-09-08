import {
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
  DragEvent,
} from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  analyzeScormQuickCreate,
  confirmScormQuickCreate,
  previewScormQuickCreate,
} from "../../api/scormQuickCreateApi";
import type {
  ScormQuickCreateAnalysisResponse,
  ScormQuickCreateMode,
} from "../../api/scormQuickCreateApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { uploadTrainingCover } from "../../api/trainingApi";
import type {
  EnrollmentMode,
  TrainingLevel,
  TrainingVisibility,
} from "../../types/training";
import type { TrainingCategoryResponse } from "../../types/trainingCategory";

export type TrainingCreationMode = "MANUAL" | "SCORM";

interface CreationModeSelectorProps {
  mode: TrainingCreationMode;
  onChange: (mode: TrainingCreationMode) => void;
}

export function ScormCreationModeSelector({
  mode,
  onChange,
}: CreationModeSelectorProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.25,
        borderRadius: 3,
      }}
    >
      <Stack spacing={1.75}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            Méthode de création
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Créez la formation manuellement ou partez d'un package SCORM existant.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
            },
            gap: 1.25,
          }}
        >
          <Button
            type="button"
            variant={mode === "MANUAL" ? "contained" : "outlined"}
            onClick={() => onChange("MANUAL")}
            sx={{
              minHeight: 54,
              justifyContent: "flex-start",
              textAlign: "left",
            }}
          >
            Créer manuellement
          </Button>

          <Button
            type="button"
            variant={mode === "SCORM" ? "contained" : "outlined"}
            onClick={() => onChange("SCORM")}
            sx={{
              minHeight: 54,
              justifyContent: "flex-start",
              textAlign: "left",
            }}
          >
            Importer un SCORM
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}

interface ScormQuickCreatePanelProps {
  categories: TrainingCategoryResponse[];
  categoriesLoading?: boolean;
  adminContext?: boolean;
  onCreated: (trainingId: number) => void;
}

interface ConfirmFormState {
  title: string;
  shortDescription: string;
  description: string;
  objectives: string;
  prerequisites: string;
  targetAudience: string;
  categoryId: string;
  language: string;
  level: "" | TrainingLevel;
  estimatedDurationHours: string;
  visibility: "" | TrainingVisibility;
  enrollmentMode: "" | EnrollmentMode;
  accessCode: string;
  maxLearners: string;
}

const emptyConfirmForm: ConfirmFormState = {
  title: "",
  shortDescription: "",
  description: "",
  objectives: "",
  prerequisites: "",
  targetAudience: "",
  categoryId: "",
  language: "fr",
  level: "DEBUTANT",
  estimatedDurationHours: "1",
  visibility: "PRIVATE",
  enrollmentMode: "ASSIGNMENT_ONLY",
  accessCode: "",
  maxLearners: "30",
};

function cleanFileTitle(fileName: string): string {
  return fileName
    .replace(/\.zip$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function scormVersionLabel(value: string): string {
  if (value === "SCORM_1_2") {
    return "SCORM 1.2";
  }

  if (value === "SCORM_2004") {
    return "SCORM 2004";
  }

  return value || "Version non déterminée";
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

const COVER_MAX_SIZE_BYTES = 10 * 1024 * 1024;

function isAllowedCoverFile(file: File): boolean {
  const allowedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);
  const lowerName = file.name.toLowerCase();

  return (
    allowedTypes.has(file.type.toLowerCase()) ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".webp")
  );
}

export function ScormQuickCreatePanel({
  categories,
  categoriesLoading = false,
  adminContext = false,
  onCreated,
}: ScormQuickCreatePanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analysis, setAnalysis] =
    useState<ScormQuickCreateAnalysisResponse | null>(null);
  const [mode, setMode] =
    useState<ScormQuickCreateMode>("SAFE");
  const [form, setForm] =
    useState<ConfirmFormState>(emptyConfirmForm);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [coverFile]);

  function updateForm<K extends keyof ConfirmFormState>(
    field: K,
    value: ConfirmFormState[K],
  ) {
    setError("");
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetAnalysis() {
    setAnalysis(null);
    setMode("SAFE");
    setUploadProgress(0);
    setForm(emptyConfirmForm);
    setCoverFile(null);
    setSuccess("");
  }

  function acceptFile(candidate: File | null) {
    setError("");

    if (!candidate) {
      setFile(null);
      resetAnalysis();
      return;
    }

    if (
      !candidate.name.toLocaleLowerCase().endsWith(".zip") ||
      candidate.size <= 0
    ) {
      setFile(null);
      resetAnalysis();
      setError(
        "Sélectionnez un package SCORM valide au format ZIP.",
      );
      return;
    }

    setFile(candidate);
    resetAnalysis();
  }

  function handleFileInput(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    acceptFile(event.target.files?.[0] || null);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    const candidate = event.dataTransfer.files?.[0] || null;
    acceptFile(candidate);
  }

  function handleCoverInput(event: ChangeEvent<HTMLInputElement>) {
    const candidate = event.target.files?.[0] || null;
    event.target.value = "";
    setError("");

    if (!candidate) {
      return;
    }

    if (!isAllowedCoverFile(candidate)) {
      setError("Utilisez une couverture JPEG, PNG ou WebP.");
      return;
    }

    if (candidate.size > COVER_MAX_SIZE_BYTES) {
      setError("La couverture ne doit pas dépasser 10 Mo.");
      return;
    }

    setCoverFile(candidate);
    setSuccess(
      "Couverture prête. Elle sera ajoutée automatiquement à la formation.",
    );
  }

  async function analyze() {
    if (!file) {
      setError("Choisissez d'abord un package SCORM ZIP.");
      return;
    }

    setAnalyzing(true);
    setError("");
    setSuccess("");
    setUploadProgress(0);

    try {
      const analyzed = await analyzeScormQuickCreate(
        file,
        setUploadProgress,
      );

      const previewed = await previewScormQuickCreate(
        analyzed.temporaryImportId,
      );

      if (
        previewed.temporaryImportId !==
          analyzed.temporaryImportId ||
        previewed.checksumSha256 !== analyzed.checksumSha256
      ) {
        throw new Error(
          "La prévisualisation SCORM ne correspond pas à l'analyse.",
        );
      }

      setAnalysis(previewed);
      setMode(
        previewed.structuredAvailable &&
          previewed.proposedMode === "STRUCTURED"
          ? "STRUCTURED"
          : "SAFE",
      );

      setForm({
        ...emptyConfirmForm,
        title:
          previewed.detectedTitle?.trim() ||
          cleanFileTitle(file.name),
      });

      setSuccess(
        "Package analysé. Vérifiez le contenu détecté puis complétez les informations de la formation.",
      );
    } catch (err) {
      setAnalysis(null);
      setMode("SAFE");
      setError(getApiErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  }

  function validateConfirm(): string | null {
    if (!analysis) {
      return "Analysez d'abord le package SCORM.";
    }

    if (!form.title.trim()) {
      return "Le titre de la formation est obligatoire.";
    }

    const categoryId = Number(form.categoryId);

    if (
      !Number.isInteger(categoryId) ||
      categoryId <= 0
    ) {
      return "Choisissez une catégorie.";
    }

    if (!form.language) {
      return "Choisissez la langue.";
    }

    if (!form.level) {
      return "Choisissez le niveau.";
    }

    if (form.estimatedDurationHours === "") {
      return "Renseignez la durée estimée.";
    }

    const duration = Number(form.estimatedDurationHours);

    if (!Number.isFinite(duration) || duration < 0) {
      return "La durée estimée doit être positive ou égale à zéro.";
    }

    if (!form.visibility) {
      return "Choisissez la visibilité.";
    }

    if (!form.enrollmentMode) {
      return "Choisissez le mode d'inscription.";
    }

    if (
      form.enrollmentMode === "ACCESS_CODE" &&
      !form.accessCode.trim()
    ) {
      return "Renseignez le code d'accès.";
    }

    if (form.maxLearners !== "") {
      const maxLearners = Number(form.maxLearners);

      if (
        !Number.isFinite(maxLearners) ||
        maxLearners < 0
      ) {
        return "Le nombre maximal de participants doit être positif ou égal à zéro.";
      }
    }

    return null;
  }

  async function createDraft() {
    const validationError = validateConfirm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!analysis || !form.level || !form.visibility || !form.enrollmentMode) {
      setError("Les informations obligatoires sont incomplètes.");
      return;
    }

    setConfirming(true);
    setError("");
    setSuccess("");

    try {
      const result = await confirmScormQuickCreate(
        analysis.temporaryImportId,
        {
          title: form.title.trim(),
          shortDescription:
            buildShortDescription(
              form.description,
              form.shortDescription,
            ) || undefined,
          description:
            form.description.trim() || undefined,
          objectives:
            form.objectives.trim() || undefined,
          prerequisites:
            form.prerequisites.trim() || undefined,
          targetAudience:
            form.targetAudience.trim() || undefined,
          categoryId: Number(form.categoryId),
          language: form.language,
          level: form.level,
          estimatedDurationHours: Number(
            form.estimatedDurationHours,
          ),
          visibility: form.visibility,
          enrollmentMode: form.enrollmentMode,
          accessCode:
            form.enrollmentMode === "ACCESS_CODE"
              ? form.accessCode.trim()
              : undefined,
          maxLearners:
            form.maxLearners === ""
              ? undefined
              : Number(form.maxLearners),
          mode:
            mode === "STRUCTURED" &&
            analysis.structuredAvailable
              ? "STRUCTURED"
              : "SAFE",
        },
      );

      if (
        !result.trainingId ||
        result.status !== "DRAFT"
      ) {
        throw new Error(
          "SmartTraining n'a pas confirmé la création de la formation.",
        );
      }

      if (coverFile) {
        try {
          await uploadTrainingCover(result.trainingId, coverFile);
        } catch {
          onCreated(result.trainingId);
          return;
        }
      }

      setSuccess("Formation créée.");
      onCreated(result.trainingId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <Alert severity="info">
        Importez le ZIP, vérifiez ce que SmartTraining a détecté,
        ajoutez la couverture puis créez la formation.
      </Alert>

      {adminContext ? (
        <Alert severity="warning">
          Après création, vous pourrez choisir ou confirmer le formateur
          responsable dans l'éditeur.
        </Alert>
      ) : null}

      {error && !analysis ? (
        <Alert
          severity="error"
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      ) : null}

      {success ? (
        <Alert
          severity="success"
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      ) : null}

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                1. Package SCORM
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Déposez un ZIP SCORM 1.2 ou 2004. Aucun contenu n'est créé à cette étape.
              </Typography>
            </Box>

            <Box
              role="button"
              tabIndex={0}
              aria-label="Déposer ou choisir un package SCORM ZIP"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              sx={{
                border: "2px dashed",
                borderColor: dragging
                  ? "primary.main"
                  : "divider",
                bgcolor: dragging
                  ? "action.hover"
                  : "background.default",
                borderRadius: 3,
                minHeight: 150,
                px: 2.5,
                py: 3,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                outline: "none",
                "&:focus-visible": {
                  borderColor: "primary.main",
                  boxShadow: (theme) =>
                    `0 0 0 3px ${theme.palette.action.focus}`,
                },
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={handleFileInput}
                hidden
              />

              <Stack
                spacing={1}
                sx={{
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                  {file
                    ? file.name
                    : "Glissez-déposez votre package SCORM ici"}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {file
                    ? `${(file.size / 1024 / 1024).toFixed(2)} Mo`
                    : "ou cliquez pour sélectionner un fichier ZIP"}
                </Typography>
              </Stack>
            </Box>

            {analyzing || uploadProgress > 0 ? (
              <Stack spacing={0.75}>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  aria-label={`Envoi du package SCORM ${uploadProgress}%`}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {analyzing
                    ? `Envoi et analyse : ${uploadProgress}%`
                    : `Envoi : ${uploadProgress}%`}
                </Typography>
              </Stack>
            ) : null}

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
            >
              <Button
                type="button"
                variant="contained"
                disabled={!file || analyzing || confirming}
                onClick={() => void analyze()}
                startIcon={
                  analyzing ? (
                    <CircularProgress
                      size={16}
                      color="inherit"
                    />
                  ) : undefined
                }
              >
                {analyzing
                  ? "Analyse en cours..."
                  : "Analyser le package"}
              </Button>

              {file ? (
                <Button
                  type="button"
                  variant="outlined"
                  disabled={analyzing || confirming}
                  onClick={() => {
                    setFile(null);
                    resetAnalysis();
                  }}
                >
                  Choisir un autre fichier
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {analysis ? (
        <>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    2. Analyse et prévisualisation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vérifiez simplement le contenu et l’organisation détectés par SmartTraining.
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
                >
                  <Chip
                    label={scormVersionLabel(
                      analysis.scormVersion,
                    )}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`${analysis.scoCount} contenu(s)`}
                    variant="outlined"
                  />
                  <Chip
                    label={`${analysis.itemCount} élément(s)`}
                    variant="outlined"
                  />
                  <Chip
                    label={
                      analysis.structuredAvailable
                        ? "Structure détaillée reconnue"
                        : "Import sécurisé"
                    }
                    color={
                      analysis.structuredAvailable
                        ? "success"
                        : "warning"
                    }
                  />
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Titre détecté
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {analysis.detectedTitle || "Non détecté"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Organisation
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {analysis.organizationTitle || "Non déterminée"}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Fichier
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 800, overflowWrap: "anywhere" }}
                    >
                      {analysis.originalFileName}
                    </Typography>
                  </Box>

                </Box>

                <Divider />

                <Stack spacing={1.25}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                    Structure proposée
                  </Typography>

                  {analysis.preview.map((module, moduleIndex) => (
                    <Paper
                      key={`${module.title}-${moduleIndex}`}
                      variant="outlined"
                      sx={{ p: 1.75, borderRadius: 2.5 }}
                    >
                      <Stack spacing={1}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                          {module.title}
                        </Typography>

                        {module.lessons.map((lesson, lessonIndex) => (
                          <Typography
                            key={`${lesson.title}-${lessonIndex}`}
                            variant="body2"
                            color="text.secondary"
                          >
                            {`${lessonIndex + 1}. ${lesson.title}`}
                          </Typography>
                        ))}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {!analysis.structuredAvailable ? (
            <Alert severity="info">
              La structure détaillée n’est pas assez fiable. SmartTraining
              utilisera automatiquement une organisation sûre et simple,
              sans vous demander de réglage technique.
            </Alert>
          ) : null}

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    3. Finaliser la formation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Vérifiez les informations proposées et complétez ce qui
                    manque avant de créer la formation.
                  </Typography>
                </Box>

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
                    onChange={(event) =>
                      updateForm("title", event.target.value)
                    }
                    required
                    fullWidth
                    sx={{
                      gridColumn: {
                        xs: "auto",
                        md: "1 / -1",
                      },
                    }}
                  />

                  <TextField
                    select
                    label="Catégorie"
                    value={form.categoryId}
                    onChange={(event) =>
                      updateForm(
                        "categoryId",
                        event.target.value,
                      )
                    }
                    required
                    disabled={categoriesLoading}
                    fullWidth
                  >
                    <MenuItem value="">
                      {categoriesLoading
                        ? "Chargement..."
                        : "Choisir une catégorie"}
                    </MenuItem>

                    {categories.map((category) => (
                      <MenuItem
                        key={category.id}
                        value={String(category.id)}
                      >
                        {category.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Langue"
                    value={form.language}
                    onChange={(event) =>
                      updateForm("language", event.target.value)
                    }
                    required
                    fullWidth
                  >
                    <MenuItem value="">
                      Choisir une langue
                    </MenuItem>
                    <MenuItem value="fr">Français</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="ar">Arabe</MenuItem>
                  </TextField>

                  <TextField
                    select
                    label="Niveau"
                    value={form.level}
                    onChange={(event) =>
                      updateForm(
                        "level",
                        event.target.value as TrainingLevel,
                      )
                    }
                    required
                    fullWidth
                  >
                    <MenuItem value="">
                      Choisir un niveau
                    </MenuItem>
                    <MenuItem value="DEBUTANT">Débutant</MenuItem>
                    <MenuItem value="INTERMEDIAIRE">
                      Intermédiaire
                    </MenuItem>
                    <MenuItem value="AVANCE">Avancé</MenuItem>
                  </TextField>

                  <TextField
                    type="number"
                    label="Durée estimée (heures)"
                    value={form.estimatedDurationHours}
                    onChange={(event) =>
                      updateForm(
                        "estimatedDurationHours",
                        event.target.value,
                      )
                    }
                    required
                    fullWidth
                    slotProps={{
                      htmlInput: {
                        min: 0,
                        step: 1,
                      },
                    }}
                  />

                  <TextField
                    select
                    label="Visibilité"
                    value={form.visibility}
                    onChange={(event) =>
                      updateForm(
                        "visibility",
                        event.target.value as TrainingVisibility,
                      )
                    }
                    required
                    fullWidth
                  >
                    <MenuItem value="">
                      Choisir une visibilité
                    </MenuItem>
                    <MenuItem value="PRIVATE">Privée</MenuItem>
                    <MenuItem value="PUBLIC">Publique</MenuItem>
                    <MenuItem value="ASSIGNED_ONLY">
                      Affectés uniquement
                    </MenuItem>
                  </TextField>

                  <TextField
                    select
                    label="Mode d'inscription"
                    value={form.enrollmentMode}
                    onChange={(event) =>
                      updateForm(
                        "enrollmentMode",
                        event.target.value as EnrollmentMode,
                      )
                    }
                    required
                    fullWidth
                  >
                    <MenuItem value="">
                      Choisir un mode d'inscription
                    </MenuItem>
                    <MenuItem value="ASSIGNMENT_ONLY">
                      Affectation
                    </MenuItem>
                    <MenuItem value="SELF_ENROLLMENT">
                      Auto-inscription
                    </MenuItem>
                    <MenuItem value="ACCESS_CODE">
                      Code d'accès
                    </MenuItem>
                    <MenuItem value="INVITATION">
                      Invitation
                    </MenuItem>
                  </TextField>

                  <TextField
                    type="number"
                    label="Participants maximum"
                    value={form.maxLearners}
                    onChange={(event) =>
                      updateForm(
                        "maxLearners",
                        event.target.value,
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

                  {form.enrollmentMode === "ACCESS_CODE" ? (
                    <TextField
                      label="Code d'accès"
                      value={form.accessCode}
                      onChange={(event) =>
                        updateForm(
                          "accessCode",
                          event.target.value,
                        )
                      }
                      required
                      fullWidth
                      sx={{
                        gridColumn: {
                          xs: "auto",
                          md: "1 / -1",
                        },
                      }}
                    />
                  ) : null}

                  <TextField
                    label="Description de la formation"
                    value={form.description}
                    onChange={(event) =>
                      updateForm(
                        "description",
                        event.target.value,
                      )
                    }
                    helperText="Le résumé affiché dans les cartes sera généré automatiquement."
                    multiline
                    minRows={3}
                    fullWidth
                    sx={{
                      gridColumn: {
                        xs: "auto",
                        md: "1 / -1",
                      },
                    }}
                  />

                  <Box
                    sx={{
                      gridColumn: {
                        xs: "auto",
                        md: "1 / -1",
                      },
                    }}
                  >
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        Couverture de la formation
                      </Typography>

                      {coverPreviewUrl ? (
                        <Box
                          component="img"
                          src={coverPreviewUrl}
                          alt="Aperçu de la couverture"
                          sx={{
                            width: "100%",
                            maxHeight: 260,
                            minHeight: 160,
                            objectFit: "contain",
                            bgcolor: "action.hover",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2.5,
                          }}
                        />
                      ) : null}

                      <Button
                        component="label"
                        type="button"
                        variant="outlined"
                        sx={{ alignSelf: "flex-start" }}
                      >
                        {coverFile ? "Remplacer la couverture" : "Choisir une couverture"}
                        <input
                          hidden
                          type="file"
                          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                          onChange={handleCoverInput}
                        />
                      </Button>

                      <Typography variant="caption" color="text.secondary">
                        JPEG, PNG ou WebP · 10 Mo maximum · aperçu sans déformation · format 16:9 conseillé.
                      </Typography>
                    </Stack>
                  </Box>

                  <TextField
                    label="Objectifs pédagogiques"
                    value={form.objectives}
                    onChange={(event) =>
                      updateForm(
                        "objectives",
                        event.target.value,
                      )
                    }
                    multiline
                    minRows={2}
                    fullWidth
                  />

                  <TextField
                    label="Public cible"
                    value={form.targetAudience}
                    onChange={(event) =>
                      updateForm(
                        "targetAudience",
                        event.target.value,
                      )
                    }
                    multiline
                    minRows={2}
                    fullWidth
                  />

                  <TextField
                    label="Prérequis"
                    value={form.prerequisites}
                    onChange={(event) =>
                      updateForm(
                        "prerequisites",
                        event.target.value,
                      )
                    }
                    multiline
                    minRows={2}
                    fullWidth
                    sx={{
                      gridColumn: {
                        xs: "auto",
                        md: "1 / -1",
                      },
                    }}
                  />
                </Box>

                {error && analysis ? (
                  <Alert severity="error">{error}</Alert>
                ) : null}

                <Divider />

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{ justifyContent: "flex-end" }}
                >
                  <Button
                    type="button"
                    variant="outlined"
                    disabled={confirming || analyzing}
                    onClick={() => {
                      setAnalysis(null);
                      setMode("SAFE");
                      setSuccess("");
                      setError("");
                    }}
                  >
                    Revenir à l'analyse
                  </Button>

                  <Button
                    type="button"
                    variant="contained"
                    disabled={confirming || analyzing}
                    onClick={() => void createDraft()}
                    startIcon={
                      confirming ? (
                        <CircularProgress
                          size={16}
                          color="inherit"
                        />
                      ) : undefined
                    }
                  >
                    {confirming
                      ? "Création..."
                      : "Créer la formation"}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </>
      ) : null}
    </Stack>
  );
}
