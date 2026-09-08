import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";

type ActionProps = {
  actionLabel?: string;
  onAction?: () => void;
};

export function SmartEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: ActionProps & {
  title: string;
  description?: string;
}) {
  return (
    <Stack spacing={1.5} sx={{ py: 4, px: 2, alignItems: "center", textAlign: "center" }}>
      <Typography variant="h6">{title}</Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 560 }}>
          {description}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  );
}

export function SmartErrorState({
  title = "Une erreur est survenue",
  description,
  actionLabel,
  onAction,
}: ActionProps & {
  title?: string;
  description: string;
}) {
  return (
    <Alert
      severity="error"
      action={
        actionLabel && onAction ? (
          <Button color="inherit" size="small" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : undefined
      }
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {description}
    </Alert>
  );
}

export function SmartLoadingState({
  label = "Chargement…",
  skeletonRows = 3,
}: {
  label?: string;
  skeletonRows?: number;
}) {
  return (
    <Stack spacing={1.25} aria-live="polite" aria-busy="true">
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Stack>
      {Array.from({ length: Math.max(1, skeletonRows) }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={48} />
      ))}
    </Stack>
  );
}

export function SmartConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onCancel}
      aria-labelledby="smart-confirm-title"
      aria-describedby="smart-confirm-description"
    >
      <DialogTitle id="smart-confirm-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="smart-confirm-description">
          {description}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={destructive ? "error" : "primary"}
          onClick={onConfirm}
          disabled={busy}
          autoFocus
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
