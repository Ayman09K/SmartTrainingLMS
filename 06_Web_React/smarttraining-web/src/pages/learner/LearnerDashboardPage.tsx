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
  Award,
  BookOpen,
  Compass,
  TrendingUp,
} from "lucide-react";

import {
  getCatalogTrainings,
  getMyTrainings,
} from "../../api/trainingApi";
import {
  getMyProgress,
  getMyRecommendations,
} from "../../api/analyticsApi";
import { getMyCertificates } from "../../api/certificateApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { SmartPageHeader, SmartSectionCard } from "../../components/ui";
import {
  ActivityTimeline,
  CertificateCard,
  DeadlineItem,
  PriorityCard,
  TrainingCard,
  TrainingCover,
} from "../../components/ux/RichPrimitives";
import {
  SmartEmptyState,
  SmartErrorState,
  SmartLoadingState,
} from "../../components/ux/SmartStates";
import { useAuth } from "../../features/auth/AuthContext";
import type {
  LearnerCatalogTrainingResponse,
  LearnerMyTrainingResponse,
} from "../../types/training";
import type {
  LearnerProgressResponse,
  RecommendationResponse,
} from "../../types/analytics";
import type { TrainingCertificate } from "../../types/certificate";

const DAY_MS = 24 * 60 * 60 * 1000;

function clampProgress(value?: number | null): number {
  return Math.min(100, Math.max(0, Math.round(value ?? 0)));
}

