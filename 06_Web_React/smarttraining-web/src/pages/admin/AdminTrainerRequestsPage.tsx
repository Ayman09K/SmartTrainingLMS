/* WEB_VISUAL_FINAL_ADMIN_TRAINER_REQUESTS_SAFE_V1 */
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
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
import { CheckCircle2, UserCheck, XCircle } from "lucide-react";
import {
  approveTrainerRequest,
  getAdminTrainerRequests,
  rejectTrainerRequest,
} from "../../api/adminApi";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  SmartEmptyState,
  SmartMetricCard,
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import { smartConfirm } from "../../components/ux/smartConfirmService";
import { AdminUserManagementNav } from "../../components/admin/AdminUserManagementNav";
import type {
  TrainerAccessRequestResponse,
  TrainerRequestStatus,
} from "../../types/admin";

type RequestFilter = TrainerRequestStatus | "ALL";

const statusLabels: Record<RequestFilter, string> = {
  ALL: "Toutes",
  PENDING: "En attente",
  APPROVED: "Approuv\u00e9es",
  REJECTED: "Refus\u00e9es",
  CANCELLED: "Annul\u00e9es",
};

function statusColor(
  status: TrainerRequestStatus,
): "default" | "success" | "warning" | "error" | "info" {
  if (status === "PENDING") return "warning";
  if (status === "APPROVED") return "success";
  if (status === "REJECTED") return "error";
  if (status === "CANCELLED") return "default";
  return "info";
}

