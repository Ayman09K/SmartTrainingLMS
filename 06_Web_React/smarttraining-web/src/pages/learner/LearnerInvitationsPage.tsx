import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  MailCheck,
  XCircle,
} from "lucide-react";
import {
  acceptTrainingInvitation,
  declineTrainingInvitation,
  getTrainingInvitationsByLearner,
} from "../../api/trainingApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { SmartPageHeader } from "../../components/ui";
import { useAuth } from "../../features/auth/AuthContext";
import type {
  TrainingInvitationResponse,
  TrainingInvitationStatus,
} from "../../types/training";
function statusLabel(status: TrainingInvitationStatus): string {
  if (status === "PENDING") return "En attente";
  if (status === "ACCEPTED") return "Acceptée";
  if (status === "DECLINED") return "Refusée";
  if (status === "CANCELLED") return "Annulée";
  if (status === "EXPIRED") return "Expirée";
  return status;
}

function formatDate(value?: string): string {
  if (!value) return "Non précisée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function LearnerInvitationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<TrainingInvitationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const items = await getTrainingInvitationsByLearner(user.id);
      setInvitations(items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user?.id]);

  const sortedInvitations = useMemo(
    () =>
      [...invitations].sort((a, b) => {
        const aPending = a.status === "PENDING" ? 1 : 0;
        const bPending = b.status === "PENDING" ? 1 : 0;

        if (aPending !== bPending) {
          return bPending - aPending;
        }

        const aTime = new Date(a.createdAt ?? 0).getTime();
        const bTime = new Date(b.createdAt ?? 0).getTime();
        return bTime - aTime;
      }),
    [invitations],
  );

  const pendingCount = invitations.filter((item) => item.status === "PENDING").length;

  async function handleAccept(invitation: TrainingInvitationResponse) {
    if (!user || !invitation.token) {
      setError("Cette invitation ne peut pas être acceptée actuellement.");
      return;
    }

    setBusyId(invitation.id);
    setError("");
    setSuccess("");

    try {
      await acceptTrainingInvitation({
        token: invitation.token,
        learnerId: user.id,
      });

      navigate(`/learner/trainings/${invitation.trainingId}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDecline(invitation: TrainingInvitationResponse) {
    setBusyId(invitation.id);
    setError("");
    setSuccess("");

    try {
      await declineTrainingInvitation(invitation.id);
      setSuccess(`Invitation à « ${invitation.trainingTitle || "la formation"} » refusée.`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 320,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={30} />
          <Typography color="text.secondary">
            {"Chargement de vos invitations..."}
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow={"Acc\u00e8s aux formations"}
        title={"Mes invitations"}
        description={
          "Consultez les invitations envoy\u00e9es par vos formateurs et choisissez celles que vous souhaitez rejoindre."
        }
        actions={
          <Chip
            icon={<MailCheck size={16} />}
            label={`${pendingCount} en attente`}
            color={pendingCount ? "warning" : "default"}
            variant={pendingCount ? "filled" : "outlined"}
          />
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? (
        <Alert severity="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      ) : null}

      {!sortedInvitations.length ? (
        <Card variant="outlined">
          <CardContent>
            <Stack
              spacing={2}
              sx={{
                minHeight: 220,
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  bgcolor: "action.hover",
                  color: "primary.main",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <MailCheck size={28} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 850 }}>
                  {"Aucune invitation"}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.75 }}
                >
                  {
                    "Lorsqu'un formateur vous invitera \u00e0 une formation, elle appara\u00eetra ici."
                  }
                </Typography>
              </Box>
              <Button
                component={Link}
                to="/learner/catalog"
                variant="outlined"
              >
                {"Parcourir le catalogue"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={1.5}>
          {sortedInvitations.map((invitation) => {
            const pending = invitation.status === "PENDING";
            const busy = busyId === invitation.id;

            const chipColor =
              invitation.status === "ACCEPTED"
                ? "success"
                : invitation.status === "PENDING"
                  ? "warning"
                  : "default";

            return (
              <Card key={invitation.id} variant="outlined">
                <CardContent>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    sx={{
                      justifyContent: "space-between",
                      alignItems: { md: "center" },
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{ minWidth: 0, alignItems: "flex-start" }}
                    >
                      <Box
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: 2.5,
                          bgcolor: "action.hover",
                          color: pending ? "warning.main" : "primary.main",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {pending ? (
                          <MailCheck size={23} />
                        ) : (
                          <CheckCircle2 size={23} />
                        )}
                      </Box>

                      <Box sx={{ minWidth: 0 }}>
                        <Stack
                          direction="row"
                          spacing={1}
                          useFlexGap
                          sx={{
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <Typography variant="h6" sx={{ fontWeight: 850 }}>
                            {invitation.trainingTitle || "Formation"}
                          </Typography>
                          <Chip
                            size="small"
                            color={chipColor}
                            label={statusLabel(invitation.status)}
                          />
                        </Stack>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.75 }}
                        >
                          {invitation.message ||
                            "Vous avez \u00e9t\u00e9 invit\u00e9(e) \u00e0 rejoindre cette formation."}
                        </Typography>

                        <Stack
                          direction="row"
                          spacing={2}
                          useFlexGap
                          sx={{
                            mt: 1.25,
                            flexWrap: "wrap",
                            color: "text.secondary",
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ alignItems: "center" }}
                          >
                            <CalendarClock size={15} />
                            <Typography variant="caption">
                              {`Re\u00e7ue : ${formatDate(invitation.createdAt)}`}
                            </Typography>
                          </Stack>

                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ alignItems: "center" }}
                          >
                            <Clock3 size={15} />
                            <Typography variant="caption">
                              {`Expiration : ${formatDate(invitation.expiresAt)}`}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>
                    </Stack>

                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      sx={{ flexShrink: 0 }}
                    >
                      {invitation.status === "ACCEPTED" &&
                      invitation.trainingId ? (
                        <Button
                          component={Link}
                          to={`/learner/trainings/${invitation.trainingId}`}
                          variant="contained"
                        >
                          {"Ouvrir la formation"}
                        </Button>
                      ) : null}

                      {pending ? (
                        <>
                          <Button
                            type="button"
                            variant="contained"
                            disabled={busy || !invitation.token}
                            startIcon={
                              busy ? (
                                <CircularProgress size={16} color="inherit" />
                              ) : (
                                <CheckCircle2 size={17} />
                              )
                            }
                            onClick={() => void handleAccept(invitation)}
                          >
                            {busy ? "Traitement..." : "Accepter"}
                          </Button>

                          <Button
                            type="button"
                            variant="outlined"
                            color="inherit"
                            disabled={busy}
                            startIcon={<XCircle size={17} />}
                            onClick={() => void handleDecline(invitation)}
                          >
                            {"Refuser"}
                          </Button>
                        </>
                      ) : null}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}