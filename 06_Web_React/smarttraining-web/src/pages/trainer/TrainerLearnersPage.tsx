import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import {
  Check,
  Download,
  MailPlus,
  Search,
  UserCheck,
  UserRoundSearch,
  Users,
  X,
} from "lucide-react";
import {
  approveTrainingAccessRequest,
  assignLearners,
  createTrainingInvitation,
  getEnrollmentsByTraining,
  getPendingTrainingAccessRequests,
  getTrainerTrainings,
  getTrainingInvitationsByTraining,
  rejectTrainingAccessRequest,
} from "../../api/trainerApi";
import {
  getTrainerLearnerOverview,
  resolveTrainerLearners,
  searchTrainerLearners,
} from "../../api/trainerLearnerOverviewApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { downloadTrainingLearnersCsv } from "../../api/reportingApi";
import {
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import { LearnerRow } from "../../components/ux/RichPrimitives";
import { smartConfirm } from "../../components/ux/smartConfirmService";
import { useAuth } from "../../features/auth/AuthContext";
import type { AuthUser } from "../../types/auth";
import type { TrainerLearnerProgress } from "../../types/trainerLearnerOverview";
import type {
  EnrollmentResponse,
  TrainingAccessRequestResponse,
  TrainingInvitationResponse,
  TrainingResponse,
} from "../../types/trainer";

function learnerName(learner?: AuthUser): string {
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

function learnerLabel(learner: AuthUser): string {
  const name = learnerName(learner);
  return name === learner.email
    ? learner.email
    : `${name} - ${learner.email}`;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Non renseignee";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}


function localDateTimeInputMin(): string {
  const date = new Date(Date.now() + 60_000);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toApiDueAt(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length === 16 ? `${trimmed}:00` : trimmed;
}

function formatLastActivity(value?: string | null): string {
  if (!value) {
    return "Aucune activite";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function quizScoreLabel(progress?: TrainerLearnerProgress): string {
  if (!progress || !progress.completedQuizzes) {
    return "Aucun quiz";
  }

  return progress.averageScore != null
    ? `${progress.averageScore}%`
    : "Non calcule";
}

function enrollmentStatusLabel(value?: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Active",
    COMPLETED: "Terminee",
    CANCELLED: "Annulee",
  };

  return value ? labels[value] || "A examiner" : "A examiner";
}

function enrollmentStatusColor(
  value?: string,
): "default" | "success" | "info" | "warning" {
  if (value === "ACTIVE") {
    return "success";
  }

  if (value === "COMPLETED") {
    return "info";
  }

  if (value === "CANCELLED") {
    return "default";
  }

  return "warning";
}

function enrollmentSourceLabel(value?: string): string {
  const labels: Record<string, string> = {
    ADMIN_ASSIGNMENT: "Affectation administrateur",
    TRAINER_ASSIGNMENT: "Affectation formateur",
    SELF_ENROLLMENT: "Auto-inscription",
    ACCESS_CODE: "Code d'acces",
    INVITATION: "Invitation",
    APPROVED_REQUEST: "Demande approuvee",
  };

  return value ? labels[value] || "Inscription" : "Inscription";
}

function requestStatusLabel(value?: string): string {
  const labels: Record<string, string> = {
    PENDING: "En attente",
    APPROVED: "Approuvee",
    REJECTED: "Refusee",
    CANCELLED: "Annulee",
  };

  return value ? labels[value] || "A examiner" : "A examiner";
}

function requestStatusColor(
  value?: string,
): "default" | "success" | "warning" | "error" {
  if (value === "APPROVED") {
    return "success";
  }

  if (value === "PENDING") {
    return "warning";
  }

  if (value === "REJECTED") {
    return "error";
  }

  return "default";
}

function invitationStatusLabel(value?: string): string {
  const labels: Record<string, string> = {
    PENDING: "En attente",
    ACCEPTED: "Acceptee",
    DECLINED: "Refusee",
    REJECTED: "Refusee",
    CANCELLED: "Annulee",
    EXPIRED: "Expiree",
  };

  return value ? labels[value] || "A examiner" : "A examiner";
}

function invitationStatusColor(
  value?: string,
): "default" | "success" | "warning" | "error" {
  if (value === "ACCEPTED") {
    return "success";
  }

  if (value === "PENDING") {
    return "warning";
  }

  if (value === "DECLINED" || value === "REJECTED") {
    return "error";
  }

  return "default";
}

function progressValue(
  enrollment: EnrollmentResponse,
  analyticsProgress?: TrainerLearnerProgress,
): number {
  const raw =
    analyticsProgress?.progressPercentage ??
    enrollment.progressPercentage ??
    0;

  return Math.min(100, Math.max(0, Number(raw) || 0));
}

export function TrainerLearnersPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const routeTrainingId = Number(searchParams.get("trainingId") || 0);
  const contextualTrainingId =
    Number.isInteger(routeTrainingId) && routeTrainingId > 0
      ? routeTrainingId
      : 0;

  const [trainings, setTrainings] = useState<TrainingResponse[]>([]);
  const [trainingId, setTrainingId] = useState<number>(contextualTrainingId);

  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);
  const [requests, setRequests] = useState<TrainingAccessRequestResponse[]>([]);
  const [invitations, setInvitations] = useState<TrainingInvitationResponse[]>([]);
  const [progressByLearner, setProgressByLearner] = useState<
    Record<number, TrainerLearnerProgress>
  >({});

  const [directory, setDirectory] = useState<AuthUser[]>([]);
  const [learnerSearch, setLearnerSearch] = useState("");
  const [learnerSearchResults, setLearnerSearchResults] =
    useState<AuthUser[] | null>(null);
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<number[]>([]);
  const [assignmentDueAt, setAssignmentDueAt] = useState("");
  const [inviteLearnerId, setInviteLearnerId] = useState<number>(0);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const directoryById = useMemo(
    () => new Map(directory.map((learner) => [learner.id, learner])),
    [directory],
  );

  const enrolledLearnerIds = useMemo(
    () => new Set(enrollments.map((enrollment) => enrollment.learnerId)),
    [enrollments],
  );

  const visibleDirectory = useMemo(() => {
    const query = learnerSearch.trim().toLocaleLowerCase("fr");

    if (!query) {
      return directory;
    }

    if (learnerSearchResults) {
      return learnerSearchResults;
    }

    return directory.filter((learner) =>
      [learnerName(learner), learner.email]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(query),
    );
  }, [directory, learnerSearch, learnerSearchResults]);

  const selectedTraining = useMemo(
    () => trainings.find((training) => training.id === trainingId),
    [trainingId, trainings],
  );

  async function enrichDirectory(ids: number[]) {
    const missing = Array.from(new Set(ids)).filter(
      (id) => id > 0 && !directoryById.has(id),
    );

    if (!missing.length) {
      return;
    }

    const resolved = await resolveTrainerLearners(missing);

    setDirectory((current) => {
      const byId = new Map(
        current.map((learner) => [learner.id, learner]),
      );

      resolved.forEach((learner) => {
        byId.set(learner.id, learner);
      });

      return Array.from(byId.values());
    });
  }

  async function load(nextTrainingId?: number) {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const loadedTrainings = await getTrainerTrainings(user.id);
      setTrainings(loadedTrainings);

      const currentTrainingId =
        nextTrainingId ||
        trainingId ||
        loadedTrainings[0]?.id ||
        0;

      setTrainingId(currentTrainingId);

      if (!currentTrainingId) {
        setEnrollments([]);
        setRequests([]);
        setInvitations([]);
        setProgressByLearner({});
        return;
      }

      const [
        loadedEnrollments,
        loadedRequests,
        loadedInvitations,
      ] = await Promise.all([
        getEnrollmentsByTraining(currentTrainingId),
        getPendingTrainingAccessRequests(),
        getTrainingInvitationsByTraining(currentTrainingId),
      ]);

      setEnrollments(loadedEnrollments);

      const learnerProgressPairs = await Promise.all(
        loadedEnrollments.map(async (enrollment) => {
          const overview = await getTrainerLearnerOverview(
            enrollment.learnerId,
          );

          const progress = overview.progress.find(
            (item) => item.trainingId === currentTrainingId,
          );

          return [enrollment.learnerId, progress] as const;
        }),
      );

      const nextProgressByLearner: Record<
        number,
        TrainerLearnerProgress
      > = {};

      learnerProgressPairs.forEach(([learnerId, progress]) => {
        if (progress) {
          nextProgressByLearner[learnerId] = progress;
        }
      });

      setProgressByLearner(nextProgressByLearner);

      setRequests(
        loadedRequests.filter(
          (request) => request.trainingId === currentTrainingId,
        ),
      );

      setInvitations(loadedInvitations);

      const ids = [
        ...loadedEnrollments.map((item) => item.learnerId),
        ...loadedRequests.map((item) => item.learnerId),
        ...loadedInvitations
          .map((item) => item.learnerId)
          .filter((id): id is number => Boolean(id)),
      ];

      await enrichDirectory(ids);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function runLearnerSearch() {
    setSearching(true);
    setError("");

    try {
      const query = learnerSearch.trim();
      const results = await searchTrainerLearners(query, 50);

      setLearnerSearchResults(query ? results : null);

      setDirectory((current) => {
        const byId = new Map(
          current.map((learner) => [learner.id, learner]),
        );

        results.forEach((learner) => {
          byId.set(learner.id, learner);
        });

        return Array.from(byId.values());
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    void load(contextualTrainingId || undefined);
    void runLearnerSearch();
  }, [user, contextualTrainingId]);

  function toggleLearner(learnerId: number) {
    setSelectedLearnerIds((current) =>
      current.includes(learnerId)
        ? current.filter((id) => id !== learnerId)
        : [...current, learnerId],
    );
  }

  async function handleAssign(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!trainingId || !selectedLearnerIds.length) {
      setError(
        "Selectionnez une formation et au moins un apprenant.",
      );
      return;
    }

    const dueAt = toApiDueAt(assignmentDueAt);

    if (dueAt && new Date(dueAt).getTime() <= Date.now()) {
      setError("L'echeance doit etre dans le futur.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      await assignLearners({
        trainingId,
        learnerIds: selectedLearnerIds,
        assignedBy: user?.id,
        source: "TRAINER_ASSIGNMENT",
        dueAt,
      });

      setSelectedLearnerIds([]);
      setAssignmentDueAt("");
      setSuccess("Les apprenants selectionnes ont ete affectes.");
      await load(trainingId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleRequestDecision(
    requestId: number,
    action: "APPROVE" | "REJECT",
  ) {
    // UXD14_B1_TRAINING_ACCESS_DIALOG
    const confirmed = await smartConfirm({
      title:
        action === "APPROVE"
          ? "Approuver la demande d’accès"
          : "Refuser la demande d’accès",
      description:
        action === "APPROVE"
          ? "Confirmer l’approbation de cette demande d’accès à la formation ?"
          : "Confirmer le refus de cette demande d’accès à la formation ?",
      confirmLabel: action === "APPROVE" ? "Approuver" : "Refuser",
      destructive: action === "REJECT",
    });

    if (!confirmed) {
      return;
    }

    const actorId = user?.id;

    if (!actorId) {
      setError("Session formateur invalide.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      if (action === "APPROVE") {
        await approveTrainingAccessRequest(requestId, {
          decidedBy: actorId,
          decisionComment:
            "Demande approuvee par le formateur.",
        });

        setSuccess("Demande approuvee.");
      } else {
        await rejectTrainingAccessRequest(requestId, {
          decidedBy: actorId,
          decisionComment:
            "Demande refusee par le formateur.",
        });

        setSuccess("Demande refusee.");
      }

      await load(trainingId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleInvitation(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    // TRAINER_INVITATION_AUTO_EMAIL_UX_V1
    const selectedInviteLearner = inviteLearnerId
      ? directoryById.get(inviteLearnerId)
      : undefined;

    const resolvedInviteEmail =
      selectedInviteLearner?.email?.trim() ||
      inviteEmail.trim();

    if (
      !trainingId ||
      (!inviteLearnerId && !inviteEmail.trim())
    ) {
      setError(
        "Choisissez un apprenant ou indiquez une adresse e-mail.",
      );
      return;
    }

    if (!resolvedInviteEmail) {
      setError(
        "L’adresse e-mail de cet apprenant est indisponible. Choisissez un autre apprenant ou utilisez l’invitation par e-mail.",
      );
      return;
    }
    try {
      setError("");
      setSuccess("");

      await createTrainingInvitation({
        trainingId,
        learnerId: inviteLearnerId || undefined,
        learnerEmail: resolvedInviteEmail,
        invitedBy: user?.id || 0,
        message:
          inviteMessage.trim() ||
          `Bonjour, je vous invite à rejoindre la formation « ${
            selectedTraining?.title || "Formation"
          } ».`,
        validityDays: 7,
      });

      setInviteLearnerId(0);
      setInviteEmail("");
      setInviteMessage("");
      setSuccess(
        `Invitation envoyée pour « ${
          selectedTraining?.title || "la formation sélectionnée"
        } ».`,
      );
      await load(trainingId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }


  async function handleExportCsv() {
    if (!trainingId) {
      setError("Selectionnez une formation a exporter.");
      return;
    }

    setError("");
    setExportingCsv(true);

    try {
      await downloadTrainingLearnersCsv(trainingId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setExportingCsv(false);
    }
  }
  const enrollmentColumns: GridColDef<EnrollmentResponse>[] = [
    {
      field: "learnerId",
      headerName: "Apprenant",
      minWidth: 195,
      flex: 1.35,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const learner = directoryById.get(params.row.learnerId);

        return (
          <LearnerRow
            name={learnerName(learner)}
            email={learner?.email || "Identité non disponible"}
            avatarUrl={learner?.avatarDataUrl}
          />
        );
      },
    },
    {
      field: "status",
      headerName: "Statut",
      renderHeader: () => (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {"Statut"}
        </Box>
      ),
      sortable: false,
      filterable: false,
      minWidth: 100,
      flex: 0.7,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Chip
            size="small"
            label={enrollmentStatusLabel(params.row.status)}
            color={enrollmentStatusColor(params.row.status)}
            variant="outlined"
          />
        </Box>
      ),
    },
    {
      field: "dueAt",
      headerName: "Echeance",
      minWidth: 175,
      flex: 1,
      sortable: true,
      filterable: false,
      renderCell: (params) => (
        <Typography variant="body2">
          {formatDate(params.row.dueAt)}
        </Typography>
      ),
    },
    {
      field: "progress",
      headerName: "Progression",
      renderHeader: () => (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {"Progression"}
        </Box>
      ),
      minWidth: 145,
      flex: 0.95,
      align: "center",
      headerAlign: "center",
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const learner = directoryById.get(params.row.learnerId);
        const analyticsProgress =
          progressByLearner[params.row.learnerId];
        const progress = progressValue(
          params.row,
          analyticsProgress,
        );

        return (
          <Stack
            spacing={0.75}
            sx={{
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, width: "100%", textAlign: "center" }}
            >
              {`${Math.round(progress)}%`}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progress}
              aria-label={`Progression de ${learnerName(learner)}`}
              sx={{
                width: "92%",
                height: 7,
                borderRadius: 999,
              }}
            />
          </Stack>
        );
      },
    },
    {
      field: "quizScore",
      headerName: "Score quiz",
      renderHeader: () => (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {"Score quiz"}
        </Box>
      ),
      minWidth: 105,
      flex: 0.7,
      align: "center",
      headerAlign: "center",
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            width: "100%",
            textAlign: "center",
          }}
        >
          {quizScoreLabel(
            progressByLearner[params.row.learnerId],
          )}
        </Typography>
      ),
    },
    {
      field: "lastActivity",
      headerName: "Derni\u00e8re activit\u00e9",
      renderHeader: () => (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {"Derni\u00e8re activit\u00e9"}
        </Box>
      ),
      minWidth: 135,
      flex: 0.9,
      align: "center",
      headerAlign: "center",
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            width: "100%",
            textAlign: "center",
          }}
        >
          {formatLastActivity(
            progressByLearner[params.row.learnerId]
              ?.lastActivityAt,
          )}
        </Typography>
      ),
    },
    {
      field: "source",
      headerName: "Origine",
      renderHeader: () => (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {"Origine"}
        </Box>
      ),
      sortable: false,
      filterable: false,
      minWidth: 145,
      flex: 0.85,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            width: "100%",
            textAlign: "center",
          }}
        >
          {enrollmentSourceLabel(params.row.source)}
        </Typography>
      ),
    },
    {
      field: "followUp",
      headerName: "Suivi",
      renderHeader: () => (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {"Suivi"}
        </Box>
      ),
      minWidth: 125,
      flex: 0.75,
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Button
            component={Link}
            to={`/trainer/learners/${params.row.learnerId}`}
            size="small"
            variant="outlined"
          >
            {"Suivi 360"}
          </Button>
        </Box>
      ),
    },
  ];  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 360,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            {"Chargement des participants..."}
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!trainings.length) {
    return (
      <Stack spacing={3}>
        <SmartPageHeader
          eyebrow={"Suivi pedagogique"}
          title={"Participants"}
          description={
            "Gerez les inscriptions et accedez au suivi pedagogique de vos apprenants."
          }
        />

        <SmartSectionCard title={"Aucune formation disponible"}>
          <Stack
            spacing={1.5}
            sx={{
              alignItems: "center",
              textAlign: "center",
              py: 4,
            }}
          >
            <Users size={36} aria-hidden="true" />
            <Typography variant="h6">
              {"Aucune formation geree par ce compte formateur"}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 560 }}
            >
              {
                "Creez ou ouvrez une formation avant de gerer ses participants."
              }
            </Typography>
          </Stack>
        </SmartSectionCard>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow={"Suivi pedagogique"}
        title={"Participants"}
        description={
          "Gerez les inscriptions, les demandes d'acces et les invitations, puis ouvrez le suivi 360 de chaque apprenant."
        }
              actions={
          <Button
            variant="outlined"
            startIcon={
              exportingCsv ? (
                <CircularProgress size={16} />
              ) : (
                <Download size={17} />
              )
            }
            disabled={!trainingId || exportingCsv}
            onClick={() => void handleExportCsv()}
          >
            {exportingCsv ? "Export..." : "Exporter CSV"}
          </Button>
        }
