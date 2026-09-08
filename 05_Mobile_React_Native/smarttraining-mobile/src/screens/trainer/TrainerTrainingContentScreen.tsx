import { Href, router } from "expo-router";
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
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
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

// PATCH16_A8C5O_API_ERROR_MESSAGE_V1
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

function completionLabel(
  value?: string,
): string {
  return (
    completionRules.find((rule) => rule.value === value)
      ?.label ??
    value ??
    "Tous les blocs requis"
  );
}

// PATCH16_A8C5O_STABLE_CONTENT_INPUTS_V1
function FieldLabel({ text }: { text: string }) {
  const { theme } = useSmartTrainingTheme();

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
      accessibilityLabel={props.accessibilityLabel}
      multiline={multiline}
      placeholderTextColor={theme.colors.foregroundSubtle}
      style={[
        styles.input,
        multiline && styles.multiline,
        large && styles.largeInput,
        {
          color: theme.colors.foreground,
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.controlRadius,
        },
      ]}
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

  const [moduleEditorOpen, setModuleEditorOpen] =
    useState(false);
  const [moduleDraft, setModuleDraft] =
    useState<ModuleDraft>(emptyModuleDraft);
  const [moduleDraftBaseline, setModuleDraftBaseline] = useState(
    () => JSON.stringify(emptyModuleDraft),
  );

  const [lessonEditorOpen, setLessonEditorOpen] =
    useState(false);
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
          (left.orderIndex ?? 0) -
          (right.orderIndex ?? 0),
      ),
    [training],
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
    moduleEditorOpen && JSON.stringify(moduleDraft) !== moduleDraftBaseline;
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
        setDiscardDraftKind(moduleDraftDirty ? "MODULE" : "LESSON");
        return true;
      },
    );

    return () => subscription.remove();
  }, [hasUnsavedDraft, lessonDraftDirty, moduleDraftDirty, working]);

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
            ...modules.map(
              (module) => module.orderIndex ?? 0,
            ),
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

  function openEditModule(
    module: TrainerFullModuleResponse,
  ) {
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
      setError(
        "L’ordre du module doit être un entier positif.",
      );
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
        await updateTrainerModule(
          moduleDraft.id,
          request,
        );
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
        (left.orderIndex ?? 0) -
        (right.orderIndex ?? 0),
    );
  }

  function openCreateLesson(
    module: TrainerFullModuleResponse,
  ) {
    const lessons = sortedLessons(module);

    const nextOrder =
      lessons.length === 0
        ? 1
        : Math.max(
            ...lessons.map(
              (lesson) => lesson.orderIndex ?? 0,
            ),
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
          (rule) =>
            rule.value === lesson.completionRule,
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
    const duration = Number(
      lessonDraft.estimatedDurationMinutes,
    );
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
      setError(
        "L’ordre de la leçon doit être un entier positif.",
      );
      return;
    }

    if (
      !Number.isInteger(duration) ||
      duration < 0
    ) {
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
        await updateTrainerLesson(
          lessonDraft.id,
          request,
        );
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

    const currentOrder =
      module.orderIndex ?? index + 1;
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

    const currentOrder =
      lesson.orderIndex ?? index + 1;
    const targetOrder =
      target.orderIndex ?? index + direction + 1;

    const completionRule = (
      value?: string,
    ): MobileLessonCompletionRule =>
      completionRules.some(
        (rule) => rule.value === value,
      )
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
          completionRule: completionRule(
            lesson.completionRule,
          ),
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
          completionRule: completionRule(
            target.completionRule,
          ),
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
    return (
      <LoadingState message="Chargement du contenu..." />
    );
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
              .catch((caught) =>
                setError(errorText(caught)),
              )
              .finally(() => setLoading(false));
          }}
        />
      </ScreenContainer>
    );
  }

  const editable = training.status === "DRAFT";

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <Text
            style={[
              styles.eyebrow,
              { color: theme.colors.accent },
            ]}
          >
            CONTENU PÉDAGOGIQUE
          </Text>

          <Text
            style={[
              styles.title,
              { color: theme.colors.foreground },
            ]}
          >
            {training.title}
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            Construisez les modules et les leçons directement
            depuis le mobile.
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
            <View style={styles.statusText}>
              <Text
                style={[
                  styles.statusTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                {editable
                  ? "Brouillon modifiable"
                  : "Contenu verrouillé"}
              </Text>

              <Text
                style={[
                  styles.statusDescription,
                  {
                    color:
                      theme.colors.foregroundMuted,
                  },
                ]}
              >
                {editable
                  ? "Modules et leçons sont entièrement modifiables."
                  : "Remettez la formation en brouillon pour modifier son contenu."}
              </Text>
            </View>

            {editable ? (
              <AppButton
                title="Nouveau module"
                onPress={openCreateModule}
                style={styles.newButton}
              />
            ) : null}
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

          <View style={styles.sectionHeader}>
            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Structure
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color:
                      theme.colors.foregroundMuted,
                  },
                ]}
              >
                {modules.length} module
                {modules.length > 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          {modules.length === 0 ? (
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
                Aucun module
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
                Commencez par créer le premier module.
              </Text>
            </View>
          ) : (
            modules.map((module, moduleIndex) => {
              const lessons = sortedLessons(module);

              return (
                <View
                  key={module.id}
                  style={[
                    styles.moduleCard,
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
                  <View style={styles.moduleTop}>
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
                        {module.orderIndex ?? "-"}
                      </Text>
                    </View>

                    <View style={styles.moduleText}>
                      <Text
                        style={[
                          styles.moduleTitle,
                          {
                            color:
                              theme.colors.foreground,
                          },
                        ]}
                      >
                        {module.title}
                      </Text>

                      <Text
                        style={[
                          styles.moduleDescription,
                          {
                            color:
                              theme.colors
                                .foregroundMuted,
                          },
                        ]}
                      >
                        {module.description ||
                          "Aucune description."}
                      </Text>
                    </View>
                  </View>

                  {editable ? (
                    <>
                      <View style={styles.reorderActions}>
                        <AppButton
                          title="Monter"
                          variant="secondary"
                          disabled={working || moduleIndex === 0}
                          onPress={() =>
                            void moveModule(module, -1)
                          }
                          style={styles.reorderButton}
                        />
                        <AppButton
                          title="Descendre"
                          variant="secondary"
                          disabled={
                            working ||
                            moduleIndex === modules.length - 1
                          }
                          onPress={() =>
                            void moveModule(module, 1)
                          }
                          style={styles.reorderButton}
                        />
                      </View>

                    <View style={styles.actions}>
                      <AppButton
                      title="Nouvelle leçon"
                      onPress={() =>
                      openCreateLesson(module)
                      }
                      style={styles.newLessonButton}
                      />

                      <View style={styles.moduleSecondaryActions}>
                        <AppButton
                        title="Modifier module"
                        variant="secondary"
                        onPress={() =>
                        openEditModule(module)
                        }
                        style={styles.moduleSecondaryButton}
                        />

                        <AppButton
                        title="Supprimer module"
                        variant="secondary"
                        onPress={() =>
                        setDeleteTarget({
                        kind: "MODULE",
                        item: module,
                        })
                        }
                        style={styles.moduleSecondaryButton}
                        />
                      </View>
                    </View>
                    </>
                  ) : null}

                  <View
                    style={[
                      styles.lessonsSection,
                      {
                        borderTopColor:
                          theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.lessonsHeader}>
                      <Text
                        style={[
                          styles.lessonsTitle,
                          {
                            color:
                              theme.colors.foreground,
                          },
                        ]}
                      >
                        Leçons
                      </Text>

                      <Text
                        style={[
                          styles.lessonsCount,
                          {
                            color:
                              theme.colors
                                .foregroundMuted,
                          },
                        ]}
                      >
                        {lessons.length}
                      </Text>
                    </View>

                    {lessons.length === 0 ? (
                      <Text
                        style={[
                          styles.noLesson,
                          {
                            color:
                              theme.colors
                                .foregroundSubtle,
                          },
                        ]}
                      >
                        Aucune leçon dans ce module.
                      </Text>
                    ) : (
                      lessons.map((lesson, lessonIndex) => (
                        <View
                          key={lesson.id}
                          style={[
                            styles.lessonCard,
                            {
                              backgroundColor:
                                theme.colors
                                  .surfaceSoft,
                              borderColor:
                                theme.colors.border,
                            },
                          ]}
                        >
                          <View
                            style={styles.lessonTop}
                          >
                            <View
                              style={[
                                styles.lessonOrder,
                                {
                                  backgroundColor:
                                    theme.colors
                                      .background,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.lessonOrderText,
                                  {
                                    color:
                                      theme.colors
                                        .accent,
                                  },
                                ]}
                              >
                                {lesson.orderIndex ??
                                  "-"}
                              </Text>
                            </View>

                            <View
                              style={
                                styles.lessonText
                              }
                            >
                              <Text
                                style={[
                                  styles.lessonTitle,
                                  {
                                    color:
                                      theme.colors
                                        .foreground,
                                  },
                                ]}
                              >
                                {lesson.title}
                              </Text>

                              <Text
                                style={[
                                  styles.lessonMeta,
                                  {
                                    color:
                                      theme.colors
                                        .foregroundMuted,
                                  },
                                ]}
                              >
                                {lesson.estimatedDurationMinutes ??
                                  0}{" "}
                                min ·{" "}
                                {lesson.required ===
                                false
                                  ? "Optionnelle"
                                  : "Obligatoire"}
                              </Text>

                              <Text
                                style={[
                                  styles.lessonRule,
                                  {
                                    color:
                                      theme.colors
                                        .foregroundSubtle,
                                  },
                                ]}
                              >
                                {completionLabel(
                                  lesson.completionRule,
                                )}
                              </Text>
                            </View>
                          </View>

                          {lesson.objective ? (
                            <Text
                              style={[
                                styles.lessonObjective,
                                {
                                  color:
                                    theme.colors
                                      .foregroundMuted,
                                },
                              ]}
                            >
                              Objectif :{" "}
                              {lesson.objective}
                            </Text>
                          ) : null}

                          <Text
                            style={[
                              styles.resourceCount,
                              {
                                color:
                                  theme.colors
                                    .foregroundSubtle,
                              },
                            ]}
                          >
                            {lesson.resources?.length ??
                              0}{" "}
                            ressource(s)
                          </Text>

                          <View
                            style={
                              styles.lessonActions
                            }
                          >
                            <AppButton
                              title="Ressources"
                              variant="secondary"
                              onPress={() =>
                                router.push(
                                  `/trainer/trainings/${trainingId}/resources/${lesson.id}` as Href,
                                )
                              }
                              style={
                                styles.lessonPrimaryButton
                              }
                            />
                          </View>

                          {editable ? (
                            <View
                              style={
                                styles.lessonActions
                              }
                            >
                              <AppButton
                                title="Monter"
                                variant="secondary"
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
                                style={
                                  styles.lessonSecondaryButton
                                }
                              />

                              <AppButton
                                title="Descendre"
                                variant="secondary"
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
                                style={
                                  styles.lessonSecondaryButton
                                }
                              />

                              <AppButton
                                title="Modifier"
                                variant="secondary"
                                onPress={() =>
                                  openEditLesson(
                                    module,
                                    lesson,
                                  )
                                }
                                style={
                                  styles.lessonSecondaryButton
                                }
                              />

                              <AppButton
                                title="Supprimer"
                                variant="secondary"
                                onPress={() =>
                                  setDeleteTarget({
                                    kind: "LESSON",
                                    item: lesson,
                                    moduleId:
                                      module.id,
                                  })
                                }
                                style={
                                  styles.lessonSecondaryButton
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

      <Modal
        visible={moduleEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={requestCloseModuleEditor}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: theme.colors.foreground },
              ]}
            >
              {moduleDraft.id
                ? "Modifier le module"
                : "Nouveau module"}
            </Text>

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

            <View style={styles.modalActions}>
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

      <Modal
        visible={lessonEditorOpen}
        transparent
        animationType="fade"
        onRequestClose={requestCloseLessonEditor}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={styles.lessonModalScroll}
            contentContainerStyle={
              styles.lessonModalScrollContent
            }
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.modalCard,
                styles.lessonModalCard,
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
                  {
                    color:
                      theme.colors.foreground,
                  },
                ]}
              >
                {lessonDraft?.id
                  ? "Modifier la leçon"
                  : "Nouvelle leçon"}
              </Text>

              {lessonDraft ? (
                <>
                  <Text
                    style={[
                      styles.editorGuide,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    {lessonDraft.id
                      ? "Modifiez le titre ou ouvrez les options avancées si nécessaire."
                      : "Donnez simplement un titre à la leçon. Vous pourrez compléter les informations pédagogiques ensuite."}
                  </Text>

                  <FieldLabel text="Titre de la leçon" />
                  <EditorInput
                    accessibilityLabel="Titre de la leçon"
                    value={lessonDraft.title}
                    onChangeText={(value) =>
                      setLessonDraft(
                        (current) =>
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

                  {/* MOBILE_LESSON_CREATE_MINIMAL_INLINE_ERROR_V2 */}
                  {/* MOBILE_LESSON_EDIT_ADVANCED_COLLAPSE_SAFE_V1 */}
                  {lessonDraft.id ? (
                    <>
                      <AppButton
                        title={
                          lessonAdvancedOpen
                            ? "Masquer les options avancées"
                            : "Afficher les options avancées"
                        }
                        variant="secondary"
                        onPress={() =>
                          setLessonAdvancedOpen(
                            (current) => !current,
                          )
                        }
                      />

                      {lessonAdvancedOpen ? (
                        <>
<FieldLabel text="Introduction courte (facultative)" />
                  <EditorInput
                    accessibilityLabel="Description de la leçon"
                    value={lessonDraft.description}
                    onChangeText={(value) =>
                      setLessonDraft(
                        (current) =>
                          current
                            ? {
                                ...current,
                                description:
                                  value,
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
                      setLessonDraft(
                        (current) =>
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
                      setLessonDraft(
                        (current) =>
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

                  <View style={styles.twoColumns}>
                    <View style={styles.column}>
                      <FieldLabel text="Ordre" />
                      <EditorInput
                        accessibilityLabel="Ordre de la leçon"
                        value={
                          lessonDraft.orderIndex
                        }
                        onChangeText={(value) =>
                          setLessonDraft(
                            (current) =>
                              current
                                ? {
                                    ...current,
                                    orderIndex:
                                      value,
                                  }
                                : current,
                          )
                        }
                        keyboardType="numeric"
                        placeholder="1"
                      />
                    </View>

                    <View style={styles.column}>
                      <FieldLabel text="Durée (min)" />
                      <EditorInput
                        accessibilityLabel="Durée estimée en minutes"
                        value={
                          lessonDraft.estimatedDurationMinutes
                        }
                        onChangeText={(value) =>
                          setLessonDraft(
                            (current) =>
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
                    style={[
                      styles.requiredRow,
                      {
                        backgroundColor:
                          theme.colors.surfaceSoft,
                        borderColor:
                          theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.requiredText}>
                      <Text
                        style={[
                          styles.requiredTitle,
                          {
                            color:
                              theme.colors
                                .foreground,
                          },
                        ]}
                      >
                        Leçon obligatoire
                      </Text>

                      <Text
                        style={[
                          styles.requiredDescription,
                          {
                            color:
                              theme.colors
                                .foregroundMuted,
                          },
                        ]}
                      >
                        Cette leçon compte dans les
                        exigences du parcours.
                      </Text>
                    </View>

                    <Switch
                      value={lessonDraft.required}
                      onValueChange={(value) =>
                        setLessonDraft(
                          (current) =>
                            current
                              ? {
                                  ...current,
                                  required: value,
                                }
                              : current,
                        )
                      }
                    />
                  </View>

                  <FieldLabel text="Règle de complétion" />

                  <View
                    style={styles.ruleOptions}
                  >
                    {completionRules.map(
                      (rule) => {
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
                              setLessonDraft(
                                (current) =>
                                  current
                                    ? {
                                        ...current,
                                        completionRule:
                                          rule.value,
                                      }
                                    : current,
                              )
                            }
                            style={[
                              styles.ruleOption,
                              {
                                backgroundColor:
                                  selected
                                    ? theme.colors
                                        .accent
                                    : theme.colors
                                        .surfaceSoft,
                                borderColor:
                                  selected
                                    ? theme.colors
                                        .accent
                                    : theme.colors
                                        .border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.ruleOptionText,
                                {
                                  color: selected
                                    ? theme.colors
                                        .background
                                    : theme.colors
                                        .foreground,
                                },
                              ]}
                            >
                              {rule.label}
                            </Text>
                          </Pressable>
                        );
                      },
                    )}
                  </View>

                                          </>
                      ) : null}
                    </>
                  ) : null}

{error ? (
                    <ErrorMessage
                      title="Vérifiez la leçon"
                      message={error}
                    />
                  ) : null}

                  <View
                    style={
                      styles.modalActions
                    }
                  >
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
                      onPress={() =>
                        void saveLesson()
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
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: theme.colors.foreground },
              ]}
            >
              {deleteTarget?.kind === "MODULE"
                ? "Supprimer le module ?"
                : "Supprimer la leçon ?"}
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
              {deleteTarget?.kind === "MODULE"
                ? "La suppression d’un module peut également supprimer ses leçons et ressources. Le backend applique les règles métier finales."
                : "La suppression d’une leçon peut également supprimer ses ressources. Le backend applique les règles métier finales."}
            </Text>

            <Text
              style={[
                styles.confirmName,
                { color: theme.colors.foreground },
              ]}
            >
              {deleteTarget?.item.title}
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

}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  page: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
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
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    marginBottom: 16,
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginBottom: 15,
  },
  statusText: {
    flex: 1,
    minWidth: 220,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  statusDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  newButton: {
    minWidth: 150,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 5,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  emptyCard: {
    padding: 22,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  moduleCard: {
    padding: 18,
    marginBottom: 16,
  },
  moduleTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  orderBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  orderText: {
    fontSize: 16,
    fontWeight: "900",
  },
  moduleText: {
    flex: 1,
    minWidth: 0,
  },
  moduleTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
  },
  moduleDescription: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  reorderActions: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
    marginTop: 14,
  },
  reorderButton: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    gap: 9,
    marginTop: 12,
  },
  actionButton: {
    minWidth: 0,
  },
  newLessonButton: {
    width: "100%",
  },
  moduleSecondaryActions: {
    flexDirection: "row",
    gap: 8,
  },
  moduleSecondaryButton: {
    flex: 1,
    minWidth: 0,
  },
  lessonsSection: {
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 15,
  },
  lessonsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  lessonsTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  lessonsCount: {
    fontSize: 12,
    fontWeight: "800",
  },
  noLesson: {
    fontSize: 12,
    fontStyle: "italic",
  },
  lessonCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
  },
  lessonTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  lessonOrder: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonOrderText: {
    fontSize: 13,
    fontWeight: "900",
  },
  lessonText: {
    flex: 1,
    minWidth: 0,
  },
  lessonTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
  },
  lessonMeta: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  lessonRule: {
    fontSize: 10,
    marginTop: 3,
  },
  lessonObjective: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 9,
  },
  resourceCount: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 8,
  },
  lessonActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  lessonButton: {
    minWidth: 0,
  },
  lessonPrimaryButton: {
    width: "100%",
  },
  lessonSecondaryButton: {
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: 0,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.52)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 620,
    padding: 18,
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
  lessonModalCard: {
    maxWidth: 680,
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
    minHeight: 120,
  },
  twoColumns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  column: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 0,
  },
  requiredRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  requiredText: {
    flex: 1,
  },
  requiredTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  requiredDescription: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  ruleOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 14,
  },
  ruleOption: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  ruleOptionText: {
    fontSize: 10,
    fontWeight: "800",
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
  modalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 9,
    marginTop: 18,
  },
  modalButton: {
    minWidth: 130,
  },
});