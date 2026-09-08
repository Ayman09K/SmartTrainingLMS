import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  Activity,
  ArrowLeft,
  BellRing,
  BookOpenCheck,
  CircleHelp,
  ClipboardCheck,
  Gauge,
  GraduationCap,
  ShieldAlert,
} from "lucide-react";
import {
  getSupportSessionsForLearner,
  getTrainerTrainings,
} from "../../api/trainerApi";
import {
  getTrainerLearnerIdentity,
  getTrainerLearnerOverview,
} from "../../api/trainerLearnerOverviewApi";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  SmartMetricCard,
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import { ActivityTimeline } from "../../components/ux/RichPrimitives";
import { useAuth } from "../../features/auth/AuthContext";
import type { AuthUser } from "../../types/auth";
import type {
  SupportSessionResponse,
  TrainingResponse,
} from "../../types/trainer";
import type {
  TrainerLearnerAlert,
  TrainerLearnerFeedback,
  TrainerLearnerIntervention,
  TrainerLearnerOverviewResponse,
  TrainerLearnerProgress,
  TrainerLearnerRecommendation,
  TrainerLearnerRisk,
} from "../../types/trainerLearnerOverview";

function fullName(learner?: AuthUser | null): string {
  if (!learner) {
    return "Apprenant";
  }

  return (
    learner.fullName ||
    learner.name ||
    `${learner.firstName ?? ""} ${learner.lastName ?? ""}`.trim() ||
    learner.email
  );
}

function formatDate(
  value?: string | null,
  fallback = "Non renseignee",
): string {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function clamp(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function progressStatusLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    NOT_STARTED: "Non commencee",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminee",
    AT_RISK: "A reprendre",
  };

  return value ? labels[value] || "A examiner" : "A examiner";
}

function progressStatusColor(
  value?: string | null,
): "default" | "info" | "success" | "warning" {
  if (value === "COMPLETED") {
    return "success";
  }

  if (value === "IN_PROGRESS") {
    return "info";
  }

  if (value === "AT_RISK") {
    return "warning";
  }

  return "default";
}

function riskLabel(risk: TrainerLearnerRisk): string {
  if (
    risk.dataStatus === "INSUFFICIENT" ||
    risk.riskLevel === "DATA_INSUFFICIENT"
  ) {
    return "Donnees insuffisantes";
  }

  if (risk.riskLevel === "HIGH") {
    return "Attention elevee";
  }

  if (risk.riskLevel === "MEDIUM") {
    return "Attention moyenne";
  }

  if (risk.riskLevel === "LOW") {
    return "Attention faible";
  }

  return "Non calcule";
}

function riskColor(
  risk: TrainerLearnerRisk,
): "default" | "info" | "warning" | "error" {
  if (
    risk.dataStatus === "INSUFFICIENT" ||
    risk.riskLevel === "DATA_INSUFFICIENT"
  ) {
    return "default";
  }

  if (risk.riskLevel === "HIGH") {
    return "error";
  }

  if (risk.riskLevel === "MEDIUM") {
    return "warning";
  }

  return "info";
}

function feedbackStatusLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    OPEN: "A traiter",
    IN_PROGRESS: "En cours",
    RESOLVED: "Resolu",
    CLOSED: "Cloture",
  };

  return value ? labels[value] || "A examiner" : "A examiner";
}

function alertStatusLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    OPEN: "A traiter",
    IN_PROGRESS: "En cours",
    RESOLVED: "Resolue",
    IGNORED: "Ignoree",
  };

  return value ? labels[value] || "A examiner" : "A examiner";
}

function alertSeverityLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    LOW: "Faible",
    MEDIUM: "Moyenne",
    HIGH: "Elevee",
  };

  return value ? labels[value] || "A examiner" : "A examiner";
}

function recommendationStatusLabel(
  value?: string | null,
): string {
  const labels: Record<string, string> = {
    PROPOSED: "Proposee",
    ACCEPTED: "Acceptee",
    COMPLETED: "Terminee",
    DISMISSED: "Ignoree",
  };

  return value ? labels[value] || "A examiner" : "A examiner";
}