/>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <SmartSectionCard
        title={"Formation suivie"}
        description={
          "Toutes les donnees ci-dessous sont limitees a la formation selectionnee."
        }
      >
        <TextField
          select
          fullWidth
          label={"Formation"}
          value={trainingId}
          onChange={(event) =>
            void load(Number(event.target.value))
          }
        >
          {trainings.map((training) => (
            <MenuItem key={training.id} value={training.id}>
              {training.title}
            </MenuItem>
          ))}
        </TextField>

        {selectedTraining ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1.5 }}
          >
            {`${enrollments.length} inscrit${
              enrollments.length > 1 ? "s" : ""
            }, ${requests.length} demande${
              requests.length > 1 ? "s" : ""
            } en attente, ${invitations.length} invitation${
              invitations.length > 1 ? "s" : ""
            }.`}
          </Typography>
        ) : null}
      </SmartSectionCard>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "minmax(0, 1.15fr) minmax(380px, 0.85fr)",
          },
          gap: 2.5,
          alignItems: "start",
        }}
      >
        <SmartSectionCard
          title={"Affecter des apprenants"}
          description={
            "Recherchez, sélectionnez puis affectez plusieurs apprenants en une seule action."
          }
        >
          <Box
            component="form"
            onSubmit={handleAssign}
            sx={{ display: "grid", gap: 2.25 }}
          >
            <Box
              sx={{
                p: 1.5,
                border: 1,
                borderColor: "divider",
                borderRadius: 2.5,
                bgcolor: "action.hover",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.25}
              >
                <TextField
                  fullWidth
                  type="search"
                  label={"Rechercher un apprenant"}
                  value={learnerSearch}
                  onChange={(event) => {
                    setLearnerSearch(event.target.value);
                    setLearnerSearchResults(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void runLearnerSearch();
                    }
                  }}
                  placeholder={"Nom ou adresse e-mail"}
                />

                <Button
                  type="button"
                  variant="outlined"
                  startIcon={
                    searching ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Search size={17} />
                    )
                  }
                  disabled={searching}
                  onClick={() => void runLearnerSearch()}
                  sx={{
                    minWidth: 138,
                    whiteSpace: "nowrap",
                  }}
                >
                  {searching ? "Recherche..." : "Rechercher"}
                </Button>
              </Stack>
            </Box>

            {!visibleDirectory.length ? (
              <Box
                sx={{
                  py: 5,
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2.5,
                  bgcolor: "background.paper",
                }}
              >
                <Stack
                  spacing={1}
                  sx={{ alignItems: "center", maxWidth: 460 }}
                >
                  <UserRoundSearch
                    size={30}
                    aria-hidden="true"
                  />
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: 800 }}
                  >
                    {"Aucun apprenant trouvé"}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                  >
                    {
                      "Modifiez votre recherche pour trouver un apprenant disponible."
                    }
                  </Typography>
                </Stack>
              </Box>
            ) : (
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2.5,
                  overflow: "hidden",
                  bgcolor: "background.paper",
                }}
              >
                <Box
                  sx={{
                    px: 1.5,
                    py: 1.1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    borderBottom: 1,
                    borderColor: "divider",
                    bgcolor: "action.hover",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: 0.45,
                      textTransform: "uppercase",
                    }}
                  >
                    {"Apprenants disponibles"}
                  </Typography>

                  <Chip
                    size="small"
                    color={
                      selectedLearnerIds.length
                        ? "primary"
                        : "default"
                    }
                    variant={
                      selectedLearnerIds.length
                        ? "filled"
                        : "outlined"
                    }
                    label={`${selectedLearnerIds.length} sélectionné${
                      selectedLearnerIds.length > 1 ? "s" : ""
                    }`}
                  />
                </Box>

                <Stack
                  spacing={0}
                  sx={{
                    maxHeight: 380,
                    overflowY: "auto",
                    "&::-webkit-scrollbar": {
                      width: 7,
                    },
                    "&::-webkit-scrollbar-thumb": {
                      bgcolor: "action.disabled",
                      borderRadius: 999,
                    },
                  }}
                >
                  {visibleDirectory.map((learner) => {
                    const alreadyEnrolled =
                      enrolledLearnerIds.has(learner.id);
                    const selected =
                      selectedLearnerIds.includes(learner.id);

                    return (
                      <Box
                        key={learner.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.25,
                          px: 1.25,
                          py: 1.05,
                          borderBottom: 1,
                          borderColor: "divider",
                          bgcolor: alreadyEnrolled
                            ? "action.disabledBackground"
                            : selected
                              ? "action.selected"
                              : "background.paper",
                          transition:
                            "background-color 120ms ease",
                          "&:last-child": {
                            borderBottom: 0,
                          },
                          ...(!alreadyEnrolled
                            ? {
                                "&:hover": {
                                  bgcolor: selected
                                    ? "action.selected"
                                    : "action.hover",
                                },
                              }
                            : {}),
                        }}
                      >
                        <Checkbox
                          checked={selected}
                          disabled={alreadyEnrolled}
                          onChange={() =>
                            toggleLearner(learner.id)
                          }
                          slotProps={{
                            input: {
                              "aria-label": `Selectionner ${learnerName(
                                learner,
                              )}`,
                            },
                          }}
                        />

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 800 }}
                          >
                            {learnerName(learner)}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "block",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {learner.email}
                          </Typography>
                        </Box>

                        {alreadyEnrolled ? (
                          <Chip
                            size="small"
                            color="success"
                            variant="outlined"
                            label={"Déjà inscrit"}
                          />
                        ) : null}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            <Box
              sx={{
                p: 1.5,
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "minmax(0, 1fr) auto",
                },
                gap: 1.5,
                alignItems: "end",
                border: 1,
                borderColor: "divider",
                borderRadius: 2.5,
                bgcolor: "background.paper",
              }}
            >
              <TextField
                fullWidth
                type="datetime-local"
                label={"Échéance facultative"}
                value={assignmentDueAt}
                onChange={(event) =>
                  setAssignmentDueAt(event.target.value)
                }
                helperText={
                  "Laissez vide pour une affectation sans échéance."
                }
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: localDateTimeInputMin() },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                startIcon={<UserCheck size={17} />}
                disabled={!selectedLearnerIds.length}
                sx={{
                  minHeight: 40,
                  whiteSpace: "nowrap",
                  px: 2.25,
                }}
              >
                {selectedLearnerIds.length
                  ? `Affecter (${selectedLearnerIds.length})`
                  : "Affecter la sélection"}
              </Button>
            </Box>
          </Box>
        </SmartSectionCard>

        <SmartSectionCard
          title={"Inviter un apprenant à cette formation"}
          description={
            selectedTraining
              ? "Envoyez une invitation dans SmartTraining."
              : "Sélectionnez une formation."
          }
        >
          <Box
            component="form"
            onSubmit={handleInvitation}
            sx={{ display: "grid", gap: 2 }}
          >
            <Box
              sx={{
                p: 1.5,
                border: 1,
                borderColor: "divider",
                borderRadius: 2.5,
                bgcolor: "action.hover",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mb: 0.35,
                  fontWeight: 800,
                  letterSpacing: 0.45,
                  textTransform: "uppercase",
                }}
              >
                {"Formation concernée"}
              </Typography>

              <Typography
                variant="body2"
                sx={{ fontWeight: 800 }}
              >
                {selectedTraining?.title ||
                  "Aucune formation sélectionnée"}
              </Typography>

            </Box>

            <TextField
              select
              fullWidth
              label={"Compte SmartTraining"}
              value={inviteLearnerId}
              onChange={(event) => {
                setInviteLearnerId(
                  Number(event.target.value),
                );
                setInviteEmail("");
              }}
            >
              <MenuItem value={0}>
                {"Choisir un apprenant"}
              </MenuItem>

              {directory.map((learner) => (
                <MenuItem
                  key={learner.id}
                  value={learner.id}
                >
                  {learnerLabel(learner)}
                </MenuItem>
              ))}
            </TextField>

            {/* TRAINER_INVITATION_SMARTTRAINING_CHANNEL_UX_V1 */}
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                alignItems: "center",
                flexWrap: "wrap",
                px: 0.25,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 800 }}
              >
                {"Canal"}
              </Typography>

              <Chip
                size="small"
                color="success"
                variant="outlined"
                label="Notification SmartTraining"
              />
            </Stack>

            <TextField
              fullWidth
              label={"Message à l’apprenant (optionnel)"}
              value={inviteMessage}
              onChange={(event) =>
                setInviteMessage(event.target.value)
              }
              placeholder={
                selectedTraining
                  ? `Ex. Bonjour, je vous invite à rejoindre « ${selectedTraining.title} ».`
                  : "Ajoutez un message personnalisé."
              }
              multiline
              minRows={3}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              startIcon={<MailPlus size={17} />}
              disabled={
                !trainingId ||
                (!inviteLearnerId && !inviteEmail.trim())
              }
              sx={{
                minHeight: 44,
                mt: 0.25,
              }}
            >
              {"Inviter à cette formation"}
            </Button>
          </Box>
        </SmartSectionCard>
      </Box>

      <SmartSectionCard
        title={`Apprenants inscrits (${enrollments.length})`}
        description={
          "Progression, score quiz et derniere activite pour la formation selectionnee."
        }
      >
        {!enrollments.length ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body1">
              {"Aucun apprenant inscrit"}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              {
                "Les apprenants affectes ou inscrits apparaitront ici."
              }
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              width: "100%",
              height: Math.min(
                780,
                Math.max(380, enrollments.length * 72 + 122),
              ),
            }}
          >
            <DataGrid<EnrollmentResponse>
              rows={enrollments}
              columns={enrollmentColumns}
              disableRowSelectionOnClick
              disableColumnMenu
              rowHeight={72}
              columnHeaderHeight={52}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: {
                    page: 0,
                    pageSize: 10,
                  },
                },
              }}
              sx={{
                borderColor: "divider",
                "& .MuiDataGrid-cell": {
                  alignItems: "center",
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 800,
                },
                "& .MuiDataGrid-columnHeader--alignCenter .MuiDataGrid-columnHeaderTitleContainer": {
                  justifyContent: "center",
                  width: "100%",
                },
                "& .MuiDataGrid-columnHeader--alignCenter .MuiDataGrid-columnHeaderTitle": {
                  width: "100%",
                  textAlign: "center",
                },
              }}
            />
          </Box>
        )}
      </SmartSectionCard>

      <SmartSectionCard
        title={`Demandes reçues des apprenants (${requests.length})`}
        description={
          "Ces apprenants ont demandé à rejoindre cette formation. Approuver les inscrit automatiquement."
        }
      >
        {!requests.length ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body1">
              {"Aucune demande d'acces"}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              {
                "Les nouvelles demandes apparaitront ici."
              }
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table
              size="small"
              aria-label={"Demandes d'acces"}
              sx={{ minWidth: 820 }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>{"Apprenant"}</TableCell>
                  <TableCell>{"Message"}</TableCell>
                  <TableCell>{"Date"}</TableCell>
                  <TableCell>{"Statut"}</TableCell>
                  <TableCell align="right">
                    {"Actions"}
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {requests.map((request) => {
                  const learner = directoryById.get(
                    request.learnerId,
                  );

                  return (
                    <TableRow key={request.id} hover>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700 }}
                          >
                            {learnerName(learner)}
                          </Typography>
                          {learner?.email ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {learner.email}
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ maxWidth: 360 }}>
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: "pre-wrap" }}
                        >
                          {request.learnerMessage ||
                            "Aucun message"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {formatDate(request.requestedAt)}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={requestStatusLabel(
                            request.status,
                          )}
                          color={requestStatusColor(
                            request.status,
                          )}
                        />
                      </TableCell>

                      <TableCell align="right">
                        {request.status === "PENDING" ? (
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{
                              justifyContent: "flex-end",
                            }}
                          >
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<Check size={16} />}
                              onClick={() =>
                                void handleRequestDecision(
                                  request.id,
                                  "APPROVE",
                                )
                              }
                            >
                              {"Approuver"}
                            </Button>

                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<X size={16} />}
                              onClick={() =>
                                void handleRequestDecision(
                                  request.id,
                                  "REJECT",
                                )
                              }
                            >
                              {"Refuser"}
                            </Button>
                          </Stack>
                        ) : (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            {"Decision enregistree"}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SmartSectionCard>

      <SmartSectionCard
        title={`Invitations envoyées (${invitations.length})`}
        description={
          selectedTraining
            ? `Historique des invitations envoyées pour « ${selectedTraining.title} ».`
            : "Historique des invitations envoyées."
        }
      >
        {!invitations.length ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body1">
              {"Aucune invitation envoyee"}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5 }}
            >
              {
                "Les invitations creees apparaitront ici sans exposer leur jeton technique."
              }
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table
              size="small"
              aria-label={"Invitations de formation"}
              sx={{ minWidth: 820 }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>{"Destinataire"}</TableCell>
                  <TableCell>{"Message"}</TableCell>
                  <TableCell>{"Envoyee le"}</TableCell>
                  <TableCell>{"Expiration"}</TableCell>
                  <TableCell>{"Statut"}</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {invitations.map((invitation) => {
                  const learner = invitation.learnerId
                    ? directoryById.get(
                        invitation.learnerId,
                      )
                    : undefined;

                  const recipientName = learner
                    ? learnerName(learner)
                    : invitation.learnerEmail ||
                      "Destinataire";

                  const recipientEmail =
                    learner?.email ||
                    invitation.learnerEmail;

                  return (
                    <TableRow key={invitation.id} hover>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700 }}
                          >
                            {recipientName}
                          </Typography>

                          {recipientEmail &&
                          recipientEmail !== recipientName ? (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                overflowWrap: "anywhere",
                              }}
                            >
                              {recipientEmail}
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ maxWidth: 340 }}>
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: "pre-wrap" }}
                        >
                          {invitation.message ||
                            "Invitation a rejoindre la formation"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {formatDate(invitation.createdAt)}
                      </TableCell>

                      <TableCell>
                        {formatDate(invitation.expiresAt)}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={invitationStatusLabel(
                            invitation.status,
                          )}
                          color={invitationStatusColor(
                            invitation.status,
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SmartSectionCard>
    </Stack>
  );
}