import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  BookOpen,
  FileArchive,
  GraduationCap,
  Users,
} from "lucide-react";

import {
  getEnrollmentsByTraining,
  getSupportSessionsForTrainer,
  getTrainerDashboardData,
} from "../../api/trainerApi";
import {
  getTrainerLearnerOverview,
  resolveTrainerLearners,
} from "../../api/trainerLearnerOverviewApi";
import { getLearnerGroups } from "../../api/learnerGroupApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { buildMediaUrl } from "../../api/apiConfig";
import { SmartPageHeader, SmartSectionCard } from "../../components/ui";
import {
  ActivityTimeline,
  DeadlineItem,
  GroupCard,
  LearnerRow,
  PriorityCard,
  TrainingCover,
} from "../../components/ux/RichPrimitives";
import {
  SmartEmptyState,
  SmartErrorState,
  SmartLoadingState,
} from "../../components/ux/SmartStates";
import { useAuth } from "../../features/auth/AuthContext";
import type { AuthUser } from "../../types/auth";
import type { LearnerGroup } from "../../types/learnerGroup";
import type {
  AlertResponse,
  SupportSessionResponse,
  TrainerDashboardData,
} from "../../types/trainer";
import type {
  EnrollmentResponse,
  TrainingResponse,
} from "../../types/training";
import type { TrainerLearnerOverviewResponse } from "../../types/trainerLearnerOverview";

const emptyDashboard: TrainerDashboardData = {
  trainings: [],
  alerts: [],
  interventions: [],
  feedbacks: [],
};

type PriorityLearner = {
  alert: AlertResponse;
  identity?: AuthUser;
  overview?: TrainerLearnerOverviewResponse;
};

function clampProgress(value?: number | null): number {
  return Math.min(100, Math.max(0, Math.round(value ?? 0)));
}

function averageProgress(enrollments: EnrollmentResponse[]): number {
  if (!enrollments.length) {
    return 0;
  }

  return Math.round(
    enrollments.reduce(
      (total, enrollment) =>
        total + clampProgress(enrollment.progressPercentage),
      0,
    ) / enrollments.length,
  );
}

function dateValue(value?: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Date non disponible";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function learnerName(identity?: AuthUser): string {
  if (!identity) return "Apprenant";

  return (
    identity.fullName ||
    identity.name ||
    [identity.firstName, identity.lastName].filter(Boolean).join(" ").trim() ||
    identity.email ||
    "Apprenant"
  );
}

function alertSeverityRank(severity?: string | null): number {
  if (severity === "HIGH") return 0;
  if (severity === "MEDIUM") return 1;
  if (severity === "LOW") return 2;
  return 3;
}

function riskSeverity(
  level?: string | null,
  dataStatus?: string | null,
): "info" | "success" | "warning" | "error" {
  if (dataStatus === "INSUFFICIENT" || level === "DATA_INSUFFICIENT") {
    return "info";
  }

  if (level === "HIGH") return "error";
  if (level === "MEDIUM") return "warning";
  if (level === "LOW") return "success";
  return "info";
}

function riskLabel(
  level?: string | null,
  dataStatus?: string | null,
): string {
  if (dataStatus === "INSUFFICIENT" || level === "DATA_INSUFFICIENT") {
    return "Données insuffisantes";
  }

  if (level === "HIGH") return "Risque élevé";
  if (level === "MEDIUM") return "Risque modéré";
  if (level === "LOW") return "Risque faible";
  return level || "À examiner";
}

function sessionStatus(status?: string | null): string {
  if (status === "SCHEDULED") return "Planifiée";
  if (status === "COMPLETED") return "Terminée";
  if (status === "CANCELLED") return "Annulée";
  return status || "Séance";
}

function trainingCover(training: TrainingResponse): string {
  return buildMediaUrl(training.coverImageUrl || training.coverImagePath);
}

function CompactEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Stack
      spacing={0.75}
      sx={{
        py: 1.5,
        minHeight: 88,
        justifyContent: "center",
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          size="small"
          variant="text"
          onClick={onAction}
          sx={{ alignSelf: "flex-start", px: 0 }}
        >
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  );
}

function trainingStatusLabel(status?: string | null): string {
  if (status === "PUBLISHED") return "Publiée";
  if (status === "DRAFT") return "Brouillon";
  if (status === "ARCHIVED") return "Archivée";
  return status || "Formation";
}

