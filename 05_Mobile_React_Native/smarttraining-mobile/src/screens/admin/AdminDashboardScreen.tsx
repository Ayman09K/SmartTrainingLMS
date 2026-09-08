import { SymbolView, type SymbolViewProps } from "expo-symbols";
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
  GroupTile,
  PriorityItem,
  TrainingTile,
  type PriorityItemSeverity,
} from "../../components/ux/RichPrimitives";
import {
  AppEmptyState,
  AppErrorState,
  AppLoadingState,
} from "../../components/ux/AppStates";
import { getAdminDashboardSummary } from "../../features/admin/adminDashboardService";
import { getMyProfile } from "../../features/auth/learnerProfileService";
import { getAdminOpenAlerts } from "../../features/admin/adminFeedbackAlertService";
import { getAdminGroups } from "../../features/admin/adminGroupService";
import {
  getAdminFullTraining,
  getAdminTrainings,
} from "../../features/admin/adminTrainingService";
import {
  uxSpacing,
  uxTypography,
} from "../../theme/design-system/uxSemanticTokens";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { ConnectedUser } from "../../types/auth";
import type { LearnerProfile } from "../../types/learnerProfile";


type Props = {
  user: ConnectedUser;
  onLogout: () => void;
};

type DashboardSummary = Awaited<ReturnType<typeof getAdminDashboardSummary>>;
type AdminTraining = Awaited<ReturnType<typeof getAdminTrainings>>[number];
type AdminFullTraining = Awaited<ReturnType<typeof getAdminFullTraining>>;
type AdminAlert = Awaited<ReturnType<typeof getAdminOpenAlerts>>[number];
type AdminGroup = Awaited<ReturnType<typeof getAdminGroups>>[number];

type TrainingRow = {
  summary: AdminTraining;
  full: AdminFullTraining | null;
};

type ActivityRow = {
  key: string;
  title: string;
  description?: string;
  at: string;
  timestamp: number;
};

type DashboardData = {
  summary: DashboardSummary | null;
  trainings: TrainingRow[];
  alerts: AdminAlert[];
  groups: AdminGroup[];
  degradedSections: string[];
};

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

function trainingStatusLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    DRAFT: "Brouillon",
    PUBLISHED: "Publiée",
    ARCHIVED: "Archivée",
  };

  if (!value) {
    return "Statut non renseigné";
  }

  return labels[value] || value;
}

function isDataInsufficient(alert: AdminAlert): boolean {
  const text = [
    alert.alertType || "",
    alert.title || "",
    alert.message || "",
    alert.source || "",
  ]
    .join(" ")
    .toUpperCase();

  return text.includes("DATA_INSUFFICIENT") || text.includes("INSUFFICIENT");
}

function alertSeverity(alert: AdminAlert): PriorityItemSeverity {
  if (isDataInsufficient(alert)) {
    return "info";
  }

  const severity = String(alert.severity || "").toUpperCase();

  if (severity === "HIGH" || severity === "CRITICAL") {
    return "error";
  }

  if (severity === "MEDIUM") {
    return "warning";
  }

  return "info";
}

function alertLabel(alert: AdminAlert): string {
  if (isDataInsufficient(alert)) {
    return "Données insuffisantes";
  }

  return alert.title?.trim() || alert.alertType?.trim() || "Alerte pédagogique";
}

function alertDescription(
  alert: AdminAlert,
  trainingById: Map<number, string>,
): string {
  const parts: string[] = [];
  const trainingTitle =
    typeof alert.trainingId === "number"
      ? trainingById.get(alert.trainingId)
      : undefined;

  if (trainingTitle) {
    parts.push(trainingTitle);
  }

  const message = alert.message?.trim();
  if (message) {
    parts.push(message);
  }

  if (isDataInsufficient(alert)) {
    parts.push("Le signal reste distinct d’un risque élevé tant que les données ne suffisent pas.");
  }

  return parts.join(" • ") || "Signal à examiner depuis l’espace Pilotage.";
}

