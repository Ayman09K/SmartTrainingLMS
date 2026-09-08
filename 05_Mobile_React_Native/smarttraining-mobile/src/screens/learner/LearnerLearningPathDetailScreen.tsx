import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import { TrainingCover } from "../../components/ux/RichPrimitives";
import {
  getLearningPathCatalogDetail,
  getMyLearningPathProgress,
} from "../../features/learningPaths/learningPathService";
import {
  buildLearnerMediaUrl,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  LearningPathCatalog,
  LearningPathProgress,
  LearningPathStep,
} from "../../types/learningPath";

type Props = {
  pathId: number;
  onBack: () => void;
  onOpenTraining: (trainingId: number) => void;
  onOpenCourse: (
    trainingId: number,
    replay?: boolean,
  ) => void;
};

function clampProgress(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function firstAvailableTraining(
  trainings: LearningPathStep[],
): number | null {
  const item = trainings.find(
    (training) =>
      !training.trainingMissing &&
      (!training.trainingStatus ||
        training.trainingStatus === "PUBLISHED"),
  );

  return item?.trainingId ?? null;
}

function apiErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      response?: {
        data?: {
          message?: string;
          error?: string;
        };
      };
    };

    const backendMessage =
      candidate.response?.data?.message ||
      candidate.response?.data?.error;

    if (backendMessage) {
      return backendMessage;
    }
  }

  return "Ce parcours ne peut pas être chargé pour le moment.";
}

function ProgressBar({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      style={[
        styles.progressTrack,
        {
          backgroundColor: theme.colors.surfaceSoft,
          height: compact ? 5 : 8,
        },
      ]}
    >
      <View
        style={[
          styles.progressFill,
          {
            backgroundColor: theme.colors.accent,
            width: `${clampProgress(value)}%`,
          },
        ]}
      />
    </View>
  );
}