function recommendationPriorityLabel(
  value?: string | null,
): string {
  const labels: Record<string, string> = {
    LOW: "Priorite faible",
    MEDIUM: "Priorite moyenne",
    HIGH: "Priorite elevee",
  };

  return value ? labels[value] || "Priorite a examiner" : "Priorite a examiner";
}

function interventionStatusLabel(
  value?: string | null,
): string {
  const labels: Record<string, string> = {
    PLANNED: "Planifiee",
    DONE: "Terminee",
    CANCELLED: "Annulee",
  };

  return value ? labels[value] || "A examiner" : "A examiner";
}

function interventionTypeLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    MESSAGE: "Message",
    CALL: "Appel",
    SUPPORT_SESSION: "Seance d'accompagnement",
    MANUAL_REVIEW: "Revue manuelle",
    FOLLOW_UP: "Suivi",
  };

  return value ? labels[value] || "Action d'accompagnement" : "Action d'accompagnement";
}

function supportStatusLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    SCHEDULED: "Planifiee",
    COMPLETED: "Terminee",
    CANCELLED: "Annulee",
  };

  return value ? labels[value] || "A examiner" : "A examiner";
}

function eventTypeLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    TRAINING_OPENED: "Formation ouverte",
    MODULE_OPENED: "Module ouvert",
    LESSON_OPENED: "Lecon ouverte",
    LESSON_COMPLETED: "Lecon terminee",
    RESOURCE_OPENED: "Ressource ouverte",
    VIDEO_OPENED: "Video ouverte",
    VIDEO_COMPLETED: "Video terminee",
    PDF_OPENED: "PDF ouvert",
    SCORM_OPENED: "Module SCORM ouvert",
    QUIZ_STARTED: "Quiz commence",
    QUIZ_SUBMITTED: "Quiz soumis",
    QUIZ_PASSED: "Quiz reussi",
    QUIZ_FAILED: "Quiz a reprendre",
    SCORE_RECORDED: "Score enregistre",
    REVIEW_CREATED: "Avis publie",
    FEEDBACK_CREATED: "Feedback envoye",
    HELP_REQUESTED: "Demande d'aide",
  };

  return value ? labels[value] || "Activite pedagogique" : "Activite pedagogique";
}

function DetailEmpty({ message }: { message: string }) {
  return (
    <Box
      sx={{
        py: 4,
        textAlign: "center",
        color: "text.secondary",
      }}
    >
      <Typography variant="body2">{message}</Typography>
    </Box>
  );
}

function ProgressCard({
  progress,
  trainingName,
}: {
  progress: TrainerLearnerProgress;
  trainingName: string;
}) {
  const percentage = clamp(progress.progressPercentage);

  return (
    <Box
      sx={{
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: { sm: "center" },
          }}
        >
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 800 }}
            >
              {trainingName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {`Derniere activite : ${formatDate(
                progress.lastActivityAt,
                "Aucune activite",
              )}`}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={progressStatusLabel(progress.status)}
            color={progressStatusColor(progress.status)}
          />
        </Stack>

        <Stack spacing={0.75}>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between" }}
          >
            <Typography variant="body2">
              {"Progression"}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 800 }}
            >
              {`${percentage}%`}
            </Typography>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={percentage}
            aria-label={`Progression ${trainingName}`}
            sx={{
              height: 8,
              borderRadius: 999,
            }}
          />
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(3, minmax(0, 1fr))",
            },
            gap: 1.5,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              {"Lecons"}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {`${progress.completedLessons ?? 0}/${progress.totalLessons ?? 0}`}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              {"Quiz"}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {`${progress.completedQuizzes ?? 0}/${progress.totalQuizzes ?? 0}`}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              {"Score moyen"}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {`${Math.round(progress.averageScore ?? 0)}%`}
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}

