import type { ReactNode } from "react";
import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export type TrainingCoverProps = {
  title: string;
  coverUrl?: string | null;
  coverAlt?: string;
};

export function TrainingCover({
  title,
  coverUrl,
  coverAlt,
}: TrainingCoverProps) {
  return coverUrl ? (
    <Box
      component="img"
      src={coverUrl}
      alt={coverAlt ?? `Couverture de ${title}`}
      sx={{
        width: "100%",
        aspectRatio: "16 / 9",
        objectFit: "cover",
        display: "block",
      }}
    />
  ) : (
    <Box
      role="img"
      aria-label={`Aucune couverture disponible pour ${title}`}
      sx={{
        width: "100%",
        aspectRatio: "16 / 9",
        bgcolor: "action.hover",
        display: "grid",
        placeItems: "center",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Couverture à ajouter
      </Typography>
    </Box>
  );
}

export type TrainingCardProps = {
  title: string;
  description?: string;
  coverUrl?: string | null;
  coverAlt?: string;
  eyebrow?: string;
  status?: string;
  meta?: string;
  progress?: number | null;
  actionLabel?: string;
  onAction?: () => void;
};

export function TrainingCard({
  title,
  description,
  coverUrl,
  coverAlt,
  eyebrow,
  status,
  meta,
  progress,
  actionLabel,
  onAction,
}: TrainingCardProps) {
  const normalized =
    typeof progress === "number" ? clamp(progress) : null;

  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TrainingCover
        title={title}
        coverUrl={coverUrl}
        coverAlt={coverAlt}
      />

      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, flexGrow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ minWidth: 0 }}>
            {eyebrow ? (
              <Typography variant="overline" color="text.secondary">
                {eyebrow}
              </Typography>
            ) : null}
            <Typography variant="h6" component="h3">
              {title}
            </Typography>
          </Box>
          {status ? <Chip size="small" label={status} /> : null}
        </Stack>

        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}

        {meta ? (
          <Typography variant="caption" color="text.secondary">
            {meta}
          </Typography>
        ) : null}

        {normalized !== null ? (
          <Stack spacing={0.75}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="caption" color="text.secondary">
                Progression
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {Math.round(normalized)} %
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={normalized}
              aria-label={`Progression ${Math.round(normalized)} %`}
            />
          </Stack>
        ) : null}

        {actionLabel && onAction ? (
          <Box sx={{ mt: "auto", pt: 0.5 }}>
            <Button variant="contained" onClick={onAction}>
              {actionLabel}
            </Button>
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}

export type LearnerRowProps = {
  name: string;
  email?: string;
  subtitle?: string;
  avatarUrl?: string | null;
  status?: string;
  trailing?: ReactNode;
};

export function LearnerRow({
  name,
  email,
  subtitle,
  avatarUrl,
  status,
  trailing,
}: LearnerRowProps) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ width: "100%", minWidth: 0, py: 1, alignItems: "center" }}
    >
      <Avatar src={avatarUrl ?? undefined} alt={name}>
        {name.trim().slice(0, 1).toUpperCase()}
      </Avatar>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="body1" noWrap sx={{ fontWeight: 700 }}>
          {name}
        </Typography>
        {email ? (
          <Typography variant="body2" color="text.secondary" noWrap>
            {email}
          </Typography>
        ) : null}
        {subtitle ? (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {status ? <Chip size="small" label={status} /> : null}
      {trailing}
    </Stack>
  );
}

export type ActivityTimelineItem = {
  id: string | number;
  title: string;
  description?: string;
  timestamp?: string;
};

