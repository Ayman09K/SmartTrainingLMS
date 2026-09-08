import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Pencil,
  Search,
  X,
} from "lucide-react";
import {
  cancelSupportSession,
  completeSupportSession,
  createSupportSession,
  getEnrollmentsByTraining,
  getSupportSessionsForTrainer,
  getTrainerTrainings,
  updateSupportSession,
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
  SupportSessionRequest,
  SupportSessionResponse,
  SupportSessionStatus,
  TrainingResponse,
} from "../../types/trainer";

type SessionFilter =
  | "ALL"
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED";

const emptyForm = {
  learnerId: "",
  trainingId: "",
  title: "",
  objective: "",
  scheduledAt: "",
  meetingLink: "",
  note: "",
};

function learnerName(learner?: AuthUser): string {
  if (!learner) {
    return "Apprenant";
  }

  const name =
    learner.fullName ||
    learner.name ||
    [learner.firstName, learner.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  return name || learner.email || "Apprenant";
}

function learnerLabel(learner?: AuthUser): string {
  if (!learner) {
    return "Apprenant";
  }

  const name = learnerName(learner);

  return learner.email && learner.email !== name
    ? `${name} \u2014 ${learner.email}`
    : name;
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    SCHEDULED: "Planifi\u00e9e",
    COMPLETED: "Termin\u00e9e",
    CANCELLED: "Annul\u00e9e",
  };

  return labels[value] || "Statut indisponible";
}

function statusColor(
  value: SupportSessionStatus,
): "info" | "success" | "default" {
  if (value === "SCHEDULED") {
    return "info";
  }

  if (value === "COMPLETED") {
    return "success";
  }

  return "default";
}

function toLocalInput(value?: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }

  const pad = (part: number) =>
    String(part).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function isSafeMeetingLink(value?: string): boolean {
  return Boolean(
    value && /^https?:\/\/\S+$/i.test(value),
  );
}

export function TrainerSupportSessionsPage() {
  const { user } = useAuth();

  const [sessions, setSessions] =
    useState<SupportSessionResponse[]>([]);
  const [trainings, setTrainings] =
    useState<TrainingResponse[]>([]);
  const [learners, setLearners] =
    useState<Map<number, AuthUser>>(new Map());
  const [eligibleLearnerIds, setEligibleLearnerIds] =
    useState<number[]>([]);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<SessionFilter>("ALL");

  const [loading, setLoading] = useState(true);
  const [loadingLearners, setLoadingLearners] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [actionSessionId, setActionSessionId] =
    useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    if (!user?.id) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [loadedSessions, loadedTrainings] =
        await Promise.all([
          getSupportSessionsForTrainer(),
          getTrainerTrainings(user.id),
        ]);

      setSessions(loadedSessions);
      setTrainings(loadedTrainings);

      const ids = Array.from(
        new Set(
          loadedSessions.map(
            (session) => session.learnerId,
          ),
        ),
      );

      const identities = ids.length
        ? await resolveTrainerLearners(ids)
        : [];

      setLearners(
        new Map(
          identities.map((learner) => [
            learner.id,
            learner,
          ]),
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

  const trainingById = useMemo(
    () =>
      new Map(
        trainings.map((training) => [
          training.id,
          training,
        ]),
      ),
    [trainings],
  );

  const visibleSessions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sessions.filter((session) => {
      if (
        filter !== "ALL" &&
        session.status !== filter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const learner = learners.get(
        session.learnerId,
      );
      const training = trainingById.get(
        session.trainingId,
      );

      return [
        learnerName(learner),
        learner?.email,
        training?.title,
        session.title,
        session.objective,
        session.note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [
    sessions,
    learners,
    trainingById,
    filter,
    search,
  ]);

  const metrics = useMemo(
    () => ({
      total: sessions.length,
      scheduled: sessions.filter(
        (session) =>
          session.status === "SCHEDULED",
      ).length,
      completed: sessions.filter(
        (session) =>
          session.status === "COMPLETED",
      ).length,
      cancelled: sessions.filter(
        (session) =>
          session.status === "CANCELLED",
      ).length,
    }),
    [sessions],
  );

  async function loadLearnersForTraining(
    trainingId: number,
  ) {
    setEligibleLearnerIds([]);

    if (!trainingId) {
      return;
    }

    setLoadingLearners(true);
    setError("");

    try {
      const enrollments =
        await getEnrollmentsByTraining(trainingId);

      const ids = Array.from(
        new Set(
          enrollments.map(
            (enrollment) => enrollment.learnerId,
          ),
        ),
      );

      const identities = ids.length
        ? await resolveTrainerLearners(ids)
        : [];

      setEligibleLearnerIds(ids);

      setLearners((current) => {
        const next = new Map(current);

        identities.forEach((learner) => {
          next.set(learner.id, learner);
        });

        return next;
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingLearners(false);
    }
  }

  async function handleTrainingChange(
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      trainingId: value,
      learnerId: "",
    }));

    await loadLearnersForTraining(
      Number(value),
    );
  }

  function resetForm() {
    setForm(emptyForm);
    setEligibleLearnerIds([]);
    setEditingId(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const request: SupportSessionRequest = {
      learnerId: Number(form.learnerId),
      trainingId: Number(form.trainingId),
      title: form.title.trim(),
      objective: form.objective.trim(),
      scheduledAt: form.scheduledAt,
      meetingLink: form.meetingLink.trim(),
      note: form.note.trim() || undefined,
    };

    try {
      if (editingId) {
        await updateSupportSession(
          editingId,
          request,
        );
        setSuccess(
          "S\u00e9ance mise \u00e0 jour.",
        );
      } else {
        await createSupportSession(request);
        setSuccess(
          "S\u00e9ance planifi\u00e9e.",
        );
      }

      resetForm();
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function beginEdit(
    session: SupportSessionResponse,
  ) {
    setEditingId(session.id);

    setForm({
      learnerId: String(session.learnerId),
      trainingId: String(session.trainingId),
      title: session.title,
      objective: session.objective,
      scheduledAt: toLocalInput(
        session.scheduledAt,
      ),
      meetingLink: session.meetingLink,
      note: session.note || "",
    });

    await loadLearnersForTraining(
      session.trainingId,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleAction(
    sessionId: number,
    action: "COMPLETE" | "CANCEL",
  ) {
    // UXD14_B1_SUPPORT_SESSION_LIFECYCLE_DIALOG
    const confirmed = await smartConfirm({
      title:
        action === "COMPLETE"
          ? "Terminer la séance"
          : "Annuler la séance",
      description:
        action === "COMPLETE"
          ? "Confirmer que cette séance d’accompagnement est terminée ?"
          : "Confirmer l’annulation de cette séance d’accompagnement ?",
      confirmLabel: action === "COMPLETE" ? "Terminer" : "Annuler la séance",
      destructive: action === "CANCEL",
    });

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setActionSessionId(sessionId);

    try {
      if (action === "COMPLETE") {
        await completeSupportSession(sessionId);
        setSuccess(
          "S\u00e9ance marqu\u00e9e comme termin\u00e9e.",
        );
      } else {
        await cancelSupportSession(sessionId);
        setSuccess(
          "S\u00e9ance annul\u00e9e.",
        );
      }

      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActionSessionId(null);
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 360,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Stack
          spacing={1.5}
          sx={{ alignItems: "center" }}
        >
          <CircularProgress size={32} />
          <Typography
            variant="body2"
            color="text.secondary"
          >
            {
              "Chargement des s\u00e9ances d'accompagnement..."
            }
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow={
          "Accompagnement p\u00e9dagogique"
        }
        title={
          "S\u00e9ances d'accompagnement"
        }
        description={
          "Planifiez et suivez les rendez-vous p\u00e9dagogiques avec vos apprenants."
        }
      />

      {error ? (
        <Alert
          severity="error"
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      ) : null}

      {success ? (
        <Alert
          severity="success"
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      ) : null}

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
          {
            label: "Total",
            value: metrics.total,
          },
          {
            label: "Planifi\u00e9es",
            value: metrics.scheduled,
          },
          {
            label: "Termin\u00e9es",
            value: metrics.completed,
          },
          {
            label: "Annul\u00e9es",
            value: metrics.cancelled,
          },
        ].map((metric) => (
          <Box
            key={metric.label}
            sx={{
              p: 2,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              bgcolor: "background.paper",
            }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: 900 }}
            >
              {metric.value}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.35 }}
            >
              {metric.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <SmartSectionCard
        title={
          editingId
            ? "Modifier la s\u00e9ance"
            : "Planifier une s\u00e9ance"
        }
        description={
          "Associez le rendez-vous \u00e0 une formation et \u00e0 un apprenant effectivement inscrit."
        }
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
        >
          <Stack spacing={2.5}>
            {editingId ? (
              <Alert
                severity="info"
                icon={<Pencil size={20} />}
              >
                {
                  "Vous modifiez une s\u00e9ance existante. Enregistrez vos changements ou annulez la modification."
                }
              </Alert>
            ) : null}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md:
                    "repeat(2, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              <TextField
                select
                required
                label={"Formation"}
                value={form.trainingId}
                onChange={(event) =>
                  void handleTrainingChange(
                    event.target.value,
                  )
                }
                fullWidth
              >
                <MenuItem value="">
                  {
                    "Choisir une formation"
                  }
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
                required
                label={"Apprenant"}
                value={form.learnerId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    learnerId:
                      event.target.value,
                  }))
                }
                disabled={
                  !form.trainingId ||
                  loadingLearners
                }
                helperText={
                  loadingLearners
                    ? "Chargement des apprenants..."
                    : form.trainingId &&
                        !eligibleLearnerIds.length
                      ? "Aucun apprenant inscrit dans cette formation."
                      : "Seuls les apprenants inscrits \u00e0 la formation sont propos\u00e9s."
                }
                fullWidth
              >
                <MenuItem value="">
                  {
                    loadingLearners
                      ? "Chargement..."
                      : "Choisir un apprenant"
                  }
                </MenuItem>

                {eligibleLearnerIds.map(
                  (learnerId) => {
                    const learner =
                      learners.get(learnerId);

                    return (
                      <MenuItem
                        key={learnerId}
                        value={String(learnerId)}
                      >
                        {learnerLabel(learner)}
                      </MenuItem>
                    );
                  },
                )}
              </TextField>
            </Box>

            <TextField
              required
              label={"Titre"}
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder={
                "Ex. Point de suivi p\u00e9dagogique"
              }
              slotProps={{
                htmlInput: {
                  maxLength: 200,
                },
              }}
              fullWidth
            />

            <TextField
              required
              label={"Objectif de la s\u00e9ance"}
              value={form.objective}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  objective:
                    event.target.value,
                }))
              }
              multiline
              minRows={3}
              slotProps={{
                htmlInput: {
                  maxLength: 1500,
                },
              }}
              fullWidth
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md:
                    "repeat(2, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              <TextField
                required
                type="datetime-local"
                label={
                  "Date et heure"
                }
                value={form.scheduledAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    scheduledAt:
                      event.target.value,
                  }))
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
              />

              <TextField
                required
                type="url"
                label={
                  "Lien de visioconf\u00e9rence"
                }
                value={form.meetingLink}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    meetingLink:
                      event.target.value,
                  }))
                }
                placeholder={
                  "https://meet.example.com/..."
                }
                helperText={
                  "Le lien doit commencer par http:// ou https://."
                }
                slotProps={{
                  htmlInput: {
                    maxLength: 1000,
                  },
                }}
                fullWidth
              />
            </Box>

            <TextField
              label={"Note au rendez-vous"}
              value={form.note}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              multiline
              minRows={2}
              slotProps={{
                htmlInput: {
                  maxLength: 2000,
                },
              }}
              fullWidth
            />

            <Divider />

            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              spacing={1.5}
            >
              <Button
                type="submit"
                variant="contained"
                startIcon={
                  saving ? (
                    <CircularProgress
                      size={17}
                      color="inherit"
                    />
                  ) : (
                    <CalendarClock size={17} />
                  )
                }
                disabled={
                  saving ||
                  loadingLearners ||
                  !form.trainingId ||
                  !form.learnerId
                }
              >
                {saving
                  ? "Enregistrement..."
                  : editingId
                    ? "Enregistrer les modifications"
                    : "Planifier la s\u00e9ance"}
              </Button>

              {editingId ? (
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<X size={17} />}
                  onClick={resetForm}
                  disabled={saving}
                >
                  {
                    "Annuler la modification"
                  }
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Box>
      </SmartSectionCard>

      <SmartSectionCard
        title={"Suivi des s\u00e9ances"}
        description={
          "Recherchez un rendez-vous par apprenant, formation ou contenu, puis filtrez son \u00e9tat."
        }
      >
        <Stack spacing={2.5}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md:
                  "minmax(0, 1fr) minmax(220px, 0.35fr)",
              },
              gap: 2,
            }}
          >
            <TextField
              label={"Rechercher"}
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={
                "Apprenant, formation, titre, objectif..."
              }
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <Box
                      sx={{
                        display: "grid",
                        placeItems: "center",
                        mr: 1,
                        color:
                          "text.secondary",
                      }}
                    >
                      <Search size={17} />
                    </Box>
                  ),
                },
              }}
            />

            <TextField
              select
              label={"Statut"}
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target
                    .value as SessionFilter,
                )
              }
              fullWidth
            >
              <MenuItem value="ALL">
                {"Tous les statuts"}
              </MenuItem>
              <MenuItem value="SCHEDULED">
                {"Planifi\u00e9es"}
              </MenuItem>
              <MenuItem value="COMPLETED">
                {"Termin\u00e9es"}
              </MenuItem>
              <MenuItem value="CANCELLED">
                {"Annul\u00e9es"}
              </MenuItem>
            </TextField>
          </Box>

          {!visibleSessions.length ? (
            <Alert severity="info">
              {
                "Aucune s\u00e9ance ne correspond aux filtres."
              }
            </Alert>
          ) : (
            <Stack spacing={1.5}>
              {visibleSessions.map(
                (session) => {
                  const learner =
                    learners.get(
                      session.learnerId,
                    );
                  const training =
                    trainingById.get(
                      session.trainingId,
                    );
                  const scheduled =
                    session.status ===
                    "SCHEDULED";
                  const busy =
                    actionSessionId ===
                    session.id;
                  const safeMeetingLink =
                    isSafeMeetingLink(
                      session.meetingLink,
                    );

                  return (
                    <Box
                      key={session.id}
                      sx={{
                        p: {
                          xs: 2,
                          md: 2.5,
                        },
                        border: 1,
                        borderColor:
                          "divider",
                        borderRadius: 2,
                        bgcolor:
                          "background.paper",
                      }}
                    >
                      <Stack spacing={2}>
                        <Stack
                          direction={{
                            xs: "column",
                            md: "row",
                          }}
                          spacing={1.5}
                          sx={{
                            alignItems: {
                              xs: "flex-start",
                              md: "center",
                            },
                            justifyContent:
                              "space-between",
                          }}
                        >
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 850,
                                overflowWrap:
                                  "anywhere",
                              }}
                            >
                              {session.title}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.4 }}
                            >
                              {learnerLabel(
                                learner,
                              )}
                            </Typography>
                          </Box>

                          <Chip
                            size="small"
                            label={statusLabel(
                              session.status,
                            )}
                            color={statusColor(
                              session.status,
                            )}
                            variant={
                              session.status ===
                              "CANCELLED"
                                ? "outlined"
                                : "filled"
                            }
                          />
                        </Stack>

                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: {
                              xs: "1fr",
                              md:
                                "repeat(2, minmax(0, 1fr))",
                            },
                            gap: 2,
                          }}
                        >
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {"Formation"}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.35,
                                fontWeight: 750,
                              }}
                            >
                              {training?.title ||
                                "Formation associ\u00e9e"}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {"Date et heure"}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.35,
                                fontWeight: 750,
                              }}
                            >
                              {formatDate(
                                session.scheduledAt,
                              )}
                            </Typography>
                          </Box>
                        </Box>

                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            {"Objectif"}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              mt: 0.35,
                              whiteSpace:
                                "pre-wrap",
                            }}
                          >
                            {session.objective}
                          </Typography>
                        </Box>

                        {session.note ? (
                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {"Note"}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.35,
                                whiteSpace:
                                  "pre-wrap",
                              }}
                            >
                              {session.note}
                            </Typography>
                          </Box>
                        ) : null}

                        <Divider />

                        <Stack
                          direction={{
                            xs: "column",
                            sm: "row",
                          }}
                          spacing={1}
                          useFlexGap
                          sx={{
                            flexWrap: "wrap",
                          }}
                        >
                          {safeMeetingLink ? (
                            <Button
                              component="a"
                              href={
                                session.meetingLink
                              }
                              target="_blank"
                              rel="noreferrer"
                              variant="outlined"
                              startIcon={
                                <ExternalLink
                                  size={16}
                                />
                              }
                            >
                              {
                                "Ouvrir le rendez-vous"
                              }
                            </Button>
                          ) : null}

                          {scheduled ? (
                            <>
                              <Button
                                type="button"
                                variant="outlined"
                                startIcon={
                                  <Pencil
                                    size={16}
                                  />
                                }
                                onClick={() =>
                                  void beginEdit(
                                    session,
                                  )
                                }
                                disabled={busy}
                              >
                                {"Modifier"}
                              </Button>

                              <Button
                                type="button"
                                variant="contained"
                                color="success"
                                startIcon={
                                  busy ? (
                                    <CircularProgress
                                      size={16}
                                      color="inherit"
                                    />
                                  ) : (
                                    <CheckCircle2
                                      size={16}
                                    />
                                  )
                                }
                                onClick={() =>
                                  void handleAction(
                                    session.id,
                                    "COMPLETE",
                                  )
                                }
                                disabled={busy}
                              >
                                {"Terminer"}
                              </Button>

                              <Button
                                type="button"
                                variant="outlined"
                                color="error"
                                startIcon={
                                  <X size={16} />
                                }
                                onClick={() =>
                                  void handleAction(
                                    session.id,
                                    "CANCEL",
                                  )
                                }
                                disabled={busy}
                              >
                                {
                                  "Annuler la s\u00e9ance"
                                }
                              </Button>
                            </>
                          ) : null}
                        </Stack>
                      </Stack>
                    </Box>
                  );
                },
              )}
            </Stack>
          )}
        </Stack>
      </SmartSectionCard>
    </Stack>
  );
}