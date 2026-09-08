import { Href, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { API_BASE_URL } from "../../api/apiConfig";
import AppButton from "../../components/AppButton";
import SmartTrainingBrandMark from "../../components/branding/SmartTrainingBrandMark";
import ScreenContainer from "../../components/ScreenContainer";
import {
  ActivityItem,
  DeadlineItem,
  GroupTile,
  LearnerListItem,
  TrainingTile,
} from "../../components/ux/RichPrimitives";
import {
  AppEmptyState,
  AppErrorState,
  AppLoadingState,
} from "../../components/ux/AppStates";
import { getMyProfile } from "../../features/auth/learnerProfileService";
import { getTrainerDashboardSummary } from "../../features/trainer/trainerDashboardService";
import { getTrainerGroups } from "../../features/trainer/trainerGroupService";
import {
  getTrainerLearner360,
  getTrainerLearners,
} from "../../features/trainer/trainerLearnerService";
import { getTrainerSupportSessions } from "../../features/trainer/trainerActionService";
import {
  computeTrainingMetrics,
  getTrainerTrainingEnrollments,
  getTrainerTrainings,
} from "../../features/trainer/trainerTrainingService";
import {
  uxSpacing,
  uxTypography,
} from "../../theme/design-system/uxSemanticTokens";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { ConnectedUser } from "../../types/auth";
import type { LearnerProfile } from "../../types/learnerProfile";
import type { TrainerSupportSessionListItem } from "../../types/trainerActionMobile";
import type { TrainerLearnerGroup } from "../../types/trainerGroupMobile";
import type {
  TrainerLearner360Data,
  TrainerLearnerEvent,
  TrainerLearnerListItem,
  TrainerLearnerRisk,
} from "../../types/trainerLearnerMobile";
import type {
  TrainerDashboardSummary,
  TrainerTraining,
  TrainerTrainingMetrics,
} from "../../types/trainerMobile";

type Props = {
  user: ConnectedUser;
  onCreateTraining: () => void;
  onImportScorm: () => void;
  onOpenTrainings: () => void;
  onOpenTraining: (trainingId: number) => void;
  onOpenLearners: () => void;
  onOpenLearner: (learnerId: number) => void;
  onOpenAlerts: () => void;
  onOpenGroups: () => void;
  onOpenGroup: (groupId: number) => void;
  onOpenSupportSessions: () => void;
  onOpenSupportSession: (sessionId: number) => void;
};

type TrainingRow = {
  training: TrainerTraining;
  metrics: TrainerTrainingMetrics | null;
};

type TrainingRowsResult = {
  items: TrainingRow[];
  metricsFailures: number;
};

type DashboardData = {
  summary: TrainerDashboardSummary | null;
  trainings: TrainingRow[];
  learners: TrainerLearnerListItem[];
  learner360: TrainerLearner360Data[];
  groups: TrainerLearnerGroup[];
  sessions: TrainerSupportSessionListItem[];
  referenceNow: number;
  degradedSections: string[];
};

type PriorityLearner = {
  data: TrainerLearner360Data;
  risk: TrainerLearnerRisk | null;
  score: number;
};

type ActivityRow = {
  event: TrainerLearnerEvent;
  learnerName: string;
};

function resolveMediaUrl(value?: string | null): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const base = API_BASE_URL.replace(/\/api\/?$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

function safeTimestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Date non disponible";
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

function displayName(user: ConnectedUser): string {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user.email;
}

function profileInitials(
  profile: LearnerProfile | null,
  user: ConnectedUser,
): string {
  const first = (profile?.firstName || user.firstName || "")
    .trim()
    .charAt(0);
  const last = (profile?.lastName || user.lastName || "")
    .trim()
    .charAt(0);
  const initials = `${first}${last}`.toUpperCase();

  return initials || displayName(user).slice(0, 2).toUpperCase();
}

function learnerName(data: TrainerLearner360Data): string {
  return (
    data.identity.fullName ||
    [data.identity.firstName, data.identity.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    data.identity.email
  );
}

function trainingStatusLabel(value: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    PUBLISHED: "Publiée",
    ARCHIVED: "Archivée",
  };

  return labels[value] || value;
}

function eventLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    TRAINING_OPENED: "Formation ouverte",
    MODULE_OPENED: "Module ouvert",
    LESSON_OPENED: "Leçon ouverte",
    RESOURCE_OPENED: "Ressource ouverte",
    VIDEO_OPENED: "Vidéo ouverte",
    QUIZ_SUBMITTED: "Quiz envoyé",
    SCORE_RECORDED: "Score enregistré",
  };

  return value ? labels[value] || "Activité d’apprentissage" : "Activité d’apprentissage";
}

