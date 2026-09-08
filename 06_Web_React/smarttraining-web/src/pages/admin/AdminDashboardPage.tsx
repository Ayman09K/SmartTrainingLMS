import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import {
  Activity,
  BarChart3,
  BellRing,
  BookOpen,
  CircleGauge,
  Eye,
  Users,
} from "lucide-react";

import {
  getAdminDashboardData,
  getAllAlertsAsAdmin,
} from "../../api/adminApi";
import {
  getBiActivity,
  getBiSummary,
  getBiTrainings,
} from "../../api/biApi";
import { getLearnerGroups } from "../../api/learnerGroupApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { buildMediaUrl } from "../../api/apiConfig";
import {
  ActivityTrend,
  MetricBars,
} from "../../components/bi/BiVisuals";
import {
  SmartMetricCard,
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import {
  ActivityTimeline,
  ChartCard,
  GroupCard,
  PriorityCard,
  TrainingCard,
} from "../../components/ux/RichPrimitives";
import {
  SmartEmptyState,
  SmartErrorState,
  SmartLoadingState,
} from "../../components/ux/SmartStates";
import type {
  AdminAlertResponse,
  AdminDashboardData,
} from "../../types/admin";
import type {
  BiActivityPoint,
  BiFilters,
  BiSummary,
  BiTrainingMetric,
} from "../../types/bi";

const emptyDashboard: AdminDashboardData = {
  users: [],
  trainings: [],
  pendingTrainerRequests: [],
  pendingAccessRequests: [],
  openFeedbacks: [],
  openAlerts: [],
};

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function lastThirtyDays(): BiFilters {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);

  return {
    from: localIsoDate(from),
    to: localIsoDate(to),
  };
}

function formatPercent(value?: number | null): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value)} %`;
}

function formatActivityDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(parsed);
}

function dateValue(value?: string | null): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function alertRank(value?: string | null): number {
  if (value === "CRITICAL") return 0;
  if (value === "HIGH") return 1;
  if (value === "MEDIUM") return 2;
  if (value === "LOW") return 3;
  return 4;
}

function alertSeverity(
  value?: string | null,
): "info" | "success" | "warning" | "error" {
  if (value === "CRITICAL" || value === "HIGH") return "error";
  if (value === "MEDIUM") return "warning";
  if (value === "LOW") return "success";
  return "info";
}

function userLabel(
  users: AdminDashboardData["users"],
  learnerId?: number,
): string {
  if (!learnerId) return "Apprenant";

  const user = users.find((item) => item.id === learnerId);
  if (!user) return `Apprenant #${learnerId}`;

  return (
    user.fullName ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    user.email ||
    `Apprenant #${learnerId}`
  );
}

function trainingLabel(
  trainings: AdminDashboardData["trainings"],
  trainingId?: number,
): string {
  if (!trainingId) return "Formation non précisée";

  return (
    trainings.find((training) => training.id === trainingId)?.title ||
    `Formation #${trainingId}`
  );
}

function openAlert(alert: AdminAlertResponse): boolean {
  const status = (alert.status || "OPEN").toUpperCase();
  return status === "OPEN" || status === "IN_PROGRESS";
}