function activityRows(
  trainings: TrainingRow[],
  alerts: AdminAlert[],
  groups: AdminGroup[],
): ActivityRow[] {
  const rows: ActivityRow[] = [];

  for (const alert of alerts) {
    if (!alert.createdAt) {
      continue;
    }

    rows.push({
      key: `alert-${alert.id}`,
      title: isDataInsufficient(alert)
        ? "Données encore insuffisantes"
        : alert.title?.trim() || "Alerte ouverte",
      description: alert.message?.trim() || "Signal de pilotage à examiner.",
      at: alert.createdAt,
      timestamp: safeTimestamp(alert.createdAt),
    });
  }

  for (const group of groups) {
    const at = group.updatedAt || group.createdAt;

    if (!at) {
      continue;
    }

    rows.push({
      key: `group-${group.id}`,
      title: `Groupe mis à jour : ${group.name}`,
      description: `${group.memberCount} membre${group.memberCount > 1 ? "s" : ""}`,
      at,
      timestamp: safeTimestamp(at),
    });
  }

  for (const row of trainings) {
    const at =
      row.full?.updatedAt ||
      row.full?.publishedAt ||
      row.full?.createdAt;

    if (!at) {
      continue;
    }

    rows.push({
      key: `training-${row.summary.id}`,
      title: `Formation : ${row.summary.title}`,
      description: trainingStatusLabel(row.summary.status),
      at,
      timestamp: safeTimestamp(at),
    });
  }

  return rows
    .filter((row) => row.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);
}

