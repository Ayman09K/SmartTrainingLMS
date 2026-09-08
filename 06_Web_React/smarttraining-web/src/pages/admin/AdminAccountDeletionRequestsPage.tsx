/* WEB_VISUAL_FINAL_ADMIN_ACCOUNT_DELETION_SAFE_V1 */
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
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
import { CheckCircle2, Shield, UserCheck, XCircle } from "lucide-react";

import {
  type AccountDeletionAdminResponse,
  type AccountDeletionRequestStatus,
  completeAdminAccountDeletionRequest,
  getAdminAccountDeletionRequests,
  rejectAdminAccountDeletionRequest,
  startAdminAccountDeletionRequest,
} from "../../api/accountDeletionApi";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  SmartEmptyState,
  SmartMetricCard,
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import { AdminUserManagementNav } from "../../components/admin/AdminUserManagementNav";

type StatusFilter = AccountDeletionRequestStatus | "ALL";
type DecisionKind = "REJECT" | "COMPLETE";

type PendingDecision = {
  kind: DecisionKind;
  request: AccountDeletionAdminResponse;
};

const statusLabels: Record<StatusFilter, string> = {
  ALL: "Toutes",
  PENDING: "En attente",
  IN_PROGRESS: "En cours",
  COMPLETED: "Traitement terminé",
  CANCELLED: "Annulées",
  REJECTED: "Refusées",
};