// WEB_VISUAL_2_ADMIN_DASHBOARD_SAFE_V1
export function AdminDashboardPage() {
  const navigate = useNavigate();

  const [data, setData] = useState<AdminDashboardData>(emptyDashboard);
  const [biSummary, setBiSummary] = useState<BiSummary | null>(null);
  const [biTrainings, setBiTrainings] = useState<BiTrainingMetric[]>([]);
  const [biActivity, setBiActivity] = useState<BiActivityPoint[]>([]);
  const [groups, setGroups] =
    useState<Awaited<ReturnType<typeof getLearnerGroups>>>([]);
  const [globalAlerts, setGlobalAlerts] = useState<AdminAlertResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [coreError, setCoreError] = useState("");
  const [biSummaryUnavailable, setBiSummaryUnavailable] = useState(false);
  const [biTrainingsUnavailable, setBiTrainingsUnavailable] = useState(false);
  const [biActivityUnavailable, setBiActivityUnavailable] = useState(false);
  const [groupsUnavailable, setGroupsUnavailable] = useState(false);
  const [alertsUnavailable, setAlertsUnavailable] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setCoreError("");
      setBiSummaryUnavailable(false);
      setBiTrainingsUnavailable(false);
      setBiActivityUnavailable(false);
      setGroupsUnavailable(false);
      setAlertsUnavailable(false);

      const filters = lastThirtyDays();

      const results = await Promise.allSettled([
        getAdminDashboardData(),
        getBiSummary("admin", filters),
        getBiTrainings("admin", filters),
        getBiActivity("admin", filters),
        getLearnerGroups(),
        getAllAlertsAsAdmin(),
      ]);

      if (!active) return;

      const [
        dashboardResult,
        summaryResult,
        trainingsResult,
        activityResult,
        groupsResult,
        alertsResult,
      ] = results;

      if (dashboardResult.status === "fulfilled") {
        setData(dashboardResult.value);
      } else {
        setData(emptyDashboard);
        setCoreError(
          getApiErrorMessage(dashboardResult.reason) ||
            "Impossible de charger la console administrateur.",
        );
      }

      if (summaryResult.status === "fulfilled") {
        setBiSummary(summaryResult.value);
      } else {
        setBiSummary(null);
        setBiSummaryUnavailable(true);
      }

      if (trainingsResult.status === "fulfilled") {
        setBiTrainings(trainingsResult.value);
      } else {
        setBiTrainings([]);
        setBiTrainingsUnavailable(true);
      }

      if (activityResult.status === "fulfilled") {
        setBiActivity(activityResult.value);
      } else {
        setBiActivity([]);
        setBiActivityUnavailable(true);
      }

      if (groupsResult.status === "fulfilled") {
        setGroups(groupsResult.value);
      } else {
        setGroups([]);
        setGroupsUnavailable(true);
      }

      if (alertsResult.status === "fulfilled") {
        setGlobalAlerts(alertsResult.value);
      } else {
        setGlobalAlerts([]);
        setAlertsUnavailable(true);
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const openAlerts = useMemo(
    () =>
      globalAlerts
        .filter(openAlert)
        .sort((a, b) => {
          const rankDelta = alertRank(a.severity) - alertRank(b.severity);
          if (rankDelta !== 0) return rankDelta;
          return dateValue(b.createdAt) - dateValue(a.createdAt);
        }),
    [globalAlerts],
  );

  const activeGroups = useMemo(
    () => groups.filter((group) => group.memberCount > 0).slice(0, 4),
    [groups],
  );

  const popularTrainings = useMemo(
    () =>
      [...biTrainings]
        .filter(
          (training) =>
            training.status === "PUBLISHED" ||
            training.activeEnrollments > 0,
        )
        .sort((a, b) => {
          const enrollmentDelta = b.totalEnrollments - a.totalEnrollments;
          if (enrollmentDelta !== 0) return enrollmentDelta;

          const eventDelta = b.totalEvents - a.totalEvents;
          if (eventDelta !== 0) return eventDelta;

          return b.completionRate - a.completionRate;
        })
        .slice(0, 3),
    [biTrainings],
  );

  const activityTimeline = useMemo(
    () =>
      [...biActivity]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 4)
        .map((point) => ({
          id: point.date,
          title: `${point.totalEvents} événement${
            point.totalEvents > 1 ? "s" : ""
          } d'apprentissage`,
          description: `${point.activeLearners} apprenant${
            point.activeLearners > 1 ? "s" : ""
          } actif${point.activeLearners > 1 ? "s" : ""}`,
          timestamp: formatActivityDate(point.date),
        })),
    [biActivity],
  );

  const topTrainingBars = useMemo(
    () =>
      popularTrainings.map((training) => ({
        label: training.title,
        value: training.totalEnrollments,
      })),
    [popularTrainings],
  );

  const publishedCount =
    biSummary?.publishedTrainings ??
    data.trainings.filter((training) => training.status === "PUBLISHED").length;

  if (loading) {
    return (
      <SmartLoadingState
        label="Chargement de la console administrateur…"
        skeletonRows={7}
      />
    );
  }

  return (
    <Stack spacing={2.5}>
      <SmartPageHeader
        eyebrow="Console d'administration"
        title="Administration"
        description="Pilotez la plateforme depuis une vue synthétique : activité, formations, groupes et alertes réellement remontées par SmartTraining."
        actions={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="contained"
              startIcon={<Users size={17} />}
              onClick={() => navigate("/admin/users")}
            >
              Utilisateurs
            </Button>
            <Button
              variant="outlined"
              startIcon={<BookOpen size={17} />}
              onClick={() => navigate("/admin/trainings")}
            >
              Formations
            </Button>
            <Button
              variant="outlined"
              startIcon={<BarChart3 size={17} />}
              onClick={() => navigate("/admin/statistics")}
              sx={{ whiteSpace: "nowrap" }}
            >
              Pilotage BI détaillé
            </Button>
          </Stack>
        }
      />

      {coreError ? (
        <SmartErrorState
          title="La console administrateur n'a pas pu être chargée"
          description={coreError}
          actionLabel="Réessayer"
          onAction={() => window.location.reload()}
        />
      ) : null}

      {!coreError ? (
        <>
          <Box
            aria-label="Indicateurs globaux administration"
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(3, minmax(0, 1fr))",
                xl: "repeat(6, minmax(0, 1fr))",
              },
              gap: 1.75,
              "& .MuiCard-root": {
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
              },
            }}
          >
            <SmartMetricCard
              label="Utilisateurs"
              value={data.users.length}
              helper="Comptes enregistrés"
              icon={<Users />}
            />
            <SmartMetricCard
              label="Formations publiées"
              value={publishedCount}
              helper="Catalogue disponible"
              icon={<BookOpen />}
            />
            <SmartMetricCard
              label="Apprenants actifs"
              value={
                biSummaryUnavailable ? "—" : biSummary?.activeLearners ?? "—"
              }
              helper="Sur les 30 derniers jours"
              icon={<Activity />}
            />
            <SmartMetricCard
              label="Taux de complétion"
              value={formatPercent(biSummary?.completionRate)}
              helper="Progression globale"
              icon={<CircleGauge />}
            />
            <SmartMetricCard
              label="Alertes ouvertes"
              value={alertsUnavailable ? "—" : openAlerts.length}
              helper="À examiner"
              icon={<BellRing />}
            />
            <SmartMetricCard
              label="À observer"
              value={
                biSummaryUnavailable
                  ? "—"
                  : biSummary?.dataInsufficientLearners ?? "—"
              }
              helper="Données insuffisantes"
              icon={<Eye />}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(0, 1.15fr) minmax(0, 0.85fr)",
              },
              gap: 2.5,
              alignItems: "start",
            }}
          >
            <ChartCard
              title="Tendance d'activité"
              description="Événements d'apprentissage et apprenants actifs sur les 30 derniers jours."
              ariaLabel="Tendance réelle d'activité globale SmartTraining"
            >
              {biActivityUnavailable ? (
                <SmartErrorState
                  title="Tendance indisponible"
                  description="Les données d'activité BI ne peuvent pas être chargées pour le moment."
                />
              ) : (
                <Box
                  sx={{
                    "& svg": {
                      minHeight: "190px !important",
                      height: "190px !important",
                      maxHeight: "190px !important",
                    },
                  }}
                >
                  <ActivityTrend points={biActivity} />
                </Box>
              )}
            </ChartCard>

            <ChartCard
              title="Formations les plus suivies"
              description="Classement réel par nombre d'inscriptions sur les 30 derniers jours."
              ariaLabel="Nombre réel d'inscriptions par formation"
            >
              {biTrainingsUnavailable ? (
                <SmartErrorState
                  title="Classement indisponible"
                  description="Les métriques BI par formation ne peuvent pas être chargées pour le moment."
                />
              ) : (
                <MetricBars
                  data={topTrainingBars}
                  emptyLabel="Aucune inscription disponible pour cette période."
                />
              )}
            </ChartCard>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "minmax(0, 1.05fr) minmax(0, 0.95fr)",
              },
              gap: 2.5,
              alignItems: "start",
            }}
          >
            <SmartSectionCard
              title="Activité récente"
              description="Synthèse quotidienne issue directement des événements BI de la plateforme."
              actions={
                <Button
                  size="small"
                  variant="text"
                  onClick={() => navigate("/admin/statistics")}
                >
                  Voir le détail
                </Button>
              }
            >
              {biActivityUnavailable ? (
                <SmartErrorState
                  title="Activité indisponible"
                  description="L'activité récente ne peut pas être chargée pour le moment."
                />
              ) : (
                <ActivityTimeline
                  items={activityTimeline}
                  emptyLabel="Aucune activité d'apprentissage n'est enregistrée sur cette période."
                />
              )}
            </SmartSectionCard>

            <SmartSectionCard
              title="Alertes globales"
              description="Alertes ouvertes ou en cours, consolidées à l'échelle des formations."
              actions={
                <Button
                  size="small"
                  variant="text"
                  onClick={() => navigate("/admin/alerts")}
                >
                  Toutes les alertes
                </Button>
              }
            >
              {alertsUnavailable ? (
                <SmartErrorState
                  title="Alertes indisponibles"
                  description="Les alertes globales ne peuvent pas être chargées pour le moment."
                />
              ) : !openAlerts.length ? (
                <SmartEmptyState
                  title="Aucune alerte globale ouverte"
                  description="Aucune alerte ne nécessite actuellement de traitement."
                  actionLabel="Voir toutes les alertes"
                  onAction={() => navigate("/admin/alerts")}
                />
              ) : (
                <Stack spacing={1.25}>
                  {openAlerts.slice(0, 4).map((alert) => (
                    <PriorityCard
                      key={alert.id}
                      title={
                        alert.title ||
                        alert.alertType ||
                        "Alerte de suivi"
                      }
                      severity={alertSeverity(alert.severity)}
                      actionLabel="Ouvrir"
                      onAction={() => navigate("/admin/alerts")}
                      description={
                        <Stack spacing={0.5}>
                          <Typography variant="body2">
                            {alert.description ||
                              alert.message ||
                              "Signal de suivi à examiner."}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {`${userLabel(
                              data.users,
                              alert.learnerId,
                            )} · ${trainingLabel(
                              data.trainings,
                              alert.trainingId,
                            )}`}
                          </Typography>
                        </Stack>
                      }
                    />
                  ))}
                </Stack>
              )}
            </SmartSectionCard>
          </Box>

          <SmartSectionCard
            title="Formations actives et populaires"
            description="Formations publiées ou actives, classées uniquement à partir des métriques BI réelles."
            actions={
              <Button
                size="small"
                variant="text"
                onClick={() => navigate("/admin/trainings")}
              >
                Toutes les formations
              </Button>
            }
          >
            {biTrainingsUnavailable ? (
              <SmartErrorState
                title="Métriques formations indisponibles"
                description="Le classement des formations ne peut pas être chargé pour le moment."
              />
            ) : !popularTrainings.length ? (
              <SmartEmptyState
                title="Aucune formation active sur la période"
                description="Aucune formation publiée ou avec inscriptions actives n'apparaît dans les métriques BI."
                actionLabel="Gérer les formations"
                onAction={() => navigate("/admin/trainings")}
              />
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, minmax(0, 1fr))",
                    xl: "repeat(3, minmax(0, 1fr))",
                  },
                  gap: 2,
                }}
              >
                {popularTrainings.map((metric) => {
                  const training = data.trainings.find(
                    (item) => item.id === metric.trainingId,
                  );
                  const cover = training?.coverImageUrl
                    ? buildMediaUrl(training.coverImageUrl)
                    : null;

                  return (
                    <TrainingCard
                      key={metric.trainingId}
                      title={metric.title}
                      description={
                        training?.shortDescription ||
                        training?.description ||
                        "Formation suivie dans SmartTraining."
                      }
                      coverUrl={cover}
                      coverAlt={`Couverture de ${metric.title}`}
                      eyebrow={training?.category || "Formation"}
                      status={metric.status}
                      meta={`${metric.totalEnrollments} inscription${
                        metric.totalEnrollments > 1 ? "s" : ""
                      } · ${metric.activeLearners} apprenant${
                        metric.activeLearners > 1 ? "s" : ""
                      } actif${metric.activeLearners > 1 ? "s" : ""}`}
                      progress={metric.averageProgress}
                      actionLabel="Administrer"
                      onAction={() =>
                        navigate(`/admin/trainings/${metric.trainingId}/edit`)
                      }
                    />
                  );
                })}
              </Box>
            )}
          </SmartSectionCard>

          <SmartSectionCard
            title="Groupes actifs"
            description="Groupes contenant au moins un membre, issus du référentiel réel des cohortes."
            actions={
              <Button
                size="small"
                variant="text"
                onClick={() => navigate("/admin/groups")}
              >
                Tous les groupes
              </Button>
            }
          >
            {groupsUnavailable ? (
              <SmartErrorState
                title="Groupes indisponibles"
                description="Les groupes ne peuvent pas être chargés pour le moment."
              />
            ) : !activeGroups.length ? (
              <SmartEmptyState
                title="Aucun groupe actif"
                description="Aucun groupe contenant des membres n'est actuellement disponible."
                actionLabel="Gérer les groupes"
                onAction={() => navigate("/admin/groups")}
              />
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(auto-fit, minmax(220px, 1fr))",
                  },
                  gap: 1.5,
                  alignItems: "stretch",
                }}
              >
                {activeGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    name={group.name}
                    memberCount={group.memberCount}
                    description={group.description || undefined}
                    actionLabel="Ouvrir"
                    onAction={() =>
                      navigate(`/admin/groups/${group.id}`)
                    }
                  />
                ))}
              </Box>
            )}
          </SmartSectionCard>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              pt: 0.5,
            }}
          >

          </Box>
        </>
      ) : null}
    </Stack>
  );
}