function dateValue(value?: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function formatDate(value?: string | null): string {
  if (!value) return "Date non disponible";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function enrollmentLabel(status?: string | null): string {
  if (status === "COMPLETED") return "Terminée";
  if (status === "ACTIVE") return "En cours";
  if (status === "PENDING") return "En attente";
  return status || "Formation";
}

function deadlineStatus(dueAt?: string | null): string {
  if (!dueAt) return "";

  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return "Planifiée";

  const remainingDays = Math.ceil((due - Date.now()) / DAY_MS);

  if (remainingDays < 0) return "En retard";
  if (remainingDays <= 7) return "À faire bientôt";
  return "Planifiée";
}

function nextStepLabel(training: LearnerMyTrainingResponse): string {
  const progress = clampProgress(training.progressPercentage);

  if (training.enrollmentStatus === "COMPLETED" || progress >= 100) {
    return "Parcours terminé";
  }

  if (progress > 0) {
    return "Prochaine étape : reprendre là où vous vous êtes arrêté";
  }

  return "Prochaine étape : commencer les premières activités";
}

function prioritySeverity(
  priority: RecommendationResponse["priority"],
): "info" | "success" | "warning" {
  if (priority === "HIGH") return "warning";
  if (priority === "LOW") return "success";
  return "info";
}

function priorityRank(priority: RecommendationResponse["priority"]): number {
  if (priority === "HIGH") return 0;
  if (priority === "MEDIUM") return 1;
  return 2;
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

export function LearnerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [trainings, setTrainings] = useState<LearnerMyTrainingResponse[]>([]);
  const [catalog, setCatalog] = useState<LearnerCatalogTrainingResponse[]>([]);
  const [progressRows, setProgressRows] = useState<LearnerProgressResponse[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResponse[]>([]);
  const [certificates, setCertificates] = useState<TrainingCertificate[]>([]);

  const [loading, setLoading] = useState(true);
  const [coreError, setCoreError] = useState("");
  const [catalogUnavailable, setCatalogUnavailable] = useState(false);
  const [analyticsUnavailable, setAnalyticsUnavailable] = useState(false);
  const [certificatesUnavailable, setCertificatesUnavailable] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setCoreError("");
      setCatalogUnavailable(false);
      setAnalyticsUnavailable(false);
      setCertificatesUnavailable(false);

      const [
        trainingsResult,
        catalogResult,
        progressResult,
        recommendationsResult,
        certificatesResult,
      ] = await Promise.allSettled([
        getMyTrainings(),
        getCatalogTrainings(),
        getMyProgress(),
        getMyRecommendations(),
        getMyCertificates(),
      ]);

      if (!active) return;

      if (trainingsResult.status === "rejected") {
        setCoreError(
          getApiErrorMessage(trainingsResult.reason) ||
            "Impossible de charger votre espace apprenant.",
        );
        setTrainings([]);
      } else {
        setTrainings(trainingsResult.value);
      }

      if (catalogResult.status === "fulfilled") {
        setCatalog(catalogResult.value);
      } else {
        setCatalog([]);
        setCatalogUnavailable(true);
      }

      if (
        progressResult.status === "fulfilled" &&
        recommendationsResult.status === "fulfilled"
      ) {
        setProgressRows(progressResult.value);
        setRecommendations(recommendationsResult.value);
      } else {
        setProgressRows(
          progressResult.status === "fulfilled" ? progressResult.value : [],
        );
        setRecommendations(
          recommendationsResult.status === "fulfilled"
            ? recommendationsResult.value
            : [],
        );
        setAnalyticsUnavailable(true);
      }

      if (certificatesResult.status === "fulfilled") {
        setCertificates(certificatesResult.value);
      } else {
        setCertificates([]);
        setCertificatesUnavailable(true);
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [user]);

  const summary = useMemo(() => {
    const completed = trainings.filter(
      (training) =>
        training.enrollmentStatus === "COMPLETED" ||
        clampProgress(training.progressPercentage) >= 100,
    ).length;
    const active = trainings.filter(
      (training) => training.enrollmentStatus === "ACTIVE",
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
      active,
      averageProgress,
    };
  }, [trainings]);

  const catalogById = useMemo(
    () => new Map(catalog.map((training) => [training.id, training])),
    [catalog],
  );

  const trainingById = useMemo(
    () => new Map(trainings.map((training) => [training.id, training])),
    [trainings],
  );

  const heroTraining = useMemo(() => {
    const candidates = trainings.filter(
      (training) =>
        training.enrollmentStatus !== "COMPLETED" &&
        clampProgress(training.progressPercentage) < 100,
    );

    return [...candidates].sort((a, b) => {
      const aStarted = clampProgress(a.progressPercentage) > 0 ? 0 : 1;
      const bStarted = clampProgress(b.progressPercentage) > 0 ? 0 : 1;

      if (aStarted !== bStarted) {
        return aStarted - bStarted;
      }

      const deadlineDelta = dateValue(a.dueAt) - dateValue(b.dueAt);
      if (Number.isFinite(deadlineDelta) && deadlineDelta !== 0) {
        return deadlineDelta;
      }

      return clampProgress(b.progressPercentage) - clampProgress(a.progressPercentage);
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
        .sort((a, b) => dateValue(a.dueAt) - dateValue(b.dueAt))
        .slice(0, 4),
    [trainings],
  );

  const activeRecommendations = useMemo(
    () =>
      recommendations
        .filter(
          (recommendation) =>
            recommendation.status !== "COMPLETED" &&
            recommendation.status !== "DISMISSED",
        )
        .sort((a, b) => {
          const priorityDelta =
            priorityRank(a.priority) - priorityRank(b.priority);

          if (priorityDelta !== 0) return priorityDelta;

          return dateValue(b.createdAt) - dateValue(a.createdAt);
        })
        .slice(0, 3),
    [recommendations],
  );

  const recentActivity = useMemo(() => {
    const enrolledIds = new Set(trainings.map((training) => training.id));

    return progressRows
      .filter(
        (row) =>
          enrolledIds.has(row.trainingId) &&
          Boolean(row.lastActivityAt || row.updatedAt),
      )
      .sort(
        (a, b) =>
          dateValue(b.lastActivityAt || b.updatedAt) -
          dateValue(a.lastActivityAt || a.updatedAt),
      )
      .slice(0, 4)
      .map((row) => {
        const training = trainingById.get(row.trainingId);

        return {
          id: row.id,
          title: training?.title || "Activité d'apprentissage",
          description: training
            ? `Progression actuelle : ${clampProgress(
                training.progressPercentage,
              )} %`
            : "Activité enregistrée dans votre parcours.",
          timestamp: formatDateTime(row.lastActivityAt || row.updatedAt),
        };
      });
  }, [progressRows, trainingById, trainings]);

  const availableTrainings = useMemo(() => {
    const enrolledIds = new Set(trainings.map((training) => training.id));

    return catalog
      .filter((training) => !enrolledIds.has(training.id))
      .slice(0, 3);
  }, [catalog, trainings]);

  const latestCertificates = useMemo(
    () =>
      [...certificates]
        .sort((a, b) => dateValue(b.issuedAt) - dateValue(a.issuedAt))
        .slice(0, 2),
    [certificates],
  );

  if (loading) {
    return (
      <SmartLoadingState
        label="Chargement de votre espace apprenant…"
        skeletonRows={6}
      />
    );
  }

  const learnerName =
    user?.fullName || user?.name || user?.email || "Apprenant";

  return (
    <Stack spacing={2.5}>
      <SmartPageHeader
        eyebrow="Mon espace d'apprentissage"
        title={`Bonjour ${learnerName}`}
        description="Retrouvez immédiatement la formation à poursuivre, vos échéances et les actions utiles de votre parcours."
        actions={
          <Button
            variant="outlined"
            startIcon={<Compass size={17} />}
            onClick={() => navigate("/learner/catalog")}
          >
            Explorer le catalogue
          </Button>
        }
      />

      {coreError ? (
        <SmartErrorState
          title="Votre parcours n'a pas pu être chargé"
          description={coreError}
          actionLabel="Réessayer"
          onAction={() => window.location.reload()}
        />
      ) : null}

      {!coreError ? (
        <>
          <SmartSectionCard
            title="Continuer mon parcours"
            description="Votre prochaine action utile, basée sur vos formations réellement affectées."
          >
            {heroTraining ? (
              <Card variant="outlined" sx={{ overflow: "hidden" }}>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "minmax(240px, 320px) minmax(0, 1fr)",
                    },
                    alignItems: "stretch",
                  }}
                >
                  <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 320 } }}>
                    <TrainingCover
                      title={heroTraining.title}
                      coverUrl={
                        catalogById.get(heroTraining.id)?.coverImageUrl ?? null
                      }
                      coverAlt={`Couverture de ${heroTraining.title}`}
                    />
                  </Box>

                  <CardContent
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: 1.5,
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
                        À poursuivre
                      </Typography>
                      <Chip
                        size="small"
                        label={enrollmentLabel(heroTraining.enrollmentStatus)}
                      />
                    </Stack>

                    <Box>
                      <Typography variant="h5" component="h2" sx={{ fontWeight: 850 }}>
                        {heroTraining.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {heroTraining.shortDescription ||
                          "Formation disponible dans votre parcours."}
                      </Typography>
                    </Box>

                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {nextStepLabel(heroTraining)}
                    </Typography>

                    {heroTraining.dueAt ? (
                      <Typography variant="caption" color="text.secondary">
                        Échéance : {formatDate(heroTraining.dueAt)}
                      </Typography>
                    ) : null}

                    <Stack spacing={0.75}>
                      <Stack
                        direction="row"
                        sx={{ justifyContent: "space-between", alignItems: "center" }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Progression
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800 }}>
                          {clampProgress(heroTraining.progressPercentage)} %
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={clampProgress(heroTraining.progressPercentage)}
                        aria-label={`Progression ${clampProgress(
                          heroTraining.progressPercentage,
                        )} %`}
                        sx={{ height: 8, borderRadius: 999 }}
                      />
                    </Stack>

                    <Button
                      variant="contained"
                      onClick={() =>
                        navigate(`/learner/trainings/${heroTraining.id}`)
                      }
                      sx={{ alignSelf: "flex-start" }}
                    >
                      {clampProgress(heroTraining.progressPercentage) > 0
                        ? "Reprendre"
                        : "Commencer"}
                    </Button>
                  </CardContent>
                </Box>
              </Card>
            ) : trainings.length ? (
              <SmartEmptyState
                title="Parcours à jour"
                description="Aucune formation en cours n'attend une reprise immédiate."
                actionLabel="Voir mes formations"
                onAction={() => navigate("/learner/trainings")}
              />
            ) : (
              <SmartEmptyState
                title="Aucune formation affectée"
                description="Explorez le catalogue pour découvrir les formations disponibles."
                actionLabel="Explorer le catalogue"
                onAction={() => navigate("/learner/catalog")}
              />
            )}
          </SmartSectionCard>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
            aria-label="Résumé de votre parcours"
          >
            <Chip
              icon={<BookOpen size={16} />}
              label={`${trainings.length} formation${trainings.length > 1 ? "s" : ""}`}
              variant="outlined"
            />
            <Chip
              label={`${summary.active} en cours`}
              variant="outlined"
            />
            <Chip
              icon={<Award size={16} />}
              label={`${summary.completed} terminée${summary.completed > 1 ? "s" : ""}`}
              variant="outlined"
            />
            <Chip
              icon={<TrendingUp size={16} />}
              label={`${summary.averageProgress} % de progression moyenne`}
              variant="outlined"
            />
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2.5,
              alignItems: "start",
            }}
          >
            <SmartSectionCard
              title="Mes échéances"
              description="Les prochaines dates liées à vos formations actives."
            >
              {!deadlines.length ? (
                <CompactEmptyState
                  title="Aucune échéance proche"
                  description="Aucune date limite n'est actuellement enregistrée sur vos formations en cours."
                />
              ) : (
                <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}>
                  {deadlines.map((training) => (
                    <DeadlineItem
                      key={training.id}
                      title={training.title}
                      deadlineLabel={`Échéance : ${formatDate(training.dueAt)}`}
                      status={deadlineStatus(training.dueAt)}
                    />
                  ))}
                </Stack>
              )}
            </SmartSectionCard>

            <SmartSectionCard
              title="Recommandations"
              description="Actions réellement proposées par SmartTraining à partir de vos données d'apprentissage."
            >
              {analyticsUnavailable ? (
                <SmartErrorState
                  title="Recommandations indisponibles"
                  description="Les données d'analytics ne sont pas disponibles pour le moment."
                />
              ) : !activeRecommendations.length ? (
                <CompactEmptyState
                  title="Aucune recommandation en attente"
                  description="SmartTraining n'a pas d'action particulière à vous proposer pour le moment."
                  actionLabel="Voir ma progression"
                  onAction={() => navigate("/learner/progress")}
                />
              ) : (
                <Stack spacing={1.5}>
                  {activeRecommendations.map((recommendation) => (
                    <PriorityCard
                      key={recommendation.id}
                      title={recommendation.title}
                      description={recommendation.description}
                      severity={prioritySeverity(recommendation.priority)}
                      actionLabel="Voir ma progression"
                      onAction={() => navigate("/learner/progress")}
                    />
                  ))}
                </Stack>
              )}
            </SmartSectionCard>
          </Box>

          <SmartSectionCard
            title="À découvrir"
            description="Formations publiées du catalogue qui ne figurent pas encore dans votre parcours."
          >
            {catalogUnavailable ? (
              <SmartErrorState
                title="Catalogue indisponible"
                description="Les formations à découvrir ne peuvent pas être chargées pour le moment."
              />
            ) : !availableTrainings.length ? (
              <CompactEmptyState
                title="Aucune nouvelle formation à proposer"
                description="Toutes les formations actuellement disponibles sont déjà présentes dans votre parcours, ou le catalogue est vide."
                actionLabel="Ouvrir le catalogue"
                onAction={() => navigate("/learner/catalog")}
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
                {availableTrainings.map((training) => (
                  <TrainingCard
                    key={training.id}
                    title={training.title}
                    description={
                      training.shortDescription ||
                      training.description ||
                      "Formation disponible dans le catalogue."
                    }
                    coverUrl={training.coverImageUrl}
                    coverAlt={`Couverture de ${training.title}`}
                    eyebrow={training.category?.trim() || "Formation"}
                    status={training.level || undefined}
                    meta={
                      training.estimatedDurationHours
                        ? `${training.estimatedDurationHours} h estimées`
                        : undefined
                    }
                    actionLabel="Découvrir"
                    onAction={() => navigate("/learner/catalog")}
                  />
                ))}
              </Box>
            )}
          </SmartSectionCard>

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
            <SmartSectionCard
              title="Activité récente"
              description="Dernières progressions réellement enregistrées par SmartTraining."
            >
              {analyticsUnavailable ? (
                <SmartErrorState
                  title="Activité indisponible"
                  description="La progression récente ne peut pas être chargée pour le moment."
                />
              ) : (
                <ActivityTimeline
                  items={recentActivity}
                  emptyLabel="Aucune activité récente n'est encore enregistrée."
                />
              )}
            </SmartSectionCard>

            <SmartSectionCard
              title="Mes certificats"
              description="Vos dernières réussites délivrées par le serveur SmartTraining."
            >
              {certificatesUnavailable ? (
                <SmartErrorState
                  title="Certificats indisponibles"
                  description="Vos certificats ne peuvent pas être chargés pour le moment."
                />
              ) : !latestCertificates.length ? (
                <CompactEmptyState
                  title="Aucun certificat pour le moment"
                  description="Terminez une formation éligible pour obtenir votre premier certificat."
                  actionLabel="Voir mes formations"
                  onAction={() => navigate("/learner/trainings")}
                />
              ) : (
                <Stack spacing={1.5}>
                  {latestCertificates.map((certificate) => (
                    <CertificateCard
                      key={certificate.id}
                      title={certificate.trainingTitle}
                      issuedAt={formatDate(certificate.issuedAt)}
                      verificationLabel={
                        certificate.status === "ACTIVE"
                          ? "Certificat valide"
                          : certificate.status
                      }
                      actionLabel="Ouvrir mes certificats"
                      onAction={() => navigate("/learner/certificates")}
                    />
                  ))}

                  <Button
                    variant="text"
                    startIcon={<Award size={17} />}
                    onClick={() => navigate("/learner/certificates")}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Voir tous mes certificats
                  </Button>
                </Stack>
              )}
            </SmartSectionCard>
          </Box>

        </>
      ) : null}
    </Stack>
  );
}