export default function LearnerLearningPathDetailScreen({
  pathId,
  onBack,
  onOpenTraining,
  onOpenCourse,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [path, setPath] =
    useState<LearningPathCatalog | null>(null);
  const [progress, setProgress] =
    useState<LearningPathProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const detail =
          await getLearningPathCatalogDetail(pathId);

        let learnerProgress: LearningPathProgress | null = null;

        if (detail.assignedToMe) {
          learnerProgress =
            await getMyLearningPathProgress(pathId);
        }

        if (active) {
          setPath(detail);
          setProgress(learnerProgress);
        }
      } catch (caught: unknown) {
        if (active) {
          setPath(null);
          setProgress(null);
          setError(apiErrorMessage(caught));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [pathId]);

  const orderedTrainings = useMemo(
    () =>
      [...(path?.trainings || [])].sort(
        (a, b) =>
          a.position - b.position ||
          a.id - b.id,
      ),
    [path?.trainings],
  );

  if (loading) {
    return <LoadingState message="Chargement du parcours..." />;
  }

  if (!path) {
    return (
      <ScreenContainer>
        <View style={styles.page}>
          <ErrorMessage
            message={error || "Parcours indisponible."}
          />
          <AppButton
            title="Retour au catalogue"
            onPress={onBack}
            variant="secondary"
            style={styles.backButton}
          />
        </View>
      </ScreenContainer>
    );
  }

  const completionProgress = clampProgress(
    progress?.completionProgressPercentage,
  );

  const overallProgress = clampProgress(
    progress?.overallProgressPercentage,
  );

  const fallbackTrainingId =
    firstAvailableTraining(orderedTrainings);

  const startTrainingId =
    progress?.nextTrainingId || fallbackTrainingId;

  const completed = progress?.completed === true;
  const started =
    (progress?.overallProgressPercentage || 0) > 0;

  const dueAt = formatDate(progress?.pathDueAt);

  const coverUrl = buildLearnerMediaUrl(
    path.coverImageUrl || path.coverImagePath,
  );

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: theme.shape.cardPadding * 2,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <AppButton
            title="Retour au catalogue"
            onPress={onBack}
            variant="secondary"
            style={styles.backButton}
          />

          <View
            style={[
              styles.hero,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <TrainingCover
              title={path.title}
              coverUrl={coverUrl}
              spacingAfter
              resizeMode="contain"
            />

            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: theme.colors.accent },
                  ]}
                >
                  Parcours
                </Text>
              </View>

              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: path.assignedToMe
                      ? theme.colors.success
                      : theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: path.assignedToMe
                        ? theme.colors.success
                        : theme.colors.foregroundMuted,
                    },
                  ]}
                >
                  {path.assignedToMe
                    ? "Affecté"
                    : "À découvrir"}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.title,
                { color: theme.colors.foreground },
              ]}
            >
              {path.title}
            </Text>

            <Text
              style={[
                styles.description,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {path.shortDescription ||
                path.description ||
                "Un parcours structuré de formations."}
            </Text>

            <View style={styles.metaRow}>
              <Text
                style={[
                  styles.meta,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                {path.totalTrainings} formation
                {path.totalTrainings > 1 ? "s" : ""}
              </Text>

              <Text
                style={[
                  styles.meta,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                {path.requiredTrainings} obligatoire
                {path.requiredTrainings > 1 ? "s" : ""}
              </Text>

              {path.optionalTrainings > 0 ? (
                <Text
                  style={[
                    styles.meta,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {path.optionalTrainings} facultative
                  {path.optionalTrainings > 1 ? "s" : ""}
                </Text>
              ) : null}
            </View>

            {dueAt ? (
              <View
                style={[
                  styles.infoBox,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.warning,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.infoTitle,
                    { color: theme.colors.warning },
                  ]}
                >
                  Échéance du parcours
                </Text>
                <Text
                  style={[
                    styles.infoText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {dueAt}
                </Text>
              </View>
            ) : null}

            {path.canStart && startTrainingId ? (
              <AppButton
                title={
                  completed
                    ? "Revoir le parcours"
                    : started
                      ? "Reprendre le parcours"
                      : "Commencer le parcours"
                }
                onPress={() =>
                  onOpenCourse(
                    startTrainingId,
                    completed,
                  )
                }
                style={styles.primaryAction}
              />
            ) : (
              <View
                style={[
                  styles.infoBox,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.info,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.infoTitle,
                    { color: theme.colors.info },
                  ]}
                >
                  Affectation requise
                </Text>
                <Text
                  style={[
                    styles.infoText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Tu peux consulter ce parcours public, mais il doit
                  t’être affecté avant de pouvoir démarrer.
                </Text>
              </View>
            )}
          </View>

          {progress ? (
            <View
              style={[
                styles.section,
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
                  styles.sectionTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Ta progression
              </Text>

              <Text
                style={[
                  styles.progressLabel,
                  { color: theme.colors.foreground },
                ]}
              >
                Complétion : {completionProgress} %
              </Text>
              <ProgressBar value={completionProgress} />

              <Text
                style={[
                  styles.progressSubLabel,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Progression globale : {overallProgress} %
              </Text>
              <ProgressBar
                value={overallProgress}
                compact
              />

              <Text
                style={[
                  styles.progressHint,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                {progress.completed
                  ? "Parcours terminé."
                  : `${progress.completedRequiredSteps}/${progress.requiredSteps || progress.totalSteps} étape(s) obligatoire(s) terminée(s).`}
              </Text>
            </View>
          ) : null}

          {path.description || path.objectives ? (
            <View
              style={[
                styles.section,
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
                  styles.sectionTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Présentation
              </Text>

              {path.description ? (
                <Text
                  style={[
                    styles.bodyText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {path.description}
                </Text>
              ) : null}

              {path.objectives ? (
                <>
                  <Text
                    style={[
                      styles.subTitle,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    Objectifs
                  </Text>
                  <Text
                    style={[
                      styles.bodyText,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    {path.objectives}
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}

          <View
            style={[
              styles.section,
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
                styles.sectionTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Formations du parcours
            </Text>

            <Text
              style={[
                styles.sectionIntro,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Les formations facultatives enrichissent le parcours
              sans bloquer sa complétion lorsqu’il existe des
              formations obligatoires.
            </Text>

            {orderedTrainings.map((training, index) => {
              const trainingProgress =
                progress?.trainings.find(
                  (item) =>
                    item.trainingId === training.trainingId,
                );

              const percentage = clampProgress(
                trainingProgress?.progressPercentage,
              );

              const stepCompleted = percentage >= 100;

              return (
                <View
                  key={training.id}
                  style={[
                    styles.stepCard,
                    {
                      backgroundColor:
                        theme.colors.surfaceElevated,
                      borderColor: stepCompleted
                        ? theme.colors.success
                        : theme.colors.border,
                      borderRadius: theme.shape.controlRadius,
                      borderWidth: Math.max(
                        1,
                        theme.shape.borderWidth,
                      ),
                    },
                  ]}
                >
                  <View style={styles.stepHeader}>
                    <View
                      style={[
                        styles.stepNumber,
                        {
                          backgroundColor: stepCompleted
                            ? theme.colors.success
                            : theme.colors.surfaceSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepNumberText,
                          {
                            color: stepCompleted
                              ? theme.colors.accentForeground
                              : theme.colors.foreground,
                          },
                        ]}
                      >
                        {stepCompleted ? "\u2713" : index + 1}
                      </Text>
                    </View>

                    <View style={styles.stepBody}>
                      <Text
                        style={[
                          styles.stepTitle,
                          { color: theme.colors.foreground },
                        ]}
                      >
                        {training.trainingTitle ||
                          `Formation ${index + 1}`}
                      </Text>

                      <Text
                        style={[
                          styles.stepMeta,
                          { color: theme.colors.foregroundMuted },
                        ]}
                      >
                        {training.required
                          ? "Obligatoire"
                          : "Facultative"}
                        {training.estimatedDurationHours
                          ? ` · ${training.estimatedDurationHours} h`
                          : ""}
                        {path.canStart
                          ? ` · ${percentage} %`
                          : ""}
                      </Text>
                    </View>
                  </View>

                  {path.canStart &&
                  percentage > 0 &&
                  percentage < 100 ? (
                    <ProgressBar
                      value={percentage}
                      compact
                    />
                  ) : null}

                  {path.canStart ? (
                    <AppButton
                      title={
                        stepCompleted
                          ? "Voir la formation"
                          : percentage > 0
                            ? "Continuer la formation"
                            : "Ouvrir la formation"
                      }
                      onPress={() =>
                        onOpenTraining(training.trainingId)
                      }
                      variant={
                        training.trainingId ===
                        progress?.nextTrainingId
                          ? "primary"
                          : "secondary"
                      }
                      style={styles.stepAction}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  hero: {
    marginBottom: 18,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  meta: {
    fontSize: 12,
    fontWeight: "800",
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
  },
  primaryAction: {
    marginTop: 12,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 10,
  },
  sectionIntro: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
  },
  progressSubLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 7,
  },
  progressHint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  progressTrack: {
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  stepCard: {
    padding: 14,
    marginBottom: 12,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: "900",
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  stepMeta: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  stepAction: {
    marginTop: 12,
  },
});