function RiskCard({
  risk,
  trainingName,
}: {
  risk: TrainerLearnerRisk;
  trainingName: string;
}) {
  const insufficient =
    risk.dataStatus === "INSUFFICIENT" ||
    risk.riskLevel === "DATA_INSUFFICIENT";

  return (
    <Box
      sx={{
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: { sm: "center" },
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800 }}
          >
            {trainingName}
          </Typography>

          <Chip
            size="small"
            label={riskLabel(risk)}
            color={riskColor(risk)}
          />
        </Stack>

        {insufficient ? (
          <Alert severity="info">
            {
              "Le volume d'activite est encore insuffisant pour etablir un indicateur de suivi fiable."
            }
          </Alert>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(3, minmax(0, 1fr))",
              },
              gap: 1.5,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                {"Progression moyenne"}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {`${Math.round(risk.averageProgress ?? 0)}%`}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                {"Score moyen"}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {`${Math.round(risk.averageScore ?? 0)}%`}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                {"Demandes d'aide"}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {risk.helpRequests ?? 0}
              </Typography>
            </Box>
          </Box>
        )}

        {risk.riskFactors?.length ? (
          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, mb: 0.75 }}
            >
              {"Points a examiner"}
            </Typography>

            <Stack spacing={0.5}>
              {risk.riskFactors.map((factor, index) => (
                <Typography
                  key={`${factor}-${index}`}
                  variant="body2"
                  color="text.secondary"
                >
                  {`- ${factor}`}
                </Typography>
              ))}
            </Stack>
          </Box>
        ) : null}

        {risk.recommendations?.length ? (
          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, mb: 0.75 }}
            >
              {"Pistes d'accompagnement"}
            </Typography>

            <Stack spacing={0.5}>
              {risk.recommendations.map((item, index) => (
                <Typography
                  key={`${item}-${index}`}
                  variant="body2"
                  color="text.secondary"
                >
                  {`- ${item}`}
                </Typography>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}

function FeedbackItem({
  item,
  trainingName,
}: {
  item: TrainerLearnerFeedback;
  trainingName: string;
}) {
  return (
    <Box
      sx={{
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Stack spacing={1}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ justifyContent: "space-between" }}
        >
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800 }}
            >
              {trainingName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(item.createdAt)}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            {item.needHelp ? (
              <Chip
                size="small"
                color="warning"
                icon={<CircleHelp size={14} />}
                label={"Aide demandee"}
              />
            ) : null}

            <Chip
              size="small"
              variant="outlined"
              label={feedbackStatusLabel(item.status)}
            />
          </Stack>
        </Stack>

        <Typography
          variant="body2"
          sx={{ whiteSpace: "pre-wrap" }}
        >
          {item.message || "Aucun message"}
        </Typography>

        {item.trainerResponse ? (
          <>
            <Divider />
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
              >
                {"Reponse formateur"}
              </Typography>
              <Typography
                variant="body2"
                sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}
              >
                {item.trainerResponse}
              </Typography>
            </Box>
          </>
        ) : null}
      </Stack>
    </Box>
  );
}

function AlertItem({
  item,
  trainingName,
}: {
  item: TrainerLearnerAlert;
  trainingName: string;
}) {
  return (
    <Box
      sx={{
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Stack spacing={1}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ justifyContent: "space-between" }}
        >
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800 }}
            >
              {item.title || "Signal de suivi"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {`${trainingName} - ${formatDate(item.createdAt)}`}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Chip
              size="small"
              label={alertSeverityLabel(item.severity)}
              variant="outlined"
            />
            <Chip
              size="small"
              label={alertStatusLabel(item.status)}
            />
          </Stack>
        </Stack>

        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          {item.message || "Signal pedagogique a examiner."}
        </Typography>
      </Stack>
    </Box>
  );
}

