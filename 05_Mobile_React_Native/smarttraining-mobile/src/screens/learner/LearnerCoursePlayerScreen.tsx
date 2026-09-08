// MOBILE_LEARNER_COURSE_HEADER_RESPONSIVE_SAFE_V2
import { useEffect, useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LearnerResourceCard from "../../components/learner/LearnerResourceCard";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
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
import {
  LearnerTrainingContent,
  LearnerTrainingLesson,
  LearnerTrainingResource,
} from "../../types/learnerTraining";

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
  const { width: viewportWidth } = useWindowDimensions();
  const compactCourseHeader = viewportWidth < 600;

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
      <ScreenContainer>
        <View style={styles.page}>
          <ErrorMessage message={error || "Parcours indisponible."} />
          <AppButton
            title="Réessayer"
            onPress={() => setLoadRevision((value) => value + 1)}
            style={styles.backButton}
          />
          <AppButton
            title="Retour"
            onPress={onBack}
            variant="secondary"
            style={styles.backButton}
          />
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

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.topBar,
            compactCourseHeader ? styles.topBarCompact : null,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.shape.cardRadius,
              borderWidth: theme.shape.borderWidth,
              padding: Math.max(12, theme.shape.cardPadding - 6),
            },
          ]}
        >
          <AppButton
            title={"Retour \u00E0 la formation"}
            onPress={onBack}
            variant="secondary"
            style={styles.backButton}
          />

          <View style={[styles.topMeta, compactCourseHeader ? styles.topMetaCompact : null]}>
            <Text
              style={[
                styles.title,
                { color: theme.colors.foreground },
              ]}
              numberOfLines={2}
            >
              {training.title}
            </Text>

            <Text
              style={[
                styles.stepMeta,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {steps.length
                ? `Étape ${safeStepIndex + 1}/${steps.length} · Progression validée ${backendProgress} %`
                : `Progression validée ${backendProgress} %`}
            </Text>
          </View>
        </View>

        {error ? <ErrorMessage message={error} /> : null}

        {success ? (
          <View
            style={[
              styles.successBox,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.successText,
                { color: theme.colors.foreground },
              ]}
            >
              {success}
            </Text>
          </View>
        ) : null}

        {steps.length === 0 || !activeStep || !activeLesson ? (
          <View
            style={[
              styles.empty,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Aucun contenu pédagogique n’est disponible.
            </Text>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.contextCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                  padding: Math.max(12, theme.shape.cardPadding - 6),
                },
              ]}
            >
              <Text
                style={[
                  styles.context,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                MODULE · {activeStep.module.title}
              </Text>
            </View>

            {showLessonIntro ? (
              <View
                style={[
                  styles.lesson,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.shape.cardRadius,
                    borderWidth: theme.shape.borderWidth,
                    padding: theme.shape.cardPadding,
                  },
                ]}
              >
                <View style={styles.lessonHeader}>
                  <View style={styles.lessonHeadingText}>
                    <Text
                      style={[
                        styles.lessonIndex,
                        { color: theme.colors.accent },
                      ]}
                    >
                      LEÇON
                    </Text>
                    <Text
                      style={[
                        styles.lessonTitle,
                        { color: theme.colors.foreground },
                      ]}
                    >
                      {activeLesson.title}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.ruleBadge,
                      {
                        backgroundColor: theme.colors.surfaceSoft,
                        borderRadius: 999,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.lessonRule,
                        { color: theme.colors.foregroundMuted },
                      ]}
                    >
                      {completionRuleLabel(activeLesson.completionRule)}
                    </Text>
                  </View>
                </View>

                {activeLesson.objective ? (
                  <View
                    style={[
                      styles.objectiveBox,
                      {
                        backgroundColor: theme.colors.surfaceSoft,
                        borderRadius: theme.shape.controlRadius,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.objectiveLabel,
                        { color: theme.colors.accent },
                      ]}
                    >
                      VOTRE OBJECTIF
                    </Text>
                    <Text
                      style={[
                        styles.lessonObjective,
                        { color: theme.colors.foreground },
                      ]}
                    >
                      {activeLesson.objective}
                    </Text>
                  </View>
                ) : null}

                {activeLesson.description ? (
                  <Text
                    style={[
                      styles.lessonDescription,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    {activeLesson.description}
                  </Text>
                ) : null}

                {activeLesson.content ? (
                  <View
                    style={[
                      styles.lessonContentBox,
                      {
                        backgroundColor: theme.colors.surfaceSoft,
                        borderRadius: theme.shape.controlRadius,
                        padding: Math.max(
                          14,
                          theme.shape.cardPadding - 6,
                        ),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.lessonContent,
                        { color: theme.colors.foregroundMuted },
                      ]}
                    >
                      {activeLesson.content}
                    </Text>
                  </View>
                ) : null}

                {!activeResource &&
                  activeLesson.completionRule !== "OPENED" &&
                  activeLesson.completionRule !== "MANUAL" ? (
                  <View
                    style={[
                      styles.strictRuleHint,
                      {
                        backgroundColor: theme.colors.surfaceSoft,
                        borderRadius: theme.shape.controlRadius,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.strictRuleText,
                        { color: theme.colors.foregroundMuted },
                      ]}
                    >
                      Terminez l’activité demandée pour valider cette leçon.
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View
              style={[
                styles.resourceSection,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                  padding: theme.shape.cardPadding,
                },
              ]}
            >
              <Text
                style={[
                  styles.resourcesTitle,
                  { color: theme.colors.foregroundSubtle },
                ]}
              >
                {activeResourceType === "TEXT"
                  ? "À RETENIR"
                  : "RESSOURCE DE LA LEÇON"}
              </Text>

              {activeResource ? (
                <LearnerResourceCard
                  resource={activeResource}
                  busy={busyResourceId === activeResource.id}
                  onOpen={() =>
                    void openResource(activeResource)
                  }
                  onVideoCompleted={() =>
                    void markResourceConsulted(activeResource)
                  }
                  videoCompleted={completedResourceIds.has(
                    activeResource.id,
                  )}
                />
              ) : (
                <Text
                  style={[
                    styles.noResource,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Cette étape ne contient aucune ressource.
                </Text>
              )}
            </View>

            <View style={styles.bottomNavigation}>
              <AppButton
                title="Précédent"
                onPress={() => void goToStep(safeStepIndex - 1)}
                disabled={
                  safeStepIndex <= 0 ||
                  busyResourceId !== null ||
                  busyLessonId !== null
                }
                variant="secondary"
                style={styles.navigationButton}
              />
              {safeStepIndex >= steps.length - 1 ? (
                backendProgress >= 100 ? (
                  <AppButton
                    title="Voir mon bilan"
                    onPress={onBack}
                    style={styles.navigationButton}
                  />
                ) : (
                  <AppButton
                    title={
                      busyResourceId !== null || busyLessonId !== null
                        ? "Enregistrement..."
                        : "Accéder aux quiz"
                    }
                    onPress={() => {
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
                    }}
                    disabled={
                      busyResourceId !== null ||
                      busyLessonId !== null
                    }
                    style={styles.navigationButton}
                  />
                )
              ) : (
                <AppButton
                  title={
                    busyResourceId !== null || busyLessonId !== null
                      ? "Enregistrement..."
                      : "Suivant"
                  }
                  onPress={() =>
                    void goToStep(safeStepIndex + 1)
                  }
                  disabled={
                    busyResourceId !== null ||
                    busyLessonId !== null
                  }
                  style={styles.navigationButton}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
  },
  content: {
    paddingBottom: 28,
    gap: 12,
  },
  page: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  topBarCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
  },
  backButton: {
    alignSelf: "flex-start",
  },
  topMeta: {
    flex: 1,
    minWidth: 0,
  },
  topMetaCompact: {
    width: "100%",
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
  },
  stepMeta: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 2,
  },
  successBox: {
    borderWidth: 1,
    padding: 12,
  },
  successText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  empty: {},
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  contextCard: {
    gap: 10,
  },
  context: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  navigationButtons: {
    flexDirection: "row",
    gap: 10,
  },
  navigationButton: {
    flex: 1,
    minWidth: 0,
  },
  lesson: {},
  lessonHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  lessonHeadingText: {
    flexGrow: 1,
    flexBasis: 220,
  },
  lessonIndex: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  lessonTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "900",
  },
  ruleBadge: {
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lessonRule: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  objectiveBox: {
    marginTop: 14,
    padding: 14,
  },
  objectiveLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginBottom: 5,
  },
  lessonObjective: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
  lessonDescription: {
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
  },
  lessonContentBox: {
    marginTop: 14,
  },
  lessonContent: {
    fontSize: 16,
    lineHeight: 25,
  },
  lessonAction: {
    alignSelf: "flex-start",
    marginTop: 16,
  },
  strictRuleHint: {
    marginTop: 16,
    padding: 12,
  },
  strictRuleText: {
    fontSize: 12,
    lineHeight: 18,
  },
  resourceSection: {},
  resourcesTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  noResource: {
    fontSize: 13,
    lineHeight: 18,
  },
  bottomNavigation: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
});