export function ActivityTimeline({
  items,
  emptyLabel = "Aucune activité récente.",
}: {
  items: ActivityTimelineItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Stack component="ol" spacing={0} sx={{ p: 0, m: 0, listStyle: "none" }}>
      {items.map((item, index) => (
        <Stack
          component="li"
          key={item.id}
          direction="row"
          spacing={1.5}
          sx={{ pb: index === items.length - 1 ? 0 : 2 }}
        >
          <Stack sx={{ width: 3, flexShrink: 0, alignItems: "center" }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: "primary.main",
              }}
            />
            {index !== items.length - 1 ? (
              <Box sx={{ width: 2, flexGrow: 1, bgcolor: "divider", mt: 0.5 }} />
            ) : null}
          </Stack>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {item.title}
            </Typography>
            {item.description ? (
              <Typography variant="body2" color="text.secondary">
                {item.description}
              </Typography>
            ) : null}
            {item.timestamp ? (
              <Typography variant="caption" color="text.secondary">
                {item.timestamp}
              </Typography>
            ) : null}
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

export type PriorityCardSeverity = "info" | "success" | "warning" | "error";

export function PriorityCard({
  title,
  description,
  severity = "info",
  actionLabel,
  onAction,
}: {
  title: string;
  description?: ReactNode;
  severity?: PriorityCardSeverity;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Alert
      severity={severity}
      variant="outlined"
      action={
        actionLabel && onAction ? (
          <Button color="inherit" size="small" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : undefined
      }
    >
      <AlertTitle>{title}</AlertTitle>
      {description ? <Box>{description}</Box> : null}
    </Alert>
  );
}

export function MetricCard({
  label,
  value,
  helper,
  trend,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  trend?: string;
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h4" component="p" sx={{ fontWeight: 800 }}>
            {value}
          </Typography>
          {trend ? (
            <Typography variant="caption" color="text.secondary">
              {trend}
            </Typography>
          ) : null}
          {helper ? (
            <Typography variant="body2" color="text.secondary">
              {helper}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ProgressCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: number;
  helper?: string;
}) {
  const normalized = clamp(value);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.25}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="h6">{Math.round(normalized)} %</Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={normalized}
            aria-label={`${title} ${Math.round(normalized)} %`}
          />
          {helper ? (
            <Typography variant="body2" color="text.secondary">
              {helper}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DeadlineItem({
  title,
  deadlineLabel,
  status,
}: {
  title: string;
  deadlineLabel: string;
  status?: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ py: 1, alignItems: "center" }}>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="body1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {deadlineLabel}
        </Typography>
      </Box>
      {status ? <Chip size="small" label={status} /> : null}
    </Stack>
  );
}

export function GroupCard({
  name,
  memberCount,
  description,
  actionLabel,
  onAction,
}: {
  name: string;
  memberCount: number;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack spacing={1} sx={{ height: "100%", flexGrow: 1 }}>
          <Typography variant="h6" component="h3">
            {name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {memberCount} membre{memberCount > 1 ? "s" : ""}
          </Typography>
          {description ? (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          ) : null}
          {actionLabel && onAction ? (
            <Button
              variant="outlined"
              onClick={onAction}
              sx={{ alignSelf: "flex-start", mt: "auto !important" }}
            >
              {actionLabel}
            </Button>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function CertificateCard({
  title,
  issuedAt,
  verificationLabel,
  actionLabel,
  onAction,
}: {
  title: string;
  issuedAt?: string;
  verificationLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack spacing={0.75} sx={{ height: "100%", flexGrow: 1 }}>
          <Typography variant="h6" component="h3">
            {title}
          </Typography>
          {issuedAt ? (
            <Typography variant="body2" color="text.secondary">
              Délivré le {issuedAt}
            </Typography>
          ) : null}
          {verificationLabel ? (
            <Typography variant="caption" color="text.secondary">
              {verificationLabel}
            </Typography>
          ) : null}
          {actionLabel && onAction ? (
            <Button
              variant="outlined"
              onClick={onAction}
              sx={{ alignSelf: "flex-start", mt: "auto !important" }}
            >
              {actionLabel}
            </Button>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ChartCard({
  title,
  description,
  children,
  ariaLabel,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="h6" component="h3">
              {title}
            </Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary">
                {description}
              </Typography>
            ) : null}
          </Stack>
          <Box role="img" aria-label={ariaLabel ?? title}>
            {children}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function SmartSearchFilterBar({
  value,
  onChange,
  label = "Recherche",
  placeholder = "Rechercher…",
  children,
  onClear,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  children?: ReactNode;
  onClear?: () => void;
}) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1.5}
      sx={{ width: "100%", alignItems: { xs: "stretch", md: "center" } }}
    >
      <TextField
        fullWidth
        size="small"
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {children}
      {onClear ? (
        <Button variant="text" onClick={onClear} sx={{ whiteSpace: "nowrap" }}>
          Réinitialiser
        </Button>
      ) : null}
    </Stack>
  );
}
