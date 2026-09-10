import { SymbolView } from "expo-symbols";
import { Href, router } from "expo-router";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import { AppConfirmSheet } from "../../components/ux/AppStates";
import {
  createTrainerLesson,
  createTrainerModule,
  deleteTrainerLesson,
  deleteTrainerModule,
  getTrainerFullTraining,
  updateTrainerLesson,
  updateTrainerModule,
} from "../../features/trainer/trainerAuthoringService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  MobileLessonCompletionRule,
  TrainerFullLessonResponse,
  TrainerFullModuleResponse,
  TrainerFullTrainingResponse,
} from "../../types/trainerAuthoringMobile";

type Props = {
  trainingId: number;
  trainerId: number;
};

type ModuleDraft = {
  id?: number;
  title: string;
  description: string;
  orderIndex: string;
};

type LessonDraft = {
  id?: number;
  moduleId: number;
  title: string;
  description: string;
  objective: string;
  content: string;
  orderIndex: string;
  estimatedDurationMinutes: string;
  required: boolean;
  completionRule: MobileLessonCompletionRule;
};

type DeleteTarget =
  | {
      kind: "MODULE";
      item: TrainerFullModuleResponse;
    }
  | {
      kind: "LESSON";
      item: TrainerFullLessonResponse;
      moduleId: number;
    };

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type Tone = "violet" | "blue" | "green" | "orange" | "red";

const TONES: Record<Tone, { soft: string; icon: string }> = {
  violet: { soft: "#F1E9FF", icon: "#7C3AED" },
  blue: { soft: "#EAF2FF", icon: "#397BE8" },
  green: { soft: "#EAFBF3", icon: "#12A66A" },
  orange: { soft: "#FFF4E5", icon: "#F59E0B" },
  red: { soft: "#FFF0F1", icon: "#E5484D" },
};

const emptyModuleDraft: ModuleDraft = {
  title: "",
  description: "",
  orderIndex: "1",
};

const completionRules: {
  value: MobileLessonCompletionRule;
  label: string;
}[] = [
  {
    value: "ALL_REQUIRED_BLOCKS",
    label: "Tous les blocs requis",
  },
  {
    value: "MANUAL",
    label: "Validation manuelle",
  },
  {
    value: "OPENED",
    label: "Ouverture de la leçon",
  },
  {
    value: "ASSESSMENT_PASSED",
    label: "Évaluation réussie",
  },
  {
    value: "SCORM_COMPLETED",
    label: "SCORM terminé",
  },
];

function normalizedPedagogicalText(value?: string): string {
  return (value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("fr");
}

function samePedagogicalText(left?: string, right?: string): boolean {
  const normalizedLeft = normalizedPedagogicalText(left);

  return Boolean(
    normalizedLeft &&
      normalizedLeft === normalizedPedagogicalText(right),
  );
}

function apiErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const response = (
    error as { response?: { data?: unknown } }
  ).response;
  const data = response?.data;

  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

  if (data && typeof data === "object") {
    const payload = data as Record<string, unknown>;

    for (const key of ["message", "detail", "error"]) {
      const value = payload[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    for (const value of Object.values(payload)) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
}

function errorText(error: unknown): string {
  const backendMessage = apiErrorMessage(error);

  if (backendMessage) {
    return backendMessage;
  }

  if (
    error instanceof Error &&
    error.message &&
    !/^Request failed with status code \d+$/i.test(error.message)
  ) {
    return error.message;
  }

  return "L’opération n’a pas pu être réalisée.";
}

function completionLabel(value?: string): string {
  return (
    completionRules.find((rule) => rule.value === value)?.label ??
    value ??
    "Tous les blocs requis"
  );
}

function FieldLabel({ text }: { text: string }) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Text
      className="mb-1.5 text-[11px] font-black"
      style={{ color: theme.colors.foregroundMuted }}
    >
      {text}
    </Text>
  );
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
      accessibilityLabel={props.accessibilityLabel}
      multiline={multiline}
      placeholderTextColor={theme.colors.foregroundSubtle}
      className={[
        "mb-3.5 min-h-[48px] rounded-[14px] border px-3.5 py-3 text-[13px]",
        multiline ? "min-h-[86px]" : "",
        large ? "min-h-[120px]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        color: theme.colors.foreground,
        backgroundColor: "#FBFAF8",
        borderColor: "#E2DCE6",
        textAlignVertical: multiline ? "top" : "center",
      }}
    />
  );
}

