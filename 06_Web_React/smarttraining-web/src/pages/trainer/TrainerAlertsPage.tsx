import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import {
  BellRing,
  CheckCircle2,
  Eye,
  Search,
  XCircle,
} from "lucide-react";
import {
  getOpenAlerts,
  getTrainerTrainings,
  ignoreAlert,
  markAlertInProgress,
  resolveAlert,
} from "../../api/trainerApi";
import { resolveTrainerLearners } from "../../api/trainerLearnerOverviewApi";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import { useAuth } from "../../features/auth/AuthContext";
import type { AuthUser } from "../../types/auth";
import type {
  AlertResponse,
  TrainingResponse,
} from "../../types/trainer";

function learnerName(learner?: AuthUser): string {
  if (!learner) {
    return "Apprenant";
  }

  const fullName =
    learner.fullName ||
    learner.name ||
    [learner.firstName, learner.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  return fullName || learner.email || "Apprenant";
}

function alertTypeLabel(value?: string): string {
  const labels: Record<string, string> = {
    LOW_PROGRESS: "Progression faible",
    LOW_SCORE: "Score a revoir",
    INACTIVITY: "Inactivite",
    AI_RISK: "Risque a examiner",
    QUIZ_FAILURE: "Quiz a reprendre",
    LOW_ACTIVITY: "Activite encore limitee",
    HELP_REQUEST: "Demande d'aide",
  };

  return value ? labels[value] || "Signal pedagogique" : "Signal pedagogique";
}

function severityLabel(value?: string): string {
  const labels: Record<string, string> = {
    LOW: "Faible",
    MEDIUM: "Moyenne",
    HIGH: "Elevee",
  };

  return value ? labels[value] || "A examiner" : "A examiner";
}

function severityColor(
  value?: string,
): "default" | "info" | "warning" | "error" {
  if (value === "HIGH") {
    return "error";
  }

  if (value === "MEDIUM") {
    return "warning";
  }

  if (value === "LOW") {
    return "info";
  }

  return "default";
}

function statusLabel(value?: string): string {
  const labels: Record<string, string> = {
    OPEN: "A traiter",
    IN_PROGRESS: "En cours",
    RESOLVED: "Resolue",
    IGNORED: "Ignoree",
  };

  return value ? labels[value] || "A traiter" : "A traiter";
}

function statusColor(
  value?: string,
): "default" | "warning" | "info" | "success" {
  if (value === "IN_PROGRESS") {
    return "info";
  }

  if (value === "RESOLVED") {
    return "success";
  }

  if (value === "OPEN" || !value) {
    return "warning";
  }

  return "default";
}

export function TrainerAlertsPage() {
  const { user } = useAuth();

  const [alerts, setAlerts] = useState<AlertResponse[]>([]);
  const [learners, setLearners] =
    useState<Map<number, AuthUser>>(new Map());
  const [trainings, setTrainings] =
    useState<Map<number, TrainingResponse>>(new Map());

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [loadedAlerts, loadedTrainings] = await Promise.all([
        getOpenAlerts(),
        getTrainerTrainings(user.id),
      ]);

      setAlerts(loadedAlerts);
      setTrainings(
        new Map(
          loadedTrainings.map((training) => [
            training.id,
            training,
          ]),
        ),
      );

      const learnerIds = Array.from(
        new Set(loadedAlerts.map((alert) => alert.learnerId)),
      );

      const identities = learnerIds.length
        ? await resolveTrainerLearners(learnerIds)
        : [];

      setLearners(
        new Map(
          identities.map((learner) => [learner.id, learner]),
        ),
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user?.id]);

  const visibleAlerts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");

    return alerts.filter((alert) => {
      const severity = String(
        alert.severity || alert.riskLevel || "",
      );

      if (
        severityFilter !== "ALL" &&
        severity !== severityFilter
      ) {
        return false;
      }

      if (
        typeFilter !== "ALL" &&
        String(alert.alertType || "") !== typeFilter
      ) {
        return false;
      }

      if (query) {
        const learner = learners.get(alert.learnerId);
        const training = trainings.get(alert.trainingId);

        const searchable = [
          learnerName(learner),
          learner?.email,
          training?.title,
          alertTypeLabel(alert.alertType),
          alert.title,
          alert.message,
          alert.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fr");

        if (!searchable.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [
    alerts,
    learners,
    trainings,
    search,
    severityFilter,
    typeFilter,
  ]);

  async function handleAction(
    alertId: number,
    action: "IN_PROGRESS" | "RESOLVE" | "IGNORE",
  ) {
    setError("");
    setSuccess("");

    try {
      if (action === "IN_PROGRESS") {
        await markAlertInProgress(alertId);
        setSuccess("Signal pris en charge.");
      }

      if (action === "RESOLVE") {
        await resolveAlert(alertId);
        setSuccess("Signal resolu.");
      }

      if (action === "IGNORE") {
        await ignoreAlert(alertId);
        setSuccess("Signal ignore.");
      }

      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">
            {"Chargement des alertes de suivi..."}
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow={"Suivi pedagogique"}
        title={"Alertes & risques"}
        description={
          "Examinez les signaux qui peuvent necessiter une action d'accompagnement et traitez-les dans le contexte de la formation."
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Alert severity="info">
        {
          "Un signal est une aide au suivi pedagogique. Il doit etre interprete avec la progression et l'activite reelles de l'apprenant."
        }
      </Alert>

      <SmartSectionCard
        title={"Filtres"}
        description={
          "Recherchez un apprenant, une formation ou un message, puis affinez par niveau d'attention ou type de signal."
        }
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(3, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          <TextField
            label={"Rechercher"}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={"Apprenant, formation ou message"}
            slotProps={{
              input: {
                startAdornment: (
                  <Search
                    size={18}
                    aria-hidden="true"
                    style={{ marginRight: 8 }}
                  />
                ),
              },
            }}
          />

          <TextField
            select
            label={"Niveau d'attention"}
            value={severityFilter}
            onChange={(event) =>
              setSeverityFilter(event.target.value)
            }
          >
            <MenuItem value="ALL">{"Tous les niveaux"}</MenuItem>
            <MenuItem value="LOW">{"Faible"}</MenuItem>
            <MenuItem value="MEDIUM">{"Moyenne"}</MenuItem>
            <MenuItem value="HIGH">{"Elevee"}</MenuItem>
          </TextField>

          <TextField
            select
            label={"Type de signal"}
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <MenuItem value="ALL">{"Tous les types"}</MenuItem>
            <MenuItem value="LOW_PROGRESS">
              {"Progression faible"}
            </MenuItem>
            <MenuItem value="LOW_SCORE">{"Score a revoir"}</MenuItem>
            <MenuItem value="INACTIVITY">{"Inactivite"}</MenuItem>
            <MenuItem value="AI_RISK">
              {"Risque a examiner"}
            </MenuItem>
            <MenuItem value="QUIZ_FAILURE">
              {"Quiz a reprendre"}
            </MenuItem>
            <MenuItem value="LOW_ACTIVITY">
              {"Activite encore limitee"}
            </MenuItem>
            <MenuItem value="HELP_REQUEST">
              {"Demande d'aide"}
            </MenuItem>
          </TextField>
        </Box>
      </SmartSectionCard>

      <SmartSectionCard
        title={"Signaux a examiner"}
        description={`${visibleAlerts.length} signal${
          visibleAlerts.length > 1 ? "aux" : ""
        } correspondant aux filtres.`}
      >
        {!visibleAlerts.length ? (
          <Box
            sx={{
              py: 5,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
            }}
          >
            <Stack spacing={1} sx={{ alignItems: "center", maxWidth: 480 }}>
              <BellRing size={32} aria-hidden="true" />
              <Typography variant="h6">
                {"Aucun signal a afficher"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {
                  "Aucune alerte ouverte ne correspond actuellement aux filtres selectionnes."
                }
              </Typography>
            </Stack>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table
              size="small"
              aria-label={"Alertes & risques pedagogique"}
              sx={{ minWidth: 1050 }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>{"Apprenant"}</TableCell>
                  <TableCell>{"Formation"}</TableCell>
                  <TableCell>{"Signal"}</TableCell>
                  <TableCell>{"Niveau"}</TableCell>
                  <TableCell>{"Statut"}</TableCell>
                  <TableCell>{"Message"}</TableCell>
                  <TableCell>{"Actions"}</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {visibleAlerts.map((alert) => {
                  const learner = learners.get(alert.learnerId);
                  const training = trainings.get(alert.trainingId);
                  const severity = String(
                    alert.severity || alert.riskLevel || "",
                  );
                  const status = String(alert.status || "OPEN");
                  const actionable =
                    status === "OPEN" || status === "IN_PROGRESS";

                  return (
                    <TableRow key={alert.id} hover>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
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

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {training?.title || "Formation"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {alertTypeLabel(alert.alertType)}
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={severityLabel(severity)}
                          color={severityColor(severity)}
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={statusLabel(status)}
                          color={statusColor(status)}
                        />
                      </TableCell>

                      <TableCell sx={{ maxWidth: 360 }}>
                        <Typography
                          variant="body2"
                          sx={{ whiteSpace: "pre-wrap" }}
                        >
                          {alert.message ||
                            alert.description ||
                            alert.title ||
                            "Signal de suivi pedagogique"}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ minWidth: 235 }}>
                        {actionable ? (
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            useFlexGap
                            sx={{ flexWrap: "wrap" }}
                          >
                            {status === "OPEN" ? (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Eye size={16} />}
                                onClick={() =>
                                  void handleAction(
                                    alert.id,
                                    "IN_PROGRESS",
                                  )
                                }
                              >
                                {"Prendre en charge"}
                              </Button>
                            ) : null}

                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckCircle2 size={16} />}
                              onClick={() =>
                                void handleAction(
                                  alert.id,
                                  "RESOLVE",
                                )
                              }
                            >
                              {"Resoudre"}
                            </Button>

                            <Button
                              size="small"
                              color="inherit"
                              variant="text"
                              startIcon={<XCircle size={16} />}
                              onClick={() =>
                                void handleAction(
                                  alert.id,
                                  "IGNORE",
                                )
                              }
                            >
                              {"Ignorer"}
                            </Button>
                          </Stack>
                        ) : (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            {"Traitement termine"}
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
    </Stack>
  );
}