import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LearnerResourceCard from "../../components/learner/LearnerResourceCard";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import { Text } from "../../components/nativewindui/Text";
import {
  buildMobileCoursePlayerSteps,
  findMobileCoursePlayerStepIndex,
  normalizeMobileCoursePlayerTraining,
} from "../../features/trainings/mobileCoursePlayerModel";
import {
  loadMobileCoursePlayerPosition,
  saveMobileCoursePlayerPosition,
} from "../../features/trainings/mobileCoursePlayerPositionStore";
import {
  buildLearnerMediaUrl,
  getMyLearnerTrainingContent,
  normalizeLearnerResourceType,
} from "../../features/trainings/learnerTrainingService";
import {
  completeLesson,
  completeResource,
} from "../../features/trainings/learningCompletionService";
import {
  getMyTrainingEvents,
} from "../../features/analytics/analyticsService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  LearningEventResponse,
} from "../../types/analytics";
import type {
  LearnerTrainingContent,
  LearnerTrainingLesson,
  LearnerTrainingResource,
} from "../../types/learnerTraining";

type SymbolName =
  ComponentProps<typeof SymbolView>["name"];

function serverCompletionState(
  events: LearningEventResponse[],
): {
  lessonIds: Set<number>;
  resourceIds: Set<number>;
} {
  const lessonIds = new Set<number>();
  const resourceIds = new Set<number>();

  for (const event of events) {
    const type = String(event.eventType || "").toUpperCase();

    if (
      type === "LESSON_COMPLETED" &&
      typeof event.lessonId === "number"
    ) {
      lessonIds.add(event.lessonId);
    }

    if (
      type === "RESOURCE_COMPLETED" &&
      typeof event.resourceId === "number"
    ) {
      resourceIds.add(event.resourceId);
    }
  }

  return { lessonIds, resourceIds };
}

function serverResumeIndex(
  steps: ReturnType<typeof buildMobileCoursePlayerSteps>,
  events: LearningEventResponse[],
): number | null {
  const { lessonIds, resourceIds } = serverCompletionState(events);

  if (lessonIds.size === 0 && resourceIds.size === 0) {
    return null;
  }

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];

    if (lessonIds.has(step.lesson.id)) {
      continue;
    }

    if (
      step.resource?.id &&
      resourceIds.has(step.resource.id)
    ) {
      continue;
    }

    return index;
  }

  return null;
}

type Props = {
  trainingId: number;
  replayMode?: boolean;
  onOpenScorm: (resourceId: number) => void;
  onOpenQuizzes: () => void;
  onBack: () => void;
};

function completionRuleLabel(rule?: string | null): string {
  if (rule === "MANUAL") return "À réaliser";
  if (rule === "OPENED") return "À réaliser";
  if (rule === "ALL_REQUIRED_BLOCKS") return "Activités à réaliser";
  if (rule === "ASSESSMENT_PASSED") return "Quiz à réussir";
  if (rule === "SCORM_COMPLETED") return "Module interactif";

  return "Progression automatique";
}

function canDirectCompleteLesson(rule?: string | null): boolean {
  return rule === "MANUAL";
}

function shouldAutoCompleteOpenedLesson(rule?: string | null): boolean {
  return rule === "OPENED";
}

function resourceCompletesOnAdvance(
  resource: LearnerTrainingResource,
): boolean {
  const type = normalizeLearnerResourceType(resource.type);
  return type !== "VIDEO" && type !== "SCORM";
}

function coursePlayerLoadErrorMessage(error: unknown): string {
  const candidate = error as {
    message?: string;
    response?: { status?: number };
  } | null | undefined;
  const status = candidate?.response?.status;

  if (__DEV__ && typeof status === "number") {
    return `Impossible de charger le contenu (HTTP ${status}).`;
  }

  if (__DEV__ && candidate?.message) {
    return `Impossible de charger le contenu : ${candidate.message}`;
  }

  return "Impossible de charger le contenu de cette formation.";
}

