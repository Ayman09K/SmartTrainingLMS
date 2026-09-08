import { useEffect, useMemo, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import { ActivityItem } from "../../components/ux/RichPrimitives";
import {
  getTrainerLearner360,
} from "../../features/trainer/trainerLearnerService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerLearner360Data,
  TrainerLearnerProgress,
  TrainerLearnerRisk,
} from "../../types/trainerLearnerMobile";

type Props = {
  trainerId: number;
  learnerId: number;
};

function fullName(data: TrainerLearner360Data): string {
  const { identity } = data;

  return (
    identity.fullName ||
    [identity.firstName, identity.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    identity.email
  );
}

function initials(value: string): string {
  const parts = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.length
    ? parts
        .map((part) =>
          part.charAt(0).toLocaleUpperCase("fr"),
        )
        .join("")
    : "AP";
}

function formatDate(
  value?: string | null,
  fallback = "Aucune activité",
): string {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function eventTypeLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    TRAINING_OPENED: "Formation ouverte",
    MODULE_OPENED: "Module ouvert",
    LESSON_OPENED: "Leçon ouverte",
    LESSON_COMPLETED: "Leçon terminée",
    RESOURCE_OPENED: "Ressource ouverte",
    VIDEO_OPENED: "Vidéo ouverte",
    VIDEO_COMPLETED: "Vidéo terminée",
    PDF_OPENED: "PDF ouvert",
    SCORM_OPENED: "Module SCORM ouvert",
    QUIZ_STARTED: "Quiz commencé",
    QUIZ_SUBMITTED: "Quiz soumis",
    QUIZ_PASSED: "Quiz réussi",
    QUIZ_FAILED: "Quiz à reprendre",
    SCORE_RECORDED: "Score enregistré",
    REVIEW_CREATED: "Avis publié",
    FEEDBACK_CREATED: "Feedback envoyé",
    HELP_REQUESTED: "Demande d’aide",
  };

  return value ? labels[value] || "Activité pédagogique" : "Activité pédagogique";
}

function progressStatusLabel(
  value?: string | null,
): string {
  const labels: Record<string, string> = {
    NOT_STARTED: "Non commencée",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminée",
    AT_RISK: "À reprendre",
  };

  if (!value) {
    return "À examiner";
  }

  return labels[value] || "À examiner";
}

function riskLabel(
  risk?: TrainerLearnerRisk,
): string {
  if (
    !risk ||
    risk.dataStatus === "DATA_INSUFFICIENT" ||
    risk.riskLevel === "DATA_INSUFFICIENT"
  ) {
    return "Données insuffisantes";
  }

  if (risk.riskLevel === "HIGH") {
    return "Accompagnement prioritaire";
  }

  if (risk.riskLevel === "MEDIUM") {
    return "Accompagnement à renforcer";
  }

  if (risk.riskLevel === "LOW") {
    return "Suivi léger";
  }

  return "À examiner";
}

