import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { ShieldAlert, Trash2, XCircle } from "lucide-react";

import {
  type AccountDeletionRequestResponse,
  type AccountDeletionRequestStatus,
  cancelMyAccountDeletionRequest,
  getMyAccountDeletionRequest,
  requestMyAccountDeletion,
} from "../../api/accountDeletionApi";
import { getApiErrorMessage } from "../../api/apiClient";

function statusLabel(status: AccountDeletionRequestStatus): string {
  if (status === "PENDING") return "Demande reçue";
  if (status === "IN_PROGRESS") return "Traitement en cours";
  if (status === "COMPLETED") return "Traitement administratif terminé";
  if (status === "CANCELLED") return "Annulée";
  return "Refusée";
}

function requestDate(value?: string | null): string {
  if (!value) return "Date indisponible";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function AccountDeletionPanel() {
  const [request, setRequest] =
    useState<AccountDeletionRequestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getMyAccountDeletionRequest()
      .then((value) => {
        if (active) {
          setRequest(value);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (active) setError(getApiErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function submitRequest() {
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await requestMyAccountDeletion();
      setRequest(created);
      setConfirmOpen(false);
      setSuccess(
        "Ta demande a été enregistrée. Un administrateur peut maintenant la prendre en charge.",
      );
    } catch (submitError) {
      setError(getApiErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  async function cancelRequest() {
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const cancelled = await cancelMyAccountDeletionRequest();
      setRequest(cancelled);
      setCancelOpen(false);
      setSuccess("Ta demande de suppression a été annulée.");
    } catch (cancelError) {
      setError(getApiErrorMessage(cancelError));
    } finally {
      setBusy(false);
    }
  }

  const active = request?.active === true;
  const canCancel = request?.status === "PENDING";

  return (
    <Paper
      component="section"
      elevation={0}
      sx={{
        gridColumn: "1 / -1",
        p: { xs: 2.25, md: 3 },
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        bgcolor: "background.paper",
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
        >
          <Box>
            <Typography variant="overline" sx={{ color: "error.main", fontWeight: 900 }}>
              SUPPRESSION DU COMPTE
            </Typography>
            <Typography variant="h5" component="h3" sx={{ fontWeight: 900 }}>
              Gérer ma demande de suppression
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 760 }}>
              La demande est suivie par l’administration. Elle ne désactive pas
              et n’efface pas automatiquement le compte : le traitement réel
              des données reste explicite et traçable.
            </Typography>
          </Box>
          <ShieldAlert size={28} aria-hidden="true" />
        </Stack>

        {loading ? (
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Vérification d’une demande existante...
            </Typography>
          </Stack>
        ) : null}

        {request ? (
          <Alert severity={active ? "warning" : "info"}>
            <strong>{statusLabel(request.status)}</strong>
            {" — "}
            Demandée le {requestDate(request.requestedAt)}.
            {request.processingStartedAt
              ? ` Prise en charge le ${requestDate(request.processingStartedAt)}.`
              : ""}
            {request.adminComment
              ? ` Commentaire : ${request.adminComment}`
              : ""}
          </Alert>
        ) : null}

        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          sx={{ alignItems: { sm: "center" } }}
        >
          <Button
            color="error"
            variant="outlined"
            startIcon={<Trash2 size={18} />}
            disabled={loading || busy || active}
            onClick={() => setConfirmOpen(true)}
          >
            {active
              ? "Demande déjà enregistrée"
              : "Demander la suppression de mon compte"}
          </Button>

          {canCancel ? (
            <Button
              color="warning"
              variant="text"
              startIcon={<XCircle size={18} />}
              disabled={busy}
              onClick={() => setCancelOpen(true)}
            >
              Annuler ma demande
            </Button>
          ) : null}

          <Typography variant="caption" color="text.secondary">
            Une demande déjà prise en charge ne peut plus être annulée ici.
          </Typography>
        </Stack>
      </Stack>

      <Dialog
        open={confirmOpen}
        onClose={() => {
          if (!busy) setConfirmOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Confirmer la demande de suppression</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Alert severity="warning">
              Cette action crée une demande officielle de suppression. Elle ne
              doit pas être confondue avec une simple désactivation.
            </Alert>
            <Typography color="text.secondary">
              Un administrateur devra prendre en charge la demande et documenter
              le traitement appliqué aux données et aux historiques pédagogiques.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setConfirmOpen(false)}>
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy}
            onClick={() => void submitRequest()}
          >
            {busy ? "Envoi..." : "Confirmer la demande"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={cancelOpen}
        onClose={() => {
          if (!busy) setCancelOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Annuler la demande en attente ?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            L’annulation est possible uniquement avant la prise en charge par
            un administrateur.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setCancelOpen(false)}>
            Conserver la demande
          </Button>
          <Button
            color="warning"
            variant="contained"
            disabled={busy}
            onClick={() => void cancelRequest()}
          >
            {busy ? "Annulation..." : "Confirmer l’annulation"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