export function TrainerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<TrainerDashboardData>(emptyDashboard);
  const [trainingMetrics, setTrainingMetrics] = useState<
    Record<
      number,
      { learners: number | null; averageProgress: number | null }
    >
  >({});
  const [priorityLearners, setPriorityLearners] = useState<PriorityLearner[]>([]);
  const [sessions, setSessions] = useState<SupportSessionResponse[]>([]);
  const [groups, setGroups] = useState<LearnerGroup[]>([]);

  const [loading, setLoading] = useState(true);
  const [coreError, setCoreError] = useState("");
  const [priorityUnavailable, setPriorityUnavailable] = useState(false);
  const [sessionsUnavailable, setSessionsUnavailable] = useState(false);
  const [groupsUnavailable, setGroupsUnavailable] = useState(false);

  const trainerId = user?.id;

  useEffect(() => {
    if (!trainerId) {
      setLoading(false);
      return;
    }

    let active = true;

    async function load(resolvedTrainerId: number) {
      setLoading(true);
      setCoreError("");
      setPriorityUnavailable(false);
      setSessionsUnavailable(false);
      setGroupsUnavailable(false);

      try {
        const dashboard = await getTrainerDashboardData(resolvedTrainerId);

        if (!active) return;
        setData(dashboard);

        const metricEntries = await Promise.all(
          dashboard.trainings.map(async (training) => {
            try {
              const enrollments = await getEnrollmentsByTraining(training.id);
              return [
                training.id,
                {
                  learners: enrollments.length,
                  averageProgress: averageProgress(enrollments),
                },
              ] as const;
            } catch {
              return [
                training.id,
                {
                  learners: null,
                  averageProgress: null,
                },
              ] as const;
            }
          }),
        );

        if (!active) return;
        setTrainingMetrics(Object.fromEntries(metricEntries));

        const openAlerts = dashboard.alerts
          .filter((alert) => !alert.status || alert.status === "OPEN")
          .sort((a, b) => {
            const severityDelta =
              alertSeverityRank(a.severity) - alertSeverityRank(b.severity);

            if (severityDelta !== 0) return severityDelta;

            return (b.riskProbability ?? 0) - (a.riskProbability ?? 0);
          });

        const uniqueAlerts: AlertResponse[] = [];
        const seenLearners = new Set<number>();

        for (const alert of openAlerts) {
          if (seenLearners.has(alert.learnerId)) continue;
          seenLearners.add(alert.learnerId);
          uniqueAlerts.push(alert);

          if (uniqueAlerts.length >= 4) break;
        }

        const priorityIds = uniqueAlerts.map((alert) => alert.learnerId);

        const [identitiesResult, overviewsResult, sessionsResult, groupsResult] =
          await Promise.allSettled([
            priorityIds.length
              ? resolveTrainerLearners(priorityIds)
              : Promise.resolve<AuthUser[]>([]),
            Promise.all(
              priorityIds.map(async (learnerId) => {
                try {
                  const overview =
                    await getTrainerLearnerOverview(learnerId);
                  return [learnerId, overview] as const;
                } catch {
                  return [learnerId, null] as const;
                }
              }),
            ),
            getSupportSessionsForTrainer(),
            getLearnerGroups(),
          ]);

        if (!active) return;

        const identities =
          identitiesResult.status === "fulfilled"
            ? identitiesResult.value
            : [];
        const identityMap = new Map(
          identities.map((identity) => [identity.id, identity] as const),
        );

        const overviewEntries =
          overviewsResult.status === "fulfilled"
            ? overviewsResult.value
            : [];
        const overviewMap = new Map(
          overviewEntries
            .filter(
              (
                entry,
              ): entry is readonly [number, TrainerLearnerOverviewResponse] =>
                entry[1] !== null,
            )
            .map(([learnerId, overview]) => [learnerId, overview] as const),
        );

        const overviewPartialFailure =
          overviewsResult.status === "fulfilled" &&
          overviewsResult.value.some(([, overview]) => overview === null);

        setPriorityUnavailable(
          priorityIds.length > 0 &&
            (identitiesResult.status === "rejected" ||
              overviewsResult.status === "rejected" ||
              overviewPartialFailure),
        );
        setPriorityLearners(
          uniqueAlerts.map((alert) => ({
            alert,
            identity: identityMap.get(alert.learnerId),
            overview: overviewMap.get(alert.learnerId),
          })),
        );

        if (sessionsResult.status === "fulfilled") {
          setSessions(sessionsResult.value);
        } else {
          setSessions([]);
          setSessionsUnavailable(true);
        }

        if (groupsResult.status === "fulfilled") {
          setGroups(groupsResult.value);
        } else {
          setGroups([]);
          setGroupsUnavailable(true);
        }
      } catch (error) {
        if (active) {
          setData(emptyDashboard);
          setTrainingMetrics({});
          setPriorityLearners([]);
          setSessions([]);
          setGroups([]);
          setCoreError(
            getApiErrorMessage(error) ||
              "Impossible de charger l'espace formateur.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load(trainerId);

    return () => {
      active = false;
    };
  }, [trainerId]);

  const stats = useMemo(
    () => ({
      totalTrainings: data.trainings.length,
      publishedTrainings: data.trainings.filter(
        (training) => training.status === "PUBLISHED",
      ).length,
      openAlerts: data.alerts.filter(
        (alert) => !alert.status || alert.status === "OPEN",
      ).length,
      upcomingSessions: sessions.filter(
        (session) => session.status === "SCHEDULED",
      ).length,
      groups: groups.length,
    }),
    [data, sessions, groups],
  );

  const trainingTitleById = useMemo(
    () =>
      new Map(
        data.trainings.map((training) => [
          training.id,
          training.title,
        ] as const),
      ),
    [data.trainings],
  );

  const priorityCards = useMemo(
    () =>
      priorityLearners.map((item) => {
        const matchingRisk =
          item.overview?.risks.find(
            (risk) => risk.trainingId === item.alert.trainingId,
          ) ?? item.overview?.risks[0];

        const matchingProgress =
          item.overview?.progress.find(
            (progress) => progress.trainingId === item.alert.trainingId,
          ) ?? item.overview?.progress[0];

        const progress =
          matchingRisk?.averageProgress ??
          matchingProgress?.progressPercentage ??
          item.overview?.summary.averageProgress ??
          0;

        const factor =
          matchingRisk?.riskFactors?.[0] ||
          item.alert.description ||
          item.alert.message ||
          item.alert.title ||
          "Signal pédagogique à examiner.";

        return {
          ...item,
          matchingRisk,
          progress: clampProgress(progress),
          factor,
          trainingTitle:
            trainingTitleById.get(item.alert.trainingId) || "Formation suivie",
        };
      }),
    [priorityLearners, trainingTitleById],
  );

  const upcomingSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "SCHEDULED")
        .sort(
          (a, b) =>
            dateValue(a.scheduledAt) - dateValue(b.scheduledAt),
        )
        .slice(0, 4),
    [sessions],
  );

  const recentActivity = useMemo(() => {
    const events = priorityLearners.flatMap((item) =>
      (item.overview?.recentEvents ?? []).map((event) => ({
        event,
        identity: item.identity,
      })),
    );

    return events
      .filter(({ event }) => Boolean(event.eventDate))
      .sort(
        (a, b) =>
          dateValue(b.event.eventDate) - dateValue(a.event.eventDate),
      )
      .slice(0, 6)
      .map(({ event, identity }) => ({
        id: `${event.learnerId}-${event.id}`,
        title: learnerName(identity),
        description: [
          event.description || event.eventType || "Activité d'apprentissage",
          event.trainingId
            ? trainingTitleById.get(event.trainingId)
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
        timestamp: formatDateTime(event.eventDate),
      }));
  }, [priorityLearners, trainingTitleById]);

  if (loading) {
    return (
      <SmartLoadingState
        label="Chargement de l'espace formateur…"
        skeletonRows={7}
      />
    );
  }

  return (
    <Stack spacing={2.5}>
      <SmartPageHeader
        eyebrow="Pilotage pédagogique"
        title="Espace formateur"
        description="Créez vos formations, repérez les apprenants à accompagner et retrouvez les actions prioritaires."
        actions={
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="contained"
              startIcon={<GraduationCap size={17} />}
              onClick={() => navigate("/trainer/trainings/new")}
            >
              Créer une formation
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileArchive size={17} />}
              onClick={() => navigate("/trainer/trainings/new")}
            >
              Importer un SCORM
            </Button>
          </Stack>
        }
      />

      {coreError ? (
        <SmartErrorState
          title="L'espace formateur n'a pas pu être chargé"
          description={coreError}
          actionLabel="Réessayer"
          onAction={() => window.location.reload()}
        />
      ) : null}

      {!coreError ? (
        <>
          <SmartSectionCard
            title="Mes formations"
            description="Accédez rapidement aux formations que vous pilotez, avec leur couverture, leurs apprenants et leur progression réelle."
          >
            {!data.trainings.length ? (
              <SmartEmptyState
                title="Aucune formation"
                description="Créez votre première formation pour commencer à construire votre catalogue."
                actionLabel="Créer une formation"
                onAction={() => navigate("/trainer/trainings/new")}
              />
            ) : (
              <Stack spacing={1.5}>
                {data.trainings.slice(0, 3).map((training) => {
                  const metrics = trainingMetrics[training.id];
                  const progress =
                    typeof metrics?.averageProgress === "number"
                      ? clampProgress(metrics.averageProgress)
                      : null;

                  return (
                    <Card key={training.id} variant="outlined" sx={{ overflow: "hidden" }}>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            md: "minmax(220px, 260px) minmax(0, 1fr)",
                          },
                          alignItems: "stretch",
                        }}
                      >
                        <Box
                          sx={{
                            width: "100%",
                            maxWidth: { xs: "100%", md: 260 },
                          }}
                        >
                          <TrainingCover
                            title={training.title}
                            coverUrl={trainingCover(training)}
                            coverAlt={`Couverture de ${training.title}`}
                          />
                        </Box>

                        <CardContent
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            gap: 1.25,
                            minWidth: 0,
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            sx={{ flexWrap: "wrap", alignItems: "center" }}
                          >
                            <Typography variant="overline" color="text.secondary">
                              {training.category || "Formation"}
                            </Typography>
                            <Chip
                              size="small"
                              label={trainingStatusLabel(training.status)}
                            />
                          </Stack>

                          <Box>
                            <Typography
                              variant="h6"
                              component="h2"
                              sx={{ fontWeight: 850 }}
                            >
                              {training.title}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.35 }}
                            >
                              {training.shortDescription ||
                                training.description ||
                                "Formation gérée dans votre espace."}
                            </Typography>
                          </Box>

                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            useFlexGap
                            sx={{ flexWrap: "wrap" }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {typeof metrics?.learners === "number"
                                ? `${metrics.learners} apprenant${
                                    metrics.learners > 1 ? "s" : ""
                                  }`
                                : "Inscriptions indisponibles"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {progress === null
                                ? "Progression indisponible"
                                : `Progression moyenne : ${progress} %`}
                            </Typography>
                          </Stack>

                          {progress !== null ? (
                            <Stack spacing={0.5}>
                              <LinearProgress
                                variant="determinate"
                                value={progress}
                                aria-label={`Progression moyenne ${progress} %`}
                                sx={{ height: 8, borderRadius: 999 }}
                              />
                            </Stack>
                          ) : null}

                          <Button
                            variant="contained"
                            size="small"
                            onClick={() =>
                              navigate(`/trainer/trainings/${training.id}/edit`)
                            }
                            sx={{ alignSelf: "flex-start" }}
                          >
                            Piloter
                          </Button>
                        </CardContent>
                      </Box>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </SmartSectionCard>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
            aria-label="Résumé formateur"
          >
            <Chip
              icon={<BookOpen size={16} />}
              label={`${stats.totalTrainings} formation${
                stats.totalTrainings > 1 ? "s" : ""
              }`}
              variant="outlined"
            />
            <Chip
              label={`${stats.publishedTrainings} publiée${
                stats.publishedTrainings > 1 ? "s" : ""
              }`}
              variant="outlined"
            />
            <Chip
              icon={<Users size={16} />}
              label={`${stats.openAlerts} alerte${
                stats.openAlerts > 1 ? "s" : ""
              } ouverte${stats.openAlerts > 1 ? "s" : ""}`}
              variant="outlined"
            />
            <Chip
              label={`${stats.upcomingSessions} séance${
                stats.upcomingSessions > 1 ? "s" : ""
              } à venir`}
              variant="outlined"
            />
            <Chip
              label={`${stats.groups} groupe${stats.groups > 1 ? "s" : ""}`}
              variant="outlined"
            />
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                xl: "minmax(0, 1.2fr) minmax(0, 0.8fr)",
              },
              gap: 2.5,
              alignItems: "start",
            }}
          >
            <SmartSectionCard
              title="Apprenants prioritaires"
              description="Apprenants associés à des alertes ouvertes, enrichis par la vue 360 lorsque les données sont disponibles."
            >
              {priorityUnavailable ? (
                <SmartErrorState
                  title="Vue 360 partiellement indisponible"
                  description="Certaines identités ou données de suivi n'ont pas pu être chargées."
                />
              ) : null}

              {!priorityCards.length ? (
                <CompactEmptyState
                  title="Aucun apprenant prioritaire"
                  description="Aucune alerte ouverte n'identifie actuellement un apprenant nécessitant un suivi prioritaire."
                  actionLabel="Voir tous les apprenants"
                  onAction={() => navigate("/trainer/learners")}
                />
              ) : (
                <Stack spacing={1.5}>
                  {priorityCards.map(
                    ({
                      alert,
                      identity,
                      matchingRisk,
                      progress,
                      factor,
                      trainingTitle,
                    }) => (
                      <PriorityCard
                        key={alert.id}
                        title={learnerName(identity)}
                        severity={riskSeverity(
                          matchingRisk?.riskLevel || alert.riskLevel,
                          matchingRisk?.dataStatus,
                        )}
                        actionLabel="Ouvrir la vue 360"
                        onAction={() =>
                          navigate(`/trainer/learners/${alert.learnerId}`)
                        }
                        description={
                          <Stack spacing={1.25}>
                            <LearnerRow
                              name={learnerName(identity)}
                              email={identity?.email}
                              avatarUrl={identity?.avatarDataUrl}
                              subtitle={trainingTitle}
                              status={riskLabel(
                                matchingRisk?.riskLevel || alert.riskLevel,
                                matchingRisk?.dataStatus,
                              )}
                            />

                            <Box>
                              <Stack
                                direction="row"
                                sx={{
                                  justifyContent: "space-between",
                                  alignItems: "baseline",
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Progression
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 800 }}
                                >
                                  {progress} %
                                </Typography>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={progress}
                                aria-label={`Progression ${progress} %`}
                                sx={{ mt: 0.5 }}
                              />
                            </Box>

                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Facteur explicable
                              </Typography>
                              <Typography variant="body2">
                                {factor}
                              </Typography>
                            </Box>
                          </Stack>
                        }
                      />
                    ),
                  )}
                </Stack>
              )}
            </SmartSectionCard>

            <SmartSectionCard
              title="Séances à venir"
              description="Accompagnements planifiés avec vos apprenants."
            >
              {sessionsUnavailable ? (
                <SmartErrorState
                  title="Séances indisponibles"
                  description="Les séances d'accompagnement ne peuvent pas être chargées pour le moment."
                />
              ) : !upcomingSessions.length ? (
                <CompactEmptyState
                  title="Aucune séance planifiée"
                  description="Aucune séance à venir n'est actuellement enregistrée."
                  actionLabel="Gérer les séances"
                  onAction={() => navigate("/trainer/support-sessions")}
                />
              ) : (
                <Stack
                  divider={
                    <Box sx={{ borderTop: 1, borderColor: "divider" }} />
                  }
                >
                  {upcomingSessions.map((session) => (
                    <DeadlineItem
                      key={session.id}
                      title={session.title}
                      deadlineLabel={formatDateTime(session.scheduledAt)}
                      status={sessionStatus(session.status)}
                    />
                  ))}
                </Stack>
              )}
            </SmartSectionCard>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                xl: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
              },
              gap: 2.5,
              alignItems: "start",
            }}
          >
            <SmartSectionCard
              title="Activité récente"
              description="Événements d'apprentissage réellement remontés dans les vues 360 des apprenants prioritaires."
            >
              {recentActivity.length ? (
                <ActivityTimeline items={recentActivity} />
              ) : (
                <CompactEmptyState
                  title="Aucune activité récente"
                  description="Aucun événement récent n'est disponible pour les apprenants prioritaires."
                />
              )}
            </SmartSectionCard>

            <SmartSectionCard
              title="Groupes"
              description="Vos cohortes disponibles pour organiser et affecter les apprenants."
            >
              {groupsUnavailable ? (
                <SmartErrorState
                  title="Groupes indisponibles"
                  description="Les groupes ne peuvent pas être chargés pour le moment."
                />
              ) : !groups.length ? (
                <CompactEmptyState
                  title="Aucun groupe"
                  description="Créez un groupe pour organiser vos apprenants en cohorte."
                  actionLabel="Gérer les groupes"
                  onAction={() => navigate("/trainer/groups")}
                />
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  {groups.slice(0, 4).map((group) => (
                    <GroupCard
                      key={group.id}
                      name={group.name}
                      memberCount={group.memberCount}
                      description={group.description || undefined}
                      actionLabel="Ouvrir"
                      onAction={() =>
                        navigate(`/trainer/groups/${group.id}`)
                      }
                    />
                  ))}
                </Box>
              )}
            </SmartSectionCard>
          </Box>

        </>
      ) : null}
    </Stack>
  );
}
