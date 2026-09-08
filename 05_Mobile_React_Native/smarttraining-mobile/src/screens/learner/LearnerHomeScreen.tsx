import { Href, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import SmartTrainingBrandMark from "../../components/branding/SmartTrainingBrandMark";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import {
  ActivityItem,
  CertificateTile,
  DeadlineItem,
  MetricChip,
  PriorityItem,
  ProgressBlock,
  TrainingTile,
} from "../../components/ux/RichPrimitives";
import {
  AppEmptyState,
  AppErrorState,
  AppLoadingState,
} from "../../components/ux/AppStates";
import { API_BASE_URL } from "../../api/apiConfig";
import {
  getMyProgress,
  getMyRecommendations,
  getMyRiskIndicator,
} from "../../features/analytics/analyticsService";
import { getMyProfile } from "../../features/auth/learnerProfileService";
import { getMyCertificates } from "../../features/trainings/learnerCertificateService";
import { getMyLearnerTrainings } from "../../features/trainings/learnerTrainingService";
import {
  uxSpacing,
  uxTypography,
} from "../../theme/design-system/uxSemanticTokens";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import { ConnectedUser } from "../../types/auth";
import type { LearnerProfile } from "../../types/learnerProfile";

type LearnerTraining =
  Awaited<ReturnType<typeof getMyLearnerTrainings>>[number];
type LearnerProgress =
  Awaited<ReturnType<typeof getMyProgress>>[number];
type Recommendation =
  Awaited<ReturnType<typeof getMyRecommendations>>[number];
type Certificate =
  Awaited<ReturnType<typeof getMyCertificates>>[number];
type RiskIndicator =
  Awaited<ReturnType<typeof getMyRiskIndicator>>;

type LearnerHomeScreenProps = {
  user: ConnectedUser;
  onOpenCatalog: () => void;
  onOpenInvitations: () => void;
  onOpenTrainings: () => void;
  onOpenTraining: (trainingId: number) => void;
  onOpenProgress: () => void;
  onOpenRecommendations: () => void;
  onOpenCertificates: () => void;
  onOpenReviewsFeedback: () => void;
  onOpenSessions: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
};

type DashboardResults = Awaited<
  ReturnType<typeof fetchDashboardResults>
>;

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
  const firstName = (profile?.firstName || user.firstName || "").trim();
  const lastName = (profile?.lastName || user.lastName || "").trim();
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  if (initials) return initials;

  return (user.email || "?").trim().charAt(0).toUpperCase() || "?";
}

function clampProgress(value?: number | null): number {
  return Math.min(100, Math.max(0, Math.round(value ?? 0)));
}

function sortableDate(value?: string | null, missing = Number.POSITIVE_INFINITY): number {
  if (!value) return missing;

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? missing : parsed;
}

