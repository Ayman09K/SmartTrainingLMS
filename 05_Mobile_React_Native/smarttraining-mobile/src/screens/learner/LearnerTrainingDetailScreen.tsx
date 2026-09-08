import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  getMyLearnerTrainingContent,
} from "../../features/trainings/learnerTrainingService";
import {
  getPublishedQuizzesByTraining,
} from "../../features/evaluation/evaluationService";
import { selfUnenroll } from "../../features/trainings/catalogService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import { LearnerTrainingContent } from "../../types/learnerTraining";

type Props = {
  trainingId: number;
  onOpenCourse: (replay?: boolean) => void;
  onOpenQuizzes: () => void;
  onBack: () => void;
};

type DeadlinePresentation = {
  label: string;
  detail: string;
  tone: "info" | "warning" | "danger";
};

function formatDeadline(value: string): string {
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

function deadlinePresentation(
  dueAt?: string | null,
  completed = false,
): DeadlinePresentation | null {
  if (!dueAt) {
    return null;
  }

  const due = new Date(dueAt);

  if (Number.isNaN(due.getTime())) {
    return null;
  }

  const detail = formatDeadline(dueAt);

  if (completed) {
    return {
      label: "\u00c9ch\u00e9ance",
      detail,
      tone: "info",
    };
  }

  const remainingMs = due.getTime() - Date.now();

  if (remainingMs < 0) {
    return {
      label: "\u00c9ch\u00e9ance d\u00e9pass\u00e9e",
      detail,
      tone: "danger",
    };
  }

  const remainingDays = Math.ceil(
    remainingMs / (24 * 60 * 60 * 1000),
  );

  if (remainingDays <= 3) {
    return {
      label:
        remainingDays <= 1
          ? "\u00c9ch\u00e9ance dans moins de 24 h"
          : `\u00c9ch\u00e9ance dans ${remainingDays} jours`,
      detail,
      tone: "warning",
    };
  }

  return {
    label: "\u00c0 terminer avant",
    detail,
    tone: "info",
  };
}

function levelLabel(level?: string | null): string {
  if (level === "DEBUTANT") return "D\u00E9butant";
  if (level === "INTERMEDIAIRE") return "Interm\u00E9diaire";
  if (level === "AVANCE") return "Avanc\u00E9";

  return level || "Niveau non indiqu\u00E9";
}

function clampProgress(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export default function LearnerTrainingDetailScreen({
  trainingId,
  onOpenCourse,
  onOpenQuizzes,
  onBack,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [training, setTraining] =
    useState<LearnerTrainingContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // MOBILE_HIDE_EMPTY_QUIZ_ACTION_SAFE_V2
  const [hasPublishedQuiz, setHasPublishedQuiz] = useState(false);
  const [unenrollBusy, setUnenrollBusy] = useState(false);

  useEffect(() => {
    let active = true;

    void getMyLearnerTrainingContent(trainingId)
      .then((data) => {
        if (active) {
          setTraining(data);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Cette formation ne peut pas \u00EAtre charg\u00E9e depuis ton espace apprenant.",
          );
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
  }, [trainingId]);

  async function performSelfUnenroll() {
    if (!training?.canSelfUnenroll || unenrollBusy) return;

    setUnenrollBusy(true);
    setError("");

    try {
      await selfUnenroll(trainingId);
      onBack();
    } catch {
      setError(
        "La d\u00E9sinscription n'a pas pu etre effectuee. Reessaie dans quelques instants.",
      );
    } finally {
      setUnenrollBusy(false);
    }
  }

  function confirmSelfUnenroll() {
    if (!training?.canSelfUnenroll || unenrollBusy) return;

    Alert.alert(
      "Se d\u00E9sinscrire ?",
      "Tu perdras l'acces a la formation, mais ta progression, tes resultats et tes certificats resteront conserves. Tu pourras te reinscrire plus tard.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Se d\u00E9sinscrire",
          style: "destructive",
          onPress: () => void performSelfUnenroll(),
        },
      ],
    );
  }
  useEffect(() => {
    let active = true;

    setHasPublishedQuiz(false);

    void getPublishedQuizzesByTraining(trainingId)
      .then((items) => {
        if (active) {
          setHasPublishedQuiz(items.length > 0);
        }
      })
      .catch(() => {
        if (active) {
          setHasPublishedQuiz(false);
        }
      });

    return () => {
      active = false;
    };
  }, [trainingId]);

  if (loading) {
    return <LoadingState message="Chargement de la formation..." />;
  }

  if (!training) {
    return (
      <ScreenContainer>
        <View style={styles.page}>
          <ErrorMessage
            message={error || "Formation indisponible."}
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

  const progress = clampProgress(training.progressPercentage);

  const completed =
    training.enrollmentStatus === "COMPLETED" || progress >= 100;

  const deadline = deadlinePresentation(
    training.dueAt,
    completed,
  );

  const deadlineColor = deadline
    ? deadline.tone === "danger"
      ? theme.colors.danger
      : deadline.tone === "warning"
        ? theme.colors.warning
        : theme.colors.info
    : theme.colors.info;

  const lessonCount = training.modules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  );

  const resourceCount = training.modules.reduce(
    (total, module) =>
      total +
      module.lessons.reduce(
        (lessonTotal, lesson) =>
          lessonTotal + lesson.resources.length,
        0,
      ),
    0,
  );

  const moduleLabel =
    training.modules.length > 1 ? "modules" : "module";
  const lessonLabel = lessonCount > 1 ? "le\u00E7ons" : "le\u00E7on";
  const resourceLabel =
    resourceCount > 1 ? "ressources" : "ressource";

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
            title={"Retour \u00E0 mes formations"}
            onPress={onBack}
            variant="secondary"
            style={styles.backButton}
          />

          {error ? <ErrorMessage message={error} /> : null}

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
            <Text
              style={[
                styles.eyebrow,
                { color: theme.colors.accent },
              ]}
            >
              FORMATION
            </Text>

            <Text
              style={[
                styles.title,
                { color: theme.colors.foreground },
              ]}
            >
              {training.title}
            </Text>

            {training.shortDescription ? (
              <Text
                style={[
                  styles.summary,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                {training.shortDescription}
              </Text>
            ) : null}

            <View style={styles.metaRow}>
              <View
                style={[
                  styles.metaPill,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderRadius: 999,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.meta,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {levelLabel(training.level)}
                </Text>
              </View>

              <View
                style={[
                  styles.metaPill,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderRadius: 999,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.meta,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {training.estimatedDurationHours
                    ? `${training.estimatedDurationHours} h`
                    : "Dur\u00E9e non indiqu\u00E9e"}
                </Text>
              </View>

              <View
                style={[
                  styles.metaPill,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderRadius: 999,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.meta,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {training.modules.length} {moduleLabel}
                </Text>
              </View>

              <View
                style={[
                  styles.metaPill,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderRadius: 999,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.meta,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {lessonCount} {lessonLabel}
                </Text>
              </View>

              <View
                style={[
                  styles.metaPill,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderRadius: 999,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.meta,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {resourceCount} {resourceLabel}
                </Text>
              </View>
            </View>

            {deadline ? (
              <View
                style={[
                  styles.deadlinePanel,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: deadlineColor,
                    borderWidth: Math.max(
                      1,
                      theme.shape.borderWidth,
                    ),
                    borderRadius: theme.shape.controlRadius,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.deadlineLabel,
                    { color: deadlineColor },
                  ]}
                >
                  {deadline.label}
                </Text>
                <Text
                  style={[
                    styles.deadlineDetail,
                    { color: theme.colors.foreground },
                  ]}
                >
                  {deadline.detail}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.progressPanel,
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
              <View style={styles.progressHeader}>
                <View>
                  <Text
                    style={[
                      styles.progressEyebrow,
                      { color: theme.colors.foregroundSubtle },
                    ]}
                  >
                    PROGRESSION
                  </Text>
                  <Text
                    style={[
                      styles.progressLabel,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    {progress >= 100
                      ? "Parcours termin\u00E9"
                      : progress > 0
                        ? "Parcours en cours"
                        : "Parcours \u00E0 commencer"}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.progressValue,
                    {
                      color:
                        progress >= 100
                          ? theme.colors.success
                          : theme.colors.accent,
                    },
                  ]}
                >
                  {progress} %
                </Text>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: theme.colors.border },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress}%`,
                      backgroundColor:
                        progress >= 100
                          ? theme.colors.success
                          : theme.colors.accent,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.heroActions}>
              <AppButton
                title={
                  progress >= 100
                    ? "Revoir le parcours"
                    : progress > 0
                      ? "Reprendre le parcours"
                      : "Commencer le parcours"
                }
                onPress={() => onOpenCourse(progress >= 100)}
                style={styles.primaryAction}
              />

              {hasPublishedQuiz ? (
<View
                style={[
                  styles.quizActionCard,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderRadius: theme.shape.controlRadius,
                    borderColor: theme.colors.border,
                    borderWidth: theme.shape.borderWidth,
                    padding: Math.max(
                      14,
                      theme.shape.cardPadding - 6,
                    ),
                  },
                ]}
              >
                <View style={styles.quizActionText}>
                  <Text
                    style={[
                      styles.quizActionEyebrow,
                      { color: theme.colors.accent },
                    ]}
                  >
                    {"\u00C9VALUATIONS"}
                  </Text>
                  <Text
                    style={[
                      styles.quizActionTitle,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    Quiz de la formation
                  </Text>
                  <Text
                    style={[
                      styles.quizActionDescription,
                      {
                        color: theme.colors.foregroundMuted,
                      },
                    ]}
                  >
                    Consulte les quiz disponibles, tes tentatives et tes
                    {" r\u00E9sultats."}
                  </Text>
                </View>

                <AppButton
                  title="Voir les quiz"
                  onPress={onOpenQuizzes}
                  variant="secondary"
                  style={styles.quizActionButton}
                />
              </View>
) : null}

              {training.canSelfUnenroll ? (
                <AppButton
                  title={
                    unenrollBusy
                      ? "D\u00E9sinscription..."
                      : "Se d\u00E9sinscrire"
                  }
                  onPress={confirmSelfUnenroll}
                  variant="secondary"
                />
              ) : null}
            </View>
          </View>

          <View style={styles.infoGrid}>
            {training.description ? (
              <InfoPanel
                title={"\u00C0 propos"}
                text={training.description}
              />
            ) : null}

            {training.objectives ? (
              <InfoPanel
                title="Objectifs"
                text={training.objectives}
              />
            ) : null}

            {training.prerequisites ? (
              <InfoPanel
                title={"\u00A0Pr\u00E9requis".trim()}
                text={training.prerequisites}
              />
            ) : null}

            {training.targetAudience ? (
              <InfoPanel
                title={"Public concern\u00E9"}
                text={training.targetAudience}
              />
            ) : null}
          </View>

          <View style={styles.programHeader}>
            <Text
              style={[
                styles.programEyebrow,
                { color: theme.colors.accent },
              ]}
            >
              PROGRAMME
            </Text>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Ton parcours
            </Text>
            <Text
              style={[
                styles.sectionSubtitle,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Parcours les modules dans {"l\u2019ordre"} propos{"\u00E9"} pour
              avancer de fa{"\u00E7"}on structur{"\u00E9"}e.
            </Text>
          </View>

          {training.modules.map((module, moduleIndex) => (
            <View
              key={module.id}
              style={[
                styles.moduleCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                  padding: theme.shape.cardPadding,
                },
              ]}
            >
              <View style={styles.moduleTopRow}>
                <View
                  style={[
                    styles.moduleNumber,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderRadius: theme.shape.controlRadius,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.moduleNumberText,
                      { color: theme.colors.accent },
                    ]}
                  >
                    {String(moduleIndex + 1).padStart(2, "0")}
                  </Text>
                </View>

                <View style={styles.moduleText}>
                  <Text
                    style={[
                      styles.moduleIndex,
                      { color: theme.colors.foregroundSubtle },
                    ]}
                  >
                    MODULE {moduleIndex + 1}
                  </Text>
                  <Text
                    style={[
                      styles.moduleTitle,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    {module.title}
                  </Text>
                </View>
              </View>

              {module.description ? (
                <Text
                  style={[
                    styles.moduleDescription,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {module.description}
                </Text>
              ) : null}

              <View style={styles.moduleMetaRow}>
                <Text
                  style={[
                    styles.moduleMeta,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {module.lessons.length}{" "}
                  {module.lessons.length > 1 ? "le\u00E7ons" : "le\u00E7on"}
                </Text>

                {module.estimatedDurationMinutes ? (
                  <Text
                    style={[
                      styles.moduleMeta,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    {module.estimatedDurationMinutes} min
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function InfoPanel({
    title,
    text,
  }: {
    title: string;
    text: string;
  }) {
    return (
      <View
        style={[
          styles.infoCard,
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
            styles.infoTitle,
            { color: theme.colors.foreground },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.infoText,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {text}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
    maxWidth: 1040,
    alignSelf: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  hero: {
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "900",
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18,
    marginBottom: 18,
  },
  metaPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  meta: {
    fontSize: 12,
    fontWeight: "800",
  },
  deadlinePanel: {
    marginBottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  deadlineLabel: {
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 3,
  },
  deadlineDetail: {
    fontSize: 13,
    fontWeight: "800",
  },
  progressPanel: {
    marginBottom: 18,
  },
  progressHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 12,
  },
  progressEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  progressValue: {
    fontSize: 19,
    fontWeight: "900",
  },
  progressTrack: {
    width: "100%",
    height: 9,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  heroActions: {
    width: "100%",
  },
  primaryAction: {
    alignSelf: "flex-start",
    minWidth: 210,
  },
  quizActionCard: {
    marginTop: 14,
  },
  quizActionText: {
    marginBottom: 14,
  },
  quizActionEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  quizActionTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  quizActionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  quizActionButton: {
    alignSelf: "flex-start",
    minWidth: 150,
  },
  infoGrid: {
    width: "100%",
  },
  infoCard: {
    marginBottom: 14,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 21,
  },
  programHeader: {
    marginTop: 10,
    marginBottom: 14,
  },
  programEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    maxWidth: 720,
  },
  moduleCard: {
    marginBottom: 14,
  },
  moduleTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  moduleNumber: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  moduleNumberText: {
    fontSize: 15,
    fontWeight: "900",
  },
  moduleText: {
    flex: 1,
  },
  moduleIndex: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  moduleTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900",
  },
  moduleDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  moduleMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 12,
  },
  moduleMeta: {
    fontSize: 12,
    fontWeight: "700",
  },
});
