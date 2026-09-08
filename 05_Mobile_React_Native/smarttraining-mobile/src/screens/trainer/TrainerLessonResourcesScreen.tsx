import * as DocumentPicker from "expo-document-picker";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  createTrainerResource,
  deleteTrainerResource,
  getTrainerFullTraining,
  updateTrainerResource,
  uploadTrainerLessonDocument,
  uploadTrainerLessonImage,
  uploadTrainerLessonPdf,
  uploadTrainerLessonScorm,
  uploadTrainerLessonVideo,
} from "../../features/trainer/trainerAuthoringService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  MobileResourceType,
  MobileStorageMode,
  TrainerFullTrainingResponse,
  TrainerPickedFile,
  TrainerResourceResponse,
} from "../../types/trainerAuthoringMobile";

type Props = {
  trainerId: number;
  trainingId: number;
  lessonId: number;
  onBack: () => void;
};

type ResourceDraft = {
  id?: number;
  type: MobileResourceType;
  title: string;
  description: string;
  orderIndex: string;
  textContent: string;
  url: string;
  durationSeconds: string;
  file: TrainerPickedFile | null;
};

const resourceTypes: {
  value: MobileResourceType;
  label: string;
  help: string;
}[] = [
  {
    value: "TEXT",
    label: "Texte",
    help: "Contenu pédagogique saisi directement.",
  },
  {
    value: "EXTERNAL_LINK",
    label: "Lien",
    help: "Lien HTTP/HTTPS vers une ressource externe.",
  },
  {
    value: "IMAGE",
    label: "Image",
    help: "PNG, JPG, JPEG, WEBP ou GIF.",
  },
  {
    value: "PDF",
    label: "PDF",
    help: "Document PDF.",
  },
  {
    value: "DOCUMENT",
    label: "Document",
    help: "DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, ODT, ODS ou ODP.",
  },
  {
    value: "VIDEO",
    label: "Vidéo",
    help: "Vidéo MP4.",
  },
  {
    value: "SCORM",
    label: "SCORM",
    help: "Package ZIP SCORM. Le manifest est validé par le backend.",
  },
];

const documentExtensions = [
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".txt",
  ".odt",
  ".ods",
  ".odp",
];

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "L’opération n’a pas pu être réalisée.";
}

function labelForType(type?: string): string {
  return (
    resourceTypes.find((item) => item.value === type)
      ?.label ??
    type ??
    "Ressource"
  );
}

function formatSize(size?: number | null): string {
  if (!size || size <= 0) {
    return "Taille non indiquée";
  }

  if (size < 1024) {
    return `${size} o`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} Ko`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

// PATCH16_A8C5L_AUTHORING_CONTENT_CLARITY_V1
function normalizedPedagogicalText(value?: string): string {
  return (value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("fr");
}

function samePedagogicalText(left?: string, right?: string): boolean {
  const normalizedLeft = normalizedPedagogicalText(left);
  return Boolean(
    normalizedLeft && normalizedLeft === normalizedPedagogicalText(right),
  );
}

function storageModeFor(
  type: MobileResourceType,
): "TEXT_CONTENT" | "EXTERNAL_URL" {
  return type === "TEXT"
    ? "TEXT_CONTENT"
    : "EXTERNAL_URL";
}

function canonicalResourceType(
  value?: string,
): MobileResourceType | null {
  return resourceTypes.some(
    (item) => item.value === value,
  )
    ? (value as MobileResourceType)
    : null;
}

function storageModeForResource(
  resource: TrainerResourceResponse,
  type: MobileResourceType,
): MobileStorageMode {
  const current = resource.storageMode;

  if (
    current === "TEXT_CONTENT" ||
    current === "EXTERNAL_URL" ||
    current === "LOCAL_FILE" ||
    current === "SCORM_PACKAGE"
  ) {
    return current;
  }

  if (type === "TEXT") {
    return "TEXT_CONTENT";
  }

  if (type === "EXTERNAL_LINK") {
    return "EXTERNAL_URL";
  }

  if (type === "SCORM") {
    return "SCORM_PACKAGE";
  }

  return "LOCAL_FILE";
}

function resourceOrderRequest(
  resource: TrainerResourceResponse,
  lessonId: number,
  orderIndex: number,
) {
  const type = canonicalResourceType(resource.type);

  if (!type) {
    throw new Error(
      "Ce type de ressource ne peut pas être réordonné depuis le mobile.",
    );
  }

  return {
    lessonId,
    title: resource.title,
    description: resource.description || "",
    type,
    storageMode: storageModeForResource(resource, type),
    url: resource.url,
    textContent: resource.textContent,
    orderIndex,
  };
}

function isEditableJsonResource(
  resource: TrainerResourceResponse,
): boolean {
  return (
    resource.type === "TEXT" ||
    resource.type === "EXTERNAL_LINK"
  );
}

function pickerTypes(
  type: MobileResourceType,
): string | string[] {
  if (type === "IMAGE") {
    return "image/*";
  }

  if (type === "PDF") {
    return "application/pdf";
  }

  if (type === "VIDEO") {
    return "video/mp4";
  }

  if (type === "SCORM") {
    return [
      "application/zip",
      "application/x-zip-compressed",
    ];
  }

  return "*/*";
}

function allowedPickedFile(
  type: MobileResourceType,
  file: TrainerPickedFile,
): boolean {
  const lower = file.name.toLowerCase();
  const mime = (file.mimeType || "").toLowerCase();

  if (type === "IMAGE") {
    return (
      mime.startsWith("image/") ||
      [".png", ".jpg", ".jpeg", ".webp", ".gif"].some(
        (extension) => lower.endsWith(extension),
      )
    );
  }

  if (type === "PDF") {
    return (
      mime === "application/pdf" ||
      lower.endsWith(".pdf")
    );
  }

  if (type === "VIDEO") {
    return (
      mime === "video/mp4" ||
      lower.endsWith(".mp4")
    );
  }

  if (type === "SCORM") {
    return lower.endsWith(".zip");
  }

  if (type === "DOCUMENT") {
    return documentExtensions.some((extension) =>
      lower.endsWith(extension),
    );
  }

  return false;
}

function blankDraft(
  type: MobileResourceType,
  orderIndex: number,
): ResourceDraft {
  return {
    type,
    title: "",
    description: "",
    orderIndex: String(orderIndex),
    textContent: "",
    url: "",
    durationSeconds: "",
    file: null,
  };
}

// MOBILE_RESOURCE_STABLE_EDITOR_INPUT_SAFE_V1
function EditorInput({
  multiline = false,
  large = false,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  multiline?: boolean;
  large?: boolean;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <TextInput
      {...props}
      multiline={multiline}
      placeholderTextColor={
        theme.colors.foregroundSubtle
      }
      style={[
        styles.input,
        multiline && styles.multiline,
        large && styles.largeInput,
        {
          color: theme.colors.foreground,
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border,
          borderRadius:
            theme.shape.controlRadius,
        },
      ]}
    />
  );
}

export default function TrainerLessonResourcesScreen({
  trainerId,
  trainingId,
  lessonId,
  onBack,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [training, setTraining] =
    useState<TrainerFullTrainingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] =
    useState<ResourceDraft | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<TrainerResourceResponse | null>(null);

  const context = useMemo(() => {
    if (!training) {
      return null;
    }

    for (const module of training.modules ?? []) {
      const lesson = (module.lessons ?? []).find(
        (item) => item.id === lessonId,
      );

      if (lesson) {
        return {
          module,
          lesson,
        };
      }
    }

    return null;
  }, [lessonId, training]);

  const resources = useMemo<TrainerResourceResponse[]>(
    () =>
      [...(context?.lesson.resources ?? [])].sort(
        (left, right) =>
          (left.orderIndex ?? 0) -
          (right.orderIndex ?? 0),
      ),
    [context],
  );

  const editable = training?.status === "DRAFT";

  async function load() {
    const loaded = await getTrainerFullTraining(trainingId);

    if (loaded.trainerId !== trainerId) {
      throw new Error(
        "Cette formation n’appartient pas à ce compte formateur.",
      );
    }

    const hasLesson = (loaded.modules ?? []).some(
      (module) =>
        (module.lessons ?? []).some(
          (lesson) => lesson.id === lessonId,
        ),
    );

    if (!hasLesson) {
      throw new Error(
        "La leçon demandée n’appartient pas à cette formation.",
      );
    }

    setTraining(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerFullTraining(trainingId)
      .then((loaded) => {
        if (!active) {
          return;
        }

        if (loaded.trainerId !== trainerId) {
          setError(
            "Cette formation n’appartient pas à ce compte formateur.",
          );
          return;
        }

        const hasLesson = (loaded.modules ?? []).some(
          (module) =>
            (module.lessons ?? []).some(
              (lesson) => lesson.id === lessonId,
            ),
        );

        if (!hasLesson) {
          setError(
            "La leçon demandée n’appartient pas à cette formation.",
          );
          return;
        }

        setTraining(loaded);
      })
      .catch((caught) => {
        if (active) {
          setError(errorText(caught));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [lessonId, trainerId, trainingId]);

  function nextOrder(): number {
    if (resources.length === 0) {
      return 1;
    }

    return (
      Math.max(
        ...resources.map(
          (resource) => resource.orderIndex ?? 0,
        ),
      ) + 1
    );
  }

  function openCreate(type: MobileResourceType) {
    setDraft(blankDraft(type, nextOrder()));
    setError("");
    setNotice("");
    setEditorOpen(true);
  }

  function openEdit(resource: TrainerResourceResponse) {
    if (!isEditableJsonResource(resource)) {
      setError(
        "Pour remplacer un fichier importé, supprimez-le puis importez le nouveau fichier.",
      );
      return;
    }

    const type =
      resource.type === "EXTERNAL_LINK"
        ? "EXTERNAL_LINK"
        : "TEXT";

    setDraft({
      id: resource.id,
      type,
      title: resource.title,
      description: resource.description || "",
      orderIndex: String(resource.orderIndex ?? 1),
      textContent: resource.textContent || "",
      url: resource.url || "",
      durationSeconds: "",
      file: null,
    });

    setError("");
    setNotice("");
    setEditorOpen(true);
  }

  async function pickFile() {
    if (
      !draft ||
      draft.type === "TEXT" ||
      draft.type === "EXTERNAL_LINK"
    ) {
      return;
    }

    setPicking(true);
    setError("");

    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: pickerTypes(draft.type),
          copyToCacheDirectory: true,
          multiple: false,
        });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset) {
        setError("Aucun fichier n’a été sélectionné.");
        return;
      }

      const picked: TrainerPickedFile = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
        webFile: asset.file ?? null,
      };

      if (!allowedPickedFile(draft.type, picked)) {
        setError(
          `Le fichier ${picked.name} n’est pas accepté pour le type ${labelForType(
            draft.type,
          )}.`,
        );
        return;
      }

      setDraft((current) =>
        current
          ? {
              ...current,
              file: picked,
              title:
                current.title.trim() ||
                picked.name.replace(/\.[^.]+$/, ""),
            }
          : current,
      );
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setPicking(false);
    }
  }

  async function saveResource() {
    if (!draft || working || !editable) {
      return;
    }

    const title = draft.title.trim();
    const description = draft.description.trim();
    const orderIndex = Number(draft.orderIndex);

    if (!title) {
      setError("Le titre de la ressource est obligatoire.");
      return;
    }

    if (samePedagogicalText(title, description)) {
      setError(
        "L’introduction de la ressource ne doit pas répéter exactement son titre.",
      );
      return;
    }

    if (
      draft.type === "TEXT" &&
      (samePedagogicalText(draft.textContent, title) ||
        samePedagogicalText(draft.textContent, description))
    ) {
      setError(
        "Le texte complémentaire doit être différent du titre et de l’introduction.",
      );
      return;
    }

    if (!Number.isInteger(orderIndex) || orderIndex <= 0) {
      setError(
        "L’ordre de la ressource doit être un entier positif.",
      );
      return;
    }

    if (
      draft.type === "TEXT" &&
      !draft.textContent.trim()
    ) {
      setError("Le contenu texte est obligatoire.");
      return;
    }

    if (draft.type === "EXTERNAL_LINK") {
      const url = draft.url.trim();

      if (!/^https?:\/\//i.test(url)) {
        setError(
          "Le lien doit commencer par http:// ou https://.",
        );
        return;
      }
    }

    if (
      draft.type !== "TEXT" &&
      draft.type !== "EXTERNAL_LINK" &&
      !draft.file
    ) {
      setError("Sélectionnez le fichier à importer.");
      return;
    }

    const durationSeconds =
      draft.durationSeconds.trim() === ""
        ? undefined
        : Number(draft.durationSeconds);

    if (
      draft.type === "VIDEO" &&
      durationSeconds !== undefined &&
      (
        !Number.isInteger(durationSeconds) ||
        durationSeconds < 0
      )
    ) {
      setError(
        "La durée vidéo doit être un nombre entier positif ou nul.",
      );
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    try {
      if (
        draft.type === "TEXT" ||
        draft.type === "EXTERNAL_LINK"
      ) {
        const request = {
          lessonId,
          title,
          description,
          type: draft.type,
          storageMode: storageModeFor(draft.type),
          url:
            draft.type === "EXTERNAL_LINK"
              ? draft.url.trim()
              : undefined,
          textContent:
            draft.type === "TEXT"
              ? draft.textContent.trim()
              : undefined,
          orderIndex,
        };

        if (draft.id) {
          await updateTrainerResource(
            draft.id,
            request,
          );
          setNotice("Ressource modifiée.");
        } else {
          await createTrainerResource(request);
          setNotice("Ressource créée.");
        }
      } else {
        const file = draft.file;

        if (!file) {
          throw new Error(
            "Le fichier sélectionné est indisponible.",
          );
        }

        const options = {
          title,
          description,
          uploadedBy: trainerId,
          orderIndex,
          durationSeconds:
            draft.type === "VIDEO"
              ? durationSeconds
              : undefined,
        };

        if (draft.type === "IMAGE") {
          await uploadTrainerLessonImage(
            lessonId,
            file,
            options,
          );
        } else if (draft.type === "PDF") {
          await uploadTrainerLessonPdf(
            lessonId,
            file,
            options,
          );
        } else if (draft.type === "VIDEO") {
          await uploadTrainerLessonVideo(
            lessonId,
            file,
            options,
          );
        } else if (draft.type === "DOCUMENT") {
          await uploadTrainerLessonDocument(
            lessonId,
            file,
            options,
          );
        } else {
          await uploadTrainerLessonScorm(
            lessonId,
            file,
            options,
          );
        }

        setNotice(
          draft.type === "SCORM"
            ? "Package SCORM importé."
            : "Fichier importé.",
        );
      }

      setEditorOpen(false);
      setDraft(null);
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setWorking(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || working || !editable) {
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    try {
      await deleteTrainerResource(deleteTarget.id);
      setDeleteTarget(null);
      setNotice("Ressource supprimée.");
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setWorking(false);
    }
  }

  async function moveResource(
    resource: TrainerResourceResponse,
    direction: -1 | 1,
  ) {
    if (!editable || working) {
      return;
    }

    const index = resources.findIndex(
      (item) => item.id === resource.id,
    );
    const target = resources[index + direction];

    if (!target) {
      return;
    }

    const currentOrder =
      resource.orderIndex ?? index + 1;
    const targetOrder =
      target.orderIndex ?? index + direction + 1;

    setWorking(true);
    setError("");
    setNotice("");

    try {
      await Promise.all([
        updateTrainerResource(
          resource.id,
          resourceOrderRequest(
            resource,
            lessonId,
            targetOrder,
          ),
        ),
        updateTrainerResource(
          target.id,
          resourceOrderRequest(
            target,
            lessonId,
            currentOrder,
          ),
        ),
      ]);

      setNotice("Ordre des ressources mis à jour.");
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <LoadingState message="Chargement des ressources..." />
    );
  }

  if (!training || !context) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message={error || "Ressources indisponibles."}
          onRetry={onBack}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <AppButton
            title="Retour au contenu"
            variant="secondary"
            onPress={onBack}
            style={styles.backButton}
          />

          <Text
            style={[
              styles.eyebrow,
              { color: theme.colors.accent },
            ]}
          >
            RESSOURCES PÉDAGOGIQUES
          </Text>

          <Text
            style={[
              styles.title,
              { color: theme.colors.foreground },
            ]}
          >
            {context.lesson.title}
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            {context.module.title} · {training.title}
          </Text>

          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.statusTitle,
                { color: theme.colors.foreground },
              ]}
            >
              {editable
                ? "Leçon modifiable"
                : "Ressources en lecture seule"}
            </Text>

            <Text
              style={[
                styles.statusText,
                {
                  color:
                    theme.colors.foregroundMuted,
                },
              ]}
            >
              {editable
                ? "Ajoutez du texte, des liens, des médias, des documents ou un package SCORM."
                : "Remettez la formation en brouillon avant de modifier les ressources."}
            </Text>
          </View>

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => setError("")}
            />
          ) : null}

          {notice ? (
            <View
              style={[
                styles.notice,
                {
                  backgroundColor:
                    theme.colors.surfaceSoft,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.noticeText,
                  { color: theme.colors.foreground },
                ]}
              >
                {notice}
              </Text>
            </View>
          ) : null}

          {editable ? (
            <>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Ajouter une ressource
              </Text>

              <Text
                style={[
                  styles.sectionHelp,
                  {
                    color:
                      theme.colors.foregroundMuted,
                  },
                ]}
              >
                Choisissez le type. Le package SCORM reste
                validé et extrait côté serveur.
              </Text>

              <View style={styles.typeGrid}>
                {resourceTypes.map((item) => (
                  <Pressable
                    key={item.value}
                    onPress={() =>
                      openCreate(item.value)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Ajouter ${item.label}`}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor:
                          theme.colors.surface,
                        borderColor:
                          theme.colors.border,
                        borderRadius:
                          theme.shape.controlRadius,
                        borderWidth:
                          theme.shape.borderWidth,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeTitle,
                        {
                          color:
                            theme.colors.foreground,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>

                    <Text
                      style={[
                        styles.typeHelp,
                        {
                          color:
                            theme.colors
                              .foregroundMuted,
                        },
                      ]}
                    >
                      {item.help}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <View style={styles.listHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Ressources
            </Text>

            <Text
              style={[
                styles.countText,
                {
                  color:
                    theme.colors.foregroundMuted,
                },
              ]}
            >
              {resources.length}
            </Text>
          </View>

          {resources.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius:
                    theme.shape.cardRadius,
                  borderWidth:
                    theme.shape.borderWidth,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Aucune ressource
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      theme.colors.foregroundMuted,
                  },
                ]}
              >
                Cette leçon ne contient encore aucune
                ressource pédagogique.
              </Text>
            </View>
          ) : (
            resources.map((resource, resourceIndex) => (
              <View
                key={resource.id}
                style={[
                  styles.resourceCard,
                  {
                    backgroundColor:
                      theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius:
                      theme.shape.cardRadius,
                    borderWidth:
                      theme.shape.borderWidth,
                  },
                ]}
              >
                <View style={styles.resourceTop}>
                  <View
                    style={[
                      styles.orderBadge,
                      {
                        backgroundColor:
                          theme.colors.surfaceSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.orderText,
                        {
                          color:
                            theme.colors.accent,
                        },
                      ]}
                    >
                      {resource.orderIndex ?? "-"}
                    </Text>
                  </View>

                  <View style={styles.resourceMain}>
                    <View style={styles.resourceTitleRow}>
                      <Text
                        style={[
                          styles.resourceTitle,
                          {
                            color:
                              theme.colors.foreground,
                          },
                        ]}
                      >
                        {resource.title}
                      </Text>

                      <View
                        style={[
                          styles.typeBadge,
                          {
                            backgroundColor:
                              theme.colors.surfaceSoft,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            {
                              color:
                                theme.colors.accent,
                            },
                          ]}
                        >
                          {labelForType(resource.type)}
                        </Text>
                      </View>
                    </View>

                    {resource.description ? (
                      <Text
                        style={[
                          styles.resourceDescription,
                          {
                            color:
                              theme.colors
                                .foregroundMuted,
                          },
                        ]}
                      >
                        {resource.description}
                      </Text>
                    ) : null}

                    {resource.originalFileName ? (
                      <Text
                        style={[
                          styles.fileMeta,
                          {
                            color:
                              theme.colors
                                .foregroundSubtle,
                          },
                        ]}
                      >
                        {resource.originalFileName} ·{" "}
                        {formatSize(resource.fileSize)}
                      </Text>
                    ) : null}

                    {resource.type === "EXTERNAL_LINK" &&
                    resource.url ? (
                      <Text
                        style={[
                          styles.fileMeta,
                          {
                            color:
                              theme.colors
                                .foregroundSubtle,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {resource.url}
                      </Text>
                    ) : null}

                    {resource.type === "SCORM" ? (
                      <Text
                        style={[
                          styles.fileMeta,
                          {
                            color:
                              theme.colors
                                .foregroundSubtle,
                          },
                        ]}
                      >
                        Package SCORM
                        {resource.scormPackageId
                          ? ` #${resource.scormPackageId}`
                          : ""}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {editable ? (
                  <View style={styles.actions}>
                    <AppButton
                      title="Monter"
                      variant="secondary"
                      disabled={
                        working || resourceIndex === 0
                      }
                      onPress={() =>
                        void moveResource(resource, -1)
                      }
                      style={styles.actionButton}
                    />

                    <AppButton
                      title="Descendre"
                      variant="secondary"
                      disabled={
                        working ||
                        resourceIndex ===
                          resources.length - 1
                      }
                      onPress={() =>
                        void moveResource(resource, 1)
                      }
                      style={styles.actionButton}
                    />

                    {isEditableJsonResource(
                      resource,
                    ) ? (
                      <AppButton
                        title="Modifier"
                        variant="secondary"
                        onPress={() =>
                          openEdit(resource)
                        }
                        style={styles.actionButton}
                      />
                    ) : null}

                    <AppButton
                      title="Supprimer"
                      variant="secondary"
                      onPress={() =>
                        setDeleteTarget(resource)
                      }
                      style={styles.actionButton}
                    />
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={editorOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!working && !picking) {
            setEditorOpen(false);
            setDraft(null);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={
              styles.modalScrollContent
            }
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor:
                    theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                  borderRadius:
                    theme.shape.cardRadius,
                  borderWidth:
                    theme.shape.borderWidth,
                },
              ]}
            >
              {draft ? (
                <>
                  <Text
                    style={[
                      styles.modalEyebrow,
                      {
                        color: theme.colors.accent,
                      },
                    ]}
                  >
                    {labelForType(draft.type).toUpperCase()}
                  </Text>

                  <Text
                    style={[
                      styles.modalTitle,
                      {
                        color:
                          theme.colors.foreground,
                      },
                    ]}
                  >
                    {draft.id
                      ? "Modifier la ressource"
                      : "Nouvelle ressource"}
                  </Text>

                  <Text
                    style={[
                      styles.editorGuide,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    {draft.type === "TEXT"
                      ? "Utilisez ce bloc pour une synthèse, un exemple ou un point à retenir, sans recopier l’explication principale de la leçon."
                      : "Le titre nomme précisément la ressource. L’introduction explique brièvement son utilité avant le média ou le document."}
                  </Text>

                  <FieldLabel text="Titre affiché à l’apprenant" />
                  <EditorInput
                    value={draft.title}
                    onChangeText={(value) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              title: value,
                            }
                          : current,
                      )
                    }
                    placeholder="Ex. Vidéo — les trois réflexes essentiels"
                  />

                  <FieldLabel text="Introduction de la ressource (facultative)" />
                  <EditorInput
                    value={draft.description}
                    onChangeText={(value) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              description: value,
                            }
                          : current,
                      )
                    }
                    placeholder="Expliquez en une phrase pourquoi cette ressource est utile, sans répéter son titre."
                    multiline
                  />

                  {draft.type === "TEXT" ? (
                    <>
                      <FieldLabel text="Texte à retenir ou complément" />
                      <EditorInput
                        value={draft.textContent}
                        onChangeText={(value) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  textContent:
                                    value,
                                }
                              : current,
                          )
                        }
                        placeholder="Ajoutez une synthèse, un exemple ou un point à retenir."
                        multiline
                        large
                      />
                    </>
                  ) : null}

                  {draft.type === "EXTERNAL_LINK" ? (
                    <>
                      <FieldLabel text="Lien HTTP/HTTPS" />
                      <EditorInput
                        value={draft.url}
                        onChangeText={(value) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  url: value,
                                }
                              : current,
                          )
                        }
                        placeholder="https://..."
                        autoCapitalize="none"
                        keyboardType="url"
                      />
                    </>
                  ) : null}

                  {draft.type !== "TEXT" &&
                  draft.type !== "EXTERNAL_LINK" ? (
                    <View
                      style={[
                        styles.filePickerCard,
                        {
                          backgroundColor:
                            theme.colors.surfaceSoft,
                          borderColor:
                            theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filePickerTitle,
                          {
                            color:
                              theme.colors.foreground,
                          },
                        ]}
                      >
                        {draft.file
                          ? draft.file.name
                          : "Aucun fichier sélectionné"}
                      </Text>

                      <Text
                        style={[
                          styles.filePickerMeta,
                          {
                            color:
                              theme.colors
                                .foregroundMuted,
                          },
                        ]}
                      >
                        {draft.file
                          ? `${formatSize(
                              draft.file.size,
                            )}${
                              draft.file.mimeType
                                ? ` · ${draft.file.mimeType}`
                                : ""
                            }`
                          : resourceTypes.find(
                                (item) =>
                                  item.value ===
                                  draft.type,
                              )?.help}
                      </Text>

                      <AppButton
                        title={
                          picking
                            ? "Sélection..."
                            : draft.file
                              ? "Changer le fichier"
                              : "Sélectionner un fichier"
                        }
                        variant="secondary"
                        disabled={picking || working}
                        onPress={() =>
                          void pickFile()
                        }
                        style={styles.pickButton}
                      />
                    </View>
                  ) : null}

                  <FieldLabel text="Ordre" />
                  <EditorInput
                    value={draft.orderIndex}
                    onChangeText={(value) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              orderIndex: value,
                            }
                          : current,
                      )
                    }
                    keyboardType="numeric"
                    placeholder="1"
                  />

                  {draft.type === "VIDEO" ? (
                    <>
                      <FieldLabel text="Durée vidéo en secondes (facultatif)" />
                      <EditorInput
                        value={draft.durationSeconds}
                        onChangeText={(value) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  durationSeconds:
                                    value,
                                }
                              : current,
                          )
                        }
                        keyboardType="numeric"
                        placeholder="Ex. 180"
                      />
                    </>
                  ) : null}

                  {draft.type === "SCORM" ? (
                    <View
                      style={[
                        styles.scormInfo,
                        {
                          backgroundColor:
                            theme.colors.surfaceSoft,
                          borderColor:
                            theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.scormInfoTitle,
                          {
                            color:
                              theme.colors.foreground,
                          },
                        ]}
                      >
                        Validation SCORM côté serveur
                      </Text>

                      <Text
                        style={[
                          styles.scormInfoText,
                          {
                            color:
                              theme.colors
                                .foregroundMuted,
                          },
                        ]}
                      >
                        Le Mobile transmet le ZIP. Le
                        training-service reste responsable
                        de l’extraction, du manifest et de
                        la création de la ressource SCORM.
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.modalActions}>
                    <AppButton
                      title="Annuler"
                      variant="secondary"
                      disabled={working || picking}
                      onPress={() => {
                        setEditorOpen(false);
                        setDraft(null);
                      }}
                      style={styles.modalButton}
                    />

                    <AppButton
                      title={
                        working
                          ? "Enregistrement..."
                          : draft.id
                            ? "Enregistrer"
                            : draft.type === "TEXT" ||
                                draft.type ===
                                  "EXTERNAL_LINK"
                              ? "Créer"
                              : "Importer"
                      }
                      loading={working}
                      disabled={picking}
                      onPress={() =>
                        void saveResource()
                      }
                      style={styles.modalButton}
                    />
                  </View>
                </>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!working) {
            setDeleteTarget(null);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                borderRadius:
                  theme.shape.cardRadius,
                borderWidth:
                  theme.shape.borderWidth,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Supprimer la ressource ?
            </Text>

            <Text
              style={[
                styles.confirmText,
                {
                  color:
                    theme.colors.foregroundMuted,
                },
              ]}
            >
              La suppression est envoyée au backend, qui
              applique les règles d’ownership et
              d’immutabilité de la formation.
            </Text>

            <Text
              style={[
                styles.confirmName,
                { color: theme.colors.foreground },
              ]}
            >
              {deleteTarget?.title}
            </Text>

            <View style={styles.modalActions}>
              <AppButton
                title="Annuler"
                variant="secondary"
                disabled={working}
                onPress={() =>
                  setDeleteTarget(null)
                }
                style={styles.modalButton}
              />

              <AppButton
                title={
                  working
                    ? "Suppression..."
                    : "Supprimer"
                }
                loading={working}
                onPress={() =>
                  void confirmDelete()
                }
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );

  function FieldLabel({
    text,
  }: {
    text: string;
  }) {
    return (
      <Text
        style={[
          styles.label,
          { color: theme.colors.foregroundMuted },
        ]}
      >
        {text}
      </Text>
    );
  }

}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 42,
  },
  page: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 16,
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 15,
    marginBottom: 14,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  statusText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  sectionHelp: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 24,
  },
  typeCard: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 150,
    padding: 13,
  },
  typeTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  typeHelp: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: "800",
  },
  emptyCard: {
    padding: 21,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  resourceCard: {
    padding: 15,
    marginBottom: 11,
  },
  resourceTop: {
    flexDirection: "row",
    gap: 11,
  },
  orderBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  orderText: {
    fontSize: 13,
    fontWeight: "900",
  },
  resourceMain: {
    flex: 1,
    minWidth: 0,
  },
  resourceTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  resourceTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: "900",
  },
  resourceDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  fileMeta: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 6,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    minWidth: 110,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalScroll: {
    width: "100%",
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 680,
    padding: 18,
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 16,
  },
  editorGuide: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 7,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 14,
  },
  multiline: {
    minHeight: 86,
    textAlignVertical: "top",
  },
  largeInput: {
    minHeight: 135,
  },
  filePickerCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    marginBottom: 14,
  },
  filePickerTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  filePickerMeta: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
    marginBottom: 10,
  },
  pickButton: {
    alignSelf: "flex-start",
  },
  scormInfo: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  scormInfoTitle: {
    fontSize: 12,
    fontWeight: "900",
  },
  scormInfoText: {
    fontSize: 10,
    lineHeight: 16,
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 9,
    marginTop: 18,
  },
  modalButton: {
    minWidth: 125,
  },
  confirmText: {
    fontSize: 13,
    lineHeight: 20,
  },
  confirmName: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 12,
  },
});