function formatDate(value?: string | null): string {
  if (!value) return "Date non disponible";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function resolveCoverUrl(training: LearnerTraining): string | null {
  const withCover = training as LearnerTraining & {
    coverImageUrl?: string | null;
  };
  const value = withCover.coverImageUrl?.trim();

  if (!value) return null;

  if (
    /^https?:\/\//i.test(value) ||
    value.startsWith("data:") ||
    value.startsWith("file:")
  ) {
    return value;
  }

  const apiRoot = API_BASE_URL
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");

  return `${apiRoot}${value.startsWith("/") ? "" : "/"}${value}`;
}

function nextStepLabel(training: LearnerTraining): string {
  const progress = clampProgress(training.progressPercentage);

  if (
    training.enrollmentStatus === "COMPLETED" ||
    progress >= 100
  ) {
    return "Parcours terminé";
  }

  if (progress > 0) {
    return "Prochaine étape : reprendre là où tu t’es arrêté";
  }

  return "Prochaine étape : commencer la formation";
}

function deadlineStatus(dueAt?: string | null): {
  label: string;
  overdue: boolean;
} {
  if (!dueAt) {
    return {
      label: "Planifiée",
      overdue: false,
    };
  }

  const due = new Date(dueAt).getTime();

  if (Number.isNaN(due)) {
    return {
      label: "Planifiée",
      overdue: false,
    };
  }

  const remainingDays = Math.ceil(
    (due - Date.now()) / (24 * 60 * 60 * 1000),
  );

  if (remainingDays < 0) {
    return {
      label: "En retard",
      overdue: true,
    };
  }

  if (remainingDays <= 7) {
    return {
      label: "À faire bientôt",
      overdue: false,
    };
  }

  return {
    label: "Planifiée",
    overdue: false,
  };
}

function recommendationSeverity(
  priority: Recommendation["priority"],
): "info" | "success" | "warning" | "error" {
  if (priority === "HIGH") return "warning";
  if (priority === "LOW") return "success";
  return "info";
}

function riskSeverity(
  level?: RiskIndicator["riskLevel"],
): "info" | "success" | "warning" | "error" {
  if (level === "HIGH") return "error";
  if (level === "MEDIUM") return "warning";
  if (level === "LOW") return "success";
  return "info";
}

function riskLevelLabel(level?: RiskIndicator["riskLevel"]): string {
  if (level === "HIGH") return "Élevé";
  if (level === "MEDIUM") return "Modéré";
  if (level === "LOW") return "Faible";
  if (level === "DATA_INSUFFICIENT") return "Données insuffisantes";
  return "Indéterminé";
}

async function fetchDashboardResults() {
  return Promise.allSettled(
    [
      getMyLearnerTrainings(),
      getMyProgress(),
      getMyRecommendations(),
      getMyCertificates(),
      getMyRiskIndicator(),
    ] as const,
  );
}

export default function LearnerHomeScreen({
  user,
  onOpenCatalog,
  onOpenInvitations,
  onOpenTrainings,
  onOpenTraining,
  onOpenProgress,
  onOpenRecommendations,
  onOpenCertificates,
  onOpenReviewsFeedback,
  onOpenSessions,
  onOpenProfile,
  onLogout,
}: LearnerHomeScreenProps) {
  const { theme } = useSmartTrainingTheme();

  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [trainings, setTrainings] = useState<LearnerTraining[]>([]);
  const [progressRows, setProgressRows] = useState<LearnerProgress[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [risk, setRisk] = useState<RiskIndicator | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coreError, setCoreError] = useState("");
  const [progressUnavailable, setProgressUnavailable] = useState(false);
  const [recommendationsUnavailable, setRecommendationsUnavailable] =
    useState(false);
  const [certificatesUnavailable, setCertificatesUnavailable] =
    useState(false);
  const [riskUnavailable, setRiskUnavailable] = useState(false);

  const applyResults = useCallback((results: DashboardResults) => {
    const [
      trainingsResult,
      progressResult,
      recommendationsResult,
      certificatesResult,
      riskResult,
    ] = results;

    if (trainingsResult.status === "fulfilled") {
      setTrainings(trainingsResult.value);
      setCoreError("");
    } else {
      setTrainings([]);
      setCoreError(
        "Impossible de charger tes formations pour le moment.",
      );
    }

    if (progressResult.status === "fulfilled") {
      setProgressRows(progressResult.value);
      setProgressUnavailable(false);
    } else {
      setProgressRows([]);
      setProgressUnavailable(true);
    }

    if (recommendationsResult.status === "fulfilled") {
      setRecommendations(recommendationsResult.value);
      setRecommendationsUnavailable(false);
    } else {
      setRecommendations([]);
      setRecommendationsUnavailable(true);
    }

    if (certificatesResult.status === "fulfilled") {
      setCertificates(certificatesResult.value);
      setCertificatesUnavailable(false);
    } else {
      setCertificates([]);
      setCertificatesUnavailable(true);
    }

    if (riskResult.status === "fulfilled") {
      setRisk(riskResult.value);
      setRiskUnavailable(false);
    } else {
      setRisk(null);
      setRiskUnavailable(true);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void getMyProfile()
      .then((nextProfile) => {
        if (active) {
          setProfile(nextProfile);
        }
      })
      .catch(() => {
        if (active) {
          setProfile(null);
        }
      });

    return () => {
      active = false;
    };
  }, [user.userId]);

  useEffect(() => {
    let active = true;

    void fetchDashboardResults()
      .then((results) => {
        if (active) {
          applyResults(results);
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
  }, [applyResults]);

  async function refresh() {
    setRefreshing(true);

    try {
      applyResults(await fetchDashboardResults());
    } finally {
      setRefreshing(false);
    }
  }

  const summary = useMemo(() => {
    const completed = trainings.filter(
      (training) =>
        training.enrollmentStatus === "COMPLETED" ||
        clampProgress(training.progressPercentage) >= 100,
    ).length;

    const averageProgress = trainings.length
      ? Math.round(
          trainings.reduce(
            (total, training) =>
              total + clampProgress(training.progressPercentage),
            0,
          ) / trainings.length,
        )
      : 0;

    return {
      completed,
      averageProgress,
    };
  }, [trainings]);

  const trainingTitleById = useMemo(
    () =>
      new Map(
        trainings.map((training) => [
          training.id,
          training.title,
        ] as const),
      ),
    [trainings],
  );

  const heroTraining = useMemo(() => {
    const candidates = trainings.filter(
      (training) =>
        training.enrollmentStatus !== "COMPLETED" &&
        clampProgress(training.progressPercentage) < 100,
    );

    return [...candidates].sort((a, b) => {
      const aStarted =
        clampProgress(a.progressPercentage) > 0 ? 0 : 1;
      const bStarted =
        clampProgress(b.progressPercentage) > 0 ? 0 : 1;

      if (aStarted !== bStarted) {
        return aStarted - bStarted;
      }

      const deadlineDelta =
        sortableDate(a.dueAt) - sortableDate(b.dueAt);

      if (
        Number.isFinite(deadlineDelta) &&
        deadlineDelta !== 0
      ) {
        return deadlineDelta;
      }

      return (
        clampProgress(b.progressPercentage) -
        clampProgress(a.progressPercentage)
      );
    })[0] ?? null;
  }, [trainings]);

  const deadlines = useMemo(
    () =>
      trainings
        .filter(
          (training) =>
            Boolean(training.dueAt) &&
            training.enrollmentStatus !== "COMPLETED" &&
            clampProgress(training.progressPercentage) < 100,
        )
        .sort(
          (a, b) =>
            sortableDate(a.dueAt) - sortableDate(b.dueAt),
        )
        .slice(0, 3),
    [trainings],
  );

  const activeRecommendations = useMemo(
    () =>
      recommendations
        .filter(
          (item) =>
            item.status !== "COMPLETED" &&
            item.status !== "DISMISSED",
        )
        .sort((a, b) => {
          const rank = {
            HIGH: 0,
            MEDIUM: 1,
            LOW: 2,
          } as const;

          const priorityDelta =
            rank[a.priority] - rank[b.priority];

          if (priorityDelta !== 0) {
            return priorityDelta;
          }

          return (
            sortableDate(b.createdAt, 0) -
            sortableDate(a.createdAt, 0)
          );
        })
        .slice(0, 2),
    [recommendations],
  );

  const recentActivity = useMemo(
    () =>
      progressRows
        .filter((row) => Boolean(row.lastActivityAt))
        .sort(
          (a, b) =>
            sortableDate(b.lastActivityAt, 0) -
            sortableDate(a.lastActivityAt, 0),
        )
        .slice(0, 4),
    [progressRows],
  );

  const latestCertificates = useMemo(
    () =>
      [...certificates]
        .sort(
          (a, b) =>
            sortableDate(b.issuedAt, 0) -
            sortableDate(a.issuedAt, 0),
        )
        .slice(0, 2),
    [certificates],
  );

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingPage}>
          <AppLoadingState label="Chargement de ton espace apprenant…" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: theme.shape.cardPadding,
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
            <View style={styles.heroIdentityRow}>
              <SmartTrainingBrandMark size={52} />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ouvrir Mon compte"
                hitSlop={8}
                onPress={() =>
                  router.push("/learner/profile" as Href)
                }
                style={({ pressed }) => ({
                  opacity: pressed ? 0.72 : 1,
                })}
              >
                {profile?.avatarDataUrl ? (
                  <Image
                    source={{ uri: profile.avatarDataUrl }}
                    accessibilityLabel="Photo de profil"
                    style={[
                      styles.profileAvatar,
                      {
                        borderColor: theme.colors.border,
                        borderWidth: theme.shape.borderWidth,
                      },
                    ]}
                  />
                ) : (
                  <View
                    accessible
                    accessibilityLabel="Avatar du profil"
                    style={[
                      styles.profileAvatarFallback,
                      {
                        backgroundColor: theme.colors.surfaceSoft,
                        borderColor: theme.colors.border,
                        borderWidth: theme.shape.borderWidth,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.profileAvatarText,
                        { color: theme.colors.accent },
                      ]}
                    >
                      {profileInitials(profile, user)}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>
              ESPACE APPRENANT
            </Text>

            <Text
              style={[
                styles.heroTitle,
                {
                  color: theme.colors.foreground,
                },
              ]}
            >
              Bonjour, {displayName(user)}
            </Text>

            <Text
              style={[
                styles.body,
                {
                  color: theme.colors.foregroundMuted,
                },
              ]}
            >
              Reprends immédiatement ton parcours et retrouve les actions
              utiles à ton apprentissage.
            </Text>

            <View style={styles.metricsRow}>
              <MetricChip
                label="Formations"
                value={trainings.length}
              />
              <MetricChip
                label="Terminées"
                value={summary.completed}
              />
              <MetricChip
                label="Progression"
                value={`${summary.averageProgress} %`}
              />
            </View>
          </View>

          {coreError ? (
            <View style={styles.section}>
              <AppErrorState
                title="Ton parcours n’a pas pu être chargé"
                description={coreError}
                actionLabel="Réessayer"
                onAction={() => void refresh()}
              />
            </View>
          ) : null}

          {!coreError ? (
            <>
              <View style={styles.section}>
                <SectionHeader
                  title="Continuer mon parcours"
                  subtitle="La prochaine action utile à partir de tes formations réelles."
                />

                {heroTraining ? (
                  <TrainingTile
                    title={heroTraining.title}
                    description={
                      heroTraining.shortDescription ||
                      "Formation disponible dans ton parcours."
                    }
                    coverUrl={resolveCoverUrl(heroTraining)}
                    meta={[
                      nextStepLabel(heroTraining),
                      heroTraining.dueAt
                        ? `Échéance : ${formatDate(heroTraining.dueAt)}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    progress={clampProgress(
                      heroTraining.progressPercentage,
                    )}
                    onPress={() =>
                      onOpenTraining(heroTraining.id)
                    }
                  />
                ) : trainings.length ? (
                  <AppEmptyState
                    title="Parcours à jour"
                    description="Aucune formation n’attend une reprise immédiate."
                    actionLabel="Voir mes formations"
                    onAction={onOpenTrainings}
                  />
                ) : (
                  <AppEmptyState
                    title="Aucune formation affectée"
                    description="Explore le catalogue pour découvrir les formations disponibles."
                    actionLabel="Explorer le catalogue"
                    onAction={onOpenCatalog}
                  />
                )}
              </View>

              <View style={styles.section}>
                <SectionHeader
                  title="Ma progression"
                  subtitle="Une lecture simple de ton avancement global."
                />

                {progressUnavailable ? (
                  <AppErrorState
                    title="Progression indisponible"
                    description="Les données de progression ne peuvent pas être chargées pour le moment."
                  />
                ) : (
                  <ProgressBlock
                    title="Progression moyenne"
                    value={summary.averageProgress}
                    helper={
                      trainings.length
                        ? `${trainings.length} formation${
                            trainings.length > 1 ? "s" : ""
                          } dans ton espace`
                        : "Aucune formation en cours"
                    }
                  />
                )}

                {riskUnavailable ? null : risk?.riskLevel ===
                  "DATA_INSUFFICIENT" ? (
                  <View style={styles.subSection}>
                    <PriorityItem
                      title="Données insuffisantes"
                      description="Il n’y a pas encore assez d’activité pour évaluer précisément ton besoin d’accompagnement. Continue ton parcours : l’indicateur s’ajustera."
                      severity="info"
                    />
                  </View>
                ) : risk ? (
                  <View style={styles.subSection}>
                    <PriorityItem
                      title="Indicateur d’accompagnement"
                      description={`Niveau : ${riskLevelLabel(risk.riskLevel)} · Progression observée : ${clampProgress(
                        risk.averageProgress,
                      )} %`}
                      severity={riskSeverity(risk.riskLevel)}
                    />
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  <AppButton
                    title="Voir ma progression"
                    onPress={onOpenProgress}
                    variant="secondary"
                    style={styles.flexAction}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <SectionHeader
                  title="Mes échéances"
                  subtitle="Les prochaines dates liées à tes formations actives."
                />

                {!deadlines.length ? (
                  <AppEmptyState
                    title="Aucune échéance proche"
                    description="Aucune date limite n’est actuellement enregistrée."
                  />
                ) : (
                  <View style={styles.listGap}>
                    {deadlines.map((training) => {
                      const status = deadlineStatus(
                        training.dueAt,
                      );

                      return (
                        <DeadlineItem
                          key={training.id}
                          title={training.title}
                          deadlineLabel={`Échéance : ${formatDate(
                            training.dueAt,
                          )}`}
                          status={status.label}
                          overdue={status.overdue}
                        />
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <SectionHeader
                  title="Mes recommandations"
                  subtitle="Actions pédagogiques réellement proposées à partir de tes données."
                />

                {recommendationsUnavailable ? (
                  <AppErrorState
                    title="Recommandations indisponibles"
                    description="Les recommandations ne peuvent pas être chargées pour le moment."
                  />
                ) : !activeRecommendations.length ? (
                  <AppEmptyState
                    title="Aucune recommandation en attente"
                    description="Aucune action particulière ne t’est proposée pour le moment."
                    actionLabel="Voir ma progression"
                    onAction={onOpenProgress}
                  />
                ) : (
                  <View style={styles.listGap}>
                    {activeRecommendations.map((item) => (
                      <PriorityItem
                        key={item.id}
                        title={item.title}
                        description={item.description}
                        severity={recommendationSeverity(
                          item.priority,
                        )}
                      />
                    ))}
                  </View>
                )}

                <View style={styles.actionRow}>
                  <AppButton
                    title="Voir toutes les recommandations"
                    onPress={onOpenRecommendations}
                    variant="secondary"
                    style={styles.flexAction}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <SectionHeader
                  title="Activité récente"
                  subtitle="Dernières progressions réellement enregistrées."
                />

                {progressUnavailable ? (
                  <AppErrorState
                    title="Activité indisponible"
                    description="L’activité récente ne peut pas être chargée pour le moment."
                  />
                ) : !recentActivity.length ? (
                  <AppEmptyState
                    title="Aucune activité récente"
                    description="Commence ou poursuis une formation pour alimenter ton activité."
                  />
                ) : (
                  <View style={styles.listGap}>
                    {recentActivity.map((row) => (
                      <ActivityItem
                        key={row.id}
                        title={
                          trainingTitleById.get(
                            row.trainingId,
                          ) || "Formation suivie"
                        }
                        description={`Progression enregistrée : ${clampProgress(
                          row.progressPercentage,
                        )} %`}
                        timestamp={formatDateTime(
                          row.lastActivityAt,
                        )}
                      />
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <SectionHeader
                  title="Mes certificats"
                  subtitle="Tes dernières réussites délivrées par SmartTraining."
                />

                {certificatesUnavailable ? (
                  <AppErrorState
                    title="Certificats indisponibles"
                    description="Tes certificats ne peuvent pas être chargés pour le moment."
                  />
                ) : !latestCertificates.length ? (
                  <AppEmptyState
                    title="Aucun certificat pour le moment"
                    description="Termine une formation éligible pour obtenir ton premier certificat."
                    actionLabel="Voir mes formations"
                    onAction={onOpenTrainings}
                  />
                ) : (
                  <View style={styles.listGap}>
                    {latestCertificates.map((certificate) => (
                      <CertificateTile
                        key={certificate.id}
                        title={certificate.trainingTitle}
                        issuedAt={formatDate(
                          certificate.issuedAt,
                        )}
                        verificationLabel={
                          certificate.status === "ACTIVE"
                            ? "Certificat valide"
                            : certificate.status
                        }
                        onPress={onOpenCertificates}
                      />
                    ))}
                  </View>
                )}

                <View style={styles.actionRow}>
                  <AppButton
                    title="Voir mes certificats"
                    onPress={onOpenCertificates}
                    variant="secondary"
                    style={styles.flexAction}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.discoveryPanel,
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
                    {
                      color: theme.colors.foreground,
                    },
                  ]}
                >
                  Explorer et se faire accompagner
                </Text>

                <Text
                  style={[
                    styles.body,
                    {
                      color: theme.colors.foregroundMuted,
                    },
                  ]}
                >
                  Découvre de nouvelles formations, consulte tes invitations et
                  retrouve les échanges utiles avec ton formateur.
                </Text>

                <View style={styles.actionGrid}>
                  <AppButton
                    title="Explorer"
                    onPress={onOpenCatalog}
                    variant="secondary"
                    style={styles.flexAction}
                  />
                  <AppButton
                    title="Invitations"
                    onPress={onOpenInvitations}
                    variant="secondary"
                    style={styles.flexAction}
                  />
                  <AppButton
                    title="Mes séances"
                    onPress={onOpenSessions}
                    variant="secondary"
                    style={styles.flexAction}
                  />
                  <AppButton
                    title="Avis et feedback"
                    onPress={onOpenReviewsFeedback}
                    variant="secondary"
                    style={styles.flexAction}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.accountActions,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
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
                    {
                      color: theme.colors.foreground,
                    },
                  ]}
                >
                  Compte et session
                </Text>

                <View style={styles.actionGrid}>
                  <AppButton
                    title="Gérer mon compte"
                    onPress={onOpenProfile}
                    variant="secondary"
                    style={styles.flexAction}
                  />
                  <AppButton
                    title="Se déconnecter"
                    onPress={onLogout}
                    variant="secondary"
                    style={styles.flexAction}
                  />
                </View>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingPage: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: uxSpacing.xl,
  },
  page: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    gap: uxSpacing.xl,
  },
  hero: {
    gap: uxSpacing.md,
  },
  heroIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: uxSpacing.md,
  },
  profileAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  profileAvatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    fontSize: uxTypography.title,
    fontWeight: "900",
  },
  eyebrow: {
    fontSize: uxTypography.caption,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: uxTypography.headline,
    lineHeight: 34,
    fontWeight: "900",
  },
  body: {
    fontSize: uxTypography.body,
    lineHeight: 21,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: uxSpacing.sm,
  },
  section: {
    gap: uxSpacing.md,
  },
  subSection: {
    marginTop: uxSpacing.sm,
  },
  listGap: {
    gap: uxSpacing.md,
  },
  actionRow: {
    marginTop: uxSpacing.sm,
    flexDirection: "row",
  },
  flexAction: {
    flexGrow: 1,
    minWidth: 148,
  },
  discoveryPanel: {
    gap: uxSpacing.md,
  },
  accountActions: {
    gap: uxSpacing.md,
  },
  sectionTitle: {
    fontSize: uxTypography.title,
    fontWeight: "800",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: uxSpacing.sm,
  },
});