function statusColor(
  status: AccountDeletionRequestStatus,
): "default" | "success" | "warning" | "error" | "info" {
  if (status === "PENDING") return "warning";
  if (status === "IN_PROGRESS") return "info";
  if (status === "COMPLETED") return "success";
  if (status === "REJECTED") return "error";
  return "default";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function requesterPrimaryLabel(
  request: AccountDeletionAdminResponse,
): string {
  const name = request.requesterName?.trim();
  const email = request.email?.trim() || "";

  if (name && name.toLocaleLowerCase("fr") !== email.toLocaleLowerCase("fr")) {
    return name;
  }

  return email || "Utilisateur";
}

function shouldShowRequesterEmail(
  request: AccountDeletionAdminResponse,
): boolean {
  const name = request.requesterName?.trim();
  const email = request.email?.trim();

  return Boolean(
    name &&
      email &&
      name.toLocaleLowerCase("fr") !== email.toLocaleLowerCase("fr"),
  );
}

export function AdminAccountDeletionRequestsPage() {
  const [requests, setRequests] = useState<AccountDeletionAdminResponse[]>([]);
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [processingConfirmed, setProcessingConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load(nextStatus = status) {
    setLoading(true);
    setError("");

    try {
      setRequests(
        await getAdminAccountDeletionRequests(
          nextStatus === "ALL" ? undefined : nextStatus,
        ),
      );
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visibleRequests = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return requests;

    return requests.filter((request) =>
      [
        request.requesterName,
        request.email,
        request.role,
        statusLabels[request.status],
        request.handledByEmail || "",
      ]
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalized),
    );
  }, [query, requests]);

  const pendingVisible = useMemo(
    () => visibleRequests.filter((request) => request.status === "PENDING").length,
    [visibleRequests],
  );
  const inProgressVisible = useMemo(
    () =>
      visibleRequests.filter((request) => request.status === "IN_PROGRESS").length,
    [visibleRequests],
  );
  const closedVisible =
    visibleRequests.length - pendingVisible - inProgressVisible;

  async function startProcessing(requestId: number) {
    setWorkingId(requestId);
    setError("");
    setSuccess("");

    try {
      await startAdminAccountDeletionRequest(requestId);
      setSuccess("La demande est maintenant prise en charge.");
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError));
    } finally {
      setWorkingId(null);
    }
  }

  function openDecision(
    kind: DecisionKind,
    request: AccountDeletionAdminResponse,
  ) {
    setPendingDecision({ kind, request });
    setAdminComment("");
    setProcessingConfirmed(false);
    setError("");
    setSuccess("");
  }

  async function confirmDecision() {
    if (!pendingDecision) return;

    const comment = adminComment.trim();
    if (!comment) {
      setError("Le commentaire administrateur est obligatoire.");
      return;
    }

    if (
      pendingDecision.kind === "COMPLETE" &&
      !processingConfirmed
    ) {
      setError(
        "Confirmez que le traitement réel des données a été effectué avant de clôturer.",
      );
      return;
    }

    setWorkingId(pendingDecision.request.id);
    setError("");

    try {
      if (pendingDecision.kind === "REJECT") {
        await rejectAdminAccountDeletionRequest(
          pendingDecision.request.id,
          comment,
        );
        setSuccess("La demande a été refusée avec une justification traçable.");
      } else {
        await completeAdminAccountDeletionRequest(
          pendingDecision.request.id,
          comment,
        );
        setSuccess("Le traitement administratif a été marqué comme terminé.");
      }

      setPendingDecision(null);
      setAdminComment("");
      setProcessingConfirmed(false);
      await load();
    } catch (actionError) {
      setError(getApiErrorMessage(actionError));
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow="Gestion des utilisateurs"
        title="Demandes de suppression"
        description="Prenez en charge les demandes de suppression de compte sans confondre désactivation, suppression et conservation des historiques pédagogiques."
      />

      <AdminUserManagementNav active="account-deletion" />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 1.5,
        }}
      >
        <SmartMetricCard
          label="Demandes affichées"
          value={visibleRequests.length}
          helper="Dans la vue actuelle"
          icon={<Shield />}
        />
        <SmartMetricCard
          label="En attente"
          value={pendingVisible}
          helper="À prendre en charge"
          icon={<UserCheck />}
        />
        <SmartMetricCard
          label="En cours"
          value={inProgressVisible}
          helper="Traitement engagé"
          icon={<CheckCircle2 />}
        />
        <SmartMetricCard
          label="Clôturées"
          value={closedVisible}
          helper="Terminées, refusées ou annulées"
          icon={<XCircle />}
        />
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <SmartSectionCard
        title="File de traitement"
        description="Chaque décision est liée à l’administrateur connecté et conserve un commentaire de traitement."
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ alignItems: { md: "center" } }}
          >
            <TextField
              size="small"
              label="Rechercher"
              placeholder="Nom, e-mail, rôle..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              sx={{ minWidth: { md: 320 } }}
            />

            <FormControl size="small" sx={{ minWidth: 210 }}>
              <InputLabel id="account-deletion-status-label">Statut</InputLabel>
              <Select
                labelId="account-deletion-status-label"
                label="Statut"
                value={status}
                onChange={(event) => {
                  const next = event.target.value as StatusFilter;
                  setStatus(next);
                  void load(next);
                }}
              >
                {(
                  [
                    "ALL",
                    "PENDING",
                    "IN_PROGRESS",
                    "COMPLETED",
                    "CANCELLED",
                    "REJECTED",
                  ] as StatusFilter[]
                ).map((value) => (
                  <MenuItem key={value} value={value}>
                    {statusLabels[value]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ flex: 1 }} />

            <Button
              variant="outlined"
              startIcon={
                loading ? <CircularProgress size={16} color="inherit" /> : <Shield size={17} />
              }
              disabled={loading}
              onClick={() => void load()}
            >
              Actualiser
            </Button>
          </Stack>

          {loading ? (
            <Box sx={{ py: 5, display: "grid", placeItems: "center" }}>
              <CircularProgress size={30} />
            </Box>
          ) : !visibleRequests.length ? (
            <SmartEmptyState
              icon={<Shield />}
              title="Aucune demande à traiter"
              description="Aucune demande de suppression ne correspond à la recherche et au statut sélectionnés."
            />
          ) : (
            <TableContainer
              sx={{
                maxHeight: 520,
                border: 1,
                borderColor: "divider",
                borderRadius: 3,
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Demandeur</TableCell>
                    <TableCell>Rôle</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Demandée</TableCell>
                    <TableCell>Prise en charge</TableCell>
                    <TableCell>Traitement</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleRequests.map((request) => (
                    <TableRow key={request.id} hover>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant="body2" sx={{ fontWeight: 850 }}>
                            {requesterPrimaryLabel(request)}
                          </Typography>
                          {shouldShowRequesterEmail(request) ? (
                            <Typography variant="caption" color="text.secondary">
                              {request.email}
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>

                      <TableCell>{request.role}</TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={statusLabels[request.status]}
                          color={statusColor(request.status)}
                          variant={request.status === "PENDING" ? "filled" : "outlined"}
                        />
                      </TableCell>

                      <TableCell>{formatDate(request.requestedAt)}</TableCell>

                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant="body2">
                            {formatDate(request.processingStartedAt)}
                          </Typography>
                          {request.handledByEmail ? (
                            <Typography variant="caption" color="text.secondary">
                              {request.handledByEmail}
                            </Typography>
                          ) : null}
                        </Stack>
                      </TableCell>

                      <TableCell sx={{ minWidth: 260 }}>
                        {request.status === "PENDING" ? (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<UserCheck size={16} />}
                            disabled={workingId === request.id}
                            onClick={() => void startProcessing(request.id)}
                          >
                            {workingId === request.id
                              ? "Prise en charge..."
                              : "Prendre en charge"}
                          </Button>
                        ) : request.status === "IN_PROGRESS" ? (
                          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              startIcon={<XCircle size={16} />}
                              disabled={workingId === request.id}
                              onClick={() => openDecision("REJECT", request)}
                            >
                              Refuser
                            </Button>
                            <Button
                              size="small"
                              color="success"
                              variant="contained"
                              startIcon={<CheckCircle2 size={16} />}
                              disabled={workingId === request.id}
                              onClick={() => openDecision("COMPLETE", request)}
                            >
                              Traitement terminé
                            </Button>
                          </Stack>
                        ) : (
                          <Stack spacing={0.25}>
                            <Typography variant="body2" sx={{ fontWeight: 750 }}>
                              {request.adminComment || "Aucun commentaire"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {request.processedAt
                                ? `Clôturée le ${formatDate(request.processedAt)}`
                                : "Aucune action disponible"}
                            </Typography>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </SmartSectionCard>

      <Alert severity="warning">
        « Traitement terminé » ne supprime pas automatiquement la ligne utilisateur.
        Cette action atteste que la procédure réelle de suppression, anonymisation
        ou conservation a été appliquée et documentée.
      </Alert>

      <Dialog
        open={pendingDecision !== null}
        onClose={() => {
          if (workingId === null) setPendingDecision(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {pendingDecision?.kind === "COMPLETE"
            ? "Confirmer la fin du traitement"
            : "Refuser la demande"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography color="text.secondary">
              {pendingDecision?.request
                ? requesterPrimaryLabel(pendingDecision.request)
                : ""}
            </Typography>

            <TextField
              label="Commentaire administrateur"
              value={adminComment}
              onChange={(event) => setAdminComment(event.target.value)}
              multiline
              minRows={4}
              slotProps={{ htmlInput: { maxLength: 1000 } }}
              helperText={`${adminComment.length}/1000`}
              required
              autoFocus
            />

            {pendingDecision?.kind === "COMPLETE" ? (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={processingConfirmed}
                    onChange={(event) =>
                      setProcessingConfirmed(event.target.checked)
                    }
                  />
                }
                label="Je confirme avoir appliqué la procédure réelle de traitement des données et des historiques associés."
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={workingId !== null}
            onClick={() => setPendingDecision(null)}
          >
            Annuler
          </Button>
          <Button
            color={pendingDecision?.kind === "COMPLETE" ? "success" : "error"}
            variant="contained"
            disabled={
              workingId !== null ||
              !adminComment.trim() ||
              (pendingDecision?.kind === "COMPLETE" && !processingConfirmed)
            }
            onClick={() => void confirmDecision()}
          >
            {workingId !== null
              ? "Traitement..."
              : pendingDecision?.kind === "COMPLETE"
                ? "Confirmer le traitement"
                : "Confirmer le refus"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
