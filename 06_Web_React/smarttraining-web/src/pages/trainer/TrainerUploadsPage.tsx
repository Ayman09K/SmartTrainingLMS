import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  BookOpen,
  CheckCircle2,
  Upload,
} from "lucide-react";
import {
  getFullTrainingById,
  getTrainerTrainings,
  uploadLessonDocument,
  uploadLessonImage,
  uploadLessonPdf,
  uploadLessonScorm,
  uploadLessonVideo,
  uploadTrainingCover,
} from "../../api/trainerApi";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import { useAuth } from "../../features/auth/AuthContext";
import type {
  FileUploadResponse,
  FullTrainingResponse,
  ScormUploadResponse,
  TrainingResponse,
} from "../../types/trainer";

type UploadKind =
  | "cover"
  | "image"
  | "pdf"
  | "video"
  | "document"
  | "scorm";

const uploadKindLabels: Record<UploadKind, string> = {
  cover: "Image de couverture",
  image: "Image de le\u00e7on",
  pdf: "Document PDF",
  video: "Vid\u00e9o",
  document: "Document bureautique",
  scorm: "Package SCORM",
};

const uploadKindHelp: Record<UploadKind, string> = {
  cover:
    "Remplacez l'image de couverture de la formation brouillon s\u00e9lectionn\u00e9e.",
  image:
    "Ajoutez une image comme ressource p\u00e9dagogique de la le\u00e7on s\u00e9lectionn\u00e9e.",
  pdf:
    "Ajoutez un document PDF \u00e0 la le\u00e7on s\u00e9lectionn\u00e9e.",
  video:
    "Ajoutez une vid\u00e9o \u00e0 la le\u00e7on s\u00e9lectionn\u00e9e.",
  document:
    "Ajoutez un document bureautique \u00e0 la le\u00e7on s\u00e9lectionn\u00e9e.",
  scorm:
    "Importez un package SCORM ZIP dans la le\u00e7on s\u00e9lectionn\u00e9e.",
};
const uploadKindAccept: Record<UploadKind, string> = {
  cover: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
  image: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
  pdf: "application/pdf,.pdf",
  video: "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov",
  document: ".doc,.docx,.ppt,.pptx,.txt",
  scorm:
    ".zip,application/zip,application/x-zip-compressed,application/octet-stream",
};

function uploadFileValidationError(
  kind: UploadKind,
  file: File,
): string | null {
  const name = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();

  if (kind === "cover" || kind === "image") {
    const validMime = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(mime);
    const validExtension = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
    ].some((extension) => name.endsWith(extension));

    return validMime || validExtension
      ? null
      : "Format invalide. Sélectionnez une image JPG, PNG ou WebP.";
  }

  if (kind === "pdf") {
    return mime === "application/pdf" || name.endsWith(".pdf")
      ? null
      : "Format invalide. Sélectionnez un document PDF.";
  }

  if (kind === "video") {
    const validMime = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ].includes(mime);
    const validExtension = [".mp4", ".webm", ".mov"].some(
      (extension) => name.endsWith(extension),
    );

    return validMime || validExtension
      ? null
      : "Format invalide. Sélectionnez une vidéo MP4, WebM ou MOV.";
  }

  if (kind === "document") {
    return [".doc", ".docx", ".ppt", ".pptx", ".txt"].some(
      (extension) => name.endsWith(extension),
    )
      ? null
      : "Format invalide. Sélectionnez un document DOC, DOCX, PPT, PPTX ou TXT.";
  }

  if (kind === "scorm") {
    return name.endsWith(".zip")
      ? null
      : "Format invalide. Sélectionnez un package SCORM au format ZIP.";
  }

  return "Format de fichier non pris en charge.";
}


