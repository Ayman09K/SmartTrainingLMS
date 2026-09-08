import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { CheckCircle2, Clock3, EyeOff } from "lucide-react";
import {
  getAdminTrainingsSafe,
  getAdminUsers,
  getAllAlertsAsAdmin,
  ignoreAlert,
  markAlertInProgress,
  resolveAlert,
} from "../../api/adminApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { SmartMetricCard, SmartPageHeader, SmartSectionCard } from "../../components/ui";
import type {
  AdminAlertResponse,
  AuthUser,
  TrainingResponse,
} from "../../types/admin";

// WEB_VISUAL_6_ADMIN_ALERTS_SAFE_V1

type AlertFilter = "ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "IGNORED";

const filters: { key: AlertFilter; label: string }[] = [
  { key: "OPEN", label: "Ouvertes" },
  { key: "IN_PROGRESS", label: "En cours" },
  { key: "RESOLVED", label: "R\u00e9solues" },
  { key: "IGNORED", label: "Ignor\u00e9es" },
  { key: "ALL", label: "Toutes" },
];

const statusLabels: Record<AlertFilter, string> = {
  ALL: "Toutes",
  OPEN: "Ouverte",
  IN_PROGRESS: "En cours",
  RESOLVED: "R\u00e9solue",
  IGNORED: "Ignor\u00e9e",
};

const severityLabels: Record<string, string> = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "\u00c9lev\u00e9e",
  CRITICAL: "Critique",
  INFO: "Information",
};

function normalizedStatus(alert: AdminAlertResponse): AlertFilter {
  const status = (alert.status || "OPEN").toUpperCase();

  if (
    status === "IN_PROGRESS" ||
    status === "RESOLVED" ||
    status === "IGNORED"
  ) {
    return status;
  }

  return "OPEN";
}

function fullName(user?: AuthUser): string {
  if (!user) return "Utilisateur non r\u00e9solu";

  const name =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return name || user.email || "Nom non renseign\u00e9";
}

function severityColor(
  severity: string,
): "default" | "success" | "warning" | "error" | "info" {
  if (severity === "HIGH" || severity === "CRITICAL") return "error";
  if (severity === "MEDIUM") return "warning";
  if (severity === "LOW") return "success";
  return "info";
}

