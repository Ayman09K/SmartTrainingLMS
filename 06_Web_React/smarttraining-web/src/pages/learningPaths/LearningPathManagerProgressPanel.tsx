import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  Download,
  Eye,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  getLearningPathLearnerProgress,
  getLearningPathLearnerProgressDetail,
} from "../../api/learningPathApi";
import {
  resolveTrainerLearners,
} from "../../api/trainerLearnerOverviewApi";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  downloadLearningPathLearnersCsv,
  downloadLearningPathLearnersDetailCsv,
} from "../../api/reportingApi";
import type { AuthUser } from "../../types/auth";
import type {
  LearningPathProgressResponse,
  LearningPathTrainingProgressResponse,
} from "../../types/learningPath";

interface LearningPathManagerProgressPanelProps {
  pathId: number;
  enabled: boolean;
}

function displayName(user?: AuthUser): string {
  if (!user) {
    return "Apprenant";
  }

  const value =
    user.fullName ||
    user.name ||
    [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  return value || user.email || "Apprenant";
}

function clampPercent(value?: number | null): number {
  if (value == null || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Aucune";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function assignmentSourceLabel(value?: string | null): string {
  const normalized = String(value || "").toUpperCase();

  if (normalized === "GROUP") {
    return "Groupe";
  }

  if (normalized === "DIRECT") {
    return "Individuelle";
  }

  return value || "Affectation";
}

function statusLabel(
  progress: LearningPathProgressResponse,
): string {
  if (progress.completed) {
    return "Terminé";
  }

  if (progress.overallProgressPercentage > 0) {
    return "En cours";
  }

  return "À commencer";
}

function statusColor(
  progress: LearningPathProgressResponse,
): "success" | "warning" | "default" {
  if (progress.completed) {
    return "success";
  }

  if (progress.overallProgressPercentage > 0) {
    return "warning";
  }

  return "default";
}

function nextTrainingLabel(
  progress: LearningPathProgressResponse,
): string {
  if (progress.completed) {
    return "Parcours terminé";
  }

  if (!progress.nextTrainingId) {
    return "À déterminer";
  }

  return (
    progress.trainings.find(
      (item) =>
        item.trainingId === progress.nextTrainingId,
    )?.trainingTitle ||
    "Prochaine formation"
  );
}

function trainingStatusLabel(
  training: LearningPathTrainingProgressResponse,
): string {
  if (training.progressPercentage >= 100) {
    return "Terminée";
  }

  if (training.progressPercentage > 0) {
    return "En cours";
  }

  if (training.enrolled) {
    return "À commencer";
  }

  return "Non inscrite";
}

export function LearningPathManagerProgressPanel({
  pathId,
  enabled,
}: LearningPathManagerProgressPanelProps) {
  const [rows, setRows] =
    useState<LearningPathProgressResponse[]>([]);
  const [identities, setIdentities] =
    useState<Record<number, AuthUser>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [exporting, setExporting] =
    useState<"summary" | "detail" | null>(null);
  const [exportError, setExportError] = useState("");

  const [detail, setDetail] =
    useState<LearningPathProgressResponse | null>(null);
  const [detailLearner, setDetailLearner] =
    useState<AuthUser | undefined>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      setIdentities({});
      setLoading(false);
      setError("");
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const progress =
          await getLearningPathLearnerProgress(pathId);

        const learnerIds = Array.from(
          new Set(
            progress
              .map((item) => item.learnerId)
              .filter(
                (learnerId) =>
                  Number.isInteger(learnerId) &&
                  learnerId > 0,
              ),
          ),
        );

        const users = learnerIds.length
          ? await resolveTrainerLearners(learnerIds)
          : [];

        if (active) {
          const byId: Record<number, AuthUser> = {};

          for (const user of users) {
            byId[user.id] = user;
          }

          setRows(progress);
          setIdentities(byId);
        }
      } catch (err) {
        if (active) {
          setRows([]);
          setIdentities({});
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [enabled, pathId, reloadVersion]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((left, right) => {
        if (left.completed !== right.completed) {
          return left.completed ? 1 : -1;
        }

        return (
          left.completionProgressPercentage -
          right.completionProgressPercentage
        );
      }),
    [rows],
  );

  const summary = useMemo(() => {
    if (!rows.length) {
      return {
        completed: 0,
        averageCompletion: 0,
      };
    }

    const completed = rows.filter(
      (item) => item.completed,
    ).length;

    const averageCompletion = Math.round(
      rows.reduce(
        (sum, item) =>
          sum + item.completionProgressPercentage,
        0,
      ) / rows.length,
    );

    return {
      completed,
      averageCompletion,
    };
  }, [rows]);

  async function openDetail(
    row: LearningPathProgressResponse,
  ) {
    setDetail(null);
    setDetailError("");
    setDetailLearner(identities[row.learnerId]);
    setDetailLoading(true);

    try {
      setDetail(
        await getLearningPathLearnerProgressDetail(
          pathId,
          row.learnerId,
        ),
      );
    } catch (err) {
      setDetailError(getApiErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetail(null);
    setDetailLearner(undefined);
    setDetailError("");
    setDetailLoading(false);
  }

  async function exportSummaryCsv() {
    setExportError("");
    setExporting("summary");

    try {
      await downloadLearningPathLearnersCsv(pathId);
    } catch (err) {
      setExportError(getApiErrorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  async function exportDetailCsv() {
    setExportError("");
    setExporting("detail");

    try {
      await downloadLearningPathLearnersDetailCsv(
        pathId,
      );
    } catch (err) {
      setExportError(getApiErrorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: "stretch", md: "center" },
            }}
          >
            <Box>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center" }}
              >
                <Users size={20} />
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800 }}
                >
                  Progression des apprenants
                </Typography>
              </Stack>

              <Typography
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Suivez la complétion du parcours, la progression
                globale, les échéances et la prochaine formation.
              </Typography>
            </Box>

            {enabled ? (
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: "wrap" }}
              >
                <Button
                  variant="outlined"
                  startIcon={<Download size={16} />}
                  disabled={
                    loading || exporting !== null
                  }
                  onClick={() =>
                    void exportSummaryCsv()
                  }
                >
                  {exporting === "summary"
                    ? "Export..."
                    : "CSV synthèse"}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Download size={16} />}
                  disabled={
                    loading || exporting !== null
                  }
                  onClick={() =>
                    void exportDetailCsv()
                  }
                >
                  {exporting === "detail"
                    ? "Export..."
                    : "CSV détail"}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<RefreshCw size={16} />}
                  disabled={
                    loading || exporting !== null
                  }
                  onClick={() =>
                    setReloadVersion(
                      (current) => current + 1,
                    )
                  }
                >
                  Actualiser
                </Button>
              </Stack>
            ) : null}
          </Stack>

          {exportError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {exportError}
            </Alert>
          ) : null}

          {!enabled ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Publiez le parcours pour suivre les apprenants affectés.
            </Alert>
          ) : loading ? (
            <Box
              sx={{
                minHeight: 160,
                display: "grid",
                placeItems: "center",
              }}
            >
              <CircularProgress size={30} />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          ) : !sortedRows.length ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Aucun apprenant n'est encore affecté à ce parcours.
            </Alert>
          ) : (
            <>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: "wrap", mt: 2, mb: 2 }}
              >
                <Chip
                  label={`${sortedRows.length} apprenant(s)`}
                  variant="outlined"
                />
                <Chip
                  label={`${summary.completed} terminé(s)`}
                  color={
                    summary.completed === sortedRows.length
                      ? "success"
                      : "default"
                  }
                  variant="outlined"
                />
                <Chip
                  label={`Complétion moyenne ${summary.averageCompletion} %`}
                  variant="outlined"
                />
              </Stack>

              <TableContainer
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1.5,
                  overflowX: "auto",
                }}
              >
                <Table
                  size="small"
                  sx={{ minWidth: 1060 }}
                  aria-label="Progression des apprenants du parcours"
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Apprenant</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Affectation</TableCell>
                      <TableCell>Complétion</TableCell>
                      <TableCell>Progression globale</TableCell>
                      <TableCell>Échéance</TableCell>
                      <TableCell>Prochaine formation</TableCell>
                      <TableCell align="right">Détail</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {sortedRows.map((row) => {
                      const identity =
                        identities[row.learnerId];

                      const completion = clampPercent(
                        row.completionProgressPercentage,
                      );

                      const overall = clampPercent(
                        row.overallProgressPercentage,
                      );

                      return (
                        <TableRow
                          key={row.learnerId}
                          hover
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 800 }}
                            >
                              {displayName(identity)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {identity?.email ||
                                "Identité indisponible"}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={statusLabel(row)}
                              color={statusColor(row)}
                              variant={
                                row.completed
                                  ? "filled"
                                  : "outlined"
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">
                              {assignmentSourceLabel(
                                row.assignmentSource,
                              )}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Box sx={{ minWidth: 120 }}>
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{
                                  justifyContent: "space-between",
                                  mb: 0.5,
                                }}
                              >
                                <Typography variant="caption">
                                  {completion} %
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {row.completedRequiredSteps}/
                                  {row.requiredSteps ||
                                    row.totalSteps}
                                </Typography>
                              </Stack>
                              <LinearProgress
                                variant="determinate"
                                value={completion}
                                sx={{
                                  height: 6,
                                  borderRadius: 99,
                                }}
                              />
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Box sx={{ minWidth: 110 }}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {overall} %
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={overall}
                                sx={{
                                  height: 5,
                                  borderRadius: 99,
                                  mt: 0.5,
                                }}
                              />
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">
                              {formatDateTime(row.pathDueAt)}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ maxWidth: 190 }}
                            >
                              {nextTrainingLabel(row)}
                            </Typography>
                          </TableCell>

                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<Eye size={15} />}
                              onClick={() =>
                                void openDetail(row)
                              }
                            >
                              Voir
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={
          detailLoading ||
          detail != null ||
          Boolean(detailError)
        }
        onClose={closeDetail}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          Détail de progression
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: 800 }}
              >
                {displayName(detailLearner)}
              </Typography>
              <Typography color="text.secondary">
                {detailLearner?.email ||
                  "Identité indisponible"}
              </Typography>
            </Box>

            {detailLoading ? (
              <Box
                sx={{
                  minHeight: 120,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <CircularProgress size={28} />
              </Box>
            ) : detailError ? (
              <Alert severity="error">
                {detailError}
              </Alert>
            ) : detail ? (
              <>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
                >
                  <Chip
                    label={statusLabel(detail)}
                    color={statusColor(detail)}
                  />
                  <Chip
                    label={assignmentSourceLabel(
                      detail.assignmentSource,
                    )}
                    variant="outlined"
                  />
                  <Chip
                    label={`Échéance : ${formatDateTime(
                      detail.pathDueAt,
                    )}`}
                    variant="outlined"
                  />
                </Stack>

                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      justifyContent: "space-between",
                      mb: 0.75,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700 }}
                    >
                      Complétion
                    </Typography>
                    <Typography variant="body2">
                      {clampPercent(
                        detail.completionProgressPercentage,
                      )}{" "}
                      %
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={clampPercent(
                      detail.completionProgressPercentage,
                    )}
                    sx={{ height: 8, borderRadius: 99 }}
                  />
                </Box>

                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      justifyContent: "space-between",
                      mb: 0.75,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      Progression globale
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {clampPercent(
                        detail.overallProgressPercentage,
                      )}{" "}
                      %
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={clampPercent(
                      detail.overallProgressPercentage,
                    )}
                    sx={{
                      height: 5,
                      borderRadius: 99,
                      opacity: 0.75,
                    }}
                  />
                </Box>

                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 800 }}
                >
                  Formations du parcours
                </Typography>

                <Stack spacing={1}>
                  {[...detail.trainings]
                    .sort(
                      (left, right) =>
                        left.position - right.position,
                    )
                    .map((training) => {
                      const progress = clampPercent(
                        training.progressPercentage,
                      );

                      return (
                        <Card
                          key={training.stepId}
                          variant="outlined"
                        >
                          <CardContent>
                            <Stack
                              direction={{
                                xs: "column",
                                sm: "row",
                              }}
                              spacing={1.5}
                              sx={{
                                justifyContent:
                                  "space-between",
                                alignItems: {
                                  xs: "stretch",
                                  sm: "center",
                                },
                              }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  sx={{ fontWeight: 800 }}
                                >
                                  {training.trainingTitle ||
                                    "Formation"}
                                </Typography>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  useFlexGap
                                  sx={{
                                    flexWrap: "wrap",
                                    mt: 0.75,
                                  }}
                                >
                                  <Chip
                                    size="small"
                                    label={
                                      training.required
                                        ? "Obligatoire"
                                        : "Facultative"
                                    }
                                    color={
                                      training.required
                                        ? "primary"
                                        : "default"
                                    }
                                    variant="outlined"
                                  />
                                  <Chip
                                    size="small"
                                    label={trainingStatusLabel(
                                      training,
                                    )}
                                    color={
                                      progress >= 100
                                        ? "success"
                                        : "default"
                                    }
                                    variant="outlined"
                                  />
                                  {training.dueAt ? (
                                    <Chip
                                      size="small"
                                      label={`Échéance : ${formatDateTime(
                                        training.dueAt,
                                      )}`}
                                      variant="outlined"
                                    />
                                  ) : null}
                                </Stack>
                              </Box>

                              <Box sx={{ minWidth: 150 }}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {progress} %
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={progress}
                                  sx={{
                                    height: 6,
                                    borderRadius: 99,
                                    mt: 0.5,
                                  }}
                                />
                              </Box>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                </Stack>
              </>
            ) : null}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDetail}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}