export default function LearnerCoursePlayerScreen({
  trainingId,
  replayMode = false,
  onOpenScorm,
  onOpenQuizzes,
  onBack,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [training, setTraining] =
    useState<LearnerTrainingContent | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadRevision, setLoadRevision] = useState(0);
  const [resumeReady, setResumeReady] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyResourceId, setBusyResourceId] =
    useState<number | null>(null);
  const [busyLessonId, setBusyLessonId] =
    useState<number | null>(null);
  const [completedResourceIds, setCompletedResourceIds] =
    useState<Set<number>>(() => new Set());
  const [completedLessonIds, setCompletedLessonIds] =
    useState<Set<number>>(() => new Set());

  const steps = training
    ? buildMobileCoursePlayerSteps(training)
    : [];
  const safeStepIndex =
    steps.length === 0
      ? 0
      : Math.min(activeStepIndex, steps.length - 1);
  const activeStep = steps[safeStepIndex] ?? null;
  const activeLesson = activeStep?.lesson ?? null;
  const activeResource = activeStep?.resource ?? null;
  const activeLessonId = activeLesson?.id ?? null;
  const activeResourceId = activeResource?.id ?? null;

  // PATCH16_A8C5I_COURSE_CONTENT_CLARITY_V1
  const activeResourceType = normalizeLearnerResourceType(
    activeResource?.type,
  );
  const showLessonIntro = !activeResource || activeResourceType === "TEXT";

  useEffect(() => {
    let active = true;

    async function loadInitialCoursePlayer() {
      setLoading(true);
      setResumeReady(false);
      setTraining(null);
      setError("");

      try {
        // PATCH16_A8C5T_RICH_PLAYER_RESILIENCE_V1
        // The server content is mandatory. Resume storage is optional.
        const content =
          await getMyLearnerTrainingContent(trainingId);
        const normalized =
          normalizeMobileCoursePlayerTraining(content);
        const normalizedSteps =
          buildMobileCoursePlayerSteps(normalized);

        let serverEvents: LearningEventResponse[] = [];

        try {
          serverEvents =
            await getMyTrainingEvents(trainingId);
        } catch {
          // Analytics history is optional for opening the player.
          // Local resume remains the safe fallback.
        }

        if (!active) {
          return;
        }

        const completionState =
          serverCompletionState(serverEvents);

        setCompletedLessonIds(completionState.lessonIds);
        setCompletedResourceIds(completionState.resourceIds);

        // Render valid server content immediately. Resume sources are optional.
        setTraining(normalized);
        setActiveStepIndex(0);
        setLoading(false);

        if (!replayMode) {
          let savedPosition = null;

          try {
            savedPosition =
              await loadMobileCoursePlayerPosition(trainingId);
          } catch {
            // Resume position is a convenience only.
          }

          const localIndex = savedPosition
            ? findMobileCoursePlayerStepIndex(
                normalizedSteps,
                savedPosition,
              )
            : 0;
          const synchronizedIndex =
            serverResumeIndex(normalizedSteps, serverEvents);
          const resumeIndex =
            synchronizedIndex == null
              ? localIndex
              : Math.max(localIndex, synchronizedIndex);

          if (active) {
            setActiveStepIndex(resumeIndex);
          }
        }

        if (active) {
          setResumeReady(true);
        }
      } catch (loadError) {
        if (active) {
          if (__DEV__) {
            console.error(
              "LearnerCoursePlayer initial load failed",
              loadError,
            );
          }
          setError(coursePlayerLoadErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadInitialCoursePlayer();

    return () => {
      active = false;
    };
  }, [trainingId, replayMode, loadRevision]);

  useEffect(() => {
    if (!resumeReady || !activeLessonId) {
      return;
    }

    void saveMobileCoursePlayerPosition(trainingId, {
      lessonId: activeLessonId,
      resourceId: activeResourceId,
    });
  }, [
    trainingId,
    activeLessonId,
    activeResourceId,
    resumeReady,
  ]);

  async function refreshCoursePlayer(
    lessonId: number,
    resourceId: number | null,
  ) {
    const content =
      await getMyLearnerTrainingContent(trainingId);
    const normalized =
      normalizeMobileCoursePlayerTraining(content);
    const normalizedSteps =
      buildMobileCoursePlayerSteps(normalized);
    const restoredIndex =
      findMobileCoursePlayerStepIndex(
        normalizedSteps,
        {
          lessonId,
          resourceId,
        },
      );

    setTraining(normalized);
    setActiveStepIndex(restoredIndex);
  }

  async function openResource(
    resource: LearnerTrainingResource,
  ) {
    setError("");
    setSuccess("");

    const type = normalizeLearnerResourceType(resource.type);

    if (type === "SCORM") {
      onOpenScorm(resource.id);
      return;
    }

    if (type === "TEXT") {
      setSuccess(
        `La ressource « ${resource.title} » est affichée dans le parcours.`,
      );
      return;
    }

    const uri = buildLearnerMediaUrl(
      resource.publicUrl || resource.url,
    );

    if (!uri) {
      setError(
        "Cette ressource ne possède pas encore de lien ouvrable.",
      );
      return;
    }

    try {
      await Linking.openURL(uri);
    } catch {
      setError("Impossible d’ouvrir cette ressource.");
    }
  }

  async function markResourceConsulted(
    resource: LearnerTrainingResource,
    nextIndex?: number,
    openQuizzesAfter = false,
  ): Promise<boolean> {
    if (!activeLesson) {
      return false;
    }

    setBusyResourceId(resource.id);
    setError("");
    setSuccess("");

    try {
      await completeResource(resource.id);

      setCompletedResourceIds((current) => {
        const next = new Set(current);
        next.add(resource.id);
        return next;
      });

      const nextStep =
        typeof nextIndex === "number"
          ? steps[nextIndex] ?? null
          : steps[safeStepIndex + 1] ?? null;
      const finishesLesson =
        !nextStep || nextStep.lesson.id !== activeLesson.id;

      if (
        finishesLesson &&
        (
          shouldAutoCompleteOpenedLesson(
            activeLesson.completionRule,
          ) ||
          canDirectCompleteLesson(
            activeLesson.completionRule,
          )
        )
      ) {
        await completeLesson(activeLesson.id);
        setCompletedLessonIds((current) => {
          const next = new Set(current);
          next.add(activeLesson.id);
          return next;
        });
      }

      await refreshCoursePlayer(
        activeLesson.id,
        resource.id,
      );

      if (
        typeof nextIndex === "number" &&
        nextIndex >= 0 &&
        nextIndex < steps.length
      ) {
        setActiveStepIndex(nextIndex);
      }

      setSuccess(
        normalizeLearnerResourceType(resource.type) === "VIDEO"
          ? "Vidéo terminée. Tu peux poursuivre."
          : "C’est enregistré. Tu peux poursuivre.",
      );

      if (openQuizzesAfter) {
        onOpenQuizzes();
      }

      return true;
    } catch {
      setError(
        "Impossible d’enregistrer cette étape. Réessaie dans quelques instants.",
      );
      return false;
    } finally {
      setBusyResourceId(null);
    }
  }

  async function completeCurrentLesson(
    lesson: LearnerTrainingLesson,
    nextIndex?: number,
    openQuizzesAfter = false,
  ): Promise<boolean> {
    if (
      !canDirectCompleteLesson(lesson.completionRule) &&
      !shouldAutoCompleteOpenedLesson(lesson.completionRule)
    ) {
      return false;
    }

    setBusyLessonId(lesson.id);
    setError("");
    setSuccess("");

    try {
      await completeLesson(lesson.id);

      setCompletedLessonIds((current) => {
        const next = new Set(current);
        next.add(lesson.id);
        return next;
      });

      await refreshCoursePlayer(
        lesson.id,
        activeResource?.id ?? null,
      );

      if (
        typeof nextIndex === "number" &&
        nextIndex >= 0 &&
        nextIndex < steps.length
      ) {
        setActiveStepIndex(nextIndex);
      }

      setSuccess("Leçon terminée. Tu peux poursuivre.");

      if (openQuizzesAfter) {
        onOpenQuizzes();
      }

      return true;
    } catch {
      setError(
        "Impossible de terminer cette leçon. Réessaie dans quelques instants.",
      );
      return false;
    } finally {
      setBusyLessonId(null);
    }
  }

  async function goToStep(nextIndex: number) {
    if (
      nextIndex < 0 ||
      nextIndex >= steps.length
    ) {
      return;
    }

    setError("");
    setSuccess("");

    if (nextIndex <= safeStepIndex) {
      setActiveStepIndex(nextIndex);
      return;
    }

    if (
      activeResource &&
      resourceCompletesOnAdvance(activeResource) &&
      !completedResourceIds.has(activeResource.id)
    ) {
      await markResourceConsulted(activeResource, nextIndex);
      return;
    }

    if (
      !activeResource &&
      activeLesson &&
      (
        shouldAutoCompleteOpenedLesson(
          activeLesson.completionRule,
        ) ||
        canDirectCompleteLesson(
          activeLesson.completionRule,
        )
      ) &&
      !completedLessonIds.has(activeLesson.id)
    ) {
      await completeCurrentLesson(activeLesson, nextIndex);
      return;
    }

    setActiveStepIndex(nextIndex);
  }

  if (loading) {
    return <LoadingState message="Ouverture du parcours..." />;
  }

  if (!training) {
    return (
      <ScreenContainer style={{ padding: 0 }}>
        <View className="flex-1 px-[14px] pt-[14px]">
          <View
            className="rounded-[20px] border bg-white p-[14px]"
            style={{ borderColor: theme.colors.border }}
          >
            <ErrorMessage
              message={error || "Parcours indisponible."}
            />

            <View className="mt-[12px] flex-row gap-[8px]">
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  setLoadRevision((value) => value + 1)
                }
                android_ripple={{ color: "transparent" }}
                className="min-h-[46px] flex-1 flex-row items-center justify-center rounded-[13px] bg-[#7C3AED] px-[12px]"
              >
                <SymbolView
                  name={{
                    ios: "arrow.clockwise",
                    android: "refresh",
                    web: "refresh",
                  }}
                  tintColor="#FFFFFF"
                  size={13}
                  weight="bold"
                />
                <Text className="ml-[7px] text-[11px] font-black text-white">
                  Réessayer
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={onBack}
                android_ripple={{ color: "transparent" }}
                className="min-h-[46px] flex-1 flex-row items-center justify-center rounded-[13px] border bg-white px-[12px]"
                style={{ borderColor: theme.colors.border }}
              >
                <SymbolView
                  name={{
                    ios: "chevron.left",
                    android: "arrow_back",
                    web: "arrow_back",
                  }}
                  tintColor={theme.colors.accent}
                  size={13}
                  weight="bold"
                />
                <Text
                  className="ml-[7px] text-[11px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Retour
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const backendProgress =
    typeof training.progressPercentage === "number"
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(training.progressPercentage),
          ),
        )
      : 0;

  const busy =
    busyResourceId !== null ||
    busyLessonId !== null;

  const atLastStep =
    steps.length > 0 &&
    safeStepIndex >= steps.length - 1;

  function nextButtonLabel(): string {
    if (busy) {
      return "Enregistrement...";
    }

    if (!atLastStep) {
      return "Continuer";
    }

    if (backendProgress >= 100) {
      return "Voir mon bilan";
    }

    return "Accéder aux quiz";
  }

  function onNextPress(): void {
    if (!atLastStep) {
      void goToStep(safeStepIndex + 1);
      return;
    }

    if (backendProgress >= 100) {
      onBack();
      return;
    }

    if (
      activeResource &&
      resourceCompletesOnAdvance(activeResource) &&
      !completedResourceIds.has(activeResource.id)
    ) {
      void markResourceConsulted(
        activeResource,
        undefined,
        true,
      );
      return;
    }

    if (
      !activeResource &&
      activeLesson &&
      (
        shouldAutoCompleteOpenedLesson(
          activeLesson.completionRule,
        ) ||
        canDirectCompleteLesson(
          activeLesson.completionRule,
        )
      ) &&
      !completedLessonIds.has(activeLesson.id)
    ) {
      void completeCurrentLesson(
        activeLesson,
        undefined,
        true,
      );
      return;
    }

    onOpenQuizzes();
  }

  return (
    <ScreenContainer style={{ padding: 0 }}>
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-[14px] pt-[10px]"
          contentContainerStyle={{
            paddingBottom: 18,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-[760px] self-center">
            {/* En-tête du lecteur */}
            <View
              className="relative overflow-hidden rounded-[24px] border bg-white p-[14px]"
              style={{
                borderColor: theme.colors.border,
                shadowColor: theme.colors.shadow,
                shadowOpacity: 0.045,
                shadowRadius: 10,
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                elevation: 2,
              }}
            >
              <View className="absolute -right-[48px] -top-[58px] h-[150px] w-[150px] rounded-full bg-[#F3EEFF]" />
              <View className="absolute right-[14px] top-[-38px] h-[82px] w-[82px] rounded-full bg-[#E5D8FF]/70" />

              <View className="flex-row items-center">
                <View className="h-[44px] w-[44px] items-center justify-center rounded-[14px] bg-[#F3EEFF]">
                  <SymbolView
                    name={{
                      ios: "book.pages.fill",
                      android: "menu_book",
                      web: "menu_book",
                    }}
                    tintColor="#7C3AED"
                    size={18}
                    weight="bold"
                  />
                </View>

                <View className="ml-[9px] self-start rounded-full bg-[#F3EEFF] px-[10px] py-[6px]">
                  <Text className="text-[9px] font-black uppercase tracking-[0.6px] text-[#7C3AED]">
                    Parcours apprenant
                  </Text>
                </View>
              </View>

              <Text
                className="mt-[13px] max-w-[94%] text-[22px] font-black leading-[28px] tracking-[-0.45px]"
                style={{ color: theme.colors.foreground }}
              >
                {training.title}
              </Text>

              <View className="mt-[7px] flex-row flex-wrap items-center gap-x-[5px] gap-y-[3px]">
                {steps.length ? (
                  <Text
                    className="text-[11px] font-extrabold"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Étape {safeStepIndex + 1}/{steps.length}
                  </Text>
                ) : null}

                {steps.length ? (
                  <Text
                    className="text-[11px] font-black"
                    style={{ color: theme.colors.foregroundSubtle }}
                  >
                    ·
                  </Text>
                ) : null}

                <Text
                  className="text-[11px] font-extrabold"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Progression validée {backendProgress} %
                </Text>
              </View>

              <View className="mt-[11px] flex-row items-center">
                <View
                  accessibilityRole="progressbar"
                  accessibilityValue={{
                    min: 0,
                    max: 100,
                    now: backendProgress,
                  }}
                  className="h-[8px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#EEE8FA]"
                >
                  <View
                    className="h-full rounded-full bg-[#7C3AED]"
                    style={{
                      width: `${backendProgress}%`,
                    }}
                  />
                </View>

                <Text className="ml-[10px] text-[18px] font-black text-[#7C3AED]">
                  {backendProgress}%
                </Text>
              </View>
            </View>

            {error ? (
              <View className="mt-[10px]">
                <ErrorMessage message={error} />
              </View>
            ) : null}

            {success ? (
              <View className="mt-[10px] flex-row items-start rounded-[15px] border border-[#BBF7D0] bg-[#ECFDF3] px-[11px] py-[10px]">
                <SymbolView
                  name={{
                    ios: "checkmark.circle.fill",
                    android: "check_circle",
                    web: "check_circle",
                  }}
                  tintColor="#16A36A"
                  size={15}
                  weight="bold"
                />
                <Text className="ml-[7px] min-w-0 flex-1 text-[11px] font-bold leading-[16px] text-[#15803D]">
                  {success}
                </Text>
              </View>
            ) : null}

            {steps.length === 0 ||
            !activeStep ||
            !activeLesson ? (
              <View
                className="mt-[10px] rounded-[20px] border bg-white p-[16px]"
                style={{ borderColor: theme.colors.border }}
              >
                <View className="items-center">
                  <View className="h-[44px] w-[44px] items-center justify-center rounded-[14px] bg-[#F3EEFF]">
                    <SymbolView
                      name={{
                        ios: "tray.fill",
                        android: "inbox",
                        web: "inbox",
                      }}
                      tintColor="#7C3AED"
                      size={17}
                      weight="bold"
                    />
                  </View>
                  <Text
                    className="mt-[9px] text-center text-[12px] font-bold leading-[18px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Aucun contenu pédagogique n’est disponible.
                  </Text>
                </View>
              </View>
            ) : (
              <>
                {/* Contexte du module */}
                <View
                  className="mt-[10px] min-h-[66px] flex-row items-center rounded-[19px] border bg-white px-[12px] py-[10px]"
                  style={{ borderColor: theme.colors.border }}
                >
                  <View className="h-[42px] w-[42px] items-center justify-center rounded-[13px] bg-[#F3EEFF]">
                    <SymbolView
                      name={{
                        ios: "folder.fill",
                        android: "folder",
                        web: "folder",
                      }}
                      tintColor="#7C3AED"
                      size={17}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-[10px] min-w-0 flex-1">
                    <Text
                      className="text-[9px] font-black uppercase tracking-[0.7px]"
                      style={{ color: theme.colors.foregroundSubtle }}
                    >
                      Module
                    </Text>
                    <Text
                      className="mt-[2px] text-[14px] font-black leading-[19px]"
                      style={{ color: theme.colors.foreground }}
                    >
                      {activeStep.module.title}
                    </Text>
                  </View>
                </View>

                {/* Présentation de la leçon — lecture premium */}
                {showLessonIntro ? (
                  <View
                    className="mt-[10px] rounded-[22px] border bg-white p-[13px]"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <View className="flex-row items-start">
                      <View className="h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] bg-[#EFF6FF]">
                        <SymbolView
                          name={{
                            ios: "doc.text.fill",
                            android: "description",
                            web: "description",
                          }}
                          tintColor="#2563EB"
                          size={16}
                          weight="bold"
                        />
                      </View>

                      <View className="ml-[10px] min-w-0 flex-1">
                        <Text className="text-[9px] font-black uppercase tracking-[0.7px] text-[#2563EB]">
                          Leçon
                        </Text>
                        <Text
                          className="mt-[2px] text-[17px] font-black leading-[22px]"
                          style={{ color: theme.colors.foreground }}
                        >
                          {activeLesson.title}
                        </Text>
                      </View>

                      <View
                        className="ml-[6px] shrink-0 rounded-full px-[9px] py-[5px]"
                        style={{
                          backgroundColor: theme.colors.surfaceSoft,
                        }}
                      >
                        <Text
                          className="text-[8px] font-black"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {completionRuleLabel(
                            activeLesson.completionRule,
                          )}
                        </Text>
                      </View>
                    </View>

                    {activeLesson.objective ? (
                      <View
                        className="mt-[12px] flex-row items-start rounded-[15px] border px-[10px] py-[10px]"
                        style={{
                          backgroundColor: "#FBF9FF",
                          borderColor: "#E6DAF8",
                        }}
                      >
                        <View className="h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] bg-[#F3EEFF]">
                          <SymbolView
                            name={{
                              ios: "target",
                              android: "track_changes",
                              web: "track_changes",
                            }}
                            tintColor="#7C3AED"
                            size={13}
                            weight="bold"
                          />
                        </View>

                        <View className="ml-[9px] min-w-0 flex-1">
                          <Text className="text-[9px] font-black uppercase tracking-[0.55px] text-[#7C3AED]">
                            Ton objectif
                          </Text>
                          <Text
                            className="mt-[3px] text-[12px] font-bold leading-[18px]"
                            style={{ color: theme.colors.foreground }}
                          >
                            {activeLesson.objective}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    {activeLesson.description ? (
                      <View className="mt-[12px]">
                        <Text
                          className="text-[10px] font-black uppercase tracking-[0.55px]"
                          style={{ color: theme.colors.foregroundSubtle }}
                        >
                          En bref
                        </Text>
                        <Text
                          className="mt-[4px] text-[13px] leading-[20px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {activeLesson.description}
                        </Text>
                      </View>
                    ) : null}

                    {activeLesson.content ? (
                      <View
                        className="relative mt-[12px] overflow-hidden rounded-[16px] border bg-[#FFFFFF] px-[13px] py-[12px]"
                        style={{ borderColor: theme.colors.border }}
                      >
                        <View className="absolute bottom-0 left-0 top-0 w-[4px] bg-[#7C3AED]" />

                        <View className="flex-row items-center">
                          <View className="h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[#F3EEFF]">
                            <SymbolView
                              name={{
                                ios: "text.alignleft",
                                android: "subject",
                                web: "subject",
                              }}
                              tintColor="#7C3AED"
                              size={12}
                              weight="bold"
                            />
                          </View>

                          <Text
                            className="ml-[8px] text-[11px] font-black"
                            style={{ color: theme.colors.foreground }}
                          >
                            Contenu de la leçon
                          </Text>
                        </View>

                        <Text
                          className="mt-[9px] text-[13px] leading-[21px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {activeLesson.content}
                        </Text>
                      </View>
                    ) : null}

                    {!activeResource &&
                    activeLesson.completionRule !== "OPENED" &&
                    activeLesson.completionRule !== "MANUAL" ? (
                      <View
                        className="mt-[11px] flex-row items-start rounded-[13px] px-[10px] py-[9px]"
                        style={{
                          backgroundColor: "#F8F6F3",
                        }}
                      >
                        <SymbolView
                          name={{
                            ios: "info.circle.fill",
                            android: "info",
                            web: "info",
                          }}
                          tintColor={theme.colors.accent}
                          size={12}
                          weight="bold"
                        />
                        <Text
                          className="ml-[7px] min-w-0 flex-1 text-[10px] leading-[15px]"
                          style={{
                            color: theme.colors.foregroundMuted,
                          }}
                        >
                          Termine l’activité demandée pour valider cette leçon.
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* Ressource */}
                <View
                  className="mt-[10px] rounded-[22px] border bg-white p-[12px]"
                  style={{
                    borderColor: theme.colors.border,
                    shadowColor: theme.colors.shadow,
                    shadowOpacity: 0.03,
                    shadowRadius: 7,
                    shadowOffset: {
                      width: 0,
                      height: 3,
                    },
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-center">
                    <View className="h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-[#F3EEFF]">
                      <SymbolView
                        name={{
                          ios: activeResourceType === "TEXT"
                            ? "text.alignleft"
                            : "photo.fill",
                          android: activeResourceType === "TEXT"
                            ? "subject"
                            : "image",
                          web: activeResourceType === "TEXT"
                            ? "subject"
                            : "image",
                        }}
                        tintColor="#7C3AED"
                        size={15}
                        weight="bold"
                      />
                    </View>

                    <View className="ml-[9px] min-w-0 flex-1">
                      <Text
                        className="text-[9px] font-black uppercase tracking-[0.7px]"
                        style={{ color: theme.colors.foregroundSubtle }}
                      >
                        {activeResourceType === "TEXT"
                          ? "À retenir"
                          : "Ressource de la leçon"}
                      </Text>
                      {activeResource ? (
                        <Text
                          className="mt-[2px] text-[12px] font-black"
                          style={{ color: theme.colors.foreground }}
                          numberOfLines={1}
                        >
                          {activeResource.title}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {activeResource ? (
                    <LearnerResourceCard
                      resource={activeResource}
                      busy={
                        busyResourceId === activeResource.id
                      }
                      onOpen={() =>
                        void openResource(activeResource)
                      }
                      onVideoCompleted={() =>
                        void markResourceConsulted(
                          activeResource,
                        )
                      }
                      videoCompleted={completedResourceIds.has(
                        activeResource.id,
                      )}
                    />
                  ) : (
                    <View className="mt-[10px] rounded-[14px] bg-[#F8F6F3] px-[11px] py-[10px]">
                      <Text
                        className="text-[11px] leading-[16px]"
                        style={{
                          color: theme.colors.foregroundMuted,
                        }}
                      >
                        Cette étape ne contient aucune ressource.
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>

        {/* Navigation persistante — deux actions de taille identique */}
        {steps.length > 0 &&
        activeStep &&
        activeLesson ? (
          <View
            className="border-t bg-white px-[12px] pb-[10px] pt-[9px]"
            style={{
              borderColor: theme.colors.border,
            }}
          >
            <View className="w-full max-w-[760px] self-center">
              <View className="mb-[7px] flex-row items-center justify-between px-[2px]">
                <Text
                  className="text-[9px] font-black uppercase tracking-[0.5px]"
                  style={{ color: theme.colors.foregroundSubtle }}
                >
                  Navigation
                </Text>
                <View className="rounded-full bg-[#F3EEFF] px-[9px] py-[4px]">
                  <Text className="text-[9px] font-black text-[#7C3AED]">
                    {safeStepIndex + 1} / {steps.length}
                  </Text>
                </View>
              </View>

              <View className="flex-row gap-[9px]">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Précédent"
                  accessibilityState={{
                    disabled: safeStepIndex <= 0 || busy,
                  }}
                  disabled={safeStepIndex <= 0 || busy}
                  onPress={() =>
                    void goToStep(safeStepIndex - 1)
                  }
                  android_ripple={{ color: "transparent" }}
                  className="min-h-[56px] min-w-0 flex-1 flex-row items-center rounded-[16px] border px-[8px]"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderColor:
                      safeStepIndex <= 0
                        ? "#EDE8F0"
                        : "#D8C6F4",
                    opacity:
                      safeStepIndex <= 0 || busy
                        ? 0.42
                        : 1,
                  }}
                >
                  <View
                    className="h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px]"
                    style={{
                      backgroundColor:
                        safeStepIndex <= 0
                          ? "#F8F6F3"
                          : "#F3EEFF",
                    }}
                  >
                    <SymbolView
                      name={{
                        ios: "chevron.left",
                        android: "chevron_left",
                        web: "chevron_left",
                      }}
                      tintColor={
                        safeStepIndex <= 0
                          ? theme.colors.foregroundSubtle
                          : "#7C3AED"
                      }
                      size={13}
                      weight="bold"
                    />
                  </View>

                  <Text
                    className="min-w-0 flex-1 text-center text-[12px] font-black"
                    style={{
                      color:
                        safeStepIndex <= 0
                          ? theme.colors.foregroundSubtle
                          : "#7C3AED",
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    Précédent
                  </Text>

                  <View className="h-[38px] w-[8px] shrink-0" />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    atLastStep
                      ? nextButtonLabel()
                      : "Suivant"
                  }
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={onNextPress}
                  android_ripple={{ color: "transparent" }}
                  className="min-h-[56px] min-w-0 flex-1 flex-row items-center rounded-[16px] bg-[#7C3AED] px-[8px]"
                  style={{
                    opacity: busy ? 0.65 : 1,
                  }}
                >
                  <View className="h-[38px] w-[8px] shrink-0" />

                  <Text
                    className="min-w-0 flex-1 text-center text-[12px] font-black"
                    style={{ color: "#FFFFFF" }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                  >
                    {atLastStep
                      ? nextButtonLabel()
                      : "Suivant"}
                  </Text>

                  <View className="h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] bg-white/15">
                    {busy ? (
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />
                    ) : (
                      <SymbolView
                        name={{
                          ios:
                            atLastStep &&
                            backendProgress < 100
                              ? "checklist.checked"
                              : "chevron.right",
                          android:
                            atLastStep &&
                            backendProgress < 100
                              ? "quiz"
                              : "chevron_right",
                          web:
                            atLastStep &&
                            backendProgress < 100
                              ? "quiz"
                              : "chevron_right",
                        }}
                        tintColor="#FFFFFF"
                        size={13}
                        weight="bold"
                      />
                    )}
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
