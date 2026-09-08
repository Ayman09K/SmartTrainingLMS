import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Eye,
  File,
  FileText,
  Image as ImageIcon,
  Layers3,
  Link2,
  Package,
  PlayCircle,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  createLesson,
  createModule,
  createResource,
  deleteLesson,
  deleteModule,
  deleteResource,
  getFullTrainingById,
  getTrainerTrainings,
  updateLesson,
  updateModule,
  updateResource,
  uploadLessonDocument,
  uploadLessonImage,
  uploadLessonPdf,
  uploadLessonScorm,
  uploadLessonVideo,
} from "../../api/trainerApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { buildMediaUrl } from "../../api/apiConfig";
import { loadLearnerMediaObjectUrl } from "../../api/learnerMediaApi";
import {
  buildScormRuntimeUrl,
  launchScormAuthorPreview,
} from "../../api/scormRuntimeApi";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import { QuizBuilderPanel } from "../../components/evaluation/QuizBuilderPanel";
import { AuthenticatedMediaRenderer } from "../../components/learner/coursePlayer/AuthenticatedMediaRenderer";
import { TrainingAuthoringNav } from "../../components/training/TrainingAuthoringNav";
import { UnsavedChangesGuard } from "../../components/ux/UnsavedChangesGuard";
import { smartConfirm } from "../../components/ux/smartConfirmService";
import { useAuth } from "../../features/auth/AuthContext";
import type {
  FullLessonResponse,
  FullModuleResponse,
  FullTrainingResponse,
  LessonRequest,
  ModuleRequest,
  ResourceRequest,
  ResourceResponse,
  ResourceType,
  StorageMode,
  TrainingResponse,
} from "../../types/training";

async function openScormAuthorPreview(
  resourceId: number,
): Promise<void> {
  const previewWindow = window.open("about:blank", "_blank");

  if (!previewWindow) {
    throw new Error(
      "Le navigateur a bloquÃ© la fenÃªtre de prÃ©visualisation.",
    );
  }

  previewWindow.opener = null;

  try {
    const launch = await launchScormAuthorPreview(resourceId);
    previewWindow.location.replace(
      buildScormRuntimeUrl(launch.runtimePath),
    );
  } catch (error) {
    previewWindow.close();
    throw error;
  }
}

async function openAuthenticatedResource(
  sourceUrl: string,
): Promise<void> {
  const previewWindow = window.open("about:blank", "_blank");

  if (!previewWindow) {
    throw new Error(
      "Le navigateur a bloqué la fenêtre de prévisualisation.",
    );
  }

  previewWindow.opener = null;

  try {
    const resolved = await loadLearnerMediaObjectUrl(sourceUrl);

    if (!resolved?.url) {
      throw new Error("Ressource indisponible.");
    }

    previewWindow.location.replace(resolved.url);

    if (resolved.revoke) {
      window.setTimeout(
        () => URL.revokeObjectURL(resolved.url),
        60_000,
      );
    }
  } catch (error) {
    previewWindow.close();
    throw error;
  }
}

type ResourceCreateType =
  | "TEXT"
  | "EXTERNAL_LINK"
  | "IMAGE"
  | "VIDEO"
  | "PDF"
  | "DOCUMENT"
  | "SCORM";

interface ModuleFormState {
  title: string;
  description: string;
  orderIndex: number;
}

interface LessonFormState {
  title: string;
  description: string;
  objective: string;
  content: string;
  orderIndex: number;
  estimatedDurationMinutes: number;
}

interface ResourceFormState {
  title: string;
  description: string;
  type: ResourceCreateType;
  content: string;
  orderIndex: number;
  file: File | null;
}

const emptyModuleForm: ModuleFormState = {
  title: "",
  description: "",
  orderIndex: 1,
};

const emptyLessonForm: LessonFormState = {
  title: "",
  description: "",
  objective: "",
  content: "",
  orderIndex: 1,
  estimatedDurationMinutes: 10,
};

const emptyResourceForm: ResourceFormState = {
  title: "",
  description: "",
  type: "TEXT",
  content: "",
  orderIndex: 1,
  file: null,
};

function sortByOrder<T extends { orderIndex?: number; id: number }>(items?: T[]): T[] {
  return [...(items || [])].sort(
    (a, b) => (a.orderIndex ?? a.id) - (b.orderIndex ?? b.id),
  );
}

function resourceUrl(resource: ResourceResponse): string {
  return buildMediaUrl(
    resource.publicUrl ||
      resource.url ||
      resource.relativePath ||
      resource.scormLaunchPath,
  );
}