export default function TrainerTrainingContentScreen({
  trainingId,
  trainerId,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [training, setTraining] =
    useState<TrainerFullTrainingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [moduleEditorOpen, setModuleEditorOpen] = useState(false);
  const [moduleDraft, setModuleDraft] =
    useState<ModuleDraft>(emptyModuleDraft);
  const [moduleDraftBaseline, setModuleDraftBaseline] = useState(
    () => JSON.stringify(emptyModuleDraft),
  );

  const [lessonEditorOpen, setLessonEditorOpen] = useState(false);
  const [lessonDraft, setLessonDraft] =
    useState<LessonDraft | null>(null);
  const [lessonDraftBaseline, setLessonDraftBaseline] = useState("");
  const [lessonAdvancedOpen, setLessonAdvancedOpen] =
    useState(false);
  const [discardDraftKind, setDiscardDraftKind] = useState<
    "MODULE" | "LESSON" | null
  >(null);

  const [deleteTarget, setDeleteTarget] =
    useState<DeleteTarget | null>(null);

  const modules = useMemo<TrainerFullModuleResponse[]>(
    () =>
      [...(training?.modules ?? [])].sort(
        (left, right) =>
          (left.orderIndex ?? 0) - (right.orderIndex ?? 0),
      ),
    [training],
  );

  const totalLessons = useMemo(
    () =>
      modules.reduce(
        (total, module) => total + (module.lessons?.length ?? 0),
        0,
      ),
    [modules],
  );

  const totalResources = useMemo(
    () =>
      modules.reduce(
        (moduleTotal, module) =>
          moduleTotal +
          (module.lessons ?? []).reduce(
            (lessonTotal, lesson) =>
              lessonTotal + (lesson.resources?.length ?? 0),
            0,
          ),
        0,
      ),
    [modules],
  );

  async function load() {
    const loaded = await getTrainerFullTraining(trainingId);

    if (loaded.trainerId !== trainerId) {
      throw new Error(
        "Cette formation n’appartient pas à ce compte formateur.",
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
  }, [trainerId, trainingId]);

  const moduleDraftDirty =
    moduleEditorOpen &&
    JSON.stringify(moduleDraft) !== moduleDraftBaseline;

  const lessonDraftDirty =
    lessonEditorOpen &&
    lessonDraft !== null &&
    JSON.stringify(lessonDraft) !== lessonDraftBaseline;

  const hasUnsavedDraft = moduleDraftDirty || lessonDraftDirty;

  useEffect(() => {
    if (!hasUnsavedDraft || working) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setDiscardDraftKind(
          moduleDraftDirty ? "MODULE" : "LESSON",
        );
        return true;
      },
    );

    return () => subscription.remove();
  }, [
    hasUnsavedDraft,
    lessonDraftDirty,
    moduleDraftDirty,
    working,
  ]);

  function requestCloseModuleEditor() {
    if (working) {
      return;
    }

    if (moduleDraftDirty) {
      setDiscardDraftKind("MODULE");
      return;
    }

    setModuleEditorOpen(false);
  }

  function requestCloseLessonEditor() {
    if (working) {
      return;
    }

    if (lessonDraftDirty) {
      setDiscardDraftKind("LESSON");
      return;
    }

    setLessonEditorOpen(false);
    setLessonDraft(null);
    setLessonDraftBaseline("");
  }

  function confirmDiscardDraft() {
    if (discardDraftKind === "MODULE") {
      setModuleEditorOpen(false);
      setModuleDraftBaseline(JSON.stringify(moduleDraft));
    } else if (discardDraftKind === "LESSON") {
      setLessonEditorOpen(false);
      setLessonDraft(null);
      setLessonDraftBaseline("");
    }

    setDiscardDraftKind(null);
  }

  function openCreateModule() {
    const nextOrder =
      modules.length === 0
        ? 1
        : Math.max(
            ...modules.map((module) => module.orderIndex ?? 0),
          ) + 1;

    const nextDraft: ModuleDraft = {
      title: "",
      description: "",
      orderIndex: String(nextOrder),
    };

    setModuleDraft(nextDraft);
    setModuleDraftBaseline(JSON.stringify(nextDraft));
    setError("");
    setNotice("");
    setModuleEditorOpen(true);
  }

  function openEditModule(module: TrainerFullModuleResponse) {
    const nextDraft = {
      id: module.id,
      title: module.title || "",
      description: module.description || "",
      orderIndex: String(module.orderIndex ?? 1),
    };

    setModuleDraft(nextDraft);
    setModuleDraftBaseline(JSON.stringify(nextDraft));
    setModuleEditorOpen(true);
  }

  async function saveModule() {
    if (working) {
      return;
    }

    const title = moduleDraft.title.trim();
    const orderIndex = Number(moduleDraft.orderIndex);

    if (!title) {
      setError("Le titre du module est obligatoire.");
      return;
    }

    if (!Number.isInteger(orderIndex) || orderIndex <= 0) {
      setError("L’ordre du module doit être un entier positif.");
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    try {
      const request = {
        trainingId,
        title,
        description: moduleDraft.description.trim(),
        orderIndex,
      };

      if (moduleDraft.id) {
        await updateTrainerModule(moduleDraft.id, request);
        setNotice("Module modifié.");
      } else {
        await createTrainerModule(request);
        setNotice("Module créé.");
      }

      setModuleEditorOpen(false);
      setModuleDraftBaseline(JSON.stringify(moduleDraft));
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setWorking(false);
    }
  }

  function sortedLessons(
    module: TrainerFullModuleResponse,
  ): TrainerFullLessonResponse[] {
    return [...(module.lessons ?? [])].sort(
      (left, right) =>
        (left.orderIndex ?? 0) - (right.orderIndex ?? 0),
    );
  }

  function openCreateLesson(module: TrainerFullModuleResponse) {
    const lessons = sortedLessons(module);

    const nextOrder =
      lessons.length === 0
        ? 1
        : Math.max(
            ...lessons.map((lesson) => lesson.orderIndex ?? 0),
          ) + 1;

    const nextDraft: LessonDraft = {
      moduleId: module.id,
      title: "",
      description: "",
      objective: "",
      content: "",
      orderIndex: String(nextOrder),
      estimatedDurationMinutes: "10",
      required: true,
      completionRule: "ALL_REQUIRED_BLOCKS",
    };

    setLessonDraft(nextDraft);
    setLessonDraftBaseline(JSON.stringify(nextDraft));
    setLessonAdvancedOpen(false);
    setError("");
    setNotice("");
    setLessonEditorOpen(true);
  }

  function openEditLesson(
    module: TrainerFullModuleResponse,
    lesson: TrainerFullLessonResponse,
  ) {
    const nextDraft: LessonDraft = {
      id: lesson.id,
      moduleId: module.id,
      title: lesson.title,
      description: lesson.description || "",
      objective: lesson.objective || "",
      content: lesson.content || "",
      orderIndex: String(lesson.orderIndex ?? 1),
      estimatedDurationMinutes: String(
        lesson.estimatedDurationMinutes ?? 10,
      ),
      required: lesson.required !== false,
      completionRule:
        lesson.completionRule &&
        completionRules.some(
          (rule) => rule.value === lesson.completionRule,
        )
          ? (lesson.completionRule as MobileLessonCompletionRule)
          : "ALL_REQUIRED_BLOCKS",
    };

    setLessonDraft(nextDraft);
    setLessonDraftBaseline(JSON.stringify(nextDraft));
    setLessonAdvancedOpen(false);
    setError("");
    setNotice("");
    setLessonEditorOpen(true);
  }

  async function saveLesson() {
    if (!lessonDraft || working) {
      return;
    }

    const title = lessonDraft.title.trim();
    const orderIndex = Number(lessonDraft.orderIndex);
    const duration = Number(lessonDraft.estimatedDurationMinutes);
    const description = lessonDraft.description.trim();
    const objective = lessonDraft.objective.trim();
    const content = lessonDraft.content.trim();

    if (!title) {
      setError("Le titre de la leçon est obligatoire.");
      return;
    }

    if (samePedagogicalText(title, description)) {
      setError(
        "L’introduction ne doit pas répéter exactement le titre de la leçon.",
      );
      return;
    }

    if (
      samePedagogicalText(content, description) ||
      samePedagogicalText(content, objective)
    ) {
      setError(
        "L’explication principale doit être différente de l’introduction et de l’objectif.",
      );
      return;
    }

    if (!Number.isInteger(orderIndex) || orderIndex <= 0) {
      setError("L’ordre de la leçon doit être un entier positif.");
      return;
    }

    if (!Number.isInteger(duration) || duration < 0) {
      setError(
        "La durée estimée doit être un entier positif ou nul.",
      );
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    try {
      const request = {
        moduleId: lessonDraft.moduleId,
        title,
        description,
        objective,
        content,
        orderIndex,
        estimatedDurationMinutes: duration,
        required: lessonDraft.required,
        completionRule: lessonDraft.completionRule,
      };

      if (lessonDraft.id) {
        await updateTrainerLesson(lessonDraft.id, request);
        setNotice("Leçon modifiée.");
      } else {
        await createTrainerLesson(request);
        setNotice("Leçon créée.");
      }

      setLessonEditorOpen(false);
      setLessonDraft(null);
      setLessonDraftBaseline("");
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setWorking(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || working) {
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    try {
      if (deleteTarget.kind === "MODULE") {
        await deleteTrainerModule(deleteTarget.item.id);
        setNotice("Module supprimé.");
      } else {
        await deleteTrainerLesson(deleteTarget.item.id);
        setNotice("Leçon supprimée.");
      }

      setDeleteTarget(null);
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setWorking(false);
    }
  }

  async function moveModule(
    module: TrainerFullModuleResponse,
    direction: -1 | 1,
  ) {
    if (!editable || working) {
      return;
    }

    const index = modules.findIndex(
      (item) => item.id === module.id,
    );
    const target = modules[index + direction];

    if (!target) {
      return;
    }

    const currentOrder = module.orderIndex ?? index + 1;
    const targetOrder =
      target.orderIndex ?? index + direction + 1;

    setWorking(true);
    setError("");
    setNotice("");

    try {
      await Promise.all([
        updateTrainerModule(module.id, {
          trainingId,
          title: module.title,
          description: module.description || "",
          orderIndex: targetOrder,
        }),
        updateTrainerModule(target.id, {
          trainingId,
          title: target.title,
          description: target.description || "",
          orderIndex: currentOrder,
        }),
      ]);

      setNotice("Ordre des modules mis à jour.");
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setWorking(false);
    }
  }

  async function moveLesson(
    module: TrainerFullModuleResponse,
    lesson: TrainerFullLessonResponse,
    direction: -1 | 1,
  ) {
    if (!editable || working) {
      return;
    }

    const lessons = sortedLessons(module);
    const index = lessons.findIndex(
      (item) => item.id === lesson.id,
    );
    const target = lessons[index + direction];

    if (!target) {
      return;
    }

    const currentOrder = lesson.orderIndex ?? index + 1;
    const targetOrder =
      target.orderIndex ?? index + direction + 1;

    const completionRule = (
      value?: string,
    ): MobileLessonCompletionRule =>
      completionRules.some((rule) => rule.value === value)
        ? (value as MobileLessonCompletionRule)
        : "ALL_REQUIRED_BLOCKS";

    setWorking(true);
    setError("");
    setNotice("");

    try {
      await Promise.all([
        updateTrainerLesson(lesson.id, {
          moduleId: module.id,
          title: lesson.title,
          description: lesson.description || "",
          objective: lesson.objective || "",
          content: lesson.content || "",
          orderIndex: targetOrder,
          estimatedDurationMinutes:
            lesson.estimatedDurationMinutes ?? 0,
          required: lesson.required !== false,
          completionRule: completionRule(lesson.completionRule),
        }),
        updateTrainerLesson(target.id, {
          moduleId: module.id,
          title: target.title,
          description: target.description || "",
          objective: target.objective || "",
          content: target.content || "",
          orderIndex: currentOrder,
          estimatedDurationMinutes:
            target.estimatedDurationMinutes ?? 0,
          required: target.required !== false,
          completionRule: completionRule(target.completionRule),
        }),
      ]);

      setNotice("Ordre des leçons mis à jour.");
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement du contenu..." />;
  }

  if (!training) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message={error || "Formation indisponible."}
          onRetry={() => {
            setLoading(true);
            setError("");

            void load()
              .catch((caught) => setError(errorText(caught)))
              .finally(() => setLoading(false));
          }}
        />
      </ScreenContainer>
    );
  }

  const editable = training.status === "DRAFT";

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
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-[760px] px-4">
          {/* HERO */}
          <View
            className="-mx-4 rounded-b-[26px] px-5 pb-5 pt-4"
            style={{
              backgroundColor: theme.colors.headerBackground,
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View className="flex-row items-start">
              <View
                className="h-[52px] w-[52px] items-center justify-center rounded-[16px]"
                style={{ backgroundColor: "#2B1A49" }}
              >
                <SymbolView
                  name={{
                    ios: "books.vertical.fill",
                    android: "menu_book",
                    web: "menu_book",
                  }}
                  tintColor="#C4B5FD"
                  size={22}
                  weight="bold"
                />
              </View>

              <View className="ml-3 min-w-0 flex-1">
                <Text className="text-[11px] font-black uppercase tracking-[0.8px] text-[#C4B5FD]">
                  Contenu pédagogique
                </Text>

                <Text className="mt-1 text-[23px] font-black leading-[29px] text-white">
                  {training.title}
                </Text>

                <Text className="mt-2 text-[11px] leading-[17px] text-white/70">
                  Structurez les modules, les leçons et leurs ressources.
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row flex-wrap gap-2">
              <HeroPill
                icon={{
                  ios: "rectangle.stack.fill",
                  android: "view_module",
                  web: "view_module",
                }}
                value={`${modules.length} module${
                  modules.length > 1 ? "s" : ""
                }`}
              />

              <HeroPill
                icon={{
                  ios: "doc.text.fill",
                  android: "description",
                  web: "description",
                }}
                value={`${totalLessons} leçon${
                  totalLessons > 1 ? "s" : ""
                }`}
              />

              <HeroPill
                icon={{
                  ios: "paperclip",
                  android: "attach_file",
                  web: "attach_file",
                }}
                value={`${totalResources} ressource${
                  totalResources > 1 ? "s" : ""
                }`}
              />
            </View>
          </View>

          {/* STATUT + CTA */}
          <View
            className="mt-4 rounded-[20px] border bg-white p-3.5"
            style={cardStyle}
          >
            <View className="flex-row items-center">
              <View
                className="h-10 w-10 items-center justify-center rounded-[13px]"
                style={{
                  backgroundColor: editable
                    ? TONES.green.soft
                    : TONES.orange.soft,
                }}
              >
                <SymbolView
                  name={
                    editable
                      ? {
                          ios: "pencil",
                          android: "edit",
                          web: "edit",
                        }
                      : {
                          ios: "lock.fill",
                          android: "lock",
                          web: "lock",
                        }
                  }
                  tintColor={
                    editable
                      ? TONES.green.icon
                      : TONES.orange.icon
                  }
                  size={17}
                  weight="bold"
                />
              </View>

              <View className="ml-3 min-w-0 flex-1">
                <Text
                  className="text-[13px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  {editable
                    ? "Brouillon modifiable"
                    : "Contenu verrouillé"}
                </Text>

                <Text
                  className="mt-0.5 text-[11px] leading-[17px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {editable
                    ? "Modules et leçons peuvent être modifiés."
                    : "Remettez la formation en brouillon pour modifier son contenu."}
                </Text>
              </View>

              {editable ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Nouveau module"
                  onPress={openCreateModule}
                  android_ripple={{ color: "transparent" }}
                  className="ml-2 flex-row items-center rounded-[13px] px-3 py-2.5"
                  style={{ backgroundColor: theme.colors.accent }}
                >
                  <SymbolView
                    name={{
                      ios: "plus",
                      android: "add",
                      web: "add",
                    }}
                    tintColor="#FFFFFF"
                    size={14}
                    weight="bold"
                  />

                  <Text className="ml-1.5 text-[11px] font-black text-white">
                    Module
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

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
              className="mt-4 flex-row items-center rounded-[16px] border p-3"
              style={{
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.border,
              }}
            >
              <View className="h-8 w-8 items-center justify-center rounded-full bg-white">
                <SymbolView
                  name={{
                    ios: "checkmark",
                    android: "check",
                    web: "check",
                  }}
                  tintColor={theme.colors.success}
                  size={14}
                  weight="bold"
                />
              </View>

              <Text
                className="ml-2.5 flex-1 text-[11px] font-extrabold"
                style={{ color: theme.colors.foreground }}
              >
                {notice}
              </Text>
            </View>
          ) : null}

          <View className="mb-3 mt-5 flex-row items-center">
            <View
              className="h-[42px] w-[42px] items-center justify-center rounded-[14px]"
              style={{ backgroundColor: theme.colors.surfaceSoft }}
            >
              <SymbolView
                name={{
                  ios: "rectangle.stack.fill",
                  android: "view_module",
                  web: "view_module",
                }}
                tintColor={theme.colors.accent}
                size={18}
                weight="bold"
              />
            </View>

            <View className="ml-2.5 flex-1">
              <Text
                className="text-[21px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Structure
              </Text>

              <Text
                className="mt-0.5 text-[11px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                {modules.length} module{modules.length > 1 ? "s" : ""} dans
                cette formation
              </Text>
            </View>
          </View>

          {modules.length === 0 ? (
            <View
              className="items-center rounded-[22px] border bg-white px-5 py-8"
              style={cardStyle}
            >
              <View
                className="h-[66px] w-[66px] items-center justify-center rounded-full"
                style={{ backgroundColor: theme.colors.surfaceSoft }}
              >
                <SymbolView
                  name={{
                    ios: "rectangle.stack.badge.plus",
                    android: "library_add",
                    web: "library_add",
                  }}
                  tintColor={theme.colors.accent}
                  size={26}
                  weight="bold"
                />
              </View>

              <Text
                className="mt-4 text-[17px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Aucun module
              </Text>

              <Text
                className="mt-1.5 text-center text-[11px] leading-[17px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Commencez par créer le premier module.
              </Text>

              {editable ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={openCreateModule}
                  android_ripple={{ color: "transparent" }}
                  className="mt-4 flex-row items-center rounded-[14px] px-4 py-3"
                  style={{ backgroundColor: theme.colors.accent }}
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
                    Nouveau module
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            modules.map((module, moduleIndex) => {
              const lessons = sortedLessons(module);
              const moduleResourceCount = lessons.reduce(
                (total, lesson) =>
                  total + (lesson.resources?.length ?? 0),
                0,
              );

              return (
                <View
                  key={module.id}
                  className="mb-4 overflow-hidden rounded-[22px] border bg-white"
                  style={cardStyle}
                >
                  {/* MODULE HEADER */}
                  <View className="p-3.5">
                    <View className="flex-row items-start">
                      <View
                        className="h-11 w-11 items-center justify-center rounded-[14px]"
                        style={{
                          backgroundColor: theme.colors.surfaceSoft,
                        }}
                      >
                        <Text
                          className="text-[15px] font-black"
                          style={{ color: theme.colors.accent }}
                        >
                          {module.orderIndex ?? "-"}
                        </Text>
                      </View>

                      <View className="ml-3 min-w-0 flex-1">
                        <Text
                          className="text-[17px] font-black leading-[22px]"
                          style={{ color: theme.colors.foreground }}
                        >
                          {module.title}
                        </Text>

                        {module.description ? (
                          <Text
                            className="mt-1 text-[11px] leading-[17px]"
                            style={{
                              color: theme.colors.foregroundMuted,
                            }}
                          >
                            {module.description}
                          </Text>
                        ) : null}

                        <View className="mt-2 flex-row flex-wrap gap-1.5">
                          <InfoPill
                            icon={{
                              ios: "doc.text.fill",
                              android: "description",
                              web: "description",
                            }}
                            value={`${lessons.length} leçon${
                              lessons.length > 1 ? "s" : ""
                            }`}
                          />

                          <InfoPill
                            icon={{
                              ios: "paperclip",
                              android: "attach_file",
                              web: "attach_file",
                            }}
                            value={`${moduleResourceCount} ressource${
                              moduleResourceCount > 1 ? "s" : ""
                            }`}
                          />
                        </View>
                      </View>
                    </View>

                    {editable ? (
                      <View className="mt-3 flex-row items-center gap-2">
                        <SmallAction
                          label="Monter"
                          icon={{
                            ios: "arrow.up",
                            android: "arrow_upward",
                            web: "arrow_upward",
                          }}
                          disabled={working || moduleIndex === 0}
                          onPress={() => void moveModule(module, -1)}
                        />

                        <SmallAction
                          label="Descendre"
                          icon={{
                            ios: "arrow.down",
                            android: "arrow_downward",
                            web: "arrow_downward",
                          }}
                          disabled={
                            working ||
                            moduleIndex === modules.length - 1
                          }
                          onPress={() => void moveModule(module, 1)}
                        />

                        <SmallAction
                          label="Modifier"
                          icon={{
                            ios: "pencil",
                            android: "edit",
                            web: "edit",
                          }}
                          onPress={() => openEditModule(module)}
                        />

                        <SmallAction
                          label="Supprimer"
                          icon={{
                            ios: "trash.fill",
                            android: "delete",
                            web: "delete",
                          }}
                          tone="red"
                          onPress={() =>
                            setDeleteTarget({
                              kind: "MODULE",
                              item: module,
                            })
                          }
                        />
                      </View>
                    ) : null}
                  </View>

                  {/* LESSONS */}
                  <View
                    className="border-t px-3.5 pb-3.5 pt-3"
                    style={{ borderTopColor: "#EEE9F0" }}
                  >
                    <View className="mb-2.5 flex-row items-center">
                      <Text
                        className="flex-1 text-[13px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        Leçons
                      </Text>

                      <View
                        className="rounded-full px-2.5 py-1"
                        style={{
                          backgroundColor: theme.colors.surfaceSoft,
                        }}
                      >
                        <Text
                          className="text-[11px] font-black"
                          style={{ color: theme.colors.accent }}
                        >
                          {lessons.length}
                        </Text>
                      </View>

                      {editable ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Nouvelle leçon dans ${module.title}`}
                          onPress={() => openCreateLesson(module)}
                          android_ripple={{ color: "transparent" }}
                          className="ml-2 flex-row items-center rounded-full px-2.5 py-1.5"
                          style={{ backgroundColor: theme.colors.accent }}
                        >
                          <SymbolView
                            name={{
                              ios: "plus",
                              android: "add",
                              web: "add",
                            }}
                            tintColor="#FFFFFF"
                            size={12}
                            weight="bold"
                          />

                          <Text className="ml-1 text-[11px] font-black text-white">
                            Leçon
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>

                    {lessons.length === 0 ? (
                      <View
                        className="rounded-[16px] px-3.5 py-4"
                        style={{ backgroundColor: "#FAF8FC" }}
                      >
                        <Text
                          className="text-center text-[10px]"
                          style={{
                            color: theme.colors.foregroundSubtle,
                          }}
                        >
                          Aucune leçon dans ce module.
                        </Text>
                      </View>
                    ) : (
                      lessons.map((lesson, lessonIndex) => (
                        <View
                          key={lesson.id}
                          className="mb-2.5 rounded-[18px] border bg-[#FCFBFD] p-3"
                          style={{ borderColor: "#E8E2EB" }}
                        >
                          <View className="flex-row items-start">
                            <View
                              className="h-9 w-9 items-center justify-center rounded-xl"
                              style={{
                                backgroundColor:
                                  theme.colors.surfaceSoft,
                              }}
                            >
                              <Text
                                className="text-[12px] font-black"
                                style={{ color: theme.colors.accent }}
                              >
                                {lesson.orderIndex ?? "-"}
                              </Text>
                            </View>

                            <View className="ml-2.5 min-w-0 flex-1">
                              <Text
                                className="text-[13px] font-black leading-[16px]"
                                style={{
                                  color: theme.colors.foreground,
                                }}
                              >
                                {lesson.title}
                              </Text>

                              <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                                <MetaPill
                                  icon={{
                                    ios: "clock.fill",
                                    android: "schedule",
                                    web: "schedule",
                                  }}
                                  text={`${
                                    lesson.estimatedDurationMinutes ?? 0
                                  } min`}
                                />

                                <MetaPill
                                  icon={{
                                    ios: lesson.required === false
                                      ? "circle"
                                      : "checkmark.circle.fill",
                                    android:
                                      lesson.required === false
                                        ? "radio_button_unchecked"
                                        : "check_circle",
                                    web:
                                      lesson.required === false
                                        ? "radio_button_unchecked"
                                        : "check_circle",
                                  }}
                                  text={
                                    lesson.required === false
                                      ? "Optionnelle"
                                      : "Obligatoire"
                                  }
                                />
                              </View>

                              <Text
                                className="mt-1.5 text-[10px]"
                                style={{
                                  color:
                                    theme.colors.foregroundSubtle,
                                }}
                              >
                                {completionLabel(
                                  lesson.completionRule,
                                )}
                              </Text>
                            </View>
                          </View>

                          {lesson.objective ? (
                            <View
                              className="mt-2.5 rounded-[13px] px-3 py-2.5"
                              style={{
                                backgroundColor:
                                  theme.colors.surfaceSoft,
                              }}
                            >
                              <Text
                                className="text-[11px] font-black uppercase tracking-[0.5px]"
                                style={{ color: theme.colors.accent }}
                              >
                                Objectif
                              </Text>

                              <Text
                                className="mt-1 text-[11px] leading-[17px]"
                                style={{
                                  color: theme.colors.foregroundMuted,
                                }}
                              >
                                {lesson.objective}
                              </Text>
                            </View>
                          ) : null}

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Ressources de ${lesson.title}`}
                            onPress={() =>
                              router.push(
                                `/trainer/trainings/${trainingId}/resources/${lesson.id}` as Href,
                              )
                            }
                            android_ripple={{ color: "transparent" }}
                            className="mt-2.5 flex-row items-center rounded-[14px] border bg-white px-3 py-2.5"
                            style={{ borderColor: "#E8E2EB" }}
                          >
                            <View
                              className="h-8 w-8 items-center justify-center rounded-[10px]"
                              style={{
                                backgroundColor: TONES.blue.soft,
                              }}
                            >
                              <SymbolView
                                name={{
                                  ios: "paperclip",
                                  android: "attach_file",
                                  web: "attach_file",
                                }}
                                tintColor={TONES.blue.icon}
                                size={14}
                                weight="bold"
                              />
                            </View>

                            <View className="ml-2.5 flex-1">
                              <Text
                                className="text-[11px] font-black"
                                style={{
                                  color: theme.colors.foreground,
                                }}
                              >
                                Ressources
                              </Text>

                              <Text
                                className="mt-0.5 text-[10px]"
                                style={{
                                  color:
                                    theme.colors.foregroundMuted,
                                }}
                              >
                                {lesson.resources?.length ?? 0} ressource
                                {(lesson.resources?.length ?? 0) > 1
                                  ? "s"
                                  : ""}
                              </Text>
                            </View>

                            <SymbolView
                              name={{
                                ios: "chevron.right",
                                android: "chevron_right",
                                web: "chevron_right",
                              }}
                              tintColor={
                                theme.colors.foregroundSubtle
                              }
                              size={15}
                              weight="bold"
                            />
                          </Pressable>

                          {editable ? (
                            <View className="mt-2.5 flex-row items-center gap-2">
                              <SmallAction
                                label="Monter"
                                icon={{
                                  ios: "arrow.up",
                                  android: "arrow_upward",
                                  web: "arrow_upward",
                                }}
                                disabled={
                                  working || lessonIndex === 0
                                }
                                onPress={() =>
                                  void moveLesson(
                                    module,
                                    lesson,
                                    -1,
                                  )
                                }
                              />

                              <SmallAction
                                label="Descendre"
                                icon={{
                                  ios: "arrow.down",
                                  android: "arrow_downward",
                                  web: "arrow_downward",
                                }}
                                disabled={
                                  working ||
                                  lessonIndex ===
                                    lessons.length - 1
                                }
                                onPress={() =>
                                  void moveLesson(
                                    module,
                                    lesson,
                                    1,
                                  )
                                }
                              />

                              <SmallAction
                                label="Modifier"
                                icon={{
                                  ios: "pencil",
                                  android: "edit",
                                  web: "edit",
                                }}
                                onPress={() =>
                                  openEditLesson(module, lesson)
                                }
                              />

                              <SmallAction
                                label="Supprimer"
                                icon={{
                                  ios: "trash.fill",
                                  android: "delete",
                                  web: "delete",
                                }}
                                tone="red"
                                onPress={() =>
                                  setDeleteTarget({
                                    kind: "LESSON",
                                    item: lesson,
                                    moduleId: module.id,
                                  })
                                }
                              />
                            </View>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* MODULE EDITOR */}
      <Modal
        visible={moduleEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={requestCloseModuleEditor}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalShell}>
            <View className="flex-row items-center">
              <View
                className="h-10 w-10 items-center justify-center rounded-[13px]"
                style={{ backgroundColor: theme.colors.surfaceSoft }}
              >
                <SymbolView
                  name={{
                    ios: "rectangle.stack.fill",
                    android: "view_module",
                    web: "view_module",
                  }}
                  tintColor={theme.colors.accent}
                  size={17}
                  weight="bold"
                />
              </View>

              <View className="ml-2.5 flex-1">
                <Text
                  className="text-[20px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  {moduleDraft.id
                    ? "Modifier le module"
                    : "Nouveau module"}
                </Text>

                <Text
                  className="mt-0.5 text-[10px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Renseignez les informations du module.
                </Text>
              </View>
            </View>

            <View className="mt-5">
              <FieldLabel text="Titre" />
              <EditorInput
                accessibilityLabel="Titre du module"
                value={moduleDraft.title}
                onChangeText={(value) =>
                  setModuleDraft((current) => ({
                    ...current,
                    title: value,
                  }))
                }
                placeholder="Ex. Comprendre les fondamentaux"
              />

              <FieldLabel text="Description" />
              <EditorInput
                accessibilityLabel="Description du module"
                value={moduleDraft.description}
                onChangeText={(value) =>
                  setModuleDraft((current) => ({
                    ...current,
                    description: value,
                  }))
                }
                placeholder="Description du module..."
                multiline
              />

              <FieldLabel text="Ordre" />
              <EditorInput
                accessibilityLabel="Ordre du module"
                value={moduleDraft.orderIndex}
                onChangeText={(value) =>
                  setModuleDraft((current) => ({
                    ...current,
                    orderIndex: value,
                  }))
                }
                keyboardType="numeric"
                placeholder="1"
              />
            </View>

            <View className="mt-1 flex-row flex-wrap justify-end gap-2.5">
              <AppButton
                title="Annuler"
                variant="secondary"
                disabled={working}
                onPress={requestCloseModuleEditor}
                style={styles.modalButton}
              />

              <AppButton
                title={
                  working
                    ? "Enregistrement..."
                    : moduleDraft.id
                      ? "Enregistrer"
                      : "Créer le module"
                }
                loading={working}
                onPress={() => void saveModule()}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* LESSON EDITOR */}
      <Modal
        visible={lessonEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={requestCloseLessonEditor}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={styles.lessonModalScroll}
            contentContainerStyle={styles.lessonModalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.modalShell, styles.lessonModalShell]}>
              <View className="flex-row items-center">
                <View
                  className="h-10 w-10 items-center justify-center rounded-[13px]"
                  style={{ backgroundColor: theme.colors.surfaceSoft }}
                >
                  <SymbolView
                    name={{
                      ios: "doc.text.fill",
                      android: "description",
                      web: "description",
                    }}
                    tintColor={theme.colors.accent}
                    size={17}
                    weight="bold"
                  />
                </View>

                <View className="ml-2.5 flex-1">
                  <Text
                    className="text-[20px] font-black"
                    style={{ color: theme.colors.foreground }}
                  >
                    {lessonDraft?.id
                      ? "Modifier la leçon"
                      : "Nouvelle leçon"}
                  </Text>

                  <Text
                    className="mt-0.5 text-[10px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {lessonDraft?.id
                      ? "Modifiez les informations nécessaires."
                      : "Commencez par le titre de la leçon."}
                  </Text>
                </View>
              </View>

              {lessonDraft ? (
                <View className="mt-5">
                  <FieldLabel text="Titre de la leçon" />
                  <EditorInput
                    accessibilityLabel="Titre de la leçon"
                    value={lessonDraft.title}
                    onChangeText={(value) =>
                      setLessonDraft((current) =>
                        current
                          ? {
                              ...current,
                              title: value,
                            }
                          : current,
                      )
                    }
                    placeholder="Ex. Comprendre le parcours d’une requête"
                  />

                  {lessonDraft.id ? (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                          setLessonAdvancedOpen(
                            (current) => !current,
                          )
                        }
                        android_ripple={{ color: "transparent" }}
                        className="mb-3.5 flex-row items-center justify-center rounded-[14px] border bg-white px-3 py-3"
                        style={{ borderColor: "#E2DCE6" }}
                      >
                        <SymbolView
                          name={{
                            ios: lessonAdvancedOpen
                              ? "chevron.up"
                              : "chevron.down",
                            android: lessonAdvancedOpen
                              ? "expand_less"
                              : "expand_more",
                            web: lessonAdvancedOpen
                              ? "expand_less"
                              : "expand_more",
                          }}
                          tintColor={theme.colors.accent}
                          size={15}
                          weight="bold"
                        />

                        <Text
                          className="ml-2 text-[11px] font-black"
                          style={{ color: theme.colors.accent }}
                        >
                          {lessonAdvancedOpen
                            ? "Masquer les options avancées"
                            : "Afficher les options avancées"}
                        </Text>
                      </Pressable>

                      {lessonAdvancedOpen ? (
                        <>
                          <FieldLabel text="Introduction courte (facultative)" />
                          <EditorInput
                            accessibilityLabel="Description de la leçon"
                            value={lessonDraft.description}
                            onChangeText={(value) =>
                              setLessonDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      description: value,
                                    }
                                  : current,
                              )
                            }
                            placeholder="Présentez en une ou deux phrases ce que cette leçon va couvrir, sans recopier son titre."
                            multiline
                          />

                          <FieldLabel text="Objectif pédagogique (facultatif)" />
                          <EditorInput
                            accessibilityLabel="Objectif pédagogique"
                            value={lessonDraft.objective}
                            onChangeText={(value) =>
                              setLessonDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      objective: value,
                                    }
                                  : current,
                              )
                            }
                            placeholder="À la fin, l’apprenant saura…"
                            multiline
                          />

                          <FieldLabel text="Explication principale" />
                          <EditorInput
                            accessibilityLabel="Contenu de la leçon"
                            value={lessonDraft.content}
                            onChangeText={(value) =>
                              setLessonDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      content: value,
                                    }
                                  : current,
                              )
                            }
                            placeholder="Expliquez ici les notions, étapes ou consignes. Les médias et synthèses seront ajoutés ensuite dans Ressources."
                            multiline
                            large
                          />

                          <View className="flex-row flex-wrap gap-3">
                            <View className="min-w-0 flex-1 basis-[160px]">
                              <FieldLabel text="Ordre" />
                              <EditorInput
                                accessibilityLabel="Ordre de la leçon"
                                value={lessonDraft.orderIndex}
                                onChangeText={(value) =>
                                  setLessonDraft((current) =>
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
                            </View>

                            <View className="min-w-0 flex-1 basis-[160px]">
                              <FieldLabel text="Durée (min)" />
                              <EditorInput
                                accessibilityLabel="Durée estimée en minutes"
                                value={
                                  lessonDraft.estimatedDurationMinutes
                                }
                                onChangeText={(value) =>
                                  setLessonDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          estimatedDurationMinutes:
                                            value,
                                        }
                                      : current,
                                  )
                                }
                                keyboardType="numeric"
                                placeholder="10"
                              />
                            </View>
                          </View>

                          <View
                            className="mb-3.5 flex-row items-center rounded-[14px] border p-3"
                            style={{
                              backgroundColor:
                                theme.colors.surfaceSoft,
                              borderColor: theme.colors.border,
                            }}
                          >
                            <View className="flex-1">
                              <Text
                                className="text-[12px] font-black"
                                style={{
                                  color: theme.colors.foreground,
                                }}
                              >
                                Leçon obligatoire
                              </Text>

                              <Text
                                className="mt-0.5 text-[11px] leading-[17px]"
                                style={{
                                  color:
                                    theme.colors.foregroundMuted,
                                }}
                              >
                                Cette leçon compte dans les exigences du
                                parcours.
                              </Text>
                            </View>

                            <Switch
                              value={lessonDraft.required}
                              onValueChange={(value) =>
                                setLessonDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        required: value,
                                      }
                                    : current,
                                )
                              }
                              trackColor={{
                                false: "#DED8E2",
                                true: theme.colors.accent,
                              }}
                              thumbColor="#FFFFFF"
                            />
                          </View>

                          <FieldLabel text="Règle de complétion" />

                          <View className="mb-3.5 flex-row flex-wrap gap-2">
                            {completionRules.map((rule) => {
                              const selected =
                                lessonDraft.completionRule ===
                                rule.value;

                              return (
                                <Pressable
                                  key={rule.value}
                                  accessibilityRole="radio"
                                  accessibilityLabel={rule.label}
                                  accessibilityState={{ selected }}
                                  onPress={() =>
                                    setLessonDraft((current) =>
                                      current
                                        ? {
                                            ...current,
                                            completionRule:
                                              rule.value,
                                          }
                                        : current,
                                    )
                                  }
                                  android_ripple={{
                                    color: "transparent",
                                  }}
                                  className="rounded-full border px-3 py-2"
                                  style={{
                                    backgroundColor: selected
                                      ? theme.colors.accent
                                      : theme.colors.surfaceSoft,
                                    borderColor: selected
                                      ? theme.colors.accent
                                      : theme.colors.border,
                                  }}
                                >
                                  <Text
                                    className="text-[9px] font-extrabold"
                                    style={{
                                      color: selected
                                        ? "#FFFFFF"
                                        : theme.colors.foreground,
                                    }}
                                  >
                                    {rule.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </>
                      ) : null}
                    </>
                  ) : null}

                  {error ? (
                    <View className="mb-3">
                      <ErrorMessage
                        title="Vérifiez la leçon"
                        message={error}
                      />
                    </View>
                  ) : null}

                  <View className="mt-1 flex-row flex-wrap justify-end gap-2.5">
                    <AppButton
                      title="Annuler"
                      variant="secondary"
                      disabled={working}
                      onPress={requestCloseLessonEditor}
                      style={styles.modalButton}
                    />

                    <AppButton
                      title={
                        working
                          ? "Enregistrement..."
                          : lessonDraft.id
                            ? "Enregistrer"
                            : "Créer la leçon"
                      }
                      loading={working}
                      onPress={() => void saveLesson()}
                      style={styles.modalButton}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </Modal>

      <AppConfirmSheet
        visible={discardDraftKind !== null}
        title="Fermer sans enregistrer ?"
        description="Les modifications de ce formulaire seront perdues."
        confirmLabel="Fermer"
        cancelLabel="Continuer à modifier"
        destructive
        busy={working}
        onConfirm={confirmDiscardDraft}
        onCancel={() => setDiscardDraftKind(null)}
      />

      {/* DELETE */}
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
          <View style={styles.modalShell}>
            <View
              className="h-11 w-11 items-center justify-center rounded-[14px]"
              style={{ backgroundColor: TONES.red.soft }}
            >
              <SymbolView
                name={{
                  ios: "trash.fill",
                  android: "delete",
                  web: "delete",
                }}
                tintColor={TONES.red.icon}
                size={18}
                weight="bold"
              />
            </View>

            <Text
              className="mt-4 text-[20px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              {deleteTarget?.kind === "MODULE"
                ? "Supprimer le module ?"
                : "Supprimer la leçon ?"}
            </Text>

            <Text
              className="mt-2 text-[10px] leading-[16px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              {deleteTarget?.kind === "MODULE"
                ? "La suppression d’un module peut également supprimer ses leçons et ressources. Le backend applique les règles métier finales."
                : "La suppression d’une leçon peut également supprimer ses ressources. Le backend applique les règles métier finales."}
            </Text>

            <Text
              className="mt-3 text-[13px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              {deleteTarget?.item.title}
            </Text>

            <View className="mt-5 flex-row flex-wrap justify-end gap-2.5">
              <AppButton
                title="Annuler"
                variant="secondary"
                disabled={working}
                onPress={() => setDeleteTarget(null)}
                style={styles.modalButton}
              />

              <AppButton
                title={working ? "Suppression..." : "Supprimer"}
                loading={working}
                onPress={() => void confirmDelete()}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );

  function HeroPill({
    icon,
    value,
  }: {
    icon: SymbolName;
    value: string;
  }) {
    return (
      <View className="flex-row items-center rounded-full bg-white/10 px-3 py-1.5">
        <SymbolView
          name={icon}
          tintColor="#C4B5FD"
          size={12}
          weight="bold"
        />

        <Text className="ml-1.5 text-[11px] font-black text-white/85">
          {value}
        </Text>
      </View>
    );
  }

  function InfoPill({
    icon,
    value,
  }: {
    icon: SymbolName;
    value: string;
  }) {
    return (
      <View
        className="flex-row items-center rounded-full px-2.5 py-1.5"
        style={{ backgroundColor: theme.colors.surfaceSoft }}
      >
        <SymbolView
          name={icon}
          tintColor={theme.colors.accent}
          size={11}
        />

        <Text
          className="ml-1.5 text-[9px] font-extrabold"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {value}
        </Text>
      </View>
    );
  }

  function MetaPill({
    icon,
    text,
  }: {
    icon: SymbolName;
    text: string;
  }) {
    return (
      <View className="flex-row items-center">
        <SymbolView
          name={icon}
          tintColor={theme.colors.foregroundSubtle}
          size={11}
        />

        <Text
          className="ml-1 text-[10px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {text}
        </Text>
      </View>
    );
  }

  function SmallAction({
    label,
    icon,
    onPress,
    disabled = false,
    tone = "violet",
  }: {
    label: string;
    icon: SymbolName;
    onPress: () => void;
    disabled?: boolean;
    tone?: Tone;
  }) {
    const palette = TONES[tone];

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="min-w-0 flex-1 items-center justify-center rounded-[12px] border px-1.5 py-2"
        style={{
          borderColor: "#E7E1E9",
          backgroundColor: disabled ? "#F7F5F7" : "#FFFFFF",
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <SymbolView
          name={icon}
          tintColor={
            disabled
              ? theme.colors.foregroundSubtle
              : palette.icon
          }
          size={13}
          weight="bold"
        />

        <Text
          numberOfLines={1}
          className="mt-1 text-[8px] font-black"
          style={{
            color: disabled
              ? theme.colors.foregroundSubtle
              : tone === "red"
                ? palette.icon
                : theme.colors.foregroundMuted,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }
}

const cardStyle = {
  borderColor: "#E2DCE6",
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.06,
  shadowRadius: 10,
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.56)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalShell: {
    width: "100%",
    maxWidth: 620,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2DCE6",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  lessonModalScroll: {
    width: "100%",
  },
  lessonModalScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
  },
  lessonModalShell: {
    maxWidth: 680,
  },
  modalButton: {
    minWidth: 130,
  },
});
