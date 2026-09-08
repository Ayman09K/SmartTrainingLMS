import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
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
  CheckCircle2,
  ClipboardPlus,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import {
  cancelIntervention,
  createIntervention,
  getEnrollmentsByTraining,
  getInterventionsByTrainer,
  getTrainerTrainings,
  markInterventionDone,
} from "../../api/trainerApi";
import { resolveTrainerLearners } from "../../api/trainerLearnerOverviewApi";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  SmartPageHeader,
  SmartSectionCard,
} from "../../components/ui";
import { smartConfirm } from "../../components/ux/smartConfirmService";
import { useAuth } from "../../features/auth/AuthContext";
import type { AuthUser } from "../../types/auth";
import type {
  InterventionRequest,
  InterventionResponse,
  InterventionType,
  TrainingResponse,
} from "../../types/trainer";

const initialForm = {
  learnerId: "",
  trainingId: "",
  interventionType: "MESSAGE" as InterventionType,
  note: "",
};

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

function typeLabel(value: InterventionType): string {
  const labels: Record<InterventionType, string> = {
    MESSAGE: "Message",
    CALL: "Appel",
    SUPPORT_SESSION: "Seance d'accompagnement",
    MANUAL_REVIEW: "Revue manuelle",
    FOLLOW_UP: "Suivi",
  };

  return labels[value];
}

function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    PLANNED: "Planifiee",
    DONE: "Terminee",
    CANCELLED: "Annulee",
  };

  return labels[value] || "A suivre";
}

function statusColor(
  value: string,
): "default" | "info" | "success" | "warning" {
  if (value === "DONE") {
    return "success";
  }

  if (value === "CANCELLED") {
    return "default";
  }

  if (value === "PLANNED") {
    return "info";
  }

  return "warning";
}

export function TrainerInterventionsPage() {
  const { user } = useAuth();

  const [interventions, setInterventions] =
    useState<InterventionResponse[]>([]);
  const [trainings, setTrainings] = useState<TrainingResponse[]>([]);
  const [learners, setLearners] =
    useState<Map<number, AuthUser>>(new Map());
  const [eligibleLearnerIds, setEligibleLearnerIds] =
    useState<number[]>([]);

  const [form, setForm] = useState(initialForm);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingLearners, setLoadingLearners] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [loadedInterventions, loadedTrainings] =
        await Promise.all([
          getInterventionsByTrainer(user.id),
          getTrainerTrainings(user.id),
        ]);

      setInterventions(loadedInterventions);
      setTrainings(loadedTrainings);

      const ids = Array.from(
        new Set(
          loadedInterventions.map(
            (intervention) => intervention.learnerId,
          ),
        ),
      );

      const identities = ids.length
        ? await resolveTrainerLearners(ids)
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

  async function handleTrainingChange(value: string) {
    setForm((current) => ({
      ...current,
      trainingId: value,
      learnerId: "",
    }));
    setEligibleLearnerIds([]);

    const selectedTrainingId = Number(value);

    if (!selectedTrainingId) {
      return;
    }

    setLoadingLearners(true);
    setError("");

    try {
      const enrollments =
        await getEnrollmentsByTraining(selectedTrainingId);

      const ids = Array.from(
        new Set(enrollments.map((item) => item.learnerId)),
      );

      const identities = ids.length
        ? await resolveTrainerLearners(ids)
        : [];

      setLearners((current) => {
        const next = new Map(current);

        identities.forEach((learner) => {
          next.set(learner.id, learner);
        });

        return next;
      });

      setEligibleLearnerIds(ids);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingLearners(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user?.id]);

  const trainingById = useMemo(
    () =>
      new Map(
        trainings.map((training) => [training.id, training]),
      ),
    [trainings],
  );

  const visibleInterventions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");

    return interventions.filter((intervention) => {
      if (
        statusFilter !== "ALL" &&
        intervention.status !== statusFilter
      ) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const learner = learners.get(intervention.learnerId);
      const training = trainingById.get(intervention.trainingId);

      return [
        learnerName(learner),
        learner?.email,
        training?.title,
        typeLabel(intervention.interventionType),
        intervention.note,
        statusLabel(intervention.status),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalized);
    });
  }, [
    interventions,
    learners,
    query,
    statusFilter,
    trainingById,
  ]);

  async function handleCreate(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!user?.id) {
      setError("Formateur introuvable.");
      return;
    }

    if (!form.trainingId || !form.learnerId) {
      setError(
        "Choisissez une formation puis un apprenant inscrit.",
      );
      return;
    }

    const request: InterventionRequest = {
      learnerId: Number(form.learnerId),
      trainingId: Number(form.trainingId),
      interventionType: form.interventionType,
      note: form.note,
      source: "MANUAL",
    };

    setError("");
    setSuccess("");

    try {
      await createIntervention(request);

      setForm((current) => ({
        ...initialForm,
        trainingId: current.trainingId,
      }));

      setSuccess("Intervention creee.");
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function handleAction(
    id: number,
    action: "DONE" | "CANCEL",
  ) {
    // UXD14_B1_INTERVENTION_LIFECYCLE_DIALOG
    const confirmed = await smartConfirm({
      title:
        action === "DONE"
          ? "Terminer l’intervention"
          : "Annuler l’intervention",
      description:
        action === "DONE"
          ? "Confirmer la clôture de cette intervention comme réalisée ?"
          : "Confirmer l’annulation de cette intervention ?",
      confirmLabel: action === "DONE" ? "Terminer" : "Annuler l’intervention",
      destructive: action === "CANCEL",
    });

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      if (action === "DONE") {
        await markInterventionDone(id);
        setSuccess("Intervention terminee.");
      } else {
        await cancelIntervention(id);
        setSuccess("Intervention annulee.");
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
            {"Chargement des interventions..."}
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow={"Accompagnement pedagogique"}
        title={"Interventions formateur"}
        description={
          "Planifiez et suivez les actions d'accompagnement pour les apprenants inscrits a vos formations."
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <SmartSectionCard
        title={"Nouvelle intervention"}
        description={
          "Choisissez d'abord une formation. La liste des apprenants est ensuite limitee aux personnes reellement inscrites."
        }
      >
        <Box
          component="form"
          onSubmit={handleCreate}
          sx={{ display: "grid", gap: 2 }}
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
              select
              label={"Formation"}
              value={form.trainingId}
              onChange={(event) =>
                void handleTrainingChange(event.target.value)
              }
              required
              disabled={!trainings.length}
            >
              <MenuItem value="">
                {"Choisir une formation"}
              </MenuItem>

              {trainings.map((training) => (
                <MenuItem
                  key={training.id}
                  value={String(training.id)}
                >
                  {training.title}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label={"Apprenant inscrit"}
              value={form.learnerId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  learnerId: event.target.value,
                }))
              }
              required
              disabled={!form.trainingId || loadingLearners}
            >
              <MenuItem value="">
                {loadingLearners
                  ? "Chargement des apprenants..."
                  : "Choisir un apprenant"}
              </MenuItem>

              {eligibleLearnerIds.map((learnerId) => {
                const learner = learners.get(learnerId);

                return (
                  <MenuItem
                    key={learnerId}
                    value={String(learnerId)}
                  >
                    {learnerName(learner)}
                    {learner?.email
                      ? ` - ${learner.email}`
                      : ""}
                  </MenuItem>
                );
              })}
            </TextField>

            <TextField
              select
              label={"Type d'intervention"}
              value={form.interventionType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  interventionType:
                    event.target.value as InterventionType,
                }))
              }
              required
            >
              <MenuItem value="MESSAGE">{"Message"}</MenuItem>
              <MenuItem value="CALL">{"Appel"}</MenuItem>
              <MenuItem value="SUPPORT_SESSION">
                {"Seance d'accompagnement"}
              </MenuItem>
              <MenuItem value="MANUAL_REVIEW">
                {"Revue manuelle"}
              </MenuItem>
              <MenuItem value="FOLLOW_UP">{"Suivi"}</MenuItem>
            </TextField>
          </Box>

          <TextField
            label={"Note de suivi"}
            value={form.note}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                note: event.target.value,
              }))
            }
            multiline
            minRows={3}
            required
            fullWidth
          />

          {form.trainingId &&
          !loadingLearners &&
          !eligibleLearnerIds.length ? (
            <Alert severity="info">
              {
                "Aucun apprenant inscrit n'est actuellement disponible pour cette formation."
              }
            </Alert>
          ) : null}

          <Box>
            <Button
              type="submit"
              variant="contained"
              startIcon={<ClipboardPlus size={17} />}
              disabled={
                !form.trainingId ||
                !form.learnerId ||
                !form.note.trim()
              }
            >
              {"Creer l'intervention"}
            </Button>
          </Box>
        </Box>
      </SmartSectionCard>

      <SmartSectionCard
        title={"Suivi des interventions"}
        description={
          "Consultez les actions en cours et l'historique des accompagnements realises."
        }
      >
        <Stack spacing={2}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {`${visibleInterventions.length} intervention${
                visibleInterventions.length > 1 ? "s" : ""
              } affichee${
                visibleInterventions.length > 1 ? "s" : ""
              }`}
            </Typography>

            <TextField
              type="search"
              size="small"
              label={"Rechercher"}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={"Apprenant, formation, type ou note"}
              sx={{ minWidth: { xs: "100%", sm: 280 }, flex: 1 }}
            />

            <TextField
              select
              size="small"
              label={"Statut"}
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              sx={{ minWidth: 190 }}
            >
              <MenuItem value="ALL">{"Tous les statuts"}</MenuItem>
              <MenuItem value="PLANNED">{"Planifiees"}</MenuItem>
              <MenuItem value="DONE">{"Terminees"}</MenuItem>
              <MenuItem value="CANCELLED">{"Annulees"}</MenuItem>
            </TextField>
          </Box>

          {!visibleInterventions.length ? (
            <Box
              sx={{
                py: 5,
                display: "grid",
                placeItems: "center",
                textAlign: "center",
              }}
            >
              <Stack
                spacing={1}
                sx={{ alignItems: "center", maxWidth: 480 }}
              >
                <UserRoundCheck size={32} aria-hidden="true" />
                <Typography variant="h6">
                  {"Aucune intervention a afficher"}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  {
                    "Les actions d'accompagnement correspondant au filtre apparaitront ici."
                  }
                </Typography>
              </Stack>
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: "auto" }}>
              <Table
                size="small"
                aria-label={"Interventions pedagogiques"}
                sx={{ minWidth: 980 }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>{"Apprenant"}</TableCell>
                    <TableCell>{"Formation"}</TableCell>
                    <TableCell>{"Type"}</TableCell>
                    <TableCell>{"Note"}</TableCell>
                    <TableCell>{"Statut"}</TableCell>
                    <TableCell>{"Actions"}</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {visibleInterventions.map((intervention) => {
                    const learner = learners.get(
                      intervention.learnerId,
                    );
                    const training = trainingById.get(
                      intervention.trainingId,
                    );
                    const planned =
                      intervention.status === "PLANNED";

                    return (
                      <TableRow key={intervention.id} hover>
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

                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600 }}
                          >
                            {training?.title || "Formation"}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          {typeLabel(
                            intervention.interventionType,
                          )}
                        </TableCell>

                        <TableCell sx={{ maxWidth: 380 }}>
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: "pre-wrap" }}
                          >
                            {intervention.note}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={statusLabel(intervention.status)}
                            color={statusColor(
                              intervention.status,
                            )}
                          />
                        </TableCell>

                        <TableCell sx={{ minWidth: 220 }}>
                          {planned ? (
                            <Stack
                              direction={{
                                xs: "column",
                                sm: "row",
                              }}
                              spacing={1}
                            >
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={
                                  <CheckCircle2 size={16} />
                                }
                                onClick={() =>
                                  void handleAction(
                                    intervention.id,
                                    "DONE",
                                  )
                                }
                              >
                                {"Terminer"}
                              </Button>

                              <Button
                                size="small"
                                variant="outlined"
                                color="inherit"
                                startIcon={<XCircle size={16} />}
                                onClick={() =>
                                  void handleAction(
                                    intervention.id,
                                    "CANCEL",
                                  )
                                }
                              >
                                {"Annuler"}
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
        </Stack>
      </SmartSectionCard>
    </Stack>
  );
}