async function loadDashboardData(): Promise<DashboardData> {
  const [summaryResult, trainingsResult, alertsResult, groupsResult] =
    await Promise.allSettled([
      getAdminDashboardSummary(),
      getAdminTrainings(),
      getAdminOpenAlerts(),
      getAdminGroups(),
    ]);

  const degradedSections: string[] = [];

  const summary =
    summaryResult.status === "fulfilled" ? summaryResult.value : null;
  if (!summary) {
    degradedSections.push("synthèse");
  } else {
    degradedSections.push(...summary.degradedSections);
  }

  const trainings =
    trainingsResult.status === "fulfilled" ? trainingsResult.value : [];
  if (trainingsResult.status === "rejected") {
    degradedSections.push("formations");
  }

  const alerts = alertsResult.status === "fulfilled" ? alertsResult.value : [];
  if (alertsResult.status === "rejected") {
    degradedSections.push("alertes");
  }

  const groups = groupsResult.status === "fulfilled" ? groupsResult.value : [];
  if (groupsResult.status === "rejected") {
    degradedSections.push("groupes");
  }

  const selectedTrainings = [...trainings]
    .sort((a, b) => {
      const aPublished = a.status === "PUBLISHED" ? 1 : 0;
      const bPublished = b.status === "PUBLISHED" ? 1 : 0;

      if (aPublished !== bPublished) {
        return bPublished - aPublished;
      }

      return a.title.localeCompare(b.title, "fr");
    })
    .slice(0, 2);

  const detailResults = await Promise.allSettled(
    selectedTrainings.map((training) => getAdminFullTraining(training.id)),
  );

  const trainingRows = selectedTrainings.map((training, index) => {
    const detail = detailResults[index];

    return {
      summary: training,
      full: detail?.status === "fulfilled" ? detail.value : null,
    };
  });

  if (detailResults.some((result) => result.status === "rejected")) {
    degradedSections.push("détails des formations");
  }

  return {
    summary,
    trainings: trainingRows,
    alerts,
    groups,
    degradedSections: Array.from(new Set(degradedSections)),
  };
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View style={styles.sectionHeading}>
      <Text
        style={[
          styles.sectionTitle,
          { color: theme.colors.foreground },
        ]}
      >
        {title}
      </Text>
      {description ? (
        <Text
          style={[
            styles.sectionDescription,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}

function DashboardMetricCard({
  label,
  value,
  icon,
  onPress,
  attention = false,
}: {
  label: string;
  value: number;
  icon: SymbolViewProps["name"];
  onPress: () => void;
  attention?: boolean;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.metricCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: theme.shape.borderWidth,
          borderRadius: theme.shape.cardRadius,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.metricIcon,
          {
            backgroundColor: theme.colors.surfaceSoft,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <SymbolView
          name={icon}
          tintColor={
            attention
              ? theme.colors.warning
              : theme.colors.accent
          }
          size={22}
          weight="bold"
        />
      </View>

      <View style={styles.metricCopy}>
        <Text
          style={[
            styles.metricValue,
            { color: theme.colors.foreground },
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

      <Text
        importantForAccessibility="no"
        style={[
          styles.metricChevron,
          { color: theme.colors.accent },
        ]}
      >
        ›
      </Text>
    </Pressable>
  );
}

export default function AdminDashboardScreen({ user, onLogout }: Props) {
  const { theme } = useSmartTrainingTheme();
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void getMyProfile()
      .then((nextProfile) => {
        if (active && nextProfile.role === "ADMIN") {
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

    void loadDashboardData()
      .then((loaded) => {
        if (!active) {
          return;
        }

        setData(loaded);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger le tableau de bord administrateur.");
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
  }, []);

  async function refresh() {
    setRefreshing(true);

    try {
      const loaded = await loadDashboardData();
      setData(loaded);
      setError("");
    } catch {
      setError("Impossible d’actualiser le tableau de bord administrateur.");
    } finally {
      setRefreshing(false);
    }
  }

  const summary = data?.summary;

  const activeGroups = useMemo(
    () => (data?.groups || []).filter((group) => group.memberCount > 0).slice(0, 2),
    [data?.groups],
  );

  const priorityAlerts = useMemo(() => {
    const severityRank: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    return [...(data?.alerts || [])]
      .sort((a, b) => {
        const aInsufficient = isDataInsufficient(a) ? 1 : 0;
        const bInsufficient = isDataInsufficient(b) ? 1 : 0;

        if (aInsufficient !== bInsufficient) {
          return aInsufficient - bInsufficient;
        }

        const severityDelta =
          (severityRank[String(b.severity || "").toUpperCase()] || 0) -
          (severityRank[String(a.severity || "").toUpperCase()] || 0);

        if (severityDelta !== 0) {
          return severityDelta;
        }

        return safeTimestamp(b.createdAt) - safeTimestamp(a.createdAt);
      })
      .slice(0, 2);
  }, [data?.alerts]);

  const trainingById = useMemo(
    () =>
      new Map(
        (data?.trainings || []).map((row) => [row.summary.id, row.summary.title]),
      ),
    [data?.trainings],
  );

  const recentActivity = useMemo(
    () => activityRows(data?.trainings || [], data?.alerts || [], data?.groups || []),
    [data?.alerts, data?.groups, data?.trainings],
  );

  const dataInsufficientCount = useMemo(
    () => (data?.alerts || []).filter(isDataInsufficient).length,
    [data?.alerts],
  );

  if (loading) {
    return (
      <ScreenContainer>
        <AppLoadingState label="Ouverture de l’espace administrateur…" />
      </ScreenContainer>
    );
  }

  if (!data) {
    return (
      <ScreenContainer>
        {error ? (
          <AppErrorState
            title="Tableau de bord indisponible"
            description={error}
            actionLabel="Réessayer"
            onAction={() => void refresh()}
          />
        ) : (
          <AppEmptyState
            title="Aucune donnée de pilotage disponible"
            description="Le tableau de bord n’a renvoyé aucune donnée exploitable pour le moment."
            actionLabel="Actualiser"
            onAction={() => void refresh()}
          />
        )}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.page}>
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
                  router.push("/admin/profile" as Href)
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
              ESPACE ADMINISTRATEUR
            </Text>
            <Text style={[styles.heroTitle, { color: theme.colors.foreground }]}>
              Bonjour, {displayName(user)}
            </Text>
            <Text style={[styles.heroText, { color: theme.colors.foregroundMuted }]}>
              Supervisez la plateforme et repérez rapidement les éléments qui demandent votre attention.
            </Text>
            <View style={styles.heroActions}>
              <AppButton title="Actualiser" onPress={() => void refresh()} style={styles.heroButton} />
              <AppButton title="Se déconnecter" variant="secondary" onPress={onLogout} style={styles.heroButton} />
            </View>
          </View>

          {error ? (
            <AppErrorState
              title="Actualisation incomplète"
              description={error}
              actionLabel="Réessayer"
              onAction={() => void refresh()}
            />
          ) : null}

          {data.degradedSections.length > 0 ? (
            <AppErrorState
              title="Certaines données sont indisponibles"
              description={`Sections concernées : ${data.degradedSections.join(", ")}. Les valeurs indisponibles ne sont pas remplacées par de faux zéros.`}
            />
          ) : null}

          <SectionHeading
            title="Vue globale"
            description="Les indicateurs clés. Touchez une carte pour ouvrir la zone correspondante."
          />

          {summary ? (
            <View style={styles.metricGrid}>
              <DashboardMetricCard
                label="Utilisateurs"
                value={summary.users}
                icon={{ ios: "person.2.fill", android: "group", web: "group" }}
                onPress={() => router.push("/admin/users" as Href)}
              />
              <DashboardMetricCard
                label="Utilisateurs actifs"
                value={summary.activeUsers}
                icon={{ ios: "person.crop.circle.badge.checkmark", android: "verified_user", web: "verified_user" }}
                onPress={() => router.push("/admin/users" as Href)}
              />
              <DashboardMetricCard
                label="Formations"
                value={summary.trainings}
                icon={{ ios: "books.vertical.fill", android: "library_books", web: "library_books" }}
                onPress={() => router.push("/admin/trainings" as Href)}
              />
              <DashboardMetricCard
                label="Formations publiées"
                value={summary.publishedTrainings}
                icon={{ ios: "checkmark.seal.fill", android: "task_alt", web: "task_alt" }}
                onPress={() => router.push("/admin/trainings" as Href)}
              />
              <DashboardMetricCard
                label="Alertes ouvertes"
                value={summary.openAlerts}
                icon={{ ios: "exclamationmark.triangle.fill", android: "warning", web: "warning" }}
                attention={summary.openAlerts > 0}
                onPress={() => router.push("/admin/alerts" as Href)}
              />
              <DashboardMetricCard
                label="Demandes formateur"
                value={summary.pendingTrainerRequests}
                icon={{ ios: "person.badge.plus", android: "person_add", web: "person_add" }}
                attention={summary.pendingTrainerRequests > 0}
                onPress={() => router.push("/admin/trainer-requests" as Href)}
              />
            </View>
          ) : (
            <AppEmptyState
              title="Synthèse momentanément indisponible"
              description="Les autres sections restent affichées lorsqu’elles ont pu être chargées."
            />
          )}

          <SectionHeading
            title="Formations à superviser"
            description="Les formations à surveiller en priorité."
          />

          {data.trainings.length > 0 ? (
            <View style={styles.stack}>
              {data.trainings.map((row) => (
                <TrainingTile
                  key={row.summary.id}
                  title={row.summary.title}
                  description={row.full?.shortDescription || "Formation du catalogue SmartTraining"}
                  coverUrl={resolveMediaUrl(row.full?.coverImageUrl || row.full?.coverImagePath)}
                  meta={`${trainingStatusLabel(row.summary.status)} • ${row.summary.category || row.full?.category || "Sans catégorie"}`}
                  onPress={() => router.push("/admin/trainings" as Href)}
                />
              ))}
            </View>
          ) : (
            <AppEmptyState
              title="Aucune formation à afficher"
              description="Le catalogue administrateur ne contient actuellement aucune formation disponible dans cette vue."
              actionLabel="Ouvrir les formations"
              onAction={() => router.push("/admin/trainings" as Href)}
            />
          )}

          <SectionHeading
            title="Pilotage prioritaire"
            description="Les signaux qui nécessitent votre attention."
          />

          {dataInsufficientCount > 0 ? (
            <PriorityItem
              title="Données insuffisantes"
              description={`${dataInsufficientCount} ${dataInsufficientCount > 1 ? "signaux" : "signal"} ${dataInsufficientCount > 1 ? "ne disposent" : "ne dispose"} pas encore d’assez de données pour conclure à un risque.`}
              severity="info"
            />
          ) : null}

          {priorityAlerts.length > 0 ? (
            <View style={styles.stack}>
              {priorityAlerts.map((alert) => (
                <PriorityItem
                  key={alert.id}
                  title={alertLabel(alert)}
                  description={alertDescription(alert, trainingById)}
                  severity={alertSeverity(alert)}
                />
              ))}
              <AppButton
                title="Ouvrir le pilotage"
                onPress={() => router.push("/admin/alerts" as Href)}
                style={styles.sectionAction}
              />
            </View>
          ) : (
            <AppEmptyState
              title="Aucune alerte ouverte"
              description="Aucun signal de pilotage n’est actuellement remonté."
              actionLabel="Ouvrir le pilotage"
              onAction={() => router.push("/admin/alerts" as Href)}
            />
          )}

          <SectionHeading
            title="Activité récente"
            description="Les derniers événements administratifs utiles."
          />

          {recentActivity.length > 0 ? (
            <View style={styles.stack}>
              {recentActivity.map((item) => (
                <ActivityItem
                  key={item.key}
                  title={item.title}
                  description={item.description}
                  timestamp={formatDateTime(item.at)}
                />
              ))}
            </View>
          ) : (
            <AppEmptyState
              title="Pas encore d’activité récente"
              description="Aucun horodatage métier exploitable n’est disponible dans les données chargées."
            />
          )}

          <SectionHeading
            title="Groupes actifs"
            description="Les cohortes avec des membres actifs."
          />

          {activeGroups.length > 0 ? (
            <View style={styles.stack}>
              {activeGroups.map((group) => (
                <GroupTile
                  key={group.id}
                  name={group.name}
                  memberCount={group.memberCount}
                  description={group.description || `Propriétaire : ${group.ownerRole}`}
                  onPress={() => router.push(`/admin/groups/${group.id}` as Href)}
                />
              ))}
              <AppButton
                title="Voir tous les groupes"
                variant="secondary"
                onPress={() => router.push("/admin/groups" as Href)}
                style={styles.sectionAction}
              />
            </View>
          ) : (
            <AppEmptyState
              title="Aucun groupe actif"
              description="Aucun groupe avec membre n’est actuellement disponible."
              actionLabel="Ouvrir les groupes"
              onAction={() => router.push("/admin/groups" as Href)}
            />
          )}

          <View style={styles.bottomActions}>
            <AppButton
              title="Gérer les utilisateurs"
              onPress={() => router.push("/admin/users" as Href)}
              style={styles.bottomButton}
            />
            <AppButton
              title="Superviser les formations"
              variant="secondary"
              onPress={() => router.push("/admin/trainings" as Href)}
              style={styles.bottomButton}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: uxSpacing.xxl,
  },
  page: {
    gap: uxSpacing.xl,
  },
  hero: {
    padding: uxSpacing.lg,
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
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: uxTypography.headline,
    fontWeight: "900",
  },
  heroText: {
    fontSize: uxTypography.body,
    lineHeight: uxTypography.body * 1.5,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: uxSpacing.sm,
    marginTop: uxSpacing.sm,
  },
  heroButton: {
    flexGrow: 1,
    minWidth: 120,
  },
  sectionHeading: {
    gap: uxSpacing.xs,
  },
  sectionTitle: {
    fontSize: uxTypography.headline,
    fontWeight: "900",
  },
  sectionDescription: {
    fontSize: uxTypography.body,
    lineHeight: uxTypography.body * 1.45,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: uxSpacing.sm,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 138,
    minHeight: 112,
    padding: uxSpacing.md,
    position: "relative",
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: uxSpacing.sm,
  },
  metricCopy: {
    gap: 1,
    paddingRight: 16,
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900",
  },
  metricLabel: {
    fontSize: uxTypography.caption,
    lineHeight: 16,
    fontWeight: "700",
  },
  metricChevron: {
    position: "absolute",
    right: 11,
    bottom: 10,
    fontSize: 18,
    fontWeight: "900",
  },
  stack: {
    gap: uxSpacing.md,
  },
  sectionAction: {
    marginTop: uxSpacing.xs,
  },
  bottomActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: uxSpacing.sm,
  },
  bottomButton: {
    flexGrow: 1,
    minWidth: 150,
  },
});