export function TrainerUploadsPage() {
  const { user } = useAuth();

  const [trainings, setTrainings] =
    useState<TrainingResponse[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] =
    useState<number>(0);
  const [fullTraining, setFullTraining] =
    useState<FullTrainingResponse | null>(null);
  const [lessonId, setLessonId] = useState<number>(0);
  const [uploadKind, setUploadKind] =
    useState<UploadKind>("pdf");
  const [title, setTitle] = useState("");
  const [durationSeconds, setDurationSeconds] =
    useState("");
  const [file, setFile] = useState<File | null>(null);
  const [lastUpload, setLastUpload] = useState<
    FileUploadResponse | ScormUploadResponse | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function load(trainingId?: number) {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const loadedTrainings = (
        await getTrainerTrainings(user.id)
      ).filter(
        (training) => training.status === "DRAFT",
      );

      setTrainings(loadedTrainings);

      const requestedId =
        trainingId || selectedTrainingId;
      const requestedIsEditable = loadedTrainings.some(
        (training) => training.id === requestedId,
      );
      const currentTrainingId = requestedIsEditable
        ? requestedId
        : loadedTrainings[0]?.id || 0;

      setSelectedTrainingId(currentTrainingId);

      if (currentTrainingId) {
        const full =
          await getFullTrainingById(currentTrainingId);

        setFullTraining(full);
        setLessonId(
          full.modules?.[0]?.lessons?.[0]?.id || 0,
        );
      } else {
        setFullTraining(null);
        setLessonId(0);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user]);

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile = event.currentTarget.files?.[0] || null;

    setError("");
    setLastUpload(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const validationError = uploadFileValidationError(
      uploadKind,
      selectedFile,
    );

    if (validationError) {
      setFile(null);
      event.currentTarget.value = "";
      setError(validationError);
      return;
    }

    setFile(selectedFile);
  }

  async function handleUpload(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedTrainingId) {
      setError(
        "Aucune formation brouillon disponible pour recevoir du contenu.",
      );
      return;
    }

    if (!file) {
      setError("S\u00e9lectionnez un fichier.");
      return;
    }

    const fileValidationError = uploadFileValidationError(
      uploadKind,
      file,
    );

    if (fileValidationError) {
      setError(fileValidationError);
      return;
    }

    if (uploadKind !== "cover" && !lessonId) {
      setError("S\u00e9lectionnez une le\u00e7on.");
      return;
    }

    setUploading(true);
    setError("");
    setLastUpload(null);

    try {
      const options = {
        title,
        uploadedBy: user?.id || 1,
        durationSeconds: durationSeconds
          ? Number(durationSeconds)
          : undefined,
      };

      let response:
        | FileUploadResponse
        | ScormUploadResponse;

      if (uploadKind === "cover") {
        response = await uploadTrainingCover(
          selectedTrainingId,
          file,
        );
      } else if (uploadKind === "image") {
        response = await uploadLessonImage(
          lessonId,
          file,
          options,
        );
      } else if (uploadKind === "pdf") {
        response = await uploadLessonPdf(
          lessonId,
          file,
          options,
        );
      } else if (uploadKind === "video") {
        response = await uploadLessonVideo(
          lessonId,
          file,
          options,
        );
      } else if (uploadKind === "document") {
        response = await uploadLessonDocument(
          lessonId,
          file,
          options,
        );
      } else {
        response = await uploadLessonScorm(
          lessonId,
          file,
          options,
        );
      }

      setLastUpload(response);
      setFile(null);
      setTitle("");
      setDurationSeconds("");
      await load(selectedTrainingId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  const lessons = useMemo(
    () =>
      fullTraining?.modules?.flatMap((module) =>
        (module.lessons || []).map((lesson) => ({
          ...lesson,
          moduleTitle: module.title,
        })),
      ) || [],
    [fullTraining],
  );

  const selectedTraining = useMemo(
    () =>
      trainings.find(
        (training) =>
          training.id === selectedTrainingId,
      ),
    [selectedTrainingId, trainings],
  );

  const selectedLesson = useMemo(
    () =>
      lessons.find(
        (lesson) => lesson.id === lessonId,
      ),
    [lessonId, lessons],
  );

  const moduleCount =
    fullTraining?.modules?.length || 0;
  const lessonCount = lessons.length;

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 360,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Stack
          spacing={1.5}
          sx={{ alignItems: "center" }}
        >
          <CircularProgress size={32} />
          <Typography
            variant="body2"
            color="text.secondary"
          >
            {"Chargement des ressources..."}
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow={"Contenu p\u00e9dagogique"}
        title={"Importer des ressources"}
        description={
          "Ajoutez des images, PDF, vid\u00e9os, documents et packages SCORM aux formations encore en brouillon."
        }
      />

      {error ? (
        <Alert
          severity="error"
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      ) : null}

      {!trainings.length ? (
        <Alert severity="info">
          {
            "Aucune formation brouillon n'est disponible. Cr\u00e9ez ou remettez une formation en brouillon avant d'ajouter du contenu."
          }
        </Alert>
      ) : (
        <>
          <SmartSectionCard
            title={"Formation de destination"}
            description={
              "Les imports sont limit\u00e9s aux formations que vous pouvez encore modifier."
            }
          >
            <Stack spacing={2.5}>
              {trainings.length > 1 ? (
                <TextField
                  select
                  label={"Formation"}
                  value={selectedTrainingId}
                  onChange={(event) =>
                    void load(
                      Number(event.target.value),
                    )
                  }
                  fullWidth
                >
                  {trainings.map((training) => (
                    <MenuItem
                      key={training.id}
                      value={training.id}
                    >
                      {training.title}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}

              {selectedTraining ? (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {"Formation"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.35,
                        fontWeight: 800,
                      }}
                    >
                      {selectedTraining.title}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {"Modules"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.35,
                        fontWeight: 800,
                      }}
                    >
                      {moduleCount}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {"Le\u00e7ons"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 0.35,
                        fontWeight: 800,
                      }}
                    >
                      {lessonCount}
                    </Typography>
                  </Box>
                </Box>
              ) : null}
            </Stack>
          </SmartSectionCard>

          <SmartSectionCard
            title={"Nouvelle ressource"}
            description={
              "Choisissez le type de contenu, sa destination et le fichier \u00e0 importer."
            }
          >
            <Box
              component="form"
              onSubmit={handleUpload}
            >
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md:
                        uploadKind === "cover"
                          ? "1fr"
                          : "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    select
                    label={"Type de ressource"}
                    value={uploadKind}
                    onChange={(event) => {
                    setUploadKind(
                      event.target.value as UploadKind,
                    );
                    setFile(null);
                    setError("");
                    setLastUpload(null);
                  }}
                    fullWidth
                  >
                    <MenuItem value="cover">
                      {"Image de couverture"}
                    </MenuItem>
                    <MenuItem value="image">
                      {"Image de le\u00e7on"}
                    </MenuItem>
                    <MenuItem value="pdf">
                      {"Document PDF"}
                    </MenuItem>
                    <MenuItem value="video">
                      {"Vid\u00e9o"}
                    </MenuItem>
                    <MenuItem value="document">
                      {"Document bureautique"}
                    </MenuItem>
                    <MenuItem value="scorm">
                      {"Package SCORM"}
                    </MenuItem>
                  </TextField>

                  {uploadKind !== "cover" ? (
                    <TextField
                      select
                      label={"Le\u00e7on"}
                      value={lessonId}
                      onChange={(event) =>
                        setLessonId(
                          Number(event.target.value),
                        )
                      }
                      fullWidth
                    >
                      <MenuItem value={0}>
                        {
                          "S\u00e9lectionner une le\u00e7on"
                        }
                      </MenuItem>

                      {lessons.map((lesson) => (
                        <MenuItem
                          key={lesson.id}
                          value={lesson.id}
                        >
                          {`${lesson.moduleTitle} \u2014 ${lesson.title}`}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : null}
                </Box>

                <Alert
                  severity={
                    uploadKind === "scorm"
                      ? "info"
                      : "success"
                  }
                  icon={
                    uploadKind === "scorm" ? (
                      <BookOpen size={20} />
                    ) : undefined
                  }
                >
                  {uploadKindHelp[uploadKind]}
                </Alert>

                <TextField
                  label={"Titre de la ressource"}
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder={
                    uploadKind === "cover"
                      ? "Facultatif pour une couverture"
                      : "Ex. Guide pratique"
                  }
                  fullWidth
                />

                {uploadKind === "video" ? (
                  <TextField
                    label={"Dur\u00e9e en secondes"}
                    type="number"
                    value={durationSeconds}
                    onChange={(event) =>
                      setDurationSeconds(
                        event.target.value,
                      )
                    }
                    slotProps={{
                      htmlInput: {
                        min: 0,
                      },
                    }}
                    fullWidth
                  />
                ) : null}

                <Box
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 2,
                    display: "flex",
                    flexDirection: {
                      xs: "column",
                      sm: "row",
                    },
                    gap: 1.5,
                    alignItems: {
                      xs: "stretch",
                      sm: "center",
                    },
                    justifyContent:
                      "space-between",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 800 }}
                    >
                      {"Fichier \u00e0 importer"}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.35,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {file
                        ? file.name
                        : "Aucun fichier s\u00e9lectionn\u00e9"}
                    </Typography>
                  </Box>

                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<Upload size={17} />}
                    disabled={uploading}
                  >
                    {"Choisir un fichier"}
                    <input
                      hidden
                      type="file"
                        key={uploadKind}
                        accept={uploadKindAccept[uploadKind]}
                      onChange={handleFileChange}
                    />
                  </Button>
                </Box>

                <Divider />

                <Stack
                  direction="row"
                  spacing={1.5}
                  useFlexGap
                  sx={{
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={
                      uploading ? (
                        <CircularProgress
                          size={17}
                          color="inherit"
                        />
                      ) : (
                        <Upload size={17} />
                      )
                    }
                    disabled={
                      uploading ||
                      !selectedTrainingId ||
                      !file ||
                      (uploadKind !== "cover" &&
                        !lessonId)
                    }
                  >
                    {uploading
                      ? "Import en cours..."
                      : "Importer la ressource"}
                  </Button>




                </Stack>
              </Stack>
            </Box>
          </SmartSectionCard>
        </>
      )}

      {lastUpload ? (
        <SmartSectionCard
          title={"Import r\u00e9ussi"}
          description={
            lastUpload.message ||
            "Le fichier a \u00e9t\u00e9 import\u00e9 et la ressource p\u00e9dagogique a \u00e9t\u00e9 cr\u00e9\u00e9e."
          }
        >
          <Stack spacing={2.5}>
            <Alert
              severity="success"
              icon={<CheckCircle2 size={20} />}
            >
              {
                "La ressource est maintenant disponible dans le contenu p\u00e9dagogique de la formation."
              }
            </Alert>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(4, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {"Formation"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.35,
                    fontWeight: 800,
                  }}
                >
                  {selectedTraining?.title ||
                    "Formation s\u00e9lectionn\u00e9e"}
                </Typography>
              </Box>

              {uploadKind !== "cover" ? (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    {"Le\u00e7on"}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.35,
                      fontWeight: 800,
                    }}
                  >
                    {selectedLesson?.title ||
                      "Le\u00e7on s\u00e9lectionn\u00e9e"}
                  </Typography>
                </Box>
              ) : null}

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {"Type"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.35,
                    fontWeight: 800,
                  }}
                >
                  {uploadKindLabels[uploadKind]}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  {"Fichier"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.35,
                    fontWeight: 800,
                    overflowWrap: "anywhere",
                  }}
                >
                  {lastUpload.originalFileName ||
                    "Fichier import\u00e9"}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </SmartSectionCard>
      ) : null}
    </Stack>
  );
}