function RecommendationItem({
  item,
  trainingName,
}: {
  item: TrainerLearnerRecommendation;
  trainingName: string;
}) {
  return (
    <Box
      sx={{
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Stack spacing={1}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ justifyContent: "space-between" }}
        >
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800 }}
            >
              {item.title || "Recommandation pedagogique"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {trainingName}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Chip
              size="small"
              variant="outlined"
              label={recommendationPriorityLabel(item.priority)}
            />
            <Chip
              size="small"
              label={recommendationStatusLabel(item.status)}
            />
          </Stack>
        </Stack>

        <Typography variant="body2">
          {item.description || "Action pedagogique proposee."}
        </Typography>
      </Stack>
    </Box>
  );
}

function InterventionItem({
  item,
  trainingName,
}: {
  item: TrainerLearnerIntervention;
  trainingName: string;
}) {
  return (
    <Box
      sx={{
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Stack spacing={1}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ justifyContent: "space-between" }}
        >
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800 }}
            >
              {interventionTypeLabel(item.interventionType)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {`${trainingName} - ${formatDate(item.createdAt)}`}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={interventionStatusLabel(item.status)}
          />
        </Stack>

        <Typography
          variant="body2"
          sx={{ whiteSpace: "pre-wrap" }}
        >
          {item.note || "Aucune note"}
        </Typography>
      </Stack>
    </Box>
  );
}