function humanFileSize(value?: number): string {
  if (!value || value <= 0) {
    return "";
  }

  if (value < 1024) {
    return `${value} o`;
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} Ko`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
}

function resourceIcon(type?: string) {
  switch (type) {
    case "IMAGE":
      return <ImageIcon size={18} />;
    case "VIDEO":
    case "VIDEO_URL":
      return <PlayCircle size={18} />;
    case "PDF":
    case "PDF_URL":
      return <FileText size={18} />;
    case "DOCUMENT":
      return <File size={18} />;
    case "SCORM":
      return <Package size={18} />;
    case "EXTERNAL_LINK":
      return <Link2 size={18} />;
    default:
      return <BookOpen size={18} />;
  }
}

function trainingStatusLabel(value?: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    PUBLISHED: "Publiée",
    ARCHIVED: "Archivée",
    ACTIVE: "Active",
    INACTIVE: "Inactive",
  };

  return labels[value || ""] || "Brouillon";
}

function resourceLabel(type?: string): string {
  const labels: Record<string, string> = {
    TEXT: "Texte",
    IMAGE: "Image",
    VIDEO: "Vidéo",
    VIDEO_URL: "Vidéo externe",
    PDF: "PDF",
    PDF_URL: "PDF externe",
    DOCUMENT: "Document",
    EXTERNAL_LINK: "Lien externe",
    SCORM: "SCORM",
  };

  return labels[type || ""] || type || "Ressource";
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

function moduleRequest(module: FullModuleResponse, trainingId: number): ModuleRequest {
  return {
    trainingId,
    title: module.title,
    description: module.description || "",
    orderIndex: module.orderIndex ?? 1,
  };
}

function lessonRequest(lesson: FullLessonResponse, moduleId: number): LessonRequest {
  return {
    moduleId,
    title: lesson.title,
    description: lesson.description || "",
    objective: lesson.objective || "",
    content: lesson.content || "",
    orderIndex: lesson.orderIndex ?? 1,
    estimatedDurationMinutes: lesson.estimatedDurationMinutes ?? 10,
  };
}

function resourceRequest(
  resource: ResourceResponse,
  lessonId: number,
): ResourceRequest {
  const type = (resource.type || "TEXT") as ResourceType;
  const storageMode =
    (resource.storageMode as StorageMode | undefined) ||
    (type === "TEXT"
      ? "TEXT_CONTENT"
      : type === "SCORM"
        ? "SCORM_PACKAGE"
        : resource.publicUrl || resource.relativePath
          ? "LOCAL_FILE"
          : "EXTERNAL_URL");

  return {
    lessonId,
    title: resource.title,
    description: resource.description || "",
    type,
    storageMode,
    url: resource.url,
    textContent: resource.textContent,
    orderIndex: resource.orderIndex ?? 1,
  };
}

function acceptedFileTypes(type: ResourceCreateType): string {
  switch (type) {
    case "IMAGE":
      return "image/png,image/jpeg,image/webp,image/gif";
    case "VIDEO":
      return "video/mp4";
    case "PDF":
      return "application/pdf";
    case "DOCUMENT":
      return ".doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.odt,.ods,.odp";
    case "SCORM":
      return ".zip,application/zip";
    default:
      return "";
  }
}

type PendingDelete =
  | { kind: "MODULE"; item: FullModuleResponse }
  | { kind: "LESSON"; item: FullLessonResponse }
  | { kind: "RESOURCE"; item: ResourceResponse };

export function TrainerContentBuilderPage() {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const { trainingId: trainingIdParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const adminContext = location.pathname.startsWith("/admin/");
  const trainingListPath = adminContext ? "/admin/trainings" : "/trainer/trainings";
  const trainingEditPath = (id: number) =>
    adminContext ? `/admin/trainings/${id}/edit` : `/trainer/trainings/${id}/edit`;
  const previewRequested = searchParams.get("preview") === "1";
  const sectionRequested = searchParams.get("section");
  const authoringStep =
    previewRequested
      ? "preview"
      : sectionRequested === "quiz"
        ? "quiz"
        : "content";

  const routeTrainingId = trainingIdParam
    ? Number(trainingIdParam)
    : Number(searchParams.get("trainingId") || 0);

  const [trainings, setTrainings] = useState<TrainingResponse[]>([]);
  const [training, setTraining] = useState<FullTrainingResponse | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState(0);
  const [selectedLessonId, setSelectedLessonId] = useState(0);

  const [moduleForm, setModuleForm] = useState<ModuleFormState>(emptyModuleForm);
  const [lessonForm, setLessonForm] = useState<LessonFormState>(emptyLessonForm);
  const [resourceForm, setResourceForm] =
    useState<ResourceFormState>(emptyResourceForm);

  const [editingModuleId, setEditingModuleId] = useState<number | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<number | null>(null);

  const [resourceEditTitle, setResourceEditTitle] = useState("");
  const [resourceEditDescription, setResourceEditDescription] = useState("");
  const [resourceEditOrder, setResourceEditOrder] = useState(1);

  const [moduleFormBaseline, setModuleFormBaseline] = useState(
    () => JSON.stringify(emptyModuleForm),
  );
  const [lessonFormBaseline, setLessonFormBaseline] = useState(
    () => JSON.stringify(emptyLessonForm),
  );
  const [resourceFormBaseline, setResourceFormBaseline] = useState(
    () => JSON.stringify({ ...emptyResourceForm, file: null }),
  );
  const [resourceEditBaseline, setResourceEditBaseline] = useState("");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const modules = useMemo(() => sortByOrder(training?.modules), [training]);

  const selectedModule = useMemo(
    () => modules.find((module) => module.id === selectedModuleId),
    [modules, selectedModuleId],
  );

  const lessons = useMemo(
    () => sortByOrder(selectedModule?.lessons),
    [selectedModule],
  );

  const selectedLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === selectedLessonId),
    [lessons, selectedLessonId],
  );

  const resources = useMemo(
    () => sortByOrder(selectedLesson?.resources),
    [selectedLesson],
  );

  async function loadTraining(id: number) {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const loaded = await getFullTrainingById(id);

      if (user.role === "FORMATEUR" && loaded.trainerId !== user.id) {
        setTraining(null);
        setError("Cette formation n'appartient pas à ce compte formateur.");
        return;
      }

      if (
        loaded.status !== "DRAFT" &&
        !(loaded.status === "PUBLISHED" && sectionRequested === "quiz")
      ) {
        setTraining(null);
        setError(
          loaded.status === "ARCHIVED"
            ? "Cette formation est archivée. Désarchivez-la depuis Mes formations avant d'ajouter ou modifier du contenu."
            : "Cette formation est publiée. Remettez-la en brouillon depuis Mes formations avant d'ajouter ou modifier du contenu.",
        );
        return;
      }

      setTraining(loaded);

      const orderedModules = sortByOrder(loaded.modules);
      const nextModule =
        orderedModules.find((item) => item.id === selectedModuleId) ||
        orderedModules[0];

      const orderedLessons = sortByOrder(nextModule?.lessons);
      const nextLesson =
        orderedLessons.find((item) => item.id === selectedLessonId) ||
        orderedLessons[0];

      setSelectedModuleId(nextModule?.id || 0);
      setSelectedLessonId(nextLesson?.id || 0);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadTrainerTrainings() {
    if (adminContext && routeTrainingId > 0) {
      await loadTraining(routeTrainingId);
      return;
    }
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const loaded = await getTrainerTrainings(user.id);
      setTrainings(loaded.filter((item) => item.status === "DRAFT"));

      if (routeTrainingId > 0) {
        await loadTraining(routeTrainingId);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTrainerTrainings();
  }, [user?.id, routeTrainingId]);

  useEffect(() => {
    const nextForm = {
      title: "",
      description: "",
      orderIndex: modules.length + 1,
    };
    setModuleForm(nextForm);
    setModuleFormBaseline(JSON.stringify(nextForm));
  }, [modules.length]);

  useEffect(() => {
    const nextForm = {
      title: "",
      description: "",
      objective: "",
      content: "",
      orderIndex: lessons.length + 1,
      estimatedDurationMinutes: 10,
    };
    setLessonForm(nextForm);
    setLessonFormBaseline(JSON.stringify(nextForm));
  }, [selectedModuleId, lessons.length]);

  useEffect(() => {
    const nextForm = {
      ...emptyResourceForm,
      orderIndex: resources.length + 1,
    };
    setResourceForm(nextForm);
    setResourceFormBaseline(JSON.stringify({ ...nextForm, file: null }));
  }, [selectedLessonId, resources.length]);

  const moduleFormDirty = JSON.stringify(moduleForm) !== moduleFormBaseline;
  const lessonFormDirty = JSON.stringify(lessonForm) !== lessonFormBaseline;
  const resourceFormDirty =
    JSON.stringify({ ...resourceForm, file: null }) !== resourceFormBaseline ||
    resourceForm.file !== null;
  const resourceEditDirty =
    editingResourceId !== null &&
    JSON.stringify({
      title: resourceEditTitle,
      description: resourceEditDescription,
      orderIndex: resourceEditOrder,
    }) !== resourceEditBaseline;
  const hasUnsavedChanges =
    moduleFormDirty || lessonFormDirty || resourceFormDirty || resourceEditDirty;

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function selectTraining(id: number) {
    if (hasUnsavedChanges) {
      const confirmed = await smartConfirm({
        title: "Changer de formation ?",
        description: "Les modifications non enregistrées seront perdues.",
        confirmLabel: "Changer de formation",
        cancelLabel: "Rester ici",
        destructive: true,
      });
      if (!confirmed) {
        return;
      }
    }

    setSearchParams({ trainingId: String(id) });
  }

  async function submitModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!training?.id || !moduleForm.title.trim()) {
      setError("Le titre du module est obligatoire.");
      return;
    }

    clearMessages();

    try {
      if (editingModuleId) {
        await updateModule(editingModuleId, {
          trainingId: training.id,
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim(),
          orderIndex: Math.max(1, moduleForm.orderIndex),
        });
        setSuccess("Module modifié.");
      } else {
        await createModule({
          trainingId: training.id,
          title: moduleForm.title.trim(),
          description: moduleForm.description.trim(),
          orderIndex: Math.max(1, moduleForm.orderIndex),
        });
        setSuccess("Module ajouté à la formation.");
      }

      setEditingModuleId(null);
      setModuleForm(emptyModuleForm);
      setModuleFormBaseline(JSON.stringify(emptyModuleForm));
      await loadTraining(training.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  function editModule(module: FullModuleResponse) {
    const nextForm = {
      title: module.title,
      description: module.description || "",
      orderIndex: module.orderIndex ?? 1,
    };
    setEditingModuleId(module.id);
    setModuleForm(nextForm);
    setModuleFormBaseline(JSON.stringify(nextForm));
  }

  function removeModule(module: FullModuleResponse) {
    setPendingDelete({ kind: "MODULE", item: module });
  }

  async function moveModule(module: FullModuleResponse, direction: -1 | 1) {
    if (!training?.id) {
      return;
    }

    const index = modules.findIndex((item) => item.id === module.id);
    const target = modules[index + direction];

    if (!target) {
      return;
    }

    clearMessages();

    try {
      const currentOrder = module.orderIndex ?? index + 1;
      const targetOrder = target.orderIndex ?? index + direction + 1;

      await Promise.all([
        updateModule(module.id, {
          ...moduleRequest(module, training.id),
          orderIndex: targetOrder,
        }),
        updateModule(target.id, {
          ...moduleRequest(target, training.id),
          orderIndex: currentOrder,
        }),
      ]);

      setSuccess("Ordre des modules mis à jour.");
      await loadTraining(training.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function submitLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!training?.id || !selectedModuleId || !lessonForm.title.trim()) {
      setError("Sélectionnez un module et renseignez le titre de la leçon.");
      return;
    }

    const lessonTitle = lessonForm.title.trim();
    const lessonDescription = lessonForm.description.trim();
    const lessonObjective = lessonForm.objective.trim();
    const lessonContent = lessonForm.content.trim();

    if (samePedagogicalText(lessonTitle, lessonDescription)) {
      setError("L’introduction ne doit pas répéter exactement le titre de la leçon.");
      return;
    }

    if (
      samePedagogicalText(lessonContent, lessonDescription) ||
      samePedagogicalText(lessonContent, lessonObjective)
    ) {
      setError("L’explication principale doit être différente de l’introduction et de l’objectif.");
      return;
    }

    clearMessages();

    try {
      const request: LessonRequest = {
        moduleId: selectedModuleId,
        title: lessonTitle,
        description: lessonDescription,
        objective: lessonObjective,
        content: lessonContent,
        orderIndex: Math.max(1, lessonForm.orderIndex),
        estimatedDurationMinutes: Math.max(
          0,
          lessonForm.estimatedDurationMinutes,
        ),
      };

      if (editingLessonId) {
        await updateLesson(editingLessonId, request);
        setSuccess("Leçon modifiée.");
      } else {
        await createLesson(request);
        setSuccess("Leçon ajoutée au module.");
      }

      setEditingLessonId(null);
      setLessonForm(emptyLessonForm);
      setLessonFormBaseline(JSON.stringify(emptyLessonForm));
      await loadTraining(training.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  function editLesson(lesson: FullLessonResponse) {
    const nextForm = {
      title: lesson.title,
      description: lesson.description || "",
      objective: lesson.objective || "",
      content: lesson.content || "",
      orderIndex: lesson.orderIndex ?? 1,
      estimatedDurationMinutes: lesson.estimatedDurationMinutes ?? 10,
    };
    setEditingLessonId(lesson.id);
    setLessonForm(nextForm);
    setLessonFormBaseline(JSON.stringify(nextForm));
  }

  function removeLesson(lesson: FullLessonResponse) {
    setPendingDelete({ kind: "LESSON", item: lesson });
  }

  async function moveLesson(lesson: FullLessonResponse, direction: -1 | 1) {
    if (!training?.id || !selectedModuleId) {
      return;
    }

    const index = lessons.findIndex((item) => item.id === lesson.id);
    const target = lessons[index + direction];

    if (!target) {
      return;
    }

    clearMessages();

    try {
      const currentOrder = lesson.orderIndex ?? index + 1;
      const targetOrder = target.orderIndex ?? index + direction + 1;

      await Promise.all([
        updateLesson(lesson.id, {
          ...lessonRequest(lesson, selectedModuleId),
          orderIndex: targetOrder,
        }),
        updateLesson(target.id, {
          ...lessonRequest(target, selectedModuleId),
          orderIndex: currentOrder,
        }),
      ]);

      setSuccess("Ordre des leçons mis à jour.");
      await loadTraining(training.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  function handleResourceFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setResourceForm((current) => ({ ...current, file }));
  }

  async function submitResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!training?.id || !selectedLessonId || !user?.id) {
      setError("Sélectionnez d'abord une leçon.");
      return;
    }

    if (!resourceForm.title.trim()) {
      setError("Le titre de la ressource est obligatoire.");
      return;
    }

    if (
      samePedagogicalText(resourceForm.title, resourceForm.description)
    ) {
      setError("L’introduction de la ressource ne doit pas répéter exactement son titre.");
      return;
    }

    if (
      resourceForm.type === "TEXT" &&
      (samePedagogicalText(resourceForm.content, resourceForm.title) ||
        samePedagogicalText(resourceForm.content, resourceForm.description))
    ) {
      setError("Le texte complémentaire doit être différent du titre et de l’introduction.");
      return;
    }

    clearMessages();
    setUploading(true);

    try {
      const orderIndex = Math.max(1, resourceForm.orderIndex);

      if (resourceForm.type === "TEXT") {
        await createResource({
          lessonId: selectedLessonId,
          title: resourceForm.title.trim(),
          description: resourceForm.description.trim(),
          type: "TEXT",
          storageMode: "TEXT_CONTENT",
          textContent: resourceForm.content.trim(),
          orderIndex,
        });
      } else if (resourceForm.type === "EXTERNAL_LINK") {
        if (!resourceForm.content.trim()) {
          throw new Error("L'URL du lien externe est obligatoire.");
        }

        await createResource({
          lessonId: selectedLessonId,
          title: resourceForm.title.trim(),
          description: resourceForm.description.trim(),
          type: "EXTERNAL_LINK",
          storageMode: "EXTERNAL_URL",
          url: resourceForm.content.trim(),
          orderIndex,
        });
      } else {
        if (!resourceForm.file) {
          throw new Error("Sélectionnez le fichier à importer.");
        }

        const options = {
          title: resourceForm.title.trim(),
          description: resourceForm.description.trim(),
          uploadedBy: user.id,
          orderIndex,
        };

        switch (resourceForm.type) {
          case "IMAGE":
            await uploadLessonImage(
              selectedLessonId,
              resourceForm.file,
              options,
            );
            break;
          case "VIDEO":
            if (
              resourceForm.file.type &&
              resourceForm.file.type !== "video/mp4"
            ) {
              throw new Error("Le fichier vidéo doit être au format MP4.");
            }
            await uploadLessonVideo(
              selectedLessonId,
              resourceForm.file,
              options,
            );
            break;
          case "PDF":
            await uploadLessonPdf(
              selectedLessonId,
              resourceForm.file,
              options,
            );
            break;
          case "DOCUMENT":
            await uploadLessonDocument(
              selectedLessonId,
              resourceForm.file,
              options,
            );
            break;
          case "SCORM":
            if (!resourceForm.file.name.toLowerCase().endsWith(".zip")) {
              throw new Error(
                "Le package SCORM doit être fourni au format ZIP.",
              );
            }
            await uploadLessonScorm(
              selectedLessonId,
              resourceForm.file,
              options,
            );
            break;
        }
      }

      const nextResourceForm = {
        ...emptyResourceForm,
        orderIndex: resources.length + 2,
      };
      setResourceForm(nextResourceForm);
      setResourceFormBaseline(
        JSON.stringify({ ...nextResourceForm, file: null }),
      );
      setSuccess("Ressource ajoutée à la leçon.");
      await loadTraining(training.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : getApiErrorMessage(err),
      );
    } finally {
      setUploading(false);
    }
  }

  function startEditResource(resource: ResourceResponse) {
    const nextEdit = {
      title: resource.title,
      description: resource.description || "",
      orderIndex: resource.orderIndex ?? 1,
    };
    setEditingResourceId(resource.id);
    setResourceEditTitle(nextEdit.title);
    setResourceEditDescription(nextEdit.description);
    setResourceEditOrder(nextEdit.orderIndex);
    setResourceEditBaseline(JSON.stringify(nextEdit));
  }

  async function saveResourceEdit(resource: ResourceResponse) {
    if (!training?.id || !selectedLessonId) {
      return;
    }

    clearMessages();

    try {
      await updateResource(resource.id, {
        ...resourceRequest(resource, selectedLessonId),
        title: resourceEditTitle.trim() || resource.title,
        description: resourceEditDescription.trim(),
        orderIndex: Math.max(1, resourceEditOrder),
      });

      setEditingResourceId(null);
      setResourceEditBaseline("");
      setSuccess("Ressource modifiée.");
      await loadTraining(training.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  function removeResource(resource: ResourceResponse) {
    setPendingDelete({ kind: "RESOURCE", item: resource });
  }

  async function confirmDelete() {
    if (!training?.id || !pendingDelete || deleting) {
      return;
    }

    clearMessages();
    setDeleting(true);

    try {
      if (pendingDelete.kind === "MODULE") {
        await deleteModule(pendingDelete.item.id);
        setSuccess("Module supprim\u00e9.");
        setSelectedModuleId(0);
        setSelectedLessonId(0);
      } else if (pendingDelete.kind === "LESSON") {
        await deleteLesson(pendingDelete.item.id);
        setSuccess("Le\u00e7on supprim\u00e9e.");
        setSelectedLessonId(0);
      } else {
        await deleteResource(pendingDelete.item.id);
        setSuccess("Ressource supprim\u00e9e.");
      }

      setPendingDelete(null);
      await loadTraining(training.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  async function moveResource(resource: ResourceResponse, direction: -1 | 1) {
    if (!training?.id || !selectedLessonId) {
      return;
    }

    const index = resources.findIndex((item) => item.id === resource.id);
    const target = resources[index + direction];

    if (!target) {
      return;
    }

    clearMessages();

    try {
      const currentOrder = resource.orderIndex ?? index + 1;
      const targetOrder = target.orderIndex ?? index + direction + 1;

      await Promise.all([
        updateResource(resource.id, {
          ...resourceRequest(resource, selectedLessonId),
          orderIndex: targetOrder,
        }),
        updateResource(target.id, {
          ...resourceRequest(target, selectedLessonId),
          orderIndex: currentOrder,
        }),
      ]);

      setSuccess("Ordre des ressources mis à jour.");
      await loadTraining(training.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  useEffect(() => {
    if (previewRequested && training) {
      setPreviewOpen(true);
    }
  }, [previewRequested, training]);


  useEffect(() => {
    if (sectionRequested !== "quiz" || !training) {
      return;
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById("authoring-quiz")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [sectionRequested, training]);
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 360,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            {"Chargement du Course Builder..."}
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!routeTrainingId || !training) {
    return (
      <Stack spacing={3}>
        <SmartPageHeader
          eyebrow={"Course Builder"}
          title={"Choisir une formation"}
          description={
            "Ouvrez une formation en brouillon pour organiser ses modules, le\u00e7ons et ressources."
          }
          actions={
            <Button
              component={Link}
              to={trainingListPath}
              variant="outlined"
              startIcon={<ArrowLeft size={17} />}
            >
              {"Retour aux formations"}
            </Button>
          }
        />

        {error ? <Alert severity="error">{error}</Alert> : null}

        {trainings.length ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            {trainings.map((item) => (
              <Card key={item.id} variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Chip
                        size="small"
                        variant="outlined"
                        label={item.category || "Sans cat\u00e9gorie"}
                      />
                      <Chip
                        size="small"
                        label={"Brouillon"}
                        color="warning"
                      />
                    </Stack>

                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 850 }}>
                        {item.title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.75 }}
                      >
                        {item.shortDescription ||
                          item.description ||
                          "Aucune description disponible."}
                      </Typography>
                    </Box>

                    <Button
                      type="button"
                      variant="contained"
                      startIcon={<BookOpen size={17} />}
                      onClick={() => selectTraining(item.id)}
                      sx={{ alignSelf: "flex-start" }}
                    >
                      {"Ouvrir le Course Builder"}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Alert severity="info">
            {
              "Aucune formation en brouillon n'est disponible pour la construction de contenu."
            }
          </Alert>
        )}
      </Stack>
    );
  }

  if (
    training.status === "PUBLISHED" &&
    sectionRequested === "quiz"
  ) {
    return (
      <Stack spacing={3}>
        <SmartPageHeader
          eyebrow={
            adminContext
              ? "Administration des quiz"
              : "Quiz de la formation"
          }
          title={`Quiz — ${training.title}`}
          description={
            "Gérez les évaluations sans remettre toute la formation en brouillon."
          }
          actions={
            <Button
              component={Link}
              to={trainingListPath}
              variant="outlined"
              startIcon={<ArrowLeft size={17} />}
            >
              {"Retour aux formations"}
            </Button>
          }
        />

        <TrainingAuthoringNav
          context={adminContext ? "admin" : "trainer"}
          trainingId={training.id}
          activeStep={authoringStep}
          status={training.status}
        />

        <Alert severity="info">
          {
            "La formation reste publiée. Pour modifier ses questions, repassez uniquement le quiz concerné en brouillon, effectuez vos modifications, puis republiez le quiz."
          }
        </Alert>

        <Alert severity="warning">
          {
            "Les modules, leçons et ressources restent verrouillés tant que la formation est publiée."
          }
        </Alert>

        <Box id="authoring-quiz" sx={{ scrollMarginTop: 96 }}>
          <QuizBuilderPanel
            trainingId={training.id}
            modules={modules.map((module) => ({
              id: module.id,
              title: module.title,
            }))}
          />
        </Box>
      </Stack>
    );
  }
  return (
    <Stack spacing={3}>
      <UnsavedChangesGuard when={hasUnsavedChanges && !uploading && !deleting} />
      <SmartPageHeader
        eyebrow={adminContext ? "Administration du contenu" : "Course Builder"}
        title={training.title}
        description={
          "Organisez la formation en modules, le\u00e7ons et ressources p\u00e9dagogiques."
        }
        actions={
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
          >
            <Button
              component={Link}
              to={trainingListPath}
              variant="outlined"
              startIcon={<ArrowLeft size={17} />}
            >
              {"Retour"}
            </Button>

            <Button
              component={Link}
              to={trainingEditPath(training.id)}
              variant="outlined"
              startIcon={<Edit3 size={17} />}
            >
              {"Informations"}
            </Button>

            <Button
              type="button"
              variant="contained"
              startIcon={<Eye size={17} />}
              onClick={() => setPreviewOpen(true)}
            >
              {"Pr\u00e9visualiser"}
            </Button>
          </Stack>
        }
      />

      <TrainingAuthoringNav
        context={adminContext ? "admin" : "trainer"}
        trainingId={training.id}
        activeStep={authoringStep}
        status={training.status}
      />

      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: "wrap" }}
      >
        <Chip
          label={training.category || "Sans cat\u00e9gorie"}
          variant="outlined"
        />
        <Chip
          label={trainingStatusLabel(training.status)}
          color={training.status === "DRAFT" ? "warning" : "default"}
        />
        <Chip
          icon={<Layers3 size={15} />}
          label={`${modules.length} module${modules.length > 1 ? "s" : ""}`}
          variant="outlined"
        />
      </Stack>

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
            lg: "minmax(260px, 0.72fr) minmax(0, 1.5fr)",
            xl: "minmax(260px, 0.68fr) minmax(0, 1.45fr) minmax(300px, 0.87fr)",
          },
          gap: 2.5,
          alignItems: "start",
        }}
      >
        <SmartSectionCard
          title={"Structure"}
          description={"Modules et le\u00e7ons de la formation."}
        >
          {!modules.length ? (
            <Alert severity="info">
              {"Commencez par cr\u00e9er un module."}
            </Alert>
          ) : (
            <Stack spacing={1.25}>
              {modules.map((module, moduleIndex) => (
                <Box
                  key={module.id}
                  sx={{
                    border: 1,
                    borderColor:
                      selectedModuleId === module.id
                        ? "primary.main"
                        : "divider",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                      alignItems: "center",
                      px: 1,
                      py: 0.75,
                      bgcolor:
                        selectedModuleId === module.id
                          ? "action.selected"
                          : "background.paper",
                    }}
                  >
                    <Button
                      type="button"
                      variant="text"
                      color="inherit"
                      startIcon={<Layers3 size={16} />}
                      onClick={() => {
                        setSelectedModuleId(module.id);
                        setSelectedLessonId(
                          sortByOrder(module.lessons)[0]?.id || 0,
                        );
                      }}
                      sx={{
                        justifyContent: "flex-start",
                        minWidth: 0,
                        flexGrow: 1,
                        textAlign: "left",
                      }}
                    >
                      {`${module.orderIndex ?? moduleIndex + 1}. ${module.title}`}
                    </Button>

                    <Tooltip title={"Monter"}>
                      <span>
                        <IconButton aria-label={"Monter le module"}
                          size="small"
                          disabled={moduleIndex === 0}
                          onClick={() => void moveModule(module, -1)}
                        >
                          <ChevronUp size={15} />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title={"Descendre"}>
                      <span>
                        <IconButton aria-label={"Descendre le module"}
                          size="small"
                          disabled={moduleIndex === modules.length - 1}
                          onClick={() => void moveModule(module, 1)}
                        >
                          <ChevronDown size={15} />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title={"Modifier"}>
                      <IconButton aria-label={"Modifier le module"}
                        size="small"
                        onClick={() => editModule(module)}
                      >
                        <Edit3 size={15} />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title={"Supprimer"}>
                      <IconButton aria-label={"Supprimer le module"}
                        size="small"
                        color="error"
                        onClick={() => void removeModule(module)}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  {sortByOrder(module.lessons).length ? (
                    <Stack
                      spacing={0}
                      divider={<Divider flexItem />}
                      sx={{ borderTop: 1, borderColor: "divider" }}
                    >
                      {sortByOrder(module.lessons).map(
                        (lesson, lessonIndex) => (
                          <Stack
                            key={lesson.id}
                            direction="row"
                            spacing={0.5}
                            sx={{
                              alignItems: "center",
                              pl: 2.5,
                              pr: 1,
                              py: 0.5,
                              bgcolor:
                                selectedLessonId === lesson.id
                                  ? "action.hover"
                                  : "transparent",
                            }}
                          >
                            <Button
                              type="button"
                              variant="text"
                              color="inherit"
                              startIcon={<BookOpen size={15} />}
                              onClick={() => {
                                setSelectedModuleId(module.id);
                                setSelectedLessonId(lesson.id);
                              }}
                              sx={{
                                justifyContent: "flex-start",
                                minWidth: 0,
                                flexGrow: 1,
                                textAlign: "left",
                              }}
                            >
                              {`${lesson.orderIndex ?? lessonIndex + 1}. ${lesson.title}`}
                            </Button>

                            <Tooltip title={"Monter"}>
                              <span>
                                <IconButton aria-label={"Monter la lecon"}
                                  size="small"
                                  disabled={lessonIndex === 0}
                                  onClick={() => void moveLesson(lesson, -1)}
                                >
                                  <ChevronUp size={14} />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip title={"Descendre"}>
                              <span>
                                <IconButton aria-label={"Descendre la lecon"}
                                  size="small"
                                  disabled={
                                    lessonIndex ===
                                    sortByOrder(module.lessons).length - 1
                                  }
                                  onClick={() => void moveLesson(lesson, 1)}
                                >
                                  <ChevronDown size={14} />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip title={"Modifier"}>
                              <IconButton aria-label={"Modifier la lecon"}
                                size="small"
                                onClick={() => editLesson(lesson)}
                              >
                                <Edit3 size={14} />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title={"Supprimer"}>
                              <IconButton aria-label={"Supprimer la lecon"}
                                size="small"
                                color="error"
                                onClick={() => void removeLesson(lesson)}
                              >
                                <Trash2 size={14} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        ),
                      )}
                    </Stack>
                  ) : null}
                </Box>
              ))}
            </Stack>
          )}
        </SmartSectionCard>

        <Stack spacing={2.5}>
          <SmartSectionCard
            title={selectedLesson?.title || "Aucune le\u00e7on s\u00e9lectionn\u00e9e"}
            description={
              selectedLesson
                ? `Dur\u00e9e estim\u00e9e : ${selectedLesson.estimatedDurationMinutes ?? 0} min`
                : "S\u00e9lectionnez une le\u00e7on pour consulter et organiser ses ressources."
            }
          >
            {selectedLesson ? (
              <Stack spacing={2.5}>
                {selectedLesson.objective ? (
                  <Alert severity="info">
                    <strong>{"Objectif pédagogique : "}</strong>
                    {selectedLesson.objective}
                  </Alert>
                ) : null}

                {selectedLesson.description ? (
                  <Typography color="text.secondary">
                    {selectedLesson.description}
                  </Typography>
                ) : null}

                {selectedLesson.content ? (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "action.hover",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 850, mb: 0.75 }}
                    >
                      {"Explication principale"}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-wrap" }}
                    >
                      {selectedLesson.content}
                    </Typography>
                  </Box>
                ) : null}

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography variant="h6">{"Ressources"}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {
                        "Texte, image, vid\u00e9o, PDF, document, lien externe ou package SCORM."
                      }
                    </Typography>
                  </Box>
                  <Chip label={resources.length} />
                </Stack>

                {!resources.length ? (
                  <Alert severity="info">
                    {
                      "Aucune ressource. Utilisez le panneau de propri\u00e9t\u00e9s pour enrichir cette le\u00e7on."
                    }
                  </Alert>
                ) : (
                  <Stack spacing={1.5}>
                    {resources.map((resource, resourceIndex) => {
                      const url = resourceUrl(resource);
                      const editing =
                        editingResourceId === resource.id;

                      return (
                        <Card
                          key={resource.id}
                          variant="outlined"
                        >
                          <CardContent>
                            <Stack spacing={1.75}>
                              <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={1}
                                sx={{
                                  justifyContent: "space-between",
                                  alignItems: { sm: "flex-start" },
                                }}
                              >
                                <Stack
                                  direction="row"
                                  spacing={1.25}
                                  sx={{ minWidth: 0 }}
                                >
                                  <Box
                                    sx={{
                                      width: 38,
                                      height: 38,
                                      borderRadius: 2,
                                      bgcolor: "action.hover",
                                      display: "grid",
                                      placeItems: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {resourceIcon(resource.type)}
                                  </Box>

                                  <Box sx={{ minWidth: 0 }}>
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      useFlexGap
                                      sx={{ flexWrap: "wrap" }}
                                    >
                                      <Chip
                                        size="small"
                                        variant="outlined"
                                        label={resourceLabel(resource.type)}
                                      />
                                      <Typography
                                        variant="subtitle1"
                                        sx={{
                                          fontWeight: 850,
                                          overflowWrap: "anywhere",
                                        }}
                                      >
                                        {resource.title}
                                      </Typography>
                                    </Stack>

                                    {resource.description ? (
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mt: 0.75 }}
                                      >
                                        {resource.description}
                                      </Typography>
                                    ) : null}
                                  </Box>
                                </Stack>

                                <Stack direction="row" spacing={0.25}>
                                  <Tooltip title={"Monter"}>
                                    <span>
                                      <IconButton aria-label={"Monter la ressource"}
                                        size="small"
                                        disabled={resourceIndex === 0}
                                        onClick={() =>
                                          void moveResource(resource, -1)
                                        }
                                      >
                                        <ChevronUp size={15} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>

                                  <Tooltip title={"Descendre"}>
                                    <span>
                                      <IconButton aria-label={"Descendre la ressource"}
                                        size="small"
                                        disabled={
                                          resourceIndex ===
                                          resources.length - 1
                                        }
                                        onClick={() =>
                                          void moveResource(resource, 1)
                                        }
                                      >
                                        <ChevronDown size={15} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>

                                  <Tooltip title={"Modifier"}>
                                    <IconButton aria-label={"Modifier la ressource"}
                                      size="small"
                                      onClick={() =>
                                        startEditResource(resource)
                                      }
                                    >
                                      <Edit3 size={15} />
                                    </IconButton>
                                  </Tooltip>

                                  <Tooltip title={"Supprimer"}>
                                    <IconButton aria-label={"Supprimer la ressource"}
                                      size="small"
                                      color="error"
                                      onClick={() =>
                                        void removeResource(resource)
                                      }
                                    >
                                      <Trash2 size={15} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </Stack>

                              {resource.type === "TEXT" &&
                              resource.textContent ? (
                                <Box
                                  sx={{
                                    p: 1.75,
                                    borderRadius: 2,
                                    bgcolor: "action.hover",
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    sx={{ whiteSpace: "pre-wrap" }}
                                  >
                                    {resource.textContent}
                                  </Typography>
                                </Box>
                              ) : null}

                              {resource.type === "IMAGE" && url ? (
                                <Box
                                  component="img"
                                  src={url}
                                  alt={resource.title}
                                  sx={{
                                    maxWidth: "100%",
                                    maxHeight: 360,
                                    objectFit: "contain",
                                    borderRadius: 2,
                                    bgcolor: "action.hover",
                                  }}
                                />
                              ) : null}

                              {(resource.type === "VIDEO" ||
                                resource.type === "VIDEO_URL") &&
                              url ? (
                                <Box
                                  component="video"
                                  controls
                                  preload="metadata"
                                  src={url}
                                  sx={{
                                    width: "100%",
                                    maxHeight: 420,
                                    borderRadius: 2,
                                    bgcolor: "common.black",
                                  }}
                                />
                              ) : null}

                              {resource.type === "SCORM" ? (
                                <Button
                                  type="button"
                                  variant="outlined"
                                  startIcon={<ExternalLink size={16} />}
                                  sx={{ alignSelf: "flex-start" }}
                                  onClick={() => {
                                    void openScormAuthorPreview(
                                      resource.id,
                                    ).catch((err) =>
                                      setError(
                                        getApiErrorMessage(err),
                                      ),
                                    );
                                  }}
                                >
                                  {
                                    "Pr\u00e9visualiser le package SCORM"
                                  }
                                </Button>
                              ) : url &&
                                resource.type !== "TEXT" &&
                                resource.type !== "IMAGE" &&
                                resource.type !== "VIDEO" &&
                                resource.type !== "VIDEO_URL" ? (
                                <Button
                                  component="a"
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  variant="outlined"
                                  startIcon={<ExternalLink size={16} />}
                                  sx={{ alignSelf: "flex-start" }}
                                >
                                  {"Ouvrir la ressource"}
                                </Button>
                              ) : null}

                              <Stack
                                direction="row"
                                spacing={1}
                                useFlexGap
                                sx={{ flexWrap: "wrap" }}
                              >
                                {resource.originalFileName ? (
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={resource.originalFileName}
                                  />
                                ) : null}
                                {resource.fileSize ? (
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={humanFileSize(resource.fileSize)}
                                  />
                                ) : null}
                                {resource.mimeType ? (
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={resource.mimeType}
                                  />
                                ) : null}
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={`Ordre ${resource.orderIndex ?? resourceIndex + 1}`}
                                />
                              </Stack>

                              {editing ? (
                                <>
                                  <Divider />
                                  <Stack spacing={1.5}>
                                    <TextField
                                      label={"Titre"}
                                      value={resourceEditTitle}
                                      onChange={(event) =>
                                        setResourceEditTitle(
                                          event.target.value,
                                        )
                                      }
                                      fullWidth
                                    />
                                    <TextField
                                      label={"Description"}
                                      value={resourceEditDescription}
                                      onChange={(event) =>
                                        setResourceEditDescription(
                                          event.target.value,
                                        )
                                      }
                                      multiline
                                      minRows={2}
                                      fullWidth
                                    />
                                    <TextField
                                      label={"Ordre"}
                                      type="number"
                                      value={resourceEditOrder}
                                      onChange={(event) =>
                                        setResourceEditOrder(
                                          Number(event.target.value),
                                        )
                                      }
                                      slotProps={{
                                        htmlInput: { min: 1 },
                                      }}
                                      fullWidth
                                    />
                                    <Stack
                                      direction="row"
                                      spacing={1}
                                      useFlexGap
                                      sx={{ flexWrap: "wrap" }}
                                    >
                                      <Button
                                        type="button"
                                        variant="contained"
                                        startIcon={<Save size={16} />}
                                        onClick={() =>
                                          void saveResourceEdit(resource)
                                        }
                                      >
                                        {"Enregistrer"}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outlined"
                                        startIcon={<X size={16} />}
                                        onClick={() => {
                                          setEditingResourceId(null);
                                          setResourceEditBaseline("");
                                        }}
                                      >
                                        {"Annuler"}
                                      </Button>
                                    </Stack>
                                  </Stack>
                                </>
                              ) : null}
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            ) : (
              <Alert severity="info">
                {
                  "Cr\u00e9ez un module puis une le\u00e7on pour commencer \u00e0 ajouter des ressources p\u00e9dagogiques."
                }
              </Alert>
            )}
          </SmartSectionCard>
        </Stack>

        <Stack
          spacing={2.5}
          sx={{
            gridColumn: {
              xs: "1",
              lg: "1 / -1",
              xl: "auto",
            },
          }}
        >
          <SmartSectionCard
            title={
              editingModuleId
                ? "Modifier le module"
                : "Ajouter un module"
            }
            description={"Titre, description et ordre d'affichage."}
          >
            <Box component="form" onSubmit={submitModule}>
              <Stack spacing={1.5}>
                <TextField
                  label={"Titre"}
                  value={moduleForm.title}
                  onChange={(event) =>
                    setModuleForm({
                      ...moduleForm,
                      title: event.target.value,
                    })
                  }
                  placeholder={"Ex. Fondamentaux"}
                  required
                  fullWidth
                />
                <TextField
                  label={"Description"}
                  value={moduleForm.description}
                  onChange={(event) =>
                    setModuleForm({
                      ...moduleForm,
                      description: event.target.value,
                    })
                  }
                  multiline
                  minRows={2}
                  fullWidth
                />
                <TextField
                  label={"Ordre"}
                  type="number"
                  value={moduleForm.orderIndex}
                  onChange={(event) =>
                    setModuleForm({
                      ...moduleForm,
                      orderIndex: Number(event.target.value),
                    })
                  }
                  slotProps={{
                    htmlInput: { min: 1 },
                  }}
                  fullWidth
                />

                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={
                      editingModuleId ? (
                        <Save size={16} />
                      ) : (
                        <Plus size={16} />
                      )
                    }
                  >
                    {editingModuleId ? "Enregistrer" : "Ajouter"}
                  </Button>

                  {editingModuleId ? (
                    <Button
                      type="button"
                      variant="outlined"
                      startIcon={<X size={16} />}
                      onClick={() => {
                        setEditingModuleId(null);
                        setModuleForm(emptyModuleForm);
                        setModuleFormBaseline(JSON.stringify(emptyModuleForm));
                      }}
                    >
                      {"Annuler"}
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Box>
          </SmartSectionCard>

          <SmartSectionCard
            title={
              editingLessonId
                ? "Modifier la le\u00e7on"
                : "Ajouter une le\u00e7on"
            }
            description={
              selectedModule
                ? `Dans : ${selectedModule.title}`
                : "S\u00e9lectionnez un module."
            }
          >
            <Box component="form" onSubmit={submitLesson}>
              <Stack spacing={1.5}>
                <Alert severity="info">
                  {
                    "Chaque champ a un rôle : le titre repère la leçon, l’introduction la présente, l’objectif annonce ce que l’apprenant saura faire et l’explication développe le sujet."
                  }
                </Alert>

                <TextField
                  label={"Titre de la leçon"}
                  value={lessonForm.title}
                  onChange={(event) =>
                    setLessonForm({
                      ...lessonForm,
                      title: event.target.value,
                    })
                  }
                  placeholder={"Ex. Comprendre le parcours d’une requête"}
                  helperText={"Un intitulé court, unique et facilement repérable dans le parcours."}
                  disabled={!selectedModule}
                  required
                  fullWidth
                />

                <TextField
                  label={"Introduction courte (facultative)"}
                  value={lessonForm.description}
                  onChange={(event) =>
                    setLessonForm({
                      ...lessonForm,
                      description: event.target.value,
                    })
                  }
                  placeholder={"Présentez en une ou deux phrases ce que cette leçon va couvrir."}
                  helperText={"Ne recopiez ni le titre, ni l’explication principale."}
                  disabled={!selectedModule}
                  multiline
                  minRows={2}
                  fullWidth
                />

                <TextField
                  label={"Objectif pédagogique (facultatif)"}
                  value={lessonForm.objective}
                  onChange={(event) =>
                    setLessonForm({
                      ...lessonForm,
                      objective: event.target.value,
                    })
                  }
                  placeholder={"À la fin, l’apprenant saura…"}
                  helperText={"Formulez une capacité observable, avec un verbe d’action."}
                  disabled={!selectedModule}
                  multiline
                  minRows={2}
                  fullWidth
                />

                <TextField
                  label={"Explication principale"}
                  value={lessonForm.content}
                  onChange={(event) =>
                    setLessonForm({
                      ...lessonForm,
                      content: event.target.value,
                    })
                  }
                  placeholder={"Expliquez ici les notions, étapes ou consignes de la leçon."}
                  helperText={"Ce texte constitue le corps de la leçon. Les médias et synthèses s’ajoutent ensuite comme ressources."}
                  disabled={!selectedModule}
                  multiline
                  minRows={4}
                  fullWidth
                />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 1.5,
                  }}
                >
                  <TextField
                    label={"Ordre"}
                    type="number"
                    value={lessonForm.orderIndex}
                    onChange={(event) =>
                      setLessonForm({
                        ...lessonForm,
                        orderIndex: Number(event.target.value),
                      })
                    }
                    disabled={!selectedModule}
                    slotProps={{
                      htmlInput: { min: 1 },
                    }}
                  />

                  <TextField
                    label={"Dur\u00e9e (min)"}
                    type="number"
                    value={lessonForm.estimatedDurationMinutes}
                    onChange={(event) =>
                      setLessonForm({
                        ...lessonForm,
                        estimatedDurationMinutes: Number(
                          event.target.value,
                        ),
                      })
                    }
                    disabled={!selectedModule}
                    slotProps={{
                      htmlInput: { min: 0 },
                    }}
                  />
                </Box>

                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={!selectedModule}
                    startIcon={
                      editingLessonId ? (
                        <Save size={16} />
                      ) : (
                        <Plus size={16} />
                      )
                    }
                  >
                    {editingLessonId ? "Enregistrer" : "Ajouter"}
                  </Button>

                  {editingLessonId ? (
                    <Button
                      type="button"
                      variant="outlined"
                      startIcon={<X size={16} />}
                      onClick={() => {
                        setEditingLessonId(null);
                        setLessonForm(emptyLessonForm);
                        setLessonFormBaseline(JSON.stringify(emptyLessonForm));
                      }}
                    >
                      {"Annuler"}
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Box>
          </SmartSectionCard>

          <SmartSectionCard
            title={"Ajouter une ressource"}
            description={
              selectedLesson
                ? `Dans : ${selectedLesson.title}`
                : "S\u00e9lectionnez une le\u00e7on."
            }
          >
            <Box component="form" onSubmit={submitResource}>
              <Stack spacing={1.5}>
                <TextField
                  select
                  label={"Type"}
                  value={resourceForm.type}
                  onChange={(event) =>
                    setResourceForm({
                      ...resourceForm,
                      type: event.target.value as ResourceCreateType,
                      content: "",
                      file: null,
                    })
                  }
                  disabled={!selectedLesson}
                  fullWidth
                >
                  <MenuItem value="TEXT">{"Texte"}</MenuItem>
                  <MenuItem value="IMAGE">{"Image"}</MenuItem>
                  <MenuItem value="VIDEO">{"Vid\u00e9o MP4"}</MenuItem>
                  <MenuItem value="PDF">{"PDF"}</MenuItem>
                  <MenuItem value="DOCUMENT">{"Document"}</MenuItem>
                  <MenuItem value="EXTERNAL_LINK">{"Lien externe"}</MenuItem>
                  <MenuItem value="SCORM">{"SCORM ZIP"}</MenuItem>
                </TextField>

                <TextField
                  label={"Titre affiché à l’apprenant"}
                  value={resourceForm.title}
                  onChange={(event) =>
                    setResourceForm({
                      ...resourceForm,
                      title: event.target.value,
                    })
                  }
                  placeholder={"Ex. Vidéo — les trois réflexes essentiels"}
                  helperText={"Nommez précisément le média, le document ou le complément."}
                  disabled={!selectedLesson}
                  required
                  fullWidth
                />

                <TextField
                  label={"Introduction de la ressource (facultative)"}
                  value={resourceForm.description}
                  onChange={(event) =>
                    setResourceForm({
                      ...resourceForm,
                      description: event.target.value,
                    })
                  }
                  placeholder={"Expliquez en une phrase pourquoi cette ressource est utile."}
                  helperText={"Évitez de répéter le titre ou le contenu principal de la leçon."}
                  disabled={!selectedLesson}
                  multiline
                  minRows={2}
                  fullWidth
                />

                {resourceForm.type === "TEXT" ? (
                  <TextField
                    label={"Texte à retenir ou complément"}
                    value={resourceForm.content}
                    onChange={(event) =>
                      setResourceForm({
                        ...resourceForm,
                        content: event.target.value,
                      })
                    }
                    placeholder={"Ajoutez une synthèse, un exemple ou un point à retenir."}
                    helperText={"Ne recopiez pas l’explication principale de la leçon."}
                    disabled={!selectedLesson}
                    multiline
                    minRows={4}
                    fullWidth
                  />
                ) : null}

                {resourceForm.type === "EXTERNAL_LINK" ? (
                  <TextField
                    type="url"
                    label={"URL"}
                    value={resourceForm.content}
                    onChange={(event) =>
                      setResourceForm({
                        ...resourceForm,
                        content: event.target.value,
                      })
                    }
                    placeholder={"https://..."}
                    disabled={!selectedLesson}
                    fullWidth
                  />
                ) : null}

                {!["TEXT", "EXTERNAL_LINK"].includes(
                  resourceForm.type,
                ) ? (
                  <Box
                    sx={{
                      p: 1.5,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 2,
                    }}
                  >
                    <Stack spacing={1}>
                      <Button
                        component="label"
                        variant="outlined"
                        startIcon={<Upload size={16} />}
                        disabled={!selectedLesson}
                      >
                        {"Choisir un fichier"}
                        <input
                          hidden
                          key={`${resourceForm.type}-${selectedLessonId}`}
                          type="file"
                          accept={acceptedFileTypes(resourceForm.type)}
                          onChange={handleResourceFile}
                          disabled={!selectedLesson}
                        />
                      </Button>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ overflowWrap: "anywhere" }}
                      >
                        {resourceForm.file
                          ? resourceForm.file.name
                          : "Aucun fichier s\u00e9lectionn\u00e9"}
                      </Typography>

                      {resourceForm.type === "VIDEO" ? (
                        <Typography variant="caption" color="text.secondary">
                          {"Format attendu : MP4."}
                        </Typography>
                      ) : null}

                      {resourceForm.type === "SCORM" ? (
                        <Typography variant="caption" color="text.secondary">
                          {
                            "Package ZIP SCORM contenant un imsmanifest.xml valide."
                          }
                        </Typography>
                      ) : null}
                    </Stack>
                  </Box>
                ) : null}

                <TextField
                  label={"Ordre"}
                  type="number"
                  value={resourceForm.orderIndex}
                  onChange={(event) =>
                    setResourceForm({
                      ...resourceForm,
                      orderIndex: Number(event.target.value),
                    })
                  }
                  disabled={!selectedLesson}
                  slotProps={{
                    htmlInput: { min: 1 },
                  }}
                  fullWidth
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={!selectedLesson || uploading}
                  startIcon={
                    uploading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Upload size={16} />
                    )
                  }
                >
                  {uploading
                    ? "Import en cours..."
                    : resourceForm.type === "TEXT" ||
                        resourceForm.type === "EXTERNAL_LINK"
                      ? "Ajouter la ressource"
                      : "Importer le fichier"}
                </Button>
              </Stack>
            </Box>
          </SmartSectionCard>
        </Stack>
      </Box>

      <Box id="authoring-quiz" sx={{ scrollMarginTop: 96 }}>
        <QuizBuilderPanel
          trainingId={training.id}
          modules={modules.map((module) => ({
            id: module.id,
            title: module.title,
          }))}
        />
      </Box>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        aria-labelledby="training-content-preview-title"
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle id="training-content-preview-title">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{
              justifyContent: "space-between",
              alignItems: { sm: "center" },
            }}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                {"Mode lecture - sans progression"}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 850 }}>
                {training.title}
              </Typography>
            </Box>
            <Chip
              icon={<Eye size={15} />}
              label={"Pr\u00e9visualisation formateur"}
              variant="outlined"
            />
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Alert severity="info">
              {
                "Cette pr\u00e9visualisation ne cr\u00e9e aucune progression apprenant."
              }
            </Alert>

            {modules.length ? (
              modules.map((module) => (
                <Box
                  key={module.id}
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    p: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 850 }}>
                    {module.title}
                  </Typography>

                  {module.description ? (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.75, mb: 2 }}
                    >
                      {module.description}
                    </Typography>
                  ) : null}

                  <Stack spacing={2}>
                    {sortByOrder(module.lessons).map((lesson) => (
                      <Box
                        key={lesson.id}
                        sx={{
                          pl: { sm: 2 },
                          borderLeft: { sm: 2 },
                          borderColor: { sm: "divider" },
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 800 }}
                        >
                          {lesson.title}
                        </Typography>

                        {lesson.objective ? (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            <strong>{"Objectif : "}</strong>
                            {lesson.objective}
                          </Alert>
                        ) : null}

                        {lesson.description ? (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.75 }}
                          >
                            {lesson.description}
                          </Typography>
                        ) : null}

                        {lesson.content ? (
                          <Typography
                            variant="body2"
                            sx={{
                              mt: 0.75,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {lesson.content}
                          </Typography>
                        ) : null}

                        <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                          {sortByOrder(lesson.resources).map(
                            (resource) => {
                              const url = resourceUrl(resource);

                              return (
                                <Box
                                  key={resource.id}
                                  sx={{
                                    p: 1.5,
                                    border: 1,
                                    borderColor: "divider",
                                    borderRadius: 2,
                                  }}
                                >
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{ alignItems: "center" }}
                                  >
                                    {resourceIcon(resource.type)}
                                    <Typography
                                      variant="subtitle2"
                                      sx={{ fontWeight: 800 }}
                                    >
                                      {resource.title}
                                    </Typography>
                                    <Chip
                                      size="small"
                                      variant="outlined"
                                      label={resourceLabel(resource.type)}
                                    />
                                  </Stack>

                                  {resource.type === "TEXT" ? (
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        mt: 1,
                                        whiteSpace: "pre-wrap",
                                      }}
                                    >
                                      {resource.textContent}
                                    </Typography>
                                  ) : null}

                                  {resource.type === "IMAGE" && url ? (
                                    <Box sx={{ mt: 1 }}>
                                      <AuthenticatedMediaRenderer
                                        sourceUrl={url}
                                        title={resource.title}
                                        kind="IMAGE"
                                      />
                                    </Box>
                                  ) : null}

                                  {(resource.type === "VIDEO" ||
                                    resource.type === "VIDEO_URL") &&
                                  url ? (
                                    <Box sx={{ mt: 1 }}>
                                      <AuthenticatedMediaRenderer
                                        sourceUrl={url}
                                        title={resource.title}
                                        kind="VIDEO"
                                      />
                                    </Box>
                                  ) : null}

                                  {(resource.type === "PDF" ||
                                    resource.type === "PDF_URL") &&
                                  url ? (
                                    <Box sx={{ mt: 1 }}>
                                      <AuthenticatedMediaRenderer
                                        sourceUrl={url}
                                        title={resource.title}
                                        kind="PDF"
                                      />
                                    </Box>
                                  ) : null}

                                  {resource.type === "SCORM" ? (
                                    <Button
                                      type="button"
                                      variant="text"
                                      startIcon={<ExternalLink size={15} />}
                                      sx={{ mt: 0.75 }}
                                      onClick={() => {
                                        void openScormAuthorPreview(
                                          resource.id,
                                        ).catch((err) =>
                                          setError(
                                            getApiErrorMessage(err),
                                          ),
                                        );
                                      }}
                                    >
                                      {"Lancer le SCORM"}
                                    </Button>
                                  ) : resource.type === "DOCUMENT" &&
                                    url ? (
                                    <Button
                                      type="button"
                                      variant="text"
                                      startIcon={<ExternalLink size={15} />}
                                      sx={{ mt: 0.75 }}
                                      onClick={() => {
                                        void openAuthenticatedResource(
                                          url,
                                        ).catch((err) =>
                                          setError(
                                            getApiErrorMessage(err),
                                          ),
                                        );
                                      }}
                                    >
                                      {"Ouvrir le document"}
                                    </Button>
                                  ) : resource.type === "EXTERNAL_LINK" &&
                                    url ? (
                                    <Button
                                      component="a"
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      variant="text"
                                      startIcon={<ExternalLink size={15} />}
                                      sx={{ mt: 0.75 }}
                                    >
                                      {"Ouvrir le lien"}
                                    </Button>
                                  ) : null}
                                </Box>
                              );
                            },
                          )}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ))
            ) : (
              <Alert severity="info">
                {"Aucun contenu \u00e0 pr\u00e9visualiser."}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            type="button"
            variant="contained"
            startIcon={<X size={16} />}
            onClick={() => setPreviewOpen(false)}
          >
            {"Fermer"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!deleting) {
            setPendingDelete(null);
          }
        }}
        aria-labelledby="training-content-delete-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="training-content-delete-title">
          {pendingDelete?.kind === "MODULE"
            ? "Supprimer le module"
            : pendingDelete?.kind === "LESSON"
              ? "Supprimer la le\u00e7on"
              : "Supprimer la ressource"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="warning">
              {pendingDelete?.kind === "MODULE"
                ? "La suppression du module peut \u00e9galement supprimer les le\u00e7ons associ\u00e9es. Cette action est d\u00e9finitive."
                : pendingDelete?.kind === "LESSON"
                  ? "Cette le\u00e7on sera supprim\u00e9e. Cette action est d\u00e9finitive."
                  : "Cette ressource sera supprim\u00e9e. Cette action est d\u00e9finitive."}
            </Alert>

            <Box>
              <Typography variant="caption" color="text.secondary">
                {"\u00c9l\u00e9ment concern\u00e9"}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {pendingDelete?.item.title || "-"}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            type="button"
            variant="outlined"
            disabled={deleting}
            onClick={() => setPendingDelete(null)}
          >
            {"Annuler"}
          </Button>
          <Button
            type="button"
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={
              deleting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Trash2 size={16} />
              )
            }
            onClick={() => void confirmDelete()}
          >
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