function riskRank(value?: string | null): number {
  if (value === "HIGH") return 4;
  if (value === "MEDIUM") return 3;
  if (value === "LOW") return 2;
  if (value === "DATA_INSUFFICIENT") return 1;
  return 0;
}

function selectRisk(data: TrainerLearner360Data): TrainerLearnerRisk | null {
  return (
    [...data.overview.risks].sort((a, b) => {
      const level = riskRank(b.riskLevel) - riskRank(a.riskLevel);
      if (level !== 0) return level;
      return (b.riskScore ?? 0) - (a.riskScore ?? 0);
    })[0] ?? null
  );
}

function priorityScore(data: TrainerLearner360Data, risk: TrainerLearnerRisk | null): number {
  return (
    riskRank(risk?.riskLevel) * 1000 +
    Math.round((risk?.riskScore ?? 0) * 100) +
    data.overview.summary.openAlerts * 100 +
    data.overview.summary.helpRequests * 50 +
    Math.max(0, 100 - data.overview.summary.averageProgress)
  );
}

function isInsufficient(risk: TrainerLearnerRisk | null): boolean {
  return (
    risk?.riskLevel === "DATA_INSUFFICIENT" ||
    risk?.dataStatus === "INSUFFICIENT" ||
    risk?.dataStatus === "DATA_INSUFFICIENT"
  );
}

function trainingTitleById(
  trainings: TrainingRow[],
  trainingId?: number | null,
): string {
  if (!trainingId) {
    return "Formation non précisée";
  }

  return (
    trainings.find((item) => item.training.id === trainingId)?.training.title ||
    `Formation ${trainingId}`
  );
}


async function fetchTrainingRows(trainerId: number): Promise<TrainingRowsResult> {
  const trainings = await getTrainerTrainings(trainerId);
  const enrollmentResults = await Promise.allSettled(
    trainings.map((training) =>
      getTrainerTrainingEnrollments(training.id),
    ),
  );

  let metricsFailures = 0;
  const items = trainings.map((training, index) => {
    const result = enrollmentResults[index];

    if (result.status === "fulfilled") {
      return {
        training,
        metrics: computeTrainingMetrics(result.value),
      };
    }

    metricsFailures += 1;
    return {
      training,
      metrics: null,
    };
  });

  return { items, metricsFailures };
}

async function fetchDashboard(trainerId: number): Promise<DashboardData> {
  const [summaryResult, trainingsResult, learnersResult, groupsResult, sessionsResult] =
    await Promise.allSettled([
      getTrainerDashboardSummary(trainerId),
      fetchTrainingRows(trainerId),
      getTrainerLearners(trainerId),
      getTrainerGroups(),
      getTrainerSupportSessions(trainerId),
    ]);

  const degradedSections: string[] = [];

  const summary =
    summaryResult.status === "fulfilled" ? summaryResult.value : null;
  if (summaryResult.status === "rejected") degradedSections.push("indicateurs");

  const trainings =
    trainingsResult.status === "fulfilled" ? trainingsResult.value.items : [];
  if (trainingsResult.status === "rejected") {
    degradedSections.push("formations");
  } else if (trainingsResult.value.metricsFailures > 0) {
    degradedSections.push("progression formations");
  }

  const learners =
    learnersResult.status === "fulfilled" ? learnersResult.value : [];
  if (learnersResult.status === "rejected") degradedSections.push("apprenants");

  const groups = groupsResult.status === "fulfilled" ? groupsResult.value : [];
  if (groupsResult.status === "rejected") degradedSections.push("groupes");

  const sessions =
    sessionsResult.status === "fulfilled" ? sessionsResult.value : [];
  if (sessionsResult.status === "rejected") degradedSections.push("séances");

  const learner360: TrainerLearner360Data[] = [];
  let learner360Failures = 0;

  for (let index = 0; index < learners.length; index += 8) {
    const batch = learners.slice(index, index + 8);
    const batchResults = await Promise.allSettled(
      batch.map((item) =>
        getTrainerLearner360(trainerId, item.identity.id),
      ),
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        learner360.push(result.value);
      } else {
        learner360Failures += 1;
      }
    }
  }

  if (learner360Failures > 0) {
    degradedSections.push("suivi 360");
  }

  if (summary?.degradedSections.length) {
    degradedSections.push(...summary.degradedSections);
  }

  return {
    summary,
    trainings,
    learners,
    learner360,
    groups,
    sessions,
    referenceNow: Date.now(),
    degradedSections: Array.from(new Set(degradedSections)),
  };
}

function TrainerMetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      accessible
      accessibilityLabel={`${label} : ${value}`}
      style={[
        styles.metricCard,
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
          styles.metricValue,
          { color: theme.colors.accent },
        ]}
      >
        {value}
      </Text>
      <Text
        numberOfLines={2}
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

export default function TrainerHomeScreen({
  user,
  onCreateTraining,
  onImportScorm,
  onOpenTrainings,
  onOpenTraining,
  onOpenLearners,
  onOpenLearner,
  onOpenAlerts,
  onOpenGroups,
  onOpenGroup,
  onOpenSupportSessions,
  onOpenSupportSession,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fatalError, setFatalError] = useState("");

  useEffect(() => {
    let active = true;

    void fetchDashboard(user.userId)
      .then((loaded) => {
        if (active) {
          setData(loaded);
          setFatalError("");
        }
      })
      .catch(() => {
        if (active) {
          setFatalError("Impossible de charger le tableau de bord formateur.");
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
  }, [user.userId]);

  useEffect(() => {
    let active = true;

    void getMyProfile()
      .then((loadedProfile) => {
        if (active && loadedProfile.role === "FORMATEUR") {
          setProfile(loadedProfile);
        }
      })
      .catch(() => {
        // Le dashboard reste utilisable avec les données de session ;
        // l’avatar retombera simplement sur les initiales.
      });

    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    setRefreshing(true);

    try {
      const loaded = await fetchDashboard(user.userId);
      setData(loaded);
      setFatalError("");
    } catch {
      setFatalError("Impossible d’actualiser le tableau de bord formateur.");
    } finally {
      setRefreshing(false);
    }
  }

  const visibleTrainings = useMemo(() => {
    if (!data) return [];

    return [...data.trainings]
      .sort((a, b) => {
        const published = Number(b.training.status === "PUBLISHED") - Number(a.training.status === "PUBLISHED");
        if (published !== 0) return published;
        return safeTimestamp(b.training.updatedAt) - safeTimestamp(a.training.updatedAt);
      })
      .slice(0, 2);
  }, [data]);

  const priorities = useMemo<PriorityLearner[]>(() => {
    if (!data) return [];

    return data.learner360
      .map((item) => {
        const risk = selectRisk(item);
        return {
          data: item,
          risk,
          score: priorityScore(item, risk),
        };
      })
      .filter(
        (item) =>
          item.risk !== null ||
          item.data.overview.summary.openAlerts > 0 ||
          item.data.overview.summary.helpRequests > 0,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
  }, [data]);

  const activities = useMemo<ActivityRow[]>(() => {
    if (!data) return [];

    return data.learner360
      .flatMap((item) =>
        item.overview.recentEvents.map((event) => ({
          event,
          learnerName: learnerName(item),
        })),
      )
      .sort((a, b) => safeTimestamp(b.event.eventDate) - safeTimestamp(a.event.eventDate))
      .slice(0, 3);
  }, [data]);

  const upcomingSessions = useMemo(() => {
    if (!data) return [];

    return data.sessions
      .filter((item) => item.session.status === "SCHEDULED")
      .sort((a, b) => safeTimestamp(a.session.scheduledAt) - safeTimestamp(b.session.scheduledAt));
  }, [data]);

  const activeGroups = useMemo(() => {
    if (!data) return [];

    return [...data.groups]
      .filter((group) => group.memberCount > 0)
      .sort((a, b) => b.memberCount - a.memberCount);
  }, [data]);

  const totalLearners = data?.learners.length ?? 0;
  const summary = data?.summary;
  const referenceNow = data?.referenceNow;

  if (loading) {
    return (
      <ScreenContainer>
        <AppLoadingState label="Ouverture de l’espace formateur…" />
      </ScreenContainer>
    );
  }

  if (!data && fatalError) {
    return (
      <ScreenContainer>
        <AppErrorState
          description={fatalError}
          actionLabel="Réessayer"
          onAction={() => void refresh()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
      >
        <View
          style={[
            styles.hero,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.shape.cardRadius,
              borderWidth: theme.shape.borderWidth,
            },
          ]}
        >
          <View style={styles.heroIdentityRow}>
            <SmartTrainingBrandMark size={52} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ouvrir Mon compte"
              hitSlop={8}
              onPress={() =>
                router.push("/trainer/profile" as Href)
              }
              style={({ pressed }) => ({
                opacity: pressed ? 0.72 : 1,
              })}
            >
              {profile?.avatarDataUrl ? (
                <Image
                  source={{ uri: profile.avatarDataUrl }}
                  style={[
                    styles.trainerAvatar,
                    {
                      borderColor: theme.colors.border,
                      borderWidth: theme.shape.borderWidth,
                    },
                  ]}
                  accessibilityLabel="Photo du profil formateur"
                />
              ) : (
                <View
                  style={[
                    styles.trainerAvatarFallback,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.border,
                      borderWidth: theme.shape.borderWidth,
                    },
                  ]}
                  accessibilityLabel="Avatar du profil formateur"
                >
                  <Text
                    style={[
                      styles.trainerAvatarText,
                      { color: theme.colors.accent },
                    ]}
                  >
                    {profileInitials(profile, user)}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>ESPACE FORMATEUR</Text>
          <Text style={[styles.headline, { color: theme.colors.foreground }]}>Bonjour {displayName(user)}</Text>
          <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>Pilotez vos formations, repérez les apprenants qui nécessitent votre attention et organisez vos actions pédagogiques.</Text>

          <View style={styles.heroActions}>
            <AppButton
              title="Créer une formation"
              onPress={onCreateTraining}
              style={styles.heroAction}
            />
            <AppButton
              title="Importer un SCORM"
              onPress={onImportScorm}
              variant="secondary"
              style={styles.heroAction}
            />
          </View>
        </View>

        {fatalError ? (
          <AppErrorState
            title="Actualisation incomplète"
            description={fatalError}
            actionLabel="Réessayer"
            onAction={() => void refresh()}
          />
        ) : null}

        {data?.degradedSections.length ? (
          <AppErrorState
            title="Certaines données sont indisponibles"
            description={`Sections concernées : ${data.degradedSections.join(", ")}. Les données disponibles restent affichées.`}
            actionLabel="Actualiser"
            onAction={() => void refresh()}
          />
        ) : null}

        <View style={styles.section}>
          <View style={styles.metricSectionHeading}>
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
              Indicateurs clés
            </Text>
            <Text style={[styles.metricSectionHint, { color: theme.colors.foregroundMuted }]}>
              Vue rapide de votre activité pédagogique.
            </Text>
          </View>

          <View style={styles.metrics}>
            <TrainerMetricCard
              label="Formations"
              value={summary?.trainings ?? data?.trainings.length ?? "—"}
            />
            <TrainerMetricCard
              label="Publiées"
              value={
                summary?.publishedTrainings ??
                data?.trainings.filter(
                  (item) => item.training.status === "PUBLISHED",
                ).length ??
                "—"
              }
            />
            <TrainerMetricCard
              label="Apprenants suivis"
              value={totalLearners}
            />
            <TrainerMetricCard
              label="Alertes ouvertes"
              value={summary?.openAlerts ?? "—"}
            />
            <TrainerMetricCard
              label="Séances planifiées"
              value={summary?.scheduledSessions ?? upcomingSessions.length}
            />
            <TrainerMetricCard
              label="Groupes actifs"
              value={activeGroups.length}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Apprenants prioritaires</Text>
              <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>Les situations qui demandent votre attention maintenant.</Text>
            </View>
            <AppButton title="Voir tout" onPress={onOpenLearners} variant="secondary" />
          </View>

          {priorities.length ? (
            priorities.map(({ data: learnerData, risk }) => {
              const name = learnerName(learnerData);
              const progress = risk?.averageProgress ?? learnerData.overview.summary.averageProgress;
              const trainingTitle = trainingTitleById(data?.trainings ?? [], risk?.trainingId);
              const insufficient = isInsufficient(risk);
              const alerts = learnerData.overview.summary.openAlerts;
              const helpRequests = learnerData.overview.summary.helpRequests;
              const riskLabel = insufficient
                ? "Données insuffisantes"
                : risk?.riskLevel === "HIGH"
                  ? "Risque élevé"
                  : risk?.riskLevel === "MEDIUM"
                    ? "Risque moyen"
                    : risk?.riskLevel === "LOW"
                      ? "Risque faible"
                      : "Suivi à examiner";
              const attention = [
                alerts > 0 ? `${alerts} alerte${alerts > 1 ? "s" : ""}` : null,
                helpRequests > 0
                  ? `${helpRequests} demande${helpRequests > 1 ? "s" : ""} d’aide`
                  : null,
              ]
                .filter(Boolean)
                .join(" • ");

              return (
                <LearnerListItem
                  key={learnerData.identity.id}
                  name={name}
                  email={learnerData.identity.email}
                  avatarUrl={learnerData.identity.avatarDataUrl}
                  subtitle={`${riskLabel} • Progression ${Math.round(progress)} %${attention ? ` • ${attention}` : ""}
${trainingTitle}`}
                  onPress={() => onOpenLearner(learnerData.identity.id)}
                />
              );
            })
          ) : (
            <AppEmptyState
              title="Aucune situation prioritaire détectée"
              description="Les suivis 360 disponibles ne remontent actuellement ni risque, ni alerte, ni demande d’aide prioritaire."
              actionLabel="Ouvrir les alertes"
              onAction={onOpenAlerts}
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Séances à venir</Text>
              <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>Rendez-vous d’accompagnement réellement planifiés.</Text>
            </View>
            <AppButton title="Voir tout" onPress={onOpenSupportSessions} variant="secondary" />
          </View>

          {upcomingSessions.length ? (
            upcomingSessions.slice(0, 3).map((item) => (
              <Pressable
                key={item.session.id}
                accessibilityRole="button"
                accessibilityLabel={`Ouvrir la séance ${item.session.title}`}
                onPress={() => onOpenSupportSession(item.session.id)}
                style={({ pressed }) => [
                  styles.deadlineBlock,
                  { opacity: pressed ? 0.82 : 1 },
                ]}
              >
                <DeadlineItem
                  title={item.session.title}
                  deadlineLabel={formatDateTime(item.session.scheduledAt)}
                  status={`${item.learner?.fullName || item.learner?.email || "Apprenant"} • ${item.training?.title || "Formation"}`}
                  actionHint="Ouvrir"
                  overdue={
                    referenceNow !== undefined &&
                    safeTimestamp(item.session.scheduledAt) < referenceNow
                  }
                />
              </Pressable>
            ))
          ) : (
            <AppEmptyState
              title="Aucune séance planifiée"
              description="Aucune séance d’accompagnement au statut SCHEDULED n’est disponible."
              actionLabel="Gérer les séances"
              onAction={onOpenSupportSessions}
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Mes formations</Text>
              <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>Vos formations récentes et leur progression.</Text>
            </View>
            <AppButton title="Voir tout" onPress={onOpenTrainings} variant="secondary" />
          </View>

          {visibleTrainings.length ? (
            visibleTrainings.map((item) => (
              <TrainingTile
                key={item.training.id}
                title={item.training.title}
                description={item.training.shortDescription || item.training.description || undefined}
                coverUrl={resolveMediaUrl(item.training.coverImageUrl)}
                meta={[
                  trainingStatusLabel(item.training.status),
                  item.training.category || null,
                  item.metrics
                    ? `${item.metrics.learners} apprenant${item.metrics.learners > 1 ? "s" : ""}`
                    : "Suivi des inscriptions indisponible",
                ].filter(Boolean).join(" • ")}
                progress={item.metrics?.averageProgress ?? null}
                onPress={() => onOpenTraining(item.training.id)}
              />
            ))
          ) : (
            <AppEmptyState
              title="Aucune formation à afficher"
              description="Créez une formation ou importez un package SCORM pour commencer."
              actionLabel="Créer une formation"
              onAction={onCreateTraining}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Activité récente</Text>
          <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>Derniers événements d’apprentissage.</Text>

          {activities.length ? (
            activities.map(({ event, learnerName: name }) => (
              <ActivityItem
                key={`${event.learnerId}-${event.id}`}
                title={`${name} — ${eventLabel(event.eventType)}`}
                description={[
                  event.description || null,
                  event.trainingId ? trainingTitleById(data?.trainings ?? [], event.trainingId) : null,
                  typeof event.progressPercentage === "number" ? `Progression ${Math.round(event.progressPercentage)} %` : null,
                ].filter(Boolean).join(" • ") || undefined}
                timestamp={formatDateTime(event.eventDate)}
              />
            ))
          ) : (
            <AppEmptyState
              title="Aucune activité récente disponible"
              description="Aucun événement d’apprentissage récent n’est remonté dans les suivis 360 actuellement chargés."
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Groupes actifs</Text>
              <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>Cohortes avec des membres actifs.</Text>
            </View>
            <AppButton title="Voir tout" onPress={onOpenGroups} variant="secondary" />
          </View>

          {activeGroups.length ? (
            activeGroups.slice(0, 2).map((group) => (
              <GroupTile
                key={group.id}
                name={group.name}
                memberCount={group.memberCount}
                description={group.description || undefined}
                onPress={() => onOpenGroup(group.id)}
              />
            ))
          ) : (
            <AppEmptyState
              title="Aucun groupe actif"
              description="Aucun groupe contenant des membres n’est actuellement disponible."
              actionLabel="Ouvrir les groupes"
              onAction={onOpenGroups}
            />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 0,
  },
  content: {
    padding: uxSpacing.lg,
    gap: uxSpacing.xl,
  },
  hero: {
    padding: uxSpacing.xl,
    gap: uxSpacing.md,
  },
  heroIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: uxSpacing.md,
  },
  trainerAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  trainerAvatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  trainerAvatarText: {
    fontSize: uxTypography.title,
    fontWeight: "900",
  },
  eyebrow: {
    fontSize: uxTypography.caption,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  headline: {
    fontSize: uxTypography.display,
    fontWeight: "900",
  },
  body: {
    fontSize: uxTypography.body,
    lineHeight: 20,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: uxSpacing.sm,
  },
  heroAction: {
    flexGrow: 1,
    minWidth: 150,
  },
  section: {
    gap: uxSpacing.md,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 136,
    minWidth: 0,
    minHeight: 86,
    paddingHorizontal: uxSpacing.md,
    paddingVertical: uxSpacing.md,
    justifyContent: "space-between",
    gap: uxSpacing.sm,
  },
  metricValue: {
    fontSize: uxTypography.headline,
    fontWeight: "900",
    lineHeight: 25,
  },
  metricLabel: {
    fontSize: uxTypography.caption,
    fontWeight: "700",
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: uxSpacing.md,
  },
  sectionHeaderText: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 180,
    gap: uxSpacing.xs,
  },
  sectionTitle: {
    fontSize: uxTypography.headline,
    fontWeight: "800",
  },
  metricSectionHeading: {
    gap: uxSpacing.xs,
  },
  metricSectionHint: {
    fontSize: uxTypography.caption,
    lineHeight: 17,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: uxSpacing.sm,
    alignItems: "stretch",
  },
  deadlineBlock: {
    gap: uxSpacing.sm,
  },
});