function SessionItem({
  item,
  trainingName,
}: {
  item: SupportSessionResponse;
  trainingName: string;
}) {
  const safeLink =
    typeof item.meetingLink === "string" &&
    /^https?:\/\//i.test(item.meetingLink);

  return (
    <Box
      sx={{
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ justifyContent: "space-between" }}
        >
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800 }}
            >
              {item.title || "Seance d'accompagnement"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {`${trainingName} - ${formatDate(item.scheduledAt)}`}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={supportStatusLabel(item.status)}
          />
        </Stack>

        <Box>
          <Typography variant="caption" color="text.secondary">
            {"Objectif"}
          </Typography>
          <Typography variant="body2">
            {item.objective || "Non renseigne"}
          </Typography>
        </Box>

        {item.note ? (
          <Box>
            <Typography variant="caption" color="text.secondary">
              {"Note"}
            </Typography>
            <Typography
              variant="body2"
              sx={{ whiteSpace: "pre-wrap" }}
            >
              {item.note}
            </Typography>
          </Box>
        ) : null}

        {safeLink && item.status === "SCHEDULED" ? (
          <Box>
            <Button
              component="a"
              href={item.meetingLink}
              target="_blank"
              rel="noreferrer"
              size="small"
              variant="outlined"
            >
              {"Ouvrir le lien de reunion"}
            </Button>
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}

export function TrainerLearnerDetailPage() {
  const { learnerId: learnerIdParam } = useParams();
  const { user } = useAuth();

  const learnerId = Number(learnerIdParam);

  const [learner, setLearner] = useState<AuthUser | null>(null);
  const [overview, setOverview] =
    useState<TrainerLearnerOverviewResponse | null>(null);
  const [trainings, setTrainings] =
    useState<TrainingResponse[]>([]);
  const [supportSessions, setSupportSessions] =
    useState<SupportSessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!Number.isInteger(learnerId) || learnerId <= 0) {
        setError("Apprenant introuvable ou lien invalide.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [
          loadedLearner,
          loadedOverview,
          loadedTrainings,
          loadedSupportSessions,
        ] = await Promise.all([
          getTrainerLearnerIdentity(learnerId),
          getTrainerLearnerOverview(learnerId),
          user?.id
            ? getTrainerTrainings(user.id).catch(() => [])
            : Promise.resolve([]),
          getSupportSessionsForLearner(learnerId).catch(() => []),
        ]);

        setLearner(loadedLearner);
        setOverview(loadedOverview);
        setTrainings(loadedTrainings);
        setSupportSessions(loadedSupportSessions);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [learnerId, user?.id]);

  const trainingById = useMemo(
    () =>
      new Map(
        trainings.map((training) => [
          training.id,
          training,
        ]),
      ),
    [trainings],
  );

  function trainingName(
    trainingId?: number | null,
  ): string {
    if (!trainingId) {
      return "Formation";
    }

    return (
      trainingById.get(trainingId)?.title ||
      "Formation indisponible"
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 380,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            {"Chargement du suivi 360..."}
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !overview || !learner) {
    return (
      <Stack spacing={3}>
        <Button
          component={Link}
          to="/trainer/learners"
          startIcon={<ArrowLeft size={17} />}
          variant="text"
          sx={{ alignSelf: "flex-start" }}
        >
          {"Retour aux participants"}
        </Button>

        <Alert severity="error">
          {error || "Vue apprenant indisponible."}
        </Alert>
      </Stack>
    );
  }

  const summary = overview.summary;

  return (
    <Stack spacing={3}>
      <Button
        component={Link}
        to="/trainer/learners"
        startIcon={<ArrowLeft size={17} />}
        variant="text"
        sx={{ alignSelf: "flex-start" }}
      >
        {"Retour aux participants"}
      </Button>

      <SmartPageHeader
        eyebrow={"Suivi pedagogique 360"}
        title={fullName(learner)}
        description={
          "Vue consolidee de la progression, des difficultes signalees et des actions d'accompagnement."
        }
      />

      <SmartSectionCard
        title={"Identite apprenant"}
        description={
          "Informations utiles au suivi pedagogique."
        }
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ alignItems: { sm: "center" } }}
        >
          <Box
            sx={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              bgcolor: "action.hover",
              flexShrink: 0,
            }}
          >
            <GraduationCap size={26} aria-hidden="true" />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 800 }}
            >
              {fullName(learner)}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ overflowWrap: "anywhere" }}
            >
              {learner.email}
            </Typography>
          </Box>
        </Stack>
      </SmartSectionCard>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(6, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <SmartMetricCard
          label={"Formations suivies"}
          value={summary.totalTrainings}
          icon={<BookOpenCheck size={20} />}
        />

        <SmartMetricCard
          label={"Progression moyenne"}
          value={`${summary.averageProgress}%`}
          icon={<Gauge size={20} />}
        />

        <SmartMetricCard
          label={"Score moyen"}
          value={`${summary.averageScore}%`}
          icon={<ClipboardCheck size={20} />}
        />

        <SmartMetricCard
          label={"Alertes ouvertes"}
          value={summary.openAlerts}
          icon={<BellRing size={20} />}
        />

        <SmartMetricCard
          label={"Demandes d'aide"}
          value={summary.helpRequests}
          icon={<CircleHelp size={20} />}
        />

        <SmartMetricCard
          label={"Derniere activite"}
          value={formatDate(
            summary.lastActivityAt,
            "Aucune activite",
          )}
          icon={<Activity size={20} />}
        />
      </Box>

      <SmartSectionCard
        title={"Progression par formation"}
        description={
          "Progression autoritaire, lecons, quiz et score moyen pour chaque formation accessible au formateur."
        }
      >
        {overview.progress.length ? (
          <Stack spacing={1.5}>
            {overview.progress.map((progress) => (
              <ProgressCard
                key={progress.id}
                progress={progress}
                trainingName={trainingName(
                  progress.trainingId,
                )}
              />
            ))}
          </Stack>
        ) : (
          <DetailEmpty message={"Aucune progression disponible."} />
        )}
      </SmartSectionCard>

      <SmartSectionCard
        title={"Points d'attention"}
        description={
          "Les indicateurs aident a prioriser l'accompagnement. Ils ne remplacent pas l'analyse pedagogique du formateur."
        }
      >
        {overview.risks.length ? (
          <Stack spacing={1.5}>
            {overview.risks.map((risk, index) => (
              <RiskCard
                key={`${risk.trainingId ?? "global"}-${index}`}
                risk={risk}
                trainingName={trainingName(
                  risk.trainingId,
                )}
              />
            ))}
          </Stack>
        ) : (
          <DetailEmpty
            message={"Aucun indicateur de risque disponible."}
          />
        )}
      </SmartSectionCard>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "repeat(2, minmax(0, 1fr))",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        <SmartSectionCard
          title={"Feedbacks"}
          description={
            "Difficultes et demandes d'aide partagees par l'apprenant."
          }
        >
          {overview.feedbacks.length ? (
            <Stack spacing={1.25}>
              {overview.feedbacks.map((item) => (
                <FeedbackItem
                  key={item.id}
                  item={item}
                  trainingName={trainingName(
                    item.trainingId,
                  )}
                />
              ))}
            </Stack>
          ) : (
            <DetailEmpty
              message={"Aucun feedback disponible."}
            />
          )}
        </SmartSectionCard>

        <SmartSectionCard
          title={"Alertes de suivi"}
          description={
            "Signaux actuellement associes au parcours de cet apprenant."
          }
        >
          {overview.alerts.length ? (
            <Stack spacing={1.25}>
              {overview.alerts.map((item) => (
                <AlertItem
                  key={item.id}
                  item={item}
                  trainingName={trainingName(
                    item.trainingId,
                  )}
                />
              ))}
            </Stack>
          ) : (
            <DetailEmpty
              message={"Aucune alerte disponible."}
            />
          )}
        </SmartSectionCard>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "repeat(2, minmax(0, 1fr))",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        <SmartSectionCard
          title={"Recommandations pedagogiques"}
          description={
            "Pistes de travail proposees pour poursuivre ou renforcer le parcours."
          }
        >
          {overview.recommendations.length ? (
            <Stack spacing={1.25}>
              {overview.recommendations.map((item) => (
                <RecommendationItem
                  key={item.id}
                  item={item}
                  trainingName={trainingName(
                    item.trainingId,
                  )}
                />
              ))}
            </Stack>
          ) : (
            <DetailEmpty
              message={"Aucune recommandation disponible."}
            />
          )}
        </SmartSectionCard>

        <SmartSectionCard
          title={"Interventions formateur"}
          description={
            "Actions d'accompagnement deja planifiees, terminees ou annulees."
          }
        >
          {overview.interventions.length ? (
            <Stack spacing={1.25}>
              {overview.interventions.map((item) => (
                <InterventionItem
                  key={item.id}
                  item={item}
                  trainingName={trainingName(
                    item.trainingId,
                  )}
                />
              ))}
            </Stack>
          ) : (
            <DetailEmpty
              message={"Aucune intervention disponible."}
            />
          )}
        </SmartSectionCard>
      </Box>

      <SmartSectionCard
        title={"Seances d'accompagnement"}
        description={
          "Rendez-vous pedagogiques planifies pour cet apprenant."
        }
      >
        {supportSessions.length ? (
          <Stack spacing={1.25}>
            {supportSessions.map((item) => (
              <SessionItem
                key={item.id}
                item={item}
                trainingName={trainingName(
                  item.trainingId,
                )}
              />
            ))}
          </Stack>
        ) : (
          <DetailEmpty
            message={"Aucune seance d'accompagnement disponible."}
          />
        )}
      </SmartSectionCard>

      <SmartSectionCard
        title={"Activite recente"}
        description={
          "Derniers evenements pedagogiques reels disponibles dans le suivi 360."
        }
      >
        <ActivityTimeline
          items={overview.recentEvents.map((item) => ({
            id: item.id,
            title: eventTypeLabel(item.eventType),
            description: [
              item.description || trainingName(item.trainingId),
              item.score != null && item.totalPoints != null
                ? `Score : ${item.score}/${item.totalPoints}`
                : "",
            ]
              .filter(Boolean)
              .join(" • "),
            timestamp: formatDate(item.eventDate),
          }))}
          emptyLabel="Aucune activite recente disponible."
        />
      </SmartSectionCard>

      <Alert
        severity="info"
        icon={<ShieldAlert size={20} />}
      >
        {
          "Cette vue consolide des donnees de suivi pedagogique. Les indicateurs doivent toujours etre interpretes dans le contexte reel de l'apprenant."
        }
      </Alert>
    </Stack>
  );
}