export default function TrainerLearner360Screen({
  trainerId,
  learnerId,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [data, setData] =
    useState<TrainerLearner360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded =
      await getTrainerLearner360(trainerId, learnerId);

    setData(loaded);
  }

  useEffect(() => {
    let active = true;

    if (!Number.isFinite(learnerId) || learnerId <= 0) {
      setError("Apprenant invalide.");
      setLoading(false);

      return () => {
        active = false;
      };
    }

    void getTrainerLearner360(trainerId, learnerId)
      .then((loaded) => {
        if (active) {
          setData(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible d’ouvrir ce suivi ou cet apprenant ne fait pas partie de votre périmètre.",
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
  }, [learnerId, trainerId]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError(
        "Impossible d’actualiser le suivi 360.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  const trainingById = useMemo(() => {
    if (!data) {
      return new Map<number, string>();
    }

    return new Map(
      data.trainings.map((training) => [
        training.id,
        training.title,
      ]),
    );
  }, [data]);

  if (loading) {
    return (
      <LoadingState message="Chargement du suivi 360..." />
    );
  }

  if (!data) {
    return (
      <ScreenContainer>
        <View style={styles.fallback}>
          <ErrorMessage
            message={error || "Suivi indisponible."}
            onRetry={() => void refresh()}
          />
        </View>
      </ScreenContainer>
    );
  }

  const name = fullName(data);
  const { identity, overview } = data;
  const summary = overview.summary;

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View
            style={[
              styles.identityCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            {identity.avatarDataUrl ? (
              <Image
                source={{ uri: identity.avatarDataUrl }}
                accessibilityLabel="Photo de l’apprenant"
                style={styles.avatar}
              />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.border,
                    borderWidth: theme.shape.borderWidth,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.initials,
                    { color: theme.colors.accent },
                  ]}
                >
                  {initials(name)}
                </Text>
              </View>
            )}

            <View style={styles.identityCopy}>
              <Text
                style={[
                  styles.identityEyebrow,
                  { color: theme.colors.accent },
                ]}
              >
                SUIVI 360
              </Text>
              <Text
                style={[
                  styles.identityName,
                  { color: theme.colors.foreground },
                ]}
              >
                {name}
              </Text>
              <Text
                style={[
                  styles.identityEmail,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                {identity.email}
              </Text>
            </View>
          </View>

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => void refresh()}
            />
          ) : null}

          <SectionHeader
            title="Synthèse pédagogique"
            subtitle="Indicateurs consolidés sur les formations que vous suivez."
          />

          <View style={styles.metricGrid}>
            <Metric
              value={String(summary.totalTrainings)}
              label="Formations suivies"
            />
            <Metric
              value={`${summary.averageProgress ?? 0} %`}
              label="Progression moyenne"
            />
            <Metric
              value={`${summary.averageScore ?? 0} %`}
              label="Score moyen"
            />
            <Metric
              value={String(summary.openAlerts ?? 0)}
              label="Alertes ouvertes"
            />
            <Metric
              value={String(summary.helpRequests ?? 0)}
              label="Demandes d’aide"
            />
          </View>

          <View
            style={[
              styles.lastActivity,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderRadius: theme.shape.cardRadius,
              },
            ]}
          >
            <Text
              style={[
                styles.lastActivityLabel,
                { color: theme.colors.foregroundSubtle },
              ]}
            >
              DERNIÈRE ACTIVITÉ
            </Text>
            <Text
              style={[
                styles.lastActivityValue,
                { color: theme.colors.foreground },
              ]}
            >
              {formatDate(summary.lastActivityAt)}
            </Text>
          </View>

          <SectionHeader
            title="Progression par formation"
            subtitle="Progression autoritaire, quiz et niveau d’accompagnement."
          />

          {overview.progress.length === 0 ? (
            <View
              style={[
                styles.empty,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Aucune progression n’est encore enregistrée.
              </Text>
            </View>
          ) : (
            overview.progress.map((progress) => (
              <ProgressCard
                key={progress.id}
                progress={progress}
                trainingName={
                  trainingById.get(progress.trainingId) ||
                  "Formation suivie"
                }
                risk={overview.risks.find(
                  (item) =>
                    item.trainingId === progress.trainingId,
                )}
              />
            ))
          )}

          <SectionHeader
            title="Vue d’ensemble"
            subtitle="Les signaux utiles pour préparer votre accompagnement."
          />

          <View style={styles.domainGrid}>
            <Domain
              value={overview.recentEvents.length}
              label="Activités récentes"
            />
            <Domain
              value={overview.feedbacks.length}
              label="Feedbacks"
            />
            <Domain
              value={overview.recommendations.length}
              label="Recommandations"
            />
            <Domain
              value={overview.interventions.length}
              label="Interventions"
            />
          </View>

          <SectionHeader
            title="Activité récente"
            subtitle="Derniers événements pédagogiques réels du suivi 360."
          />

          {overview.recentEvents.length > 0 ? (
            <View style={styles.activityList}>
              {overview.recentEvents.map((item) => {
                const training =
                  item.trainingId != null
                    ? trainingById.get(item.trainingId)
                    : undefined;
                const score =
                  item.score != null && item.totalPoints != null
                    ? `Score : ${item.score}/${item.totalPoints}`
                    : "";
                const description = [item.description || training || "", score]
                  .filter(Boolean)
                  .join(" • ");

                return (
                  <ActivityItem
                    key={item.id}
                    title={eventTypeLabel(item.eventType)}
                    description={description || undefined}
                    timestamp={formatDate(item.eventDate)}
                  />
                );
              })}
            </View>
          ) : (
            <Text
              style={[
                styles.activityEmpty,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Aucune activité pédagogique récente n’est disponible.
            </Text>
          )}

          <View
            style={[
              styles.nextCard,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderRadius: theme.shape.cardRadius,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <Text
              style={[
                styles.nextTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Accompagnement formateur
            </Text>
            <Text
              style={[
                styles.nextText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Les écrans suivants permettront de traiter les
              alertes, d’examiner les facteurs de risque,
              de répondre aux feedbacks et de piloter les
              interventions et séances.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function Metric({
    value,
    label,
  }: {
    value: string;
    label: string;
  }) {
    return (
      <View
        style={[
          styles.metric,
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
            styles.metricValue,
            { color: theme.colors.accent },
          ]}
        >
          {value}
        </Text>
        <Text
          style={[
            styles.metricLabel,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {label}
        </Text>
      </View>
    );
  }

  function ProgressCard({
    progress,
    trainingName,
    risk,
  }: {
    progress: TrainerLearnerProgress;
    trainingName: string;
    risk?: TrainerLearnerRisk;
  }) {
    return (
      <View
        style={[
          styles.progressCard,
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
            styles.progressTitle,
            { color: theme.colors.foreground },
          ]}
        >
          {trainingName}
        </Text>

        <Text
          style={[
            styles.progressStatus,
            { color: theme.colors.accent },
          ]}
        >
          {progressStatusLabel(progress.status)}
        </Text>

        <View style={styles.progressMetrics}>
          <SmallMetric
            label="Progression"
            value={`${progress.progressPercentage ?? 0} %`}
          />
          <SmallMetric
            label="Score quiz"
            value={
              progress.completedQuizzes
                ? `${progress.averageScore ?? 0} %`
                : "Aucun quiz"
            }
          />
          <SmallMetric
            label="Leçons"
            value={`${progress.completedLessons ?? 0}/${progress.totalLessons ?? 0}`}
          />
        </View>

        <Text
          style={[
            styles.progressDate,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          Dernière activité : {formatDate(progress.lastActivityAt)}
        </Text>

        <View
          style={[
            styles.riskBadge,
            {
              backgroundColor: theme.colors.surfaceSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.riskText,
              { color: theme.colors.foreground },
            ]}
          >
            {riskLabel(risk)}
          </Text>
        </View>
      </View>
    );
  }

  function SmallMetric({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) {
    return (
      <View style={styles.smallMetric}>
        <Text
          style={[
            styles.smallMetricLabel,
            { color: theme.colors.foregroundSubtle },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.smallMetricValue,
            { color: theme.colors.foreground },
          ]}
        >
          {value}
        </Text>
      </View>
    );
  }

  function Domain({
    value,
    label,
  }: {
    value: number;
    label: string;
  }) {
    return (
      <View
        style={[
          styles.domainCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.shape.cardRadius,
            borderWidth: theme.shape.borderWidth,
          },
        ]}
      >
        <Text
          style={[
            styles.domainValue,
            { color: theme.colors.accent },
          ]}
        >
          {value}
        </Text>
        <Text
          style={[
            styles.domainLabel,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {label}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fallback: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingTop: 24,
  },
  scrollArea: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
    maxWidth: 1080,
    alignSelf: "center",
  },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 24,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 20,
    fontWeight: "900",
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  identityEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  identityName: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    marginTop: 4,
  },
  identityEmail: {
    fontSize: 12,
    marginTop: 3,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 155,
    minWidth: 0,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "900",
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  activityList: {
    gap: 12,
    marginBottom: 24,
  },
  activityEmpty: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 24,
  },
  lastActivity: {
    padding: 14,
    marginBottom: 24,
  },
  lastActivityLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  lastActivityValue: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 5,
  },
  progressCard: {
    marginBottom: 13,
  },
  progressTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  progressStatus: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: 5,
  },
  progressMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  smallMetric: {
    flexGrow: 1,
    flexBasis: 120,
    minWidth: 0,
  },
  smallMetricLabel: {
    fontSize: 10,
    fontWeight: "800",
  },
  smallMetricValue: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 3,
  },
  progressDate: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 13,
  },
  riskBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 10,
  },
  riskText: {
    fontSize: 11,
    fontWeight: "900",
  },
  empty: {
    padding: 18,
    marginBottom: 18,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  domainGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  domainCard: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 0,
    padding: 14,
  },
  domainValue: {
    fontSize: 22,
    fontWeight: "900",
  },
  domainLabel: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  nextCard: {
    marginTop: 4,
  },
  nextTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  nextText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
});