function humanize(value?: string): string {
  if (!value) return "-";

  const normalized = value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase();

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<AdminAlertResponse[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [trainings, setTrainings] = useState<TrainingResponse[]>([]);
  const [filter, setFilter] = useState<AlertFilter>("OPEN");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [loadedAlerts, loadedUsers, loadedTrainings] = await Promise.all([
        getAllAlertsAsAdmin(),
        getAdminUsers(),
        getAdminTrainingsSafe(),
      ]);

      setAlerts(loadedAlerts);
      setUsers(loadedUsers);
      setTrainings(loadedTrainings);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const userById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users],
  );

  const trainingById = useMemo(
    () => new Map(trainings.map((training) => [training.id, training])),
    [trainings],
  );

  const counts = useMemo(() => {
    const result: Record<AlertFilter, number> = {
      ALL: alerts.length,
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      IGNORED: 0,
    };

    alerts.forEach((alert) => {
      result[normalizedStatus(alert)] += 1;
    });

    return result;
  }, [alerts]);

  const priorityAlertsCount = useMemo(
    () =>
      alerts.filter((alert) => {
        const severity = (
          alert.severity ||
          alert.riskLevel ||
          alert.priority ||
          "INFO"
        ).toUpperCase();

        return severity === "HIGH" || severity === "CRITICAL";
      }).length,
    [alerts],
  );

  const visibleAlerts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");

    return alerts.filter((alert) => {
      if (filter !== "ALL" && normalizedStatus(alert) !== filter) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const user = alert.learnerId
        ? userById.get(alert.learnerId)
        : undefined;
      const training = alert.trainingId
        ? trainingById.get(alert.trainingId)
        : undefined;

      return [
        fullName(user),
        user?.email,
        training?.title,
        alert.alertType,
        alert.source,
        alert.message,
        alert.description,
        alert.title,
        alert.severity,
        alert.riskLevel,
        alert.priority,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalized);
    });
  }, [alerts, filter, query, trainingById, userById]);

  async function handleAction(
    alertId: number,
    action: "IN_PROGRESS" | "RESOLVE" | "IGNORE",
  ) {
    setError("");
    setSuccess("");

    try {
      if (action === "IN_PROGRESS") {
        await markAlertInProgress(alertId);
        setFilter("IN_PROGRESS");
        setSuccess(
          "Alerte prise en charge. Elle est maintenant visible dans l'onglet En cours.",
        );
      }

      if (action === "RESOLVE") {
        await resolveAlert(alertId);
        setFilter("RESOLVED");
        setSuccess(
          "Alerte r\u00e9solue. Elle reste consultable dans l'onglet R\u00e9solues.",
        );
      }

      if (action === "IGNORE") {
        await ignoreAlert(alertId);
        setFilter("IGNORED");
        setSuccess(
          "Alerte ignor\u00e9e. Elle reste consultable dans l'onglet Ignor\u00e9es.",
        );
      }

      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} sx={{ alignItems: "center", color: "text.secondary" }}>
          <CircularProgress size={32} />
          <Typography variant="body2">Chargement des alertes...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow="Suivi et prévention"
        title="Alertes IA"
        description="Consultez les signaux de suivi pédagogique et pilotez leur prise en charge."
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <SmartMetricCard
          label="Ouvertes"
          value={counts.OPEN}
          helper="À qualifier ou traiter"
          icon={<Clock3 size={20} />}
        />
        <SmartMetricCard
          label="En cours"
          value={counts.IN_PROGRESS}
          helper="Prises en charge"
        />
        <SmartMetricCard
          label="Priorité haute"
          value={priorityAlertsCount}
          helper="Niveau élevé ou critique"
        />
        <SmartMetricCard
          label="Résolues"
          value={counts.RESOLVED}
          helper={`${counts.ALL} alerte(s) au total`}
          icon={<CheckCircle2 size={20} />}
        />
      </Box>

      <Alert severity="info" variant="outlined">
        Les alertes de suivi reposent sur les données d'activité disponibles pour chaque apprenant.
      </Alert>

      <SmartSectionCard
        title="Historique des alertes"
        description={`${visibleAlerts.length} alerte(s) dans la vue s\u00e9lectionn\u00e9e.`}
      >
        <Stack spacing={2}>
          <TextField
            type="search"
            size="small"
            label="Rechercher"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Utilisateur, formation, signal ou message"
            fullWidth
            sx={{ maxWidth: 720 }}
          />

          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={filter}
              onChange={(_, value: AlertFilter) => setFilter(value)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="Statut des alertes"
            >
              {filters.map((item) => (
                <Tab
                  key={item.key}
                  value={item.key}
                  label={`${item.label} (${counts[item.key]})`}
                />
              ))}
            </Tabs>
          </Box>

          {!visibleAlerts.length ? (
            <Alert severity="info">
              Aucune alerte dans cette catégorie.
            </Alert>
          ) : (
            <Paper variant="outlined" sx={{ overflow: "hidden" }}>
              <TableContainer sx={{ maxHeight: 620 }}>
                <Table stickyHeader size="small" aria-label="Alertes pédagogiques">
                  <TableHead>
                    <TableRow>
                      <TableCell>Utilisateur</TableCell>
                      <TableCell>Formation</TableCell>
                      <TableCell>Signal</TableCell>
                      <TableCell>Niveau</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell sx={{ minWidth: 260 }}>Message</TableCell>
                      <TableCell sx={{ minWidth: 205 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {visibleAlerts.map((alert) => {
                      const user = alert.learnerId
                        ? userById.get(alert.learnerId)
                        : undefined;

                      const training = alert.trainingId
                        ? trainingById.get(alert.trainingId)
                        : undefined;

                      const status = normalizedStatus(alert);
                      const severity =
                        alert.severity ||
                        alert.riskLevel ||
                        alert.priority ||
                        "INFO";

                      return (
                        <TableRow key={alert.id} hover>
                          <TableCell>
                            <Stack spacing={0.25}>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                {fullName(user)}
                              </Typography>
                              {user?.email ? (
                                <Typography variant="caption" color="text.secondary">
                                  {user.email}
                                </Typography>
                              ) : null}
                            </Stack>
                          </TableCell>

                          <TableCell>
                            {training?.title || "Formation non r\u00e9solue"}
                          </TableCell>

                          <TableCell>
                            {humanize(alert.alertType || alert.source)}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={severityLabels[severity] || humanize(severity)}
                              color={severityColor(severity)}
                            />
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={statusLabels[status]}
                              color={
                                status === "RESOLVED"
                                  ? "success"
                                  : status === "IN_PROGRESS"
                                    ? "info"
                                    : status === "OPEN"
                                      ? "warning"
                                      : "default"
                              }
                              variant={status === "IGNORED" ? "outlined" : "filled"}
                            />
                          </TableCell>

                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 420,
                                lineHeight: 1.55,
                                color: "text.secondary",
                              }}
                            >
                              {alert.message ||
                                alert.description ||
                                alert.title ||
                                "-"}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            {status === "OPEN" ? (
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Clock3 size={16} />}
                                  onClick={() =>
                                    void handleAction(alert.id, "IN_PROGRESS")
                                  }
                                >
                                  En cours
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<CheckCircle2 size={16} />}
                                  onClick={() =>
                                    void handleAction(alert.id, "RESOLVE")
                                  }
                                >
                                  Résoudre
                                </Button>
                                <Button
                                  size="small"
                                  variant="text"
                                  color="inherit"
                                  startIcon={<EyeOff size={16} />}
                                  onClick={() =>
                                    void handleAction(alert.id, "IGNORE")
                                  }
                                >
                                  Ignorer
                                </Button>
                              </Box>
                            ) : status === "IN_PROGRESS" ? (
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<CheckCircle2 size={16} />}
                                  onClick={() =>
                                    void handleAction(alert.id, "RESOLVE")
                                  }
                                >
                                  Résoudre
                                </Button>
                                <Button
                                  size="small"
                                  variant="text"
                                  color="inherit"
                                  startIcon={<EyeOff size={16} />}
                                  onClick={() =>
                                    void handleAction(alert.id, "IGNORE")
                                  }
                                >
                                  Ignorer
                                </Button>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                Traitée
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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