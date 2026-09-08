import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
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
import {
  CheckCircle2,
  Download,
  MailPlus,
  Search,
  UserPlus,
  XCircle,
} from "lucide-react";
import {
  approveAccessRequestAsAdmin,
  assignLearnersAsAdmin,
  createInvitationAsAdmin,
  getAdminTrainingsSafe,
  getAdminUsers,
  getEnrollmentsByTrainingSafe,
  getPendingAccessRequestsSafe,
  getTrainingInvitationsSafe,
  rejectAccessRequestAsAdmin,
} from "../../api/adminApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { downloadTrainingLearnersCsv } from "../../api/reportingApi";
import { SmartPageHeader, SmartSectionCard } from "../../components/ui";
import { smartConfirm } from "../../components/ux/smartConfirmService";
import { useAuth } from "../../features/auth/AuthContext";
import type {
  AuthUser,
  EnrollmentResponse,
  TrainingAccessRequestResponse,
  TrainingInvitationResponse,
  TrainingResponse,
} from "../../types/admin";

// WEB_VISUAL_5_ADMIN_ASSIGNMENTS_SAFE_V1 - visual-only hierarchy and density refinement

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  COMPLETED: "Termin\u00e9e",
  CANCELLED: "Annul\u00e9e",
  PENDING: "En attente",
  APPROVED: "Approuv\u00e9e",
  REJECTED: "Refus\u00e9e",
  ACCEPTED: "Accept\u00e9e",
  DECLINED: "Refus\u00e9e",
  EXPIRED: "Expir\u00e9e",
};

const sourceLabels: Record<string, string> = {
  ADMIN_ASSIGNMENT: "Affectation administrateur",
  TRAINER_ASSIGNMENT: "Affectation formateur",
  SELF_ENROLLMENT: "Auto-inscription",
  ACCESS_CODE: "Code d'acc\u00e8s",
  INVITATION: "Invitation",
  APPROVED_REQUEST: "Demande approuv\u00e9e",
};

function userName(user?: AuthUser): string {
  if (!user) return "Apprenant non r\u00e9solu";

  return (
    user.fullName ||
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
    user.email ||
    "Nom non renseign\u00e9"
  );
}

function userLabel(user: AuthUser): string {
  const name = userName(user);
  return `${name} \u2014 ${user.email}`;
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}


function formatDateTime(value?: string | null): string {
  if (!value) return "Aucune echeance";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
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

function chipColor(
  value?: string,
): "default" | "success" | "warning" | "error" | "info" {
  if (value === "ACTIVE" || value === "APPROVED" || value === "ACCEPTED") {
    return "success";
  }
  if (value === "PENDING") return "warning";
  if (value === "REJECTED" || value === "DECLINED") return "error";
  if (value === "COMPLETED") return "info";
  return "default";
}

export function AdminAssignmentsPage() {
  const { user } = useAuth();

  const [trainings, setTrainings] = useState<TrainingResponse[]>([]);
  const [learners, setLearners] = useState<AuthUser[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState<number>(0);
  const [selectedLearnerIds, setSelectedLearnerIds] = useState<number[]>([]);
  const [learnerSearch, setLearnerSearch] = useState("");
  const [assignmentDueAt, setAssignmentDueAt] = useState("");
  const [inviteLearnerId, setInviteLearnerId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  const [enrollments, setEnrollments] = useState<EnrollmentResponse[]>([]);
  const [accessRequests, setAccessRequests] = useState<
    TrainingAccessRequestResponse[]
  >([]);
  const [invitations, setInvitations] = useState<TrainingInvitationResponse[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const learnerById = useMemo(
    () => new Map(learners.map((learner) => [learner.id, learner])),
    [learners],
  );

  const selectedTraining = useMemo(
    () => trainings.find((training) => training.id === selectedTrainingId),
    [trainings, selectedTrainingId],
  );

  const enrolledLearnerIds = useMemo(
    () => new Set(enrollments.map((enrollment) => enrollment.learnerId)),
    [enrollments],
  );

  const filteredLearners = useMemo(() => {
    const query = learnerSearch.trim().toLowerCase();
    if (!query) return learners;

    return learners.filter((learner) =>
      userLabel(learner).toLowerCase().includes(query),
    );
  }, [learners, learnerSearch]);

  const selectedTrainingRequests = useMemo(
    () =>
      accessRequests.filter(
        (request) =>
          !selectedTrainingId || request.trainingId === selectedTrainingId,
      ),
    [accessRequests, selectedTrainingId],
  );

  async function loadAll(trainingId?: number) {
    setLoading(true);
    setError("");

    try {
      const [loadedTrainings, loadedUsers] = await Promise.all([
        getAdminTrainingsSafe(),
        getAdminUsers(),
      ]);

      const loadedLearners = loadedUsers.filter(
        (candidate) =>
          candidate.accountStatus === "ACTIVE" && candidate.enabled !== false,
      );

      setTrainings(loadedTrainings);
      setLearners(loadedLearners);

      const currentTrainingId =
        trainingId || selectedTrainingId || loadedTrainings[0]?.id || 0;

      setSelectedTrainingId(currentTrainingId);

      if (currentTrainingId) {
        const [loadedEnrollments, loadedRequests, loadedInvitations] =
          await Promise.all([
            getEnrollmentsByTrainingSafe(currentTrainingId),
            getPendingAccessRequestsSafe(),
            getTrainingInvitationsSafe(currentTrainingId),
          ]);

        setEnrollments(loadedEnrollments);
        setAccessRequests(loadedRequests);
        setInvitations(loadedInvitations);
      } else {
        setEnrollments([]);
        setAccessRequests([]);
        setInvitations([]);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function toggleLearner(learnerId: number) {
    setSelectedLearnerIds((current) =>
      current.includes(learnerId)
        ? current.filter((id) => id !== learnerId)
        : [...current, learnerId],
    );
  }

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!user?.id) {
      setError("Administrateur connect\u00e9 introuvable.");
      return;
    }

    if (!selectedTrainingId) {
      setError("S\u00e9lectionnez une formation.");
      return;
    }

    if (!selectedLearnerIds.length) {
      setError("S\u00e9lectionnez au moins un apprenant.");
      return;
    }

    const dueAt = toApiDueAt(assignmentDueAt);

    if (dueAt && new Date(dueAt).getTime() <= Date.now()) {
      setError("L'echeance doit etre dans le futur.");
      return;
    }

    try {
      await assignLearnersAsAdmin({
        trainingId: selectedTrainingId,
        learnerIds: selectedLearnerIds,
        assignedBy: user.id,
        source: "ADMIN_ASSIGNMENT",
        dueAt,
      });

      setSelectedLearnerIds([]);
      setAssignmentDueAt("");
      setSuccess("Affectation cr\u00e9\u00e9e.");
      await loadAll(selectedTrainingId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleAccessDecision(
    requestId: number,
    decision: "APPROVE" | "REJECT",
  ) {
    setError("");
    setSuccess("");

    if (!user?.id) {
      setError("Administrateur connect\u00e9 introuvable.");
      return;
    }

    try {
      if (decision === "APPROVE") {
        // UXD14_B1_ACCESS_APPROVE_DIALOG
        if (
          !(await smartConfirm({
            title: "Approuver la demande d’accès",
            description:
              "Confirmer l’approbation de cette demande d’accès à la formation ?",
            confirmLabel: "Approuver",
          }))
        ) {
          return;
        }

        await approveAccessRequestAsAdmin(requestId, {
          decidedBy: user.id,
          decisionComment: "Acc\u00e8s approuv\u00e9 depuis la console admin.",
        });
        setSuccess("Demande d'acc\u00e8s approuv\u00e9e.");
      } else {
        // UXD14_B1_ACCESS_REJECT_DIALOG
        if (
          !(await smartConfirm({
            title: "Refuser la demande d’accès",
            description:
              "Confirmer le refus de cette demande d’accès à la formation ?",
            confirmLabel: "Refuser",
            destructive: true,
          }))
        ) {
          return;
        }

        await rejectAccessRequestAsAdmin(requestId, {
          decidedBy: user.id,
          decisionComment: "Acc\u00e8s refus\u00e9 depuis la console admin.",
        });
        setSuccess("Demande d'acc\u00e8s refus\u00e9e.");
      }

      await loadAll(selectedTrainingId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleCreateInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!user?.id) {
      setError("Administrateur connect\u00e9 introuvable.");
      return;
    }

    if (!selectedTrainingId) {
      setError("S\u00e9lectionnez une formation.");
      return;
    }

    const selectedLearner = inviteLearnerId
      ? learnerById.get(Number(inviteLearnerId))
      : undefined;

    const learnerEmail = inviteEmail.trim() || selectedLearner?.email;

    if (!selectedLearner && !learnerEmail) {
      setError("Choisissez un apprenant ou indiquez une adresse e-mail.");
      return;
    }

    try {
      await createInvitationAsAdmin({
        trainingId: selectedTrainingId,
        learnerId: selectedLearner?.id,
        learnerEmail,
        invitedBy: user.id,
        message:
          inviteMessage.trim() ||
          `Bonjour, je vous invite à rejoindre la formation « ${
            selectedTraining?.title || "Formation"
          } ».`,
        validityDays: 7,
      });

      setInviteLearnerId("");
      setInviteEmail("");
      setInviteMessage("");
      setSuccess(
        `Invitation envoyée pour « ${
          selectedTraining?.title || "la formation sélectionnée"
        } ».`,
      );
      await loadAll(selectedTrainingId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleExportCsv() {
    if (!selectedTrainingId) {
      setError("Selectionnez une formation a exporter.");
      return;
    }

    setError("");
    setExportingCsv(true);

    try {
      await downloadTrainingLearnersCsv(
        selectedTrainingId,
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setExportingCsv(false);
    }
  }
  if (loading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} sx={{ alignItems: "center", color: "text.secondary" }}>
          <CircularProgress size={32} />
          <Typography variant="body2">
            Chargement des affectations...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow="Accès aux formations"
        title="Affectations et accès"
        description="Affectez les apprenants, traitez les demandes d'accès et gérez les invitations depuis un espace centralisé."
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
            disabled={!selectedTrainingId || exportingCsv}
            onClick={() => void handleExportCsv()}
          >
            {exportingCsv ? "Export..." : "Exporter CSV"}
          </Button>
        }
/>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <SmartSectionCard
        title="Formation pilotée"
        description="Choisissez une formation : les affectations, demandes et invitations ci-dessous se mettent à jour ensemble."
      >
        {!trainings.length ? (
          <Alert severity="info">
            Aucune formation n'est disponible pour les affectations.
          </Alert>
        ) : (
          <Stack spacing={2.25}>
            <FormControl fullWidth>
              <InputLabel id="assignment-training-label">Formation</InputLabel>
              <Select
                labelId="assignment-training-label"
                label="Formation"
                value={selectedTrainingId}
                onChange={(event) => void loadAll(Number(event.target.value))}
              >
                {trainings.map((training) => (
                  <MenuItem key={training.id} value={training.id}>
                    {training.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(4, minmax(0, 1fr))",
                },
                gap: 1.5,
              }}
            >
              {[
                { label: "Inscriptions", value: enrollments.length },
                { label: "Demandes", value: selectedTrainingRequests.length },
                { label: "Invitations", value: invitations.length },
                { label: "Sélection", value: selectedLearnerIds.length },
              ].map((metric) => (
                <Paper
                  key={metric.label}
                  variant="outlined"
                  sx={{
                    px: 2,
                    py: 1.6,
                    borderRadius: 2.5,
                    bgcolor: "background.default",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1 }}>
                    {metric.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {metric.label}
                  </Typography>
                </Paper>
              ))}
            </Box>

            {selectedTraining ? (
              <Typography variant="body2" color="text.secondary">
                Pilotage actif : <strong>{selectedTraining.title}</strong>
              </Typography>
            ) : null}
          </Stack>
        )}
      </SmartSectionCard>

      <SmartSectionCard
        title="Affecter des apprenants"
        description="Recherchez les comptes disponibles puis sélectionnez ceux à inscrire à la formation."
      >
        <Box component="form" onSubmit={handleAssign}>
          <Stack spacing={2}>
            <TextField
              type="search"
              label="Rechercher un apprenant"
              value={learnerSearch}
              onChange={(event) => setLearnerSearch(event.target.value)}
              placeholder="Nom ou adresse e-mail"
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <Box sx={{ display: "flex", mr: 1, color: "text.secondary" }}>
                      <Search size={18} />
                    </Box>
                  ),
                },
              }}
            />

            {!filteredLearners.length ? (
              <Alert severity="info">
                Aucun utilisateur ne correspond à la recherche.
              </Alert>
            ) : (
              <Paper variant="outlined" sx={{ overflow: "hidden" }}>
                <TableContainer sx={{ maxHeight: 360 }}>
                  <Table stickyHeader size="small" aria-label="Apprenants disponibles">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          Sélection
                        </TableCell>
                        <TableCell>Apprenant</TableCell>
                        <TableCell>Adresse e-mail</TableCell>
                        <TableCell>Disponibilité</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredLearners.map((learner) => {
                        const enrolled = enrolledLearnerIds.has(learner.id);
                        return (
                          <TableRow key={learner.id} hover selected={selectedLearnerIds.includes(learner.id)}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedLearnerIds.includes(learner.id)}
                                disabled={enrolled}
                                onChange={() => toggleLearner(learner.id)}
                                slotProps={{
                                  input: {
                                    "aria-label": `S\u00e9lectionner ${userLabel(learner)}`,
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>
                              {userName(learner)}
                            </TableCell>
                            <TableCell>{learner.email}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={enrolled ? "D\u00e9j\u00e0 inscrit" : "Disponible"}
                                color={enrolled ? "default" : "success"}
                                variant={enrolled ? "outlined" : "filled"}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}


            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto" },
                gap: 2,
                alignItems: "end",
              }}
            >
              <TextField
                type="datetime-local"
                label="Echéance facultative"
                value={assignmentDueAt}
                onChange={(event) => setAssignmentDueAt(event.target.value)}
                helperText="Laissez vide pour une affectation sans échéance."
                fullWidth
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: localDateTimeInputMin() },
                }}
              />

              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", pb: { md: 3 } }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${selectedLearnerIds.length} sélectionné(s)`}
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<UserPlus size={18} />}
                  disabled={!selectedLearnerIds.length || !selectedTrainingId}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  Affecter
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </SmartSectionCard>

      <SmartSectionCard
        title="Inscriptions actuelles"
        description={`${enrollments.length} inscription(s) pour la formation s\u00e9lectionn\u00e9e.`}
      >
        {!enrollments.length ? (
          <Alert severity="info">Aucune inscription pour cette formation.</Alert>
        ) : (
          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <TableContainer sx={{ maxHeight: 420 }}>
              <Table stickyHeader size="small" aria-label="Inscriptions actuelles">
                <TableHead>
                  <TableRow>
                    <TableCell>Apprenant</TableCell>
                    <TableCell>Adresse e-mail</TableCell>
                    <TableCell>Origine</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Echeance</TableCell>
                    <TableCell sx={{ minWidth: 160 }}>Progression</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {enrollments.map((enrollment) => {
                    const learner = learnerById.get(enrollment.learnerId);
                    const progress = Math.max(
                      0,
                      Math.min(100, enrollment.progressPercentage ?? 0),
                    );

                    return (
                      <TableRow key={enrollment.id} hover>
                        <TableCell sx={{ fontWeight: 800 }}>
                          {userName(learner)}
                        </TableCell>
                        <TableCell>{learner?.email || "-"}</TableCell>
                        <TableCell>
                          {sourceLabels[enrollment.source || ""] ||
                            enrollment.source ||
                            "-"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={
                              statusLabels[enrollment.status || ""] ||
                              enrollment.status ||
                              "-"
                            }
                            color={chipColor(enrollment.status)}
                          />
                        </TableCell>
                        <TableCell>
                          {formatDateTime(enrollment.dueAt)}
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant="caption">
                              {progress} %
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              aria-label={`Progression ${progress} pour cent`}
                            />
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </SmartSectionCard>

      <SmartSectionCard
        title="Demandes reçues des apprenants"
        description="Ces apprenants ont demandé à rejoindre cette formation. Approuver les inscrit automatiquement."
      >
        {!selectedTrainingRequests.length ? (
          <Alert severity="info">
            Aucune demande d'accès en attente pour cette formation.
          </Alert>
        ) : (
          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <TableContainer sx={{ maxHeight: 360 }}>
              <Table stickyHeader size="small" aria-label="Demandes d'accès en attente">
                <TableHead>
                  <TableRow>
                    <TableCell>Apprenant</TableCell>
                    <TableCell>Adresse e-mail</TableCell>
                    <TableCell sx={{ minWidth: 240 }}>Message</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell sx={{ minWidth: 210 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedTrainingRequests.map((request) => {
                    const learner = learnerById.get(request.learnerId);

                    return (
                      <TableRow key={request.id} hover>
                        <TableCell sx={{ fontWeight: 800 }}>
                          {userName(learner)}
                        </TableCell>
                        <TableCell>{learner?.email || "-"}</TableCell>
                        <TableCell>{request.learnerMessage || "-"}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={
                              statusLabels[request.status] || request.status
                            }
                            color={chipColor(request.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckCircle2 size={16} />}
                              onClick={() =>
                                void handleAccessDecision(request.id, "APPROVE")
                              }
                            >
                              Approuver
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<XCircle size={16} />}
                              onClick={() =>
                                void handleAccessDecision(request.id, "REJECT")
                              }
                            >
                              Refuser
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </SmartSectionCard>

      <SmartSectionCard
        title="Inviter un apprenant à cette formation"
        description={
          selectedTraining
            ? `Invitation à rejoindre « ${selectedTraining.title} ». L’apprenant devra accepter avant d’être inscrit.`
            : "Sélectionnez une formation avant d’envoyer une invitation."
        }
      >
        <Box component="form" onSubmit={handleCreateInvitation}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            <FormControl fullWidth>
              <InputLabel id="invite-learner-label">
                Utilisateur enregistré
              </InputLabel>
              <Select
                labelId="invite-learner-label"
                label="Utilisateur enregistré"
                value={inviteLearnerId}
                onChange={(event) => setInviteLearnerId(event.target.value)}
              >
                <MenuItem value="">Aucun compte sélectionné</MenuItem>
                {learners.map((learner) => (
                  <MenuItem key={learner.id} value={learner.id}>
                    {userLabel(learner)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              type="email"
              label="Adresse e-mail externe"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="nom@exemple.com"
              fullWidth
            />

            <TextField
              label="Message à l’apprenant (optionnel)"
              value={inviteMessage}
              onChange={(event) => setInviteMessage(event.target.value)}
              placeholder={
                selectedTraining
                  ? `Ex. Bonjour, je vous invite à rejoindre « ${selectedTraining.title} ».`
                  : "Ajoutez un message personnalisé."
              }
              multiline
              minRows={2}
              helperText="Ce message sera visible avec le nom de la formation dans Mes invitations."
              fullWidth
              sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
            />

            <Box
              sx={{
                gridColumn: { xs: "auto", md: "1 / -1" },
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Button
                type="submit"
                variant="contained"
                startIcon={<MailPlus size={18} />}
                disabled={!selectedTrainingId}
              >
                Inviter à cette formation
              </Button>
            </Box>
          </Box>
        </Box>
      </SmartSectionCard>

      <SmartSectionCard
        title="Invitations envoyées"
        description={
          selectedTraining
            ? `${invitations.length} invitation(s) envoyée(s) pour « ${selectedTraining.title} ».`
            : `${invitations.length} invitation(s) envoyée(s).`
        }
      >
        {!invitations.length ? (
          <Alert severity="info">Aucune invitation pour cette formation.</Alert>
        ) : (
          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <TableContainer sx={{ maxHeight: 320 }}>
              <Table stickyHeader size="small" aria-label="Invitations envoyées">
                <TableHead>
                  <TableRow>
                    <TableCell>Apprenant</TableCell>
                    <TableCell>Adresse e-mail</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Expiration</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invitations.map((invitation) => {
                    const learner = invitation.learnerId
                      ? learnerById.get(invitation.learnerId)
                      : undefined;

                    return (
                      <TableRow key={invitation.id} hover>
                        <TableCell sx={{ fontWeight: 800 }}>
                          {learner ? userName(learner) : "Invitation externe"}
                        </TableCell>
                        <TableCell>
                          {invitation.learnerEmail || learner?.email || "-"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={
                              statusLabels[invitation.status] ||
                              invitation.status
                            }
                            color={chipColor(invitation.status)}
                          />
                        </TableCell>
                        <TableCell>{formatDate(invitation.expiresAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </SmartSectionCard>
    </Stack>
  );
}