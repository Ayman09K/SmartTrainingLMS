import * as DocumentPicker from "expo-document-picker";
import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
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
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
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

type SymbolName = ComponentProps<typeof SymbolView>["name"];

type ResourceVisual = {
  icon: SymbolName;
  soft: string;
  color: string;
};

const resourceTypes: {
  value: MobileResourceType;
  label: string;
  help: string;
}[] = [
  {
    value: "PDF",
    label: "Document PDF",
    help: "Supports de cours, guides",
  },
  {
    value: "VIDEO",
    label: "Vidéo",
    help: "Vidéos de formation",
  },
  {
    value: "IMAGE",
    label: "Image",
    help: "Illustrations, schémas",
  },
  {
    value: "DOCUMENT",
    label: "Document",
    help: "Word, PPT, Excel, texte",
  },
  {
    value: "EXTERNAL_LINK",
    label: "Lien externe",
    help: "Sites web, articles",
  },
  {
    value: "SCORM",
    label: "SCORM",
    help: "Contenu e-learning",
  },
  {
    value: "TEXT",
    label: "Texte",
    help: "Contenu textuel simple",
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

function resourceVisual(type?: string): ResourceVisual {
  if (type === "PDF") {
    return {
      icon: {
        ios: "doc.fill",
        android: "picture_as_pdf",
        web: "picture_as_pdf",
      },
      soft: "#FFF0F2",
      color: "#E23D52",
    };
  }

  if (type === "VIDEO") {
    return {
      icon: {
        ios: "play.fill",
        android: "play_arrow",
        web: "play_arrow",
      },
      soft: "#EAF3FF",
      color: "#2F80ED",
    };
  }

  if (type === "IMAGE") {
    return {
      icon: {
        ios: "photo.fill",
        android: "image",
        web: "image",
      },
      soft: "#FFF4E8",
      color: "#F97316",
    };
  }

  if (type === "DOCUMENT") {
    return {
      icon: {
        ios: "doc.text.fill",
        android: "description",
        web: "description",
      },
      soft: "#F1EBFF",
      color: "#7C3AED",
    };
  }

  if (type === "EXTERNAL_LINK") {
    return {
      icon: {
        ios: "link",
        android: "link",
        web: "link",
      },
      soft: "#EAFBF3",
      color: "#10A36A",
    };
  }

  if (type === "SCORM") {
    return {
      icon: {
        ios: "shippingbox.fill",
        android: "inventory_2",
        web: "inventory_2",
      },
      soft: "#E9FAFC",
      color: "#0EA5A8",
    };
  }

  return {
    icon: {
      ios: "text.alignleft",
      android: "notes",
      web: "notes",
    },
    soft: "#EEF1F6",
    color: "#667085",
  };
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "L’opération n’a pas pu être réalisée.";
}

function labelForType(type?: string): string {
  return (
    resourceTypes.find((item) => item.value === type)?.label ??
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

function trainingStatusLabel(value?: string | null): string {
  if (value === "DRAFT") return "Brouillon";
  if (value === "PUBLISHED") return "Publiée";
  if (value === "ARCHIVED") return "Archivée";

  return value || "Statut inconnu";
}

function formatDuration(seconds?: number | null): string | null {
  if (
    seconds === null ||
    seconds === undefined ||
    seconds < 0
  ) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function normalizedPedagogicalText(value?: string): string {
  return (value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("fr");
}

function samePedagogicalText(
  left?: string,
  right?: string,
): boolean {
  const normalizedLeft = normalizedPedagogicalText(left);

  return Boolean(
    normalizedLeft &&
      normalizedLeft === normalizedPedagogicalText(right),
  );
}

function storageModeFor(
  type: MobileResourceType,
): "TEXT_CONTENT" | "EXTERNAL_URL" {
  return type === "TEXT" ? "TEXT_CONTENT" : "EXTERNAL_URL";
}

function canonicalResourceType(
  value?: string,
): MobileResourceType | null {
  return resourceTypes.some((item) => item.value === value)
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

function EditorInput({
  multiline = false,
  large = false,
  ...props
}: ComponentProps<typeof TextInput> & {
  multiline?: boolean;
  large?: boolean;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <TextInput
      {...props}
      multiline={multiline}
      placeholderTextColor={theme.colors.foregroundSubtle}
      className={[
        "mb-4 min-h-[50px] rounded-[15px] border bg-white px-3.5 py-3 text-[13px]",
        multiline ? "min-h-[92px]" : "",
        large ? "min-h-[138px]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        color: theme.colors.foreground,
        borderColor: "#DCE2EA",
        textAlignVertical: multiline ? "top" : "center",
      }}
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

  const [typePickerOpen, setTypePickerOpen] =
    useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] =
    useState<ResourceDraft | null>(null);
  const [actionTarget, setActionTarget] =
    useState<TrainerResourceResponse | null>(null);
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

  const stats = useMemo(() => {
    const fileCount = resources.filter((resource) =>
      [
        "PDF",
        "DOCUMENT",
        "IMAGE",
        "SCORM",
      ].includes(resource.type || ""),
    ).length;

    const videoCount = resources.filter(
      (resource) => resource.type === "VIDEO",
    ).length;

    const linkCount = resources.filter(
      (resource) =>
        resource.type === "EXTERNAL_LINK",
    ).length;

    return {
      total: resources.length,
      files: fileCount,
      videos: videoCount,
      links: linkCount,
    };
  }, [resources]);

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
    setTypePickerOpen(false);
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

    setActionTarget(null);
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
      setError(
        "Le titre de la ressource est obligatoire.",
      );
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
      (samePedagogicalText(
        draft.textContent,
        title,
      ) ||
        samePedagogicalText(
          draft.textContent,
          description,
        ))
    ) {
      setError(
        "Le texte complémentaire doit être différent du titre et de l’introduction.",
      );
      return;
    }

    if (
      !Number.isInteger(orderIndex) ||
      orderIndex <= 0
    ) {
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
      (!Number.isInteger(durationSeconds) ||
        durationSeconds < 0)
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
      setActionTarget(null);
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

      setActionTarget(null);
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
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{
        padding: 0,
        backgroundColor: "#F8F6F3",
      }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-[760px] px-4">
          {/* LESSON CARD */}
          <View
            className="mt-3 overflow-hidden rounded-[20px] px-4 py-3.5"
            style={{
              backgroundColor: "#7C3AED",
              shadowColor: "#7C3AED",
              shadowOffset: {
                width: 0,
                height: 8,
              },
              shadowOpacity: 0.22,
              shadowRadius: 16,
              elevation: 5,
            }}
          >
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: "#8D63F0",
                  opacity: 0.4,
                  transform: [
                    {
                      translateX: 115,
                    },
                  ],
                },
              ]}
            />

            <View className="flex-row items-center">
              <View className="h-[48px] w-[48px] items-center justify-center rounded-[15px] bg-white/15">
                <SymbolView
                  name={{
                    ios: "book.fill",
                    android: "menu_book",
                    web: "menu_book",
                  }}
                  tintColor="#FFFFFF"
                  size={22}
                  weight="bold"
                />
              </View>

              <View className="ml-3 min-w-0 flex-1">
                <Text className="text-[8px] font-black uppercase tracking-[0.8px] text-white/70">
                  Leçon
                </Text>

                <Text className="mt-1 text-[15px] font-black leading-[19px] text-white">
                  {context.lesson.title}
                </Text>

                <Text
                  numberOfLines={2}
                  className="mt-1.5 text-[9px] leading-[13px] text-white/70"
                >
                  {context.module.title} · {training.title}
                </Text>
              </View>

              <View className="ml-2 rounded-[13px] bg-white px-2.5 py-2">
                <Text
                  className="text-[8px] font-black"
                  style={{ color: "#7C3AED" }}
                >
                  {editable
                    ? "Brouillon"
                    : trainingStatusLabel(training.status)}
                </Text>
              </View>
            </View>
          </View>

          {/* STATS */}
          <View
            className="mt-3 flex-row rounded-[17px] border bg-white px-1.5 py-2.5"
            style={{
              borderColor: "#E5E8EE",
              shadowColor: "#0F172A",
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 1,
            }}
          >
            <StatItem
              icon={{
                ios: "square.stack.3d.up.fill",
                android: "layers",
                web: "layers",
              }}
              value={stats.total}
              label="Ressources"
              color="#7C3AED"
              soft="#F1EBFF"
            />

            <StatDivider />

            <StatItem
              icon={{
                ios: "doc.fill",
                android: "description",
                web: "description",
              }}
              value={stats.files}
              label="Fichiers"
              color="#10A36A"
              soft="#EAFBF3"
            />

            <StatDivider />

            <StatItem
              icon={{
                ios: "play.fill",
                android: "play_arrow",
                web: "play_arrow",
              }}
              value={stats.videos}
              label="Vidéos"
              color="#2F80ED"
              soft="#EAF3FF"
            />

            <StatDivider />

            <StatItem
              icon={{
                ios: "link",
                android: "link",
                web: "link",
              }}
              value={stats.links}
              label="Liens"
              color="#0EA5A8"
              soft="#E9FAFC"
            />
          </View>

          {editable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ajouter une ressource"
              onPress={() => setTypePickerOpen(true)}
              android_ripple={{ color: "transparent" }}
              className="mt-4 flex-row items-center justify-center rounded-[16px] px-4 py-3.5"
              style={{
                backgroundColor: "#7C3AED",
                shadowColor: "#7C3AED",
                shadowOffset: {
                  width: 0,
                  height: 5,
                },
                shadowOpacity: 0.2,
                shadowRadius: 10,
                elevation: 4,
              }}
            >
              <SymbolView
                name={{
                  ios: "plus",
                  android: "add",
                  web: "add",
                }}
                tintColor="#FFFFFF"
                size={15}
                weight="bold"
              />

              <Text className="ml-2 text-[11px] font-black text-white">
                Ajouter une ressource
              </Text>
            </Pressable>
          ) : (
            <View
              className="mt-3 flex-row items-center rounded-[15px] border px-3 py-2.5"
              style={{
                backgroundColor: "#FFF9EE",
                borderColor: "#F1DFC0",
              }}
            >
              <SymbolView
                name={{
                  ios: "lock.fill",
                  android: "lock",
                  web: "lock",
                }}
                tintColor="#D97706"
                size={14}
                weight="bold"
              />

              <Text
                className="ml-2 flex-1 text-[9px] leading-[13px]"
                style={{
                  color: theme.colors.foregroundMuted,
                }}
              >
                Remettez la formation en brouillon pour modifier les ressources.
              </Text>
            </View>
          )}

          {error ? (
            <View className="mt-4">
              <ErrorMessage
                message={error}
                onRetry={() => setError("")}
              />
            </View>
          ) : null}

          {notice ? (
            <View
              className="mt-4 flex-row items-center rounded-[16px] border bg-white p-3"
              style={{
                borderColor: "#D6EBE0",
              }}
            >
              <View
                className="h-8 w-8 items-center justify-center rounded-full"
                style={{
                  backgroundColor: "#EAFBF3",
                }}
              >
                <SymbolView
                  name={{
                    ios: "checkmark",
                    android: "check",
                    web: "check",
                  }}
                  tintColor="#10A36A"
                  size={14}
                  weight="bold"
                />
              </View>

              <Text
                className="ml-2.5 flex-1 text-[10px] font-extrabold"
                style={{
                  color: theme.colors.foreground,
                }}
              >
                {notice}
              </Text>
            </View>
          ) : null}

          {/* RESOURCE LIST */}
          <View className="mb-3 mt-5 flex-row items-end">
            <View className="flex-1">
              <Text
                className="text-[17px] font-black"
                style={{
                  color: theme.colors.foreground,
                }}
              >
                Ressources
              </Text>

              <Text
                className="mt-0.5 text-[9px]"
                style={{
                  color: theme.colors.foregroundMuted,
                }}
              >
                {resources.length} ressource
                {resources.length > 1 ? "s" : ""} dans cette leçon
              </Text>
            </View>
          </View>

          {resources.length === 0 ? (
            <View
              className="items-center rounded-[20px] border bg-white px-5 py-8"
              style={{
                borderColor: "#E5E8EE",
              }}
            >
              <View
                className="h-[62px] w-[62px] items-center justify-center rounded-full"
                style={{
                  backgroundColor: "#F1EBFF",
                }}
              >
                <SymbolView
                  name={{
                    ios: "tray.fill",
                    android: "inbox",
                    web: "inbox",
                  }}
                  tintColor="#7C3AED"
                  size={25}
                  weight="bold"
                />
              </View>

              <Text
                className="mt-4 text-[15px] font-black"
                style={{
                  color: theme.colors.foreground,
                }}
              >
                Aucune ressource
              </Text>

              <Text
                className="mt-1.5 text-center text-[9px] leading-[14px]"
                style={{
                  color: theme.colors.foregroundMuted,
                }}
              >
                Cette leçon ne contient encore aucune ressource pédagogique.
              </Text>
            </View>
          ) : (
            resources.map((resource, resourceIndex) => {
              const visual = resourceVisual(resource.type);
              const duration =
                resource.type === "VIDEO"
                  ? formatDuration(
                      resource.durationSeconds,
                    )
                  : null;

              return (
                <View
                  key={resource.id}
                  className="mb-2.5 flex-row items-center rounded-[18px] border bg-white px-3 py-3"
                  style={{
                    borderColor: "#E5E8EE",
                    shadowColor: "#0F172A",
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: 0.035,
                    shadowRadius: 7,
                    elevation: 1,
                  }}
                >
                  <View
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: "#F1F3F7",
                    }}
                  >
                    <Text
                      className="text-[10px] font-black"
                      style={{
                        color: "#475467",
                      }}
                    >
                      {resource.orderIndex ?? "-"}
                    </Text>
                  </View>

                  <View
                    className="ml-2.5 h-10 w-10 items-center justify-center rounded-[12px]"
                    style={{
                      backgroundColor: visual.soft,
                    }}
                  >
                    <SymbolView
                      name={visual.icon}
                      tintColor={visual.color}
                      size={17}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[11px] font-black"
                      style={{
                        color: theme.colors.foreground,
                      }}
                    >
                      {resource.title}
                    </Text>

                    <Text
                      numberOfLines={1}
                      className="mt-1 text-[8px]"
                      style={{
                        color: theme.colors.foregroundMuted,
                      }}
                    >
                      {labelForType(resource.type)}
                      {resource.fileSize
                        ? ` · ${formatSize(
                            resource.fileSize,
                          )}`
                        : ""}
                      {duration ? ` · ${duration}` : ""}
                    </Text>

                    {resource.type === "EXTERNAL_LINK" &&
                    resource.url ? (
                      <Text
                        numberOfLines={1}
                        className="mt-1 text-[7px]"
                        style={{
                          color: visual.color,
                        }}
                      >
                        {resource.url}
                      </Text>
                    ) : null}

                    {resource.type === "SCORM" &&
                    resource.scormPackageId ? (
                      <Text
                        numberOfLines={1}
                        className="mt-1 text-[7px]"
                        style={{
                          color:
                            theme.colors.foregroundSubtle,
                        }}
                      >
                        Package #{resource.scormPackageId}
                      </Text>
                    ) : null}
                  </View>

                  {editable ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Actions pour ${resource.title}`}
                      onPress={() =>
                        setActionTarget(resource)
                      }
                      android_ripple={{
                        color: "transparent",
                      }}
                      className="ml-2 h-9 w-9 items-center justify-center rounded-full"
                    >
                      <SymbolView
                        name={{
                          ios: "ellipsis",
                          android: "more_horiz",
                          web: "more_horiz",
                        }}
                        tintColor="#0F172A"
                        size={18}
                        weight="bold"
                      />
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* TYPE PICKER */}
      <Modal
        visible={typePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setTypePickerOpen(false)
        }
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            android_ripple={{ color: "transparent" }}
            onPress={() =>
              setTypePickerOpen(false)
            }
          />

          <View style={styles.typeSheet}>
            <View className="items-center">
              <View
                className="h-1.5 w-12 rounded-full"
                style={{
                  backgroundColor: "#D7DCE4",
                }}
              />
            </View>

            <View className="mt-4 flex-row items-start">
              <View className="flex-1">
                <Text
                  className="text-[20px] font-black"
                  style={{
                    color: theme.colors.foreground,
                  }}
                >
                  Ajouter une ressource
                </Text>

                <Text
                  className="mt-1 text-[10px]"
                  style={{
                    color: theme.colors.foregroundMuted,
                  }}
                >
                  Choisissez le type de ressource à ajouter
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={() =>
                  setTypePickerOpen(false)
                }
                android_ripple={{
                  color: "transparent",
                }}
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{
                  backgroundColor: "#F1F3F7",
                }}
              >
                <SymbolView
                  name={{
                    ios: "xmark",
                    android: "close",
                    web: "close",
                  }}
                  tintColor="#344054"
                  size={15}
                  weight="bold"
                />
              </Pressable>
            </View>

            <View className="mt-5 flex-row flex-wrap justify-between gap-y-3">
              {resourceTypes.map((item) => {
                const visual = resourceVisual(item.value);
                const fullWidth = item.value === "TEXT";

                return (
                  <Pressable
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Ajouter ${item.label}`}
                    onPress={() =>
                      openCreate(item.value)
                    }
                    android_ripple={{
                      color: "transparent",
                    }}
                    className="rounded-[18px] border bg-white p-3.5"
                    style={{
                      width: fullWidth
                        ? "100%"
                        : "48.5%",
                      borderColor: "#E1E6ED",
                    }}
                  >
                    <View className="flex-row items-center">
                      <View
                        className="h-10 w-10 items-center justify-center rounded-[13px]"
                        style={{
                          backgroundColor: visual.soft,
                        }}
                      >
                        <SymbolView
                          name={visual.icon}
                          tintColor={visual.color}
                          size={17}
                          weight="bold"
                        />
                      </View>

                      <View className="ml-2.5 flex-1">
                        <Text
                          className="text-[10px] font-black"
                          style={{
                            color: theme.colors.foreground,
                          }}
                        >
                          {item.label}
                        </Text>

                        <Text
                          className="mt-1 text-[7px] leading-[11px]"
                          style={{
                            color:
                              theme.colors.foregroundMuted,
                          }}
                        >
                          {item.help}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* EDITOR */}
      <Modal
        visible={editorOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!working && !picking) {
            setEditorOpen(false);
            setDraft(null);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.editorSheet}>
            <View className="items-center">
              <View
                className="h-1.5 w-12 rounded-full"
                style={{
                  backgroundColor: "#D7DCE4",
                }}
              />
            </View>

            <ScrollView
              className="mt-2"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: 18,
              }}
            >
              {draft ? (
                <>
                  <View className="flex-row items-start">
                    <View className="flex-1">
                      <Text
                        className="text-[20px] font-black"
                        style={{
                          color: theme.colors.foreground,
                        }}
                      >
                        {draft.id
                          ? "Modifier la ressource"
                          : "Nouvelle ressource"}
                      </Text>

                      <Text
                        className="mt-1 text-[10px]"
                        style={{
                          color:
                            theme.colors.foregroundMuted,
                        }}
                      >
                        {labelForType(draft.type)}
                      </Text>
                    </View>

                    <View
                      className="h-10 w-10 items-center justify-center rounded-[13px]"
                      style={{
                        backgroundColor:
                          resourceVisual(draft.type).soft,
                      }}
                    >
                      <SymbolView
                        name={
                          resourceVisual(draft.type).icon
                        }
                        tintColor={
                          resourceVisual(draft.type).color
                        }
                        size={17}
                        weight="bold"
                      />
                    </View>
                  </View>

                  <View
                    className="my-5 h-px"
                    style={{
                      backgroundColor: "#E8ECF1",
                    }}
                  />

                  <Text
                    className="mb-3 text-[14px] font-black"
                    style={{
                      color: theme.colors.foreground,
                    }}
                  >
                    Informations de la ressource
                  </Text>

                  <FieldLabel text="Titre" required />
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
                    placeholder="Ex. Introduction au marketing digital"
                  />

                  <FieldLabel text="Description" />
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
                    placeholder="Décrivez brièvement cette ressource..."
                    multiline
                  />

                  {draft.type === "TEXT" ? (
                    <>
                      <FieldLabel
                        text="Contenu texte"
                        required
                      />
                      <EditorInput
                        value={draft.textContent}
                        onChangeText={(value) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  textContent: value,
                                }
                              : current,
                          )
                        }
                        placeholder="Saisissez le contenu pédagogique..."
                        multiline
                        large
                      />
                    </>
                  ) : null}

                  {draft.type === "EXTERNAL_LINK" ? (
                    <>
                      <FieldLabel
                        text="Lien HTTP/HTTPS"
                        required
                      />
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
                    <>
                      <FieldLabel text="Fichier" required />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Sélectionner un fichier"
                        onPress={() =>
                          void pickFile()
                        }
                        disabled={picking || working}
                        android_ripple={{
                          color: "transparent",
                        }}
                        className="mb-4 items-center rounded-[18px] border border-dashed px-4 py-5"
                        style={{
                          borderColor: "#C8D0DC",
                          backgroundColor: "#FBFCFD",
                          opacity:
                            picking || working
                              ? 0.55
                              : 1,
                        }}
                      >
                        <View
                          className="h-10 w-10 items-center justify-center rounded-[13px]"
                          style={{
                            backgroundColor: "#F1EBFF",
                          }}
                        >
                          <SymbolView
                            name={{
                              ios: "arrow.up.doc.fill",
                              android: "upload_file",
                              web: "upload_file",
                            }}
                            tintColor="#7C3AED"
                            size={17}
                            weight="bold"
                          />
                        </View>

                        <Text
                          className="mt-3 text-[10px] font-black"
                          style={{
                            color: theme.colors.foreground,
                          }}
                        >
                          {draft.file
                            ? draft.file.name
                            : "Sélectionner un fichier"}
                        </Text>

                        <Text
                          className="mt-1 text-center text-[8px] leading-[12px]"
                          style={{
                            color:
                              theme.colors.foregroundMuted,
                          }}
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
                      </Pressable>
                    </>
                  ) : null}

                  <FieldLabel text="Ordre" required />
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
                      <FieldLabel text="Durée vidéo en secondes" />
                      <EditorInput
                        value={draft.durationSeconds}
                        onChangeText={(value) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  durationSeconds: value,
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
                      className="mb-4 rounded-[16px] border p-3.5"
                      style={{
                        backgroundColor: "#F8F5FF",
                        borderColor: "#E3DAF7",
                      }}
                    >
                      <Text
                        className="text-[10px] font-black"
                        style={{ color: "#6D28D9" }}
                      >
                        Validation SCORM côté serveur
                      </Text>

                      <Text
                        className="mt-1.5 text-[8px] leading-[13px]"
                        style={{
                          color:
                            theme.colors.foregroundMuted,
                        }}
                      >
                        Le ZIP est transmis au training-service qui valide le manifest et crée la ressource SCORM.
                      </Text>
                    </View>
                  ) : null}

                  {error ? (
                    <View className="mb-4">
                      <ErrorMessage message={error} />
                    </View>
                  ) : null}

                  <View className="flex-row gap-3">
                    <AppButton
                      title="Annuler"
                      variant="secondary"
                      disabled={working || picking}
                      onPress={() => {
                        setEditorOpen(false);
                        setDraft(null);
                      }}
                      style={styles.editorButton}
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
                              ? "Ajouter"
                              : "Importer"
                      }
                      loading={working}
                      disabled={picking}
                      onPress={() =>
                        void saveResource()
                      }
                      style={styles.editorButton}
                    />
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ACTION MENU */}
      <Modal
        visible={actionTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setActionTarget(null)
        }
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            android_ripple={{
              color: "transparent",
            }}
            onPress={() =>
              setActionTarget(null)
            }
          />

          <View style={styles.actionSheet}>
            {actionTarget ? (
              <>
                <View className="items-center">
                  <View
                    className="h-1.5 w-12 rounded-full"
                    style={{
                      backgroundColor: "#D7DCE4",
                    }}
                  />
                </View>

                <View className="mt-4 flex-row items-center">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-[12px]"
                    style={{
                      backgroundColor:
                        resourceVisual(
                          actionTarget.type,
                        ).soft,
                    }}
                  >
                    <SymbolView
                      name={
                        resourceVisual(
                          actionTarget.type,
                        ).icon
                      }
                      tintColor={
                        resourceVisual(
                          actionTarget.type,
                        ).color
                      }
                      size={16}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[12px] font-black"
                      style={{
                        color: theme.colors.foreground,
                      }}
                    >
                      {actionTarget.title}
                    </Text>

                    <Text
                      className="mt-0.5 text-[8px]"
                      style={{
                        color:
                          theme.colors.foregroundMuted,
                      }}
                    >
                      {labelForType(actionTarget.type)}
                    </Text>
                  </View>
                </View>

                <View
                  className="my-4 h-px"
                  style={{
                    backgroundColor: "#E8ECF1",
                  }}
                />

                <ActionRow
                  icon={{
                    ios: "arrow.up",
                    android: "arrow_upward",
                    web: "arrow_upward",
                  }}
                  label="Monter"
                  disabled={
                    working ||
                    resources.findIndex(
                      (item) =>
                        item.id === actionTarget.id,
                    ) === 0
                  }
                  onPress={() =>
                    void moveResource(
                      actionTarget,
                      -1,
                    )
                  }
                />

                <ActionRow
                  icon={{
                    ios: "arrow.down",
                    android: "arrow_downward",
                    web: "arrow_downward",
                  }}
                  label="Descendre"
                  disabled={
                    working ||
                    resources.findIndex(
                      (item) =>
                        item.id === actionTarget.id,
                    ) ===
                      resources.length - 1
                  }
                  onPress={() =>
                    void moveResource(
                      actionTarget,
                      1,
                    )
                  }
                />

                {isEditableJsonResource(
                  actionTarget,
                ) ? (
                  <ActionRow
                    icon={{
                      ios: "pencil",
                      android: "edit",
                      web: "edit",
                    }}
                    label="Modifier"
                    onPress={() =>
                      openEdit(actionTarget)
                    }
                  />
                ) : null}

                <ActionRow
                  icon={{
                    ios: "trash.fill",
                    android: "delete",
                    web: "delete",
                  }}
                  label="Supprimer"
                  danger
                  onPress={() => {
                    setActionTarget(null);
                    setDeleteTarget(
                      actionTarget,
                    );
                  }}
                />
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRM */}
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
          <Pressable
            style={StyleSheet.absoluteFill}
            android_ripple={{
              color: "transparent",
            }}
            onPress={() => {
              if (!working) {
                setDeleteTarget(null);
              }
            }}
          />

          <View style={styles.deleteCard}>
            <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-[#FFF0F2]">
              <SymbolView
                name={{
                  ios: "trash.fill",
                  android: "delete",
                  web: "delete",
                }}
                tintColor="#DC2626"
                size={18}
                weight="bold"
              />
            </View>

            <Text
              className="mt-4 text-[18px] font-black"
              style={{
                color: theme.colors.foreground,
              }}
            >
              Supprimer la ressource ?
            </Text>

            <Text
              className="mt-2 text-[10px] leading-[16px]"
              style={{
                color: theme.colors.foregroundMuted,
              }}
            >
              La suppression est envoyée au backend, qui applique les règles d’ownership et d’immutabilité de la formation.
            </Text>

            <Text
              className="mt-3 text-[12px] font-black"
              style={{
                color: theme.colors.foreground,
              }}
            >
              {deleteTarget?.title}
            </Text>

            <View className="mt-5 flex-row gap-3">
              <AppButton
                title="Annuler"
                variant="secondary"
                disabled={working}
                onPress={() =>
                  setDeleteTarget(null)
                }
                style={styles.editorButton}
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
                style={styles.editorButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );

  function StatItem({
    icon,
    value,
    label,
    color,
    soft,
  }: {
    icon: SymbolName;
    value: number;
    label: string;
    color: string;
    soft: string;
  }) {
    return (
      <View className="flex-1 items-center">
        <View
          className="h-7 w-7 items-center justify-center rounded-[9px]"
          style={{
            backgroundColor: soft,
          }}
        >
          <SymbolView
            name={icon}
            tintColor={color}
            size={14}
            weight="bold"
          />
        </View>

        <Text
          className="mt-1 text-[11px] font-black"
          style={{
            color: theme.colors.foreground,
          }}
        >
          {value}
        </Text>

        <Text
          numberOfLines={1}
          className="mt-0.5 text-[7px]"
          style={{
            color: theme.colors.foregroundMuted,
          }}
        >
          {label}
        </Text>
      </View>
    );
  }

  function StatDivider() {
    return (
      <View
        className="my-1 w-px"
        style={{
          backgroundColor: "#E8ECF1",
        }}
      />
    );
  }

  function FieldLabel({
    text,
    required = false,
  }: {
    text: string;
    required?: boolean;
  }) {
    return (
      <Text
        className="mb-1.5 text-[10px] font-black"
        style={{
          color: theme.colors.foreground,
        }}
      >
        {text}
        {required ? (
          <Text style={{ color: "#DC2626" }}> *</Text>
        ) : null}
      </Text>
    );
  }

  function ActionRow({
    icon,
    label,
    onPress,
    disabled = false,
    danger = false,
  }: {
    icon: SymbolName;
    label: string;
    onPress: () => void;
    disabled?: boolean;
    danger?: boolean;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{
          color: "transparent",
        }}
        className="mb-2 flex-row items-center rounded-[14px] px-3 py-3"
        style={{
          backgroundColor: danger
            ? "#FFF6F7"
            : "#F8FAFC",
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <View
          className="h-9 w-9 items-center justify-center rounded-[11px]"
          style={{
            backgroundColor: danger
              ? "#FFF0F2"
              : "#EEF1F5",
          }}
        >
          <SymbolView
            name={icon}
            tintColor={
              danger
                ? "#DC2626"
                : "#475467"
            }
            size={15}
            weight="bold"
          />
        </View>

        <Text
          className="ml-3 flex-1 text-[10px] font-black"
          style={{
            color: danger
              ? "#DC2626"
              : theme.colors.foreground,
          }}
        >
          {label}
        </Text>

        <SymbolView
          name={{
            ios: "chevron.right",
            android: "chevron_right",
            web: "chevron_right",
          }}
          tintColor={
            danger
              ? "#DC2626"
              : theme.colors.foregroundSubtle
          }
          size={14}
          weight="bold"
        />
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  typeSheet: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: -6,
    },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 14,
  },
  editorSheet: {
    width: "100%",
    maxHeight: "94%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: -6,
    },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 14,
  },
  actionSheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: -6,
    },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 14,
  },
  deleteCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: -6,
    },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 14,
  },
  editorButton: {
    flex: 1,
    minWidth: 0,
  },
});