function formatDate(value?: string): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminTrainerRequestsPage() {
  const [requests, setRequests] = useState<TrainerAccessRequestResponse[]>([]);
  const [status, setStatus] = useState<RequestFilter>("PENDING");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadRequests(nextStatus: RequestFilter = status) {
    setLoading(true);
    setError("");

    try {
      setRequests(
        await getAdminTrainerRequests(
          nextStatus === "ALL" ? undefined : nextStatus,
        ),
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);


  const visibleRequests = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");

    if (!normalized) {
      return requests;
    }

    return requests.filter((request) =>
      [
        request.requesterFullName,
        request.requesterEmail,
        request.expertiseDomain,
        request.motivation,
        request.adminComment,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalized),
    );
  }, [query, requests]);

  const pendingVisible = useMemo(
    () => visibleRequests.filter((request) => request.status === "PENDING").length,
    [visibleRequests],
  );
  const handledVisible = visibleRequests.length - pendingVisible;

  async function handleDecision(
    id: number,
    decision: "APPROVE" | "REJECT",
  ) {
    // PATCH15BIS_H_CONFIRM_TRAINER_REQUEST_DECISION
    const targetRequest = requests.find((item) => item.id === id);
    const requesterLabel =
      targetRequest?.requesterFullName?.trim() ||
      targetRequest?.requesterEmail?.trim() ||
      "ce demandeur";
    const confirmed = await smartConfirm({
      title:
        decision === "APPROVE"
          ? "Attribuer le rôle Formateur"
          : "Refuser la demande Formateur",
      description:
        decision === "APPROVE"
          ? `Confirmer l’attribution du rôle Formateur à ${requesterLabel} ?`
          : `Confirmer le refus de la demande Formateur de ${requesterLabel} ?`,
      confirmLabel: decision === "APPROVE" ? "Attribuer" : "Refuser",
      destructive: decision === "REJECT",
    });

    if (!confirmed) {
      return;
    }

    const adminComment =
      decision === "APPROVE"
        ? "Demande valid\u00e9e depuis la console admin."
        : "Demande refus\u00e9e depuis la console admin.";

    setError("");
    setSuccess("");

    try {
      if (decision === "APPROVE") {
        await approveTrainerRequest(id, adminComment);
        setSuccess("Demande formateur approuv\u00e9e.");
      } else {
        await rejectTrainerRequest(id, adminComment);
        setSuccess("Demande formateur refus\u00e9e.");
      }

      await loadRequests();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} sx={{ alignItems: "center", color: "text.secondary" }}>
          <CircularProgress size={32} />
          <Typography variant="body2">
            Chargement des demandes formateur...
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow="Gestion des utilisateurs"
        title="Demandes formateur"
        description="Examinez les demandes des apprenants souhaitant obtenir le rôle formateur et enregistrez votre décision."
      />

      <AdminUserManagementNav active="trainer-requests" />

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
        <SmartMetricCard
          label="Demandes affichées"
          value={visibleRequests.length}
          helper="Dans la vue actuelle"
          icon={<UserCheck />}
        />
        <SmartMetricCard
          label="En attente"
          value={pendingVisible}
          helper="Décision administrateur requise"
          icon={<CheckCircle2 />}
        />
        <SmartMetricCard
          label="Déjà traitées"
          value={handledVisible}
          helper="Approuvées, refusées ou annulées"
          icon={<XCircle />}
        />
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <SmartSectionCard
        title="Demandes reçues"
        description={`${visibleRequests.length} demande(s) affichée(s) dans le filtre s\u00e9lectionn\u00e9.`}
      >
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ alignItems: { md: "center" } }}
          >
            <TextField
              type="search"
              size="small"
              label="Rechercher"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nom, e-mail, domaine ou motivation"
              fullWidth
            />

            <Box sx={{ width: { xs: "100%", md: 260 }, flexShrink: 0 }}>
              <FormControl fullWidth size="small">
              <InputLabel id="trainer-request-status-label">
                Statut
              </InputLabel>
              <Select
                labelId="trainer-request-status-label"
                label="Statut"
                value={status}
                onChange={(event) => {
                  const nextStatus = event.target.value as RequestFilter;
                  setStatus(nextStatus);
                  void loadRequests(nextStatus);
                }}
              >
                {(
                  [
                    "ALL",
                    "PENDING",
                    "APPROVED",
                    "REJECTED",
                    "CANCELLED",
                  ] as RequestFilter[]
                ).map((value) => (
                  <MenuItem key={value} value={value}>
                    {statusLabels[value]}
                  </MenuItem>
                ))}
              </Select>
              </FormControl>
            </Box>
          </Stack>

          {!visibleRequests.length ? (
            <SmartEmptyState
              icon={<UserCheck />}
              title="Aucune demande à afficher"
              description="Aucune demande formateur ne correspond à la recherche et au statut sélectionnés."
            />
          ) : (
            <Paper
              variant="outlined"
              sx={{ overflow: "hidden", borderRadius: 3 }}
            >
              <TableContainer sx={{ maxWidth: "100%", maxHeight: 520 }}>
                <Table
                  stickyHeader
                  size="small"
                  aria-label="Demandes de rôle formateur"
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Demandeur</TableCell>
                      <TableCell>Domaine</TableCell>
                      <TableCell sx={{ minWidth: 260 }}>Motivation</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell sx={{ minWidth: 170 }}>
                        Demandée le
                      </TableCell>
                      <TableCell sx={{ minWidth: 220 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {visibleRequests.map((request) => (
                      <TableRow key={request.id} hover>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {request.requesterFullName ||
                                request.requesterEmail ||
                                "Utilisateur non indiqu\u00e9"}
                            </Typography>
                            {request.requesterFullName &&
                            request.requesterEmail ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {request.requesterEmail}
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>

                        <TableCell>{request.expertiseDomain || "-"}</TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {request.motivation || "-"}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={statusLabels[request.status]}
                            color={statusColor(request.status)}
                            variant={
                              request.status === "CANCELLED"
                                ? "outlined"
                                : "filled"
                            }
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>

                        <TableCell>{formatDate(request.requestedAt)}</TableCell>

                        <TableCell>
                          {request.status === "PENDING" ? (
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ flexWrap: "wrap", gap: 1 }}
                            >
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<CheckCircle2 size={16} />}
                                onClick={() =>
                                  void handleDecision(request.id, "APPROVE")
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
                                  void handleDecision(request.id, "REJECT")
                                }
                              >
                                Refuser
                              </Button>
                            </Stack>
                          ) : (
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                              <UserCheck size={16} />
                              <Typography variant="body2" color="text.secondary">
                                {request.adminComment || "Demande trait\u00e9e"}
                              </Typography>
                            </Stack>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Stack>
      </SmartSectionCard>
    </Stack>
  );
}