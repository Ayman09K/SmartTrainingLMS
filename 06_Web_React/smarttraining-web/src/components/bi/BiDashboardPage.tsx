/* WEB_VISUAL_FINAL_BI_LOADING_SAFE_V1 */
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  DataGrid,
} from "@mui/x-data-grid";
import type {
  GridColDef,
} from "@mui/x-data-grid";
import {
  Activity,
  BookOpenCheck,
  Download,
  Gauge,
  RefreshCw,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
import {
  getBiActivity,
  getBiDistributions,
  getBiSummary,
  getBiTrainings,
} from "../../api/biApi";
import { getApiErrorMessage } from "../../api/apiClient";
import { downloadTrainingLearnersCsv } from "../../api/reportingApi";
import { getTrainerTrainings } from "../../api/trainerApi";
import { getAdminTrainings } from "../../api/trainingApi";
import {
  SmartEmptyState,
  SmartMetricCard,
  SmartPageHeader,
  SmartSectionCard,
} from "../ui";
import { useAuth } from "../../features/auth/AuthContext";
import type {
  BiActivityPoint,
  BiDistribution,
  BiEnrollmentStatus,
  BiFilters,
  BiPeriodPreset,
  BiScope,
  BiSummary,
  BiTrainingMetric,
  BiTrainingOption,
} from "../../types/bi";
import {
  ActivityTrend,
  CompletionByTrainingChart,
  DistributionHistogram,
  RiskDonut,
} from "./BiVisuals";

type BiGridRow = BiTrainingMetric & {
  id: number;
  statusLabel: string;
  completionLabel: string;
  progressLabel: string;
  scoreLabel: string;
  lastActivityLabel: string;
};

function localIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function presetRange(days: number): {
  from: string;
  to: string;
} {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (days - 1));

  return {
    from: localIsoDate(from),
    to: localIsoDate(to),
  };
}

function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) {
    return "\u2014";
  }

  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatPercent(value?: number | null): string {
  if (value === null || value === undefined) {
    return "\u2014";
  }

  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(value)} %`;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Aucune activite";
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

function trainingStatusLabel(value?: string): string {
  if (value === "PUBLISHED") return "Publiee";
  if (value === "DRAFT") return "Brouillon";
  if (value === "ARCHIVED") return "Archivee";
  if (value === "ACTIVE") return "Active";
  return value || "Non renseigne";
}

function distributionData(
  source: Record<string, number> | undefined,
  labels: ReadonlyArray<readonly [string, string]>,
) {
  return labels.map(([key, label]) => ({
    label,
    value: source?.[key] ?? 0,
  }));
}

function rangeLabel(
  from: string,
  to: string,
): string {
  return `Periode ${from} au ${to}`;
}

const initial30 = presetRange(30);

const progressLabels = [
  ["0", "0 %"],
  ["1-49", "1 a 49 %"],
  ["50-99", "50 a 99 %"],
  ["100", "100 %"],
] as const;

const scoreLabels = [
  ["0-49", "0 a 49 %"],
  ["50-69", "50 a 69 %"],
  ["70-84", "70 a 84 %"],
  ["85-100", "85 a 100 %"],
] as const;

const riskLabels = [
  ["LOW", "Risque faible"],
  ["MEDIUM", "Risque moyen"],
  ["HIGH", "Risque eleve"],
  ["DATA_INSUFFICIENT", "Donnees insuffisantes"],
] as const;

function biFriendlyErrorMessage(error: unknown): string {
  const message = getApiErrorMessage(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes(
      "unable to find instance for analytics-service",
    )
  ) {
    return "Service de statistiques temporairement indisponible. Veuillez reessayer dans quelques instants.";
  }

  return message;
}
export function BiDashboardPage({
  scope,
}: {
  scope: BiScope;
}) {
  const { user } = useAuth();

  const [period, setPeriod] =
    useState<BiPeriodPreset>("30");
  const [customFrom, setCustomFrom] =
    useState(initial30.from);
  const [customTo, setCustomTo] =
    useState(initial30.to);
  const [trainingId, setTrainingId] =
    useState(0);
  const [status, setStatus] =
    useState<BiEnrollmentStatus>("");

  const [trainingOptions, setTrainingOptions] =
    useState<BiTrainingOption[]>([]);
  const [summary, setSummary] =
    useState<BiSummary | null>(null);
  const [trainings, setTrainings] =
    useState<BiTrainingMetric[]>([]);
  const [activity, setActivity] =
    useState<BiActivityPoint[]>([]);
  const [distributions, setDistributions] =
    useState<BiDistribution | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [exporting, setExporting] =
    useState(false);
  const [error, setError] = useState("");
  const [visualWarning, setVisualWarning] =
    useState("");
  const [reloadNonce, setReloadNonce] =
    useState(0);

  const isAdmin = scope === "admin";

  const effectiveRange = useMemo(() => {
    if (period === "7") {
      return presetRange(7);
    }

    if (period === "30") {
      return presetRange(30);
    }

    return {
      from: customFrom,
      to: customTo,
    };
  }, [
    customFrom,
    customTo,
    period,
  ]);

  const filterError = useMemo(() => {
    if (!effectiveRange.from || !effectiveRange.to) {
      return "Renseignez les deux dates.";
    }

    if (effectiveRange.from > effectiveRange.to) {
      return "La date de debut doit preceder la date de fin.";
    }

    return "";
  }, [effectiveRange]);

  const filters = useMemo<BiFilters>(
    () => ({
      from: effectiveRange.from,
      to: effectiveRange.to,
      trainingId: trainingId || undefined,
      status: status || undefined,
    }),
    [
      effectiveRange,
      status,
      trainingId,
    ],
  );

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const loaded =
          scope === "admin"
            ? await getAdminTrainings()
            : user?.id
              ? await getTrainerTrainings(user.id)
              : [];

        if (!active) {
          return;
        }

        const options: BiTrainingOption[] =
          loaded
            .map((training) => ({
              id: training.id,
              title:
                training.title ||
                `Formation ${training.id}`,
              status: training.status,
            }))
            .sort((a, b) =>
              a.title.localeCompare(
                b.title,
                "fr",
              ),
            );

        setTrainingOptions(options);
      } catch (err) {
        if (active) {
          setError(biFriendlyErrorMessage(err));
        }
      }
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, [
    scope,
    user?.id,
  ]);

  useEffect(() => {
    let active = true;

    async function loadBi() {
      if (filterError) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setError("");
      setRefreshing(true);
      setVisualWarning("");

      const results = await Promise.allSettled([
        getBiSummary(scope, filters),
        getBiTrainings(scope, filters),
        getBiActivity(scope, filters),
        getBiDistributions(scope, filters),
      ]);

      if (!active) {
        return;
      }

      const summaryResult = results[0];
      const trainingsResult = results[1];
      const activityResult = results[2];
      const distributionsResult = results[3];

      if (
        summaryResult.status === "rejected" ||
        trainingsResult.status === "rejected"
      ) {
        const cause =
          summaryResult.status === "rejected"
            ? summaryResult.reason
            : trainingsResult.status === "rejected"
              ? trainingsResult.reason
              : new Error("Chargement BI impossible.");

        setError(biFriendlyErrorMessage(cause));
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setSummary(summaryResult.value);
      setTrainings(trainingsResult.value);
      setError("");

      const warnings: string[] = [];

      if (activityResult.status === "fulfilled") {
        setActivity(activityResult.value);
      } else {
        setActivity([]);
        warnings.push(
          "La tendance d'activite n'a pas pu etre chargee.",
        );
      }

      if (
        distributionsResult.status ===
        "fulfilled"
      ) {
        setDistributions(
          distributionsResult.value,
        );
      } else {
        setDistributions(null);
        warnings.push(
          "Les distributions n'ont pas pu etre chargees.",
        );
      }

      setVisualWarning(warnings.join(" "));
      setLoading(false);
      setRefreshing(false);
    }

    void loadBi();

    return () => {
      active = false;
    };
  }, [
    filterError,
    filters,
    reloadNonce,
    scope,
  ]);

  async function handleExport() {
    if (!trainingId) {
      setError(
        "Selectionnez une formation avant l'export CSV.",
      );
      return;
    }

    setExporting(true);
    setError("");

    try {
      await downloadTrainingLearnersCsv(
        trainingId,
      );
    } catch (err) {
      setError(biFriendlyErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  const rows = useMemo<BiGridRow[]>(
    () =>
      trainings.map((item) => ({
        ...item,
        id: item.trainingId,
        statusLabel: trainingStatusLabel(
          item.status,
        ),
        completionLabel: formatPercent(
          item.completionRate,
        ),
        progressLabel: formatPercent(
          item.averageProgress,
        ),
        scoreLabel: formatPercent(
          item.averageQuizScore,
        ),
        lastActivityLabel: formatDateTime(
          item.lastActivityAt,
        ),
      })),
    [trainings],
  );

  const columns =
    useMemo<GridColDef<BiGridRow>[]>(
      () => [
        {
          field: "title",
          headerName: "Formation",
          flex: 1,
          minWidth: 220,
        },
        {
          field: "statusLabel",
          headerName: "Statut",
          minWidth: 120,
        },
        {
          field: "totalEnrollments",
          headerName: "Inscriptions",
          type: "number",
          minWidth: 115,
        },
        {
          field: "activeEnrollments",
          headerName: "Actives",
          type: "number",
          minWidth: 95,
        },
        {
          field: "completedEnrollments",
          headerName: "Completees",
          type: "number",
          minWidth: 110,
        },
        {
          field: "completionLabel",
          headerName: "Completion",
          minWidth: 110,
        },
        {
          field: "progressLabel",
          headerName: "Progression",
          minWidth: 110,
        },
        {
          field: "scoreLabel",
          headerName: "Score quiz",
          minWidth: 105,
        },
        {
          field: "activeLearners",
          headerName: "Actifs periode",
          type: "number",
          minWidth: 120,
        },
        {
          field: "atRiskLearners",
          headerName: "A risque",
          type: "number",
          minWidth: 95,
        },
        {
          field: "dataInsufficientLearners",
          headerName: "Donnees insuff.",
          type: "number",
          minWidth: 125,
        },
        {
          field: "totalEvents",
          headerName: "Evenements",
          type: "number",
          minWidth: 105,
        },
        {
          field: "lastActivityLabel",
          headerName: "Derniere activite",
          minWidth: 180,
        },
      ],
      [],
    );

  const completionBars = useMemo(
    () =>
      trainings
        .slice(0, 8)
        .map((item) => ({
          label: item.title,
          value: Number(
            item.completionRate.toFixed(1),
          ),
        })),
    [trainings],
  );

  const progressBars = useMemo(
    () =>
      distributionData(
        distributions?.progress,
        progressLabels,
      ),
    [distributions],
  );

  const scoreBars = useMemo(
    () =>
      distributionData(
        distributions?.scores,
        scoreLabels,
      ),
    [distributions],
  );

  const riskBars = useMemo(
    () =>
      distributionData(
        distributions?.risk,
        riskLabels,
      ),
    [distributions],
  );

  if (loading) {
    return (
      <Stack spacing={3}>
        <SmartPageHeader
          eyebrow="Pilotage & BI"
          title={
            isAdmin
              ? "Statistiques globales"
              : "Statistiques de mes formations"
          }
          description="Préparation des indicateurs de pilotage et des visualisations."
        />

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
          {[0, 1, 2, 3].map((item) => (
            <Box
              key={item}
              sx={{
                p: 2.5,
                border: 1,
                borderColor: "divider",
                borderRadius: 3,
                bgcolor: "background.paper",
              }}
            >
              <Skeleton variant="text" width="52%" height={22} />
              <Skeleton
                variant="text"
                width="38%"
                height={46}
                sx={{ mt: 0.25 }}
              />
              <Skeleton variant="text" width="72%" height={20} />
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            p: 2.5,
            border: 1,
            borderColor: "divider",
            borderRadius: 3,
            bgcolor: "background.paper",
          }}
        >
          <Stack spacing={1.5}>
            <Skeleton variant="text" width={230} height={30} />
            <Skeleton variant="rounded" height={190} />
          </Stack>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
          Chargement des indicateurs de pilotage...
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow="Pilotage & BI"
        title={
          isAdmin
            ? "Statistiques globales"
            : "Statistiques de mes formations"
        }
        description={
          isAdmin
            ? "Indicateurs de suivi de l'apprentissage et de la performance des formations a l'echelle de la plateforme."
            : "Indicateurs de suivi de l'apprentissage et de la performance des formations dont vous etes responsable."
        }
        actions={
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
          >
            <Button
              variant="outlined"
              startIcon={
                refreshing ? (
                  <CircularProgress size={16} />
                ) : (
                  <RefreshCw size={17} />
                )
              }
              disabled={
                refreshing ||
                Boolean(filterError)
              }
              onClick={() =>
                setReloadNonce(
                  (current) => current + 1,
                )
              }
            >
              Actualiser
            </Button>

            <Tooltip
              title={
                trainingId
                  ? "Le CSV LP3 exporte les apprenants de la formation selectionnee."
                  : "Selectionnez une formation pour activer l'export CSV."
              }
            >
              <span>
                <Button
                  variant="contained"
                  startIcon={
                    exporting ? (
                      <CircularProgress
                        size={16}
                        color="inherit"
                      />
                    ) : (
                      <Download size={17} />
                    )
                  }
                  disabled={
                    !trainingId ||
                    exporting
                  }
                  onClick={() =>
                    void handleExport()
                  }
                >
                  {exporting
                    ? "Export..."
                    : "Exporter CSV"}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        }
      />

      {error ? (
        <Alert severity="error">
          {error}
        </Alert>
      ) : null}

      {filterError ? (
        <Alert severity="warning">
          {filterError}
        </Alert>
      ) : null}

      {visualWarning ? (
        <Alert severity="warning">
          {visualWarning} Les KPI et le tableau restent disponibles.
        </Alert>
      ) : null}

      <SmartSectionCard
        title="Perimetre d'analyse"
        description="Les KPI sont calcules par le backend BI. Le Web transmet uniquement les filtres."
      >
        <Stack spacing={2}>
          <ToggleButtonGroup
            exclusive
            value={period}
            onChange={(
              _event,
              next: BiPeriodPreset | null,
            ) => {
              if (next) {
                setPeriod(next);
              }
            }}
            aria-label="Periode d'analyse"
            size="small"
          >
            <ToggleButton
              value="7"
              aria-label="7 jours"
            >
              7 jours
            </ToggleButton>
            <ToggleButton
              value="30"
              aria-label="30 jours"
            >
              30 jours
            </ToggleButton>
            <ToggleButton
              value="CUSTOM"
              aria-label="Periode personnalisee"
            >
              Personnalise
            </ToggleButton>
          </ToggleButtonGroup>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md:
                  period === "CUSTOM"
                    ? "repeat(4, minmax(0, 1fr))"
                    : "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            {period === "CUSTOM" ? (
              <>
                <TextField
                  label="Du"
                  type="date"
                  value={customFrom}
                  onChange={(event) =>
                    setCustomFrom(
                      event.target.value,
                    )
                  }
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                />

                <TextField
                  label="Au"
                  type="date"
                  value={customTo}
                  onChange={(event) =>
                    setCustomTo(
                      event.target.value,
                    )
                  }
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                />
              </>
            ) : null}

            <TextField
              select
              label="Formation"
              value={trainingId}
              onChange={(event) =>
                setTrainingId(
                  Number(event.target.value),
                )
              }
            >
              <MenuItem value={0}>
                Toutes les formations
              </MenuItem>

              {trainingOptions.map(
                (training) => (
                  <MenuItem
                    key={training.id}
                    value={training.id}
                  >
                    {training.title}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              select
              label="Statut d'inscription"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as BiEnrollmentStatus,
                )
              }
            >
              <MenuItem value="">
                Tous les statuts
              </MenuItem>
              <MenuItem value="ACTIVE">
                Active
              </MenuItem>
              <MenuItem value="COMPLETED">
                Terminee
              </MenuItem>
            </TextField>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
          >
            {rangeLabel(
              effectiveRange.from,
              effectiveRange.to,
            )}
            {trainingId
              ? " - export CSV disponible pour la formation selectionnee"
              : ""}
          </Typography>
        </Stack>
      </SmartSectionCard>

      {summary ? (
        <Stack spacing={1.5}>
          <Box>
            <Typography
              variant="overline"
              color="primary.main"
              sx={{
                fontWeight: 900,
                letterSpacing: "0.08em",
              }}
            >
              Synthese BI
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
            >
              Volumes, activite et performance sur le perimetre selectionne.
            </Typography>
          </Box>

          <Box
            aria-label="Indicateurs BI"
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(4, minmax(0, 1fr))",
              },
              gap: 2,
              "& > div > .MuiCard-root": {
                height: "100%",
                transition:
                  "transform 160ms ease, box-shadow 160ms ease",
              },
              "& > div > .MuiCard-root:hover": {
                transform: "translateY(-2px)",
                boxShadow: 4,
              },
            }}
          >
            <Box
              sx={{
                "& > .MuiCard-root": {
                  borderTop: 4,
                  borderColor: "info.main",
                  "& [data-smart-metric-icon='true']": {
                    bgcolor: "info.main",
                    color: "info.contrastText",
                  },
                },
              }}
            >
              <SmartMetricCard
                label={
                  isAdmin
                    ? "Apprenants distincts"
                    : "Apprenants suivis"
                }
                value={formatNumber(
                  summary.totalLearners,
                )}
                helper={
                  isAdmin
                    ? "Personnes inscrites dans le perimetre"
                    : "Apprenants distincts dans votre perimetre"
                }
                icon={<Users />}
              />
            </Box>

            <Box
              sx={{
                "& > .MuiCard-root": {
                  borderTop: 4,
                  borderColor: "primary.main",
                  "& [data-smart-metric-icon='true']": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  },
                },
              }}
            >
              <SmartMetricCard
                label={
                  isAdmin
                    ? "Inscriptions"
                    : "Inscriptions actives"
                }
                value={formatNumber(
                  isAdmin
                    ? summary.totalEnrollments
                    : summary.activeEnrollments,
                )}
                helper={
                  isAdmin
                    ? `${formatNumber(
                        summary.activeEnrollments,
                      )} active(s) - ${formatNumber(
                        summary.completedEnrollments,
                      )} terminee(s)`
                    : `${formatNumber(
                        summary.completedEnrollments,
                      )} terminee(s)`
                }
                icon={<Gauge />}
              />
            </Box>

            <Box
              sx={{
                "& > .MuiCard-root": {
                  borderTop: 4,
                  borderColor: "success.main",
                  "& [data-smart-metric-icon='true']": {
                    bgcolor: "success.main",
                    color: "success.contrastText",
                  },
                },
              }}
            >
              <SmartMetricCard
                label={
                  isAdmin
                    ? "Formations publiees"
                    : "Formations du perimetre"
                }
                value={formatNumber(
                  isAdmin
                    ? summary.publishedTrainings
                    : summary.totalTrainings,
                )}
                helper={
                  isAdmin
                    ? `${formatNumber(
                        summary.publishedTrainings,
                      )} publiee(s) sur ${formatNumber(
                        summary.totalTrainings,
                      )} formation(s)`
                    : `${formatNumber(
                        summary.publishedTrainings,
                      )} publiee(s)`
                }
                icon={<BookOpenCheck />}
              />
            </Box>

            <Box
              sx={{
                "& > .MuiCard-root": {
                  borderTop: 4,
                  borderColor: "info.main",
                  "& [data-smart-metric-icon='true']": {
                    bgcolor: "info.main",
                    color: "info.contrastText",
                  },
                },
              }}
            >
              <SmartMetricCard
                label="Actifs sur la periode"
                value={formatNumber(
                  summary.activeLearners,
                )}
                helper={`${formatNumber(
                  summary.totalEvents,
                )} evenement(s) d'apprentissage`}
                icon={<Activity />}
              />
            </Box>

            <Box
              sx={{
                "& > .MuiCard-root": {
                  borderTop: 4,
                  borderColor: "success.main",
                  "& [data-smart-metric-icon='true']": {
                    bgcolor: "success.main",
                    color: "success.contrastText",
                  },
                },
              }}
            >
              <SmartMetricCard
                label="Taux de completion"
                value={formatPercent(
                  summary.completionRate,
                )}
                helper={`${formatNumber(
                  summary.completedEnrollments,
                )} inscription(s) terminee(s)`}
                icon={<Trophy />}
              />
            </Box>

            <Box
              sx={{
                "& > .MuiCard-root": {
                  borderTop: 4,
                  borderColor: "primary.main",
                  "& [data-smart-metric-icon='true']": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  },
                },
              }}
            >
              <SmartMetricCard
                label="Progression moyenne"
                value={formatPercent(
                  summary.averageProgress,
                )}
                helper={
                  summary.averageProgress === null
                    ? "Aucune progression disponible"
                    : "Progression moyenne enregistree"
                }
                icon={<Gauge />}
              />
            </Box>

            <Box
              sx={{
                "& > .MuiCard-root": {
                  borderTop: 4,
                  borderColor: "warning.main",
                  "& [data-smart-metric-icon='true']": {
                    bgcolor: "warning.main",
                    color: "warning.contrastText",
                  },
                },
              }}
            >
              <SmartMetricCard
                label="Score quiz moyen"
                value={formatPercent(
                  summary.averageQuizScore,
                )}
                helper={
                  summary.averageQuizScore === null
                    ? "Aucun score quiz disponible"
                    : "Scores reellement enregistres"
                }
                icon={<Trophy />}
              />
            </Box>

            <Box
              sx={{
                "& > .MuiCard-root": {
                  borderTop: 4,
                  borderColor: "error.main",
                  "& [data-smart-metric-icon='true']": {
                    bgcolor: "error.main",
                    color: "error.contrastText",
                  },
                },
              }}
            >
              <SmartMetricCard
                label="Apprenants a risque"
                value={formatNumber(
                  summary.atRiskLearners,
                )}
                helper="Apprenants distincts en risque moyen ou eleve"
                icon={<ShieldAlert />}
              />
            </Box>
          </Box>
        </Stack>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "repeat(2, minmax(0, 1fr))",
          },
          gap: 2,
        }}
      >
        <SmartSectionCard
          title="Tendance d'activite"
          description="Evenements d'apprentissage et apprenants actifs sur la periode."
        >
          <ActivityTrend
            points={activity}
          />
        </SmartSectionCard>

        <SmartSectionCard
          title="Completion par formation"
          description="Taux de completion fourni par le backend, jusqu'a 8 formations affichees."
        >
          <CompletionByTrainingChart
            data={completionBars}
            emptyLabel="Aucune formation dans ce perimetre."
          />
        </SmartSectionCard>

        <SmartSectionCard
          title="Distribution de la progression"
          description="Repartition des progressions autoritaires."
        >
          <DistributionHistogram
            data={progressBars}
            ariaLabel="Distribution des niveaux de progression"
            emptyLabel="Aucune progression disponible."
          />
        </SmartSectionCard>

        <SmartSectionCard
          title="Distribution des scores quiz"
          description="Les apprenants sans score ne sont pas transformes en faux zero."
        >
          <DistributionHistogram
            data={scoreBars}
            ariaLabel="Distribution des scores quiz"
            emptyLabel="Aucun score quiz disponible."
          />
        </SmartSectionCard>

        <SmartSectionCard
          title="Analyses de risque par formation"
          description="LOW, MEDIUM, HIGH et donnees insuffisantes sont comptabilises par couple apprenant-formation."
        >
          <RiskDonut
            data={riskBars}
            totalLearners={summary?.totalLearners ?? 0}
            totalEnrollments={summary?.totalEnrollments ?? 0}
            emptyLabel="Aucune donnee de risque disponible."
          />
        </SmartSectionCard>
      </Box>

      <SmartSectionCard
        title="Formations du perimetre"
        description={`${rows.length} formation(s) retournee(s) par le backend BI.`}
      >
        {!rows.length ? (
          <SmartEmptyState
            title="Aucune formation pour ces filtres"
            description="Modifiez la periode, la formation ou le statut d'inscription."
            icon={<BookOpenCheck />}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: 520,
            }}
          >
            <DataGrid
              rows={rows}
              columns={columns}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: {
                  paginationModel: {
                    page: 0,
                    pageSize: 10,
                  },
                },
              }}
              aria-label="Tableau des indicateurs BI par formation"
              sx={{
                border: 0,
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontWeight: 800,
                },
              }}
            />
          </Box>
        )}
      </SmartSectionCard>
    </Stack>
  );
}