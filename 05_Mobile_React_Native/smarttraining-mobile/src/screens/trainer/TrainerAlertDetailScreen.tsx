import { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import {
  getTrainerAlertDetail,
  ignoreTrainerAlert,
  markTrainerAlertInProgress,
  resolveTrainerAlert,
} from "../../features/trainer/trainerAlertService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerAlert,
  TrainerAlertDetailData,
  TrainerRiskFactor,
  TrainerRiskIndicator,
} from "../../types/trainerAlertMobile";

type Props = {
  alertId: number;
};

function learnerName(data: TrainerAlertDetailData): string {
  const learner = data.learner;

  return (
    learner.fullName ||
    [learner.firstName, learner.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    learner.email
  );
}

function statusLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    OPEN: "À traiter",
    IN_PROGRESS: "En cours",
    RESOLVED: "Résolue",
    IGNORED: "Ignorée",
  };

  return value ? labels[value] || "À examiner" : "À examiner";
}

function severityLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    LOW: "Priorité faible",
    MEDIUM: "Priorité moyenne",
    HIGH: "Priorité élevée",
  };

  return value ? labels[value] || "Priorité à examiner" : "Priorité à examiner";
}

function typeLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    LOW_PROGRESS: "Progression faible",
    LOW_SCORE: "Score à renforcer",
    INACTIVITY: "Inactivité",
    AI_RISK: "Signal d’accompagnement",
    QUIZ_FAILURE: "Quiz à reprendre",
    LOW_ACTIVITY: "Activité faible",
  };

  return value ? labels[value] || "Signal pédagogique" : "Signal pédagogique";
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Non disponible";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function insufficient(
  risk?: TrainerRiskIndicator | null,
): boolean {
  return (
    !risk ||
    risk.dataStatus === "INSUFFICIENT" ||
    risk.riskLevel === "DATA_INSUFFICIENT"
  );
}

function riskLabel(
  risk?: TrainerRiskIndicator | null,
): string {
  if (insufficient(risk)) {
    return "Données insuffisantes";
  }

  if (risk?.riskLevel === "HIGH") {
    return "Accompagnement prioritaire";
  }

  if (risk?.riskLevel === "MEDIUM") {
    return "Accompagnement à renforcer";
  }

  if (risk?.riskLevel === "LOW") {
    return "Suivi léger";
  }

  return "Situation à examiner";
}

function fallbackFactors(
  risk: TrainerRiskIndicator | null,
): TrainerRiskFactor[] {
  if (!risk) {
    return [];
  }

  if (risk.factors?.length) {
    return risk.factors;
  }

  return (risk.riskFactors ?? []).map((value) => ({
    label: value,
    explanation: null,
  }));
}

export default function TrainerAlertDetailScreen({
  alertId,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [data, setData] =
    useState<TrainerAlertDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const loaded = await getTrainerAlertDetail(alertId);
    setData(loaded);
  }

  useEffect(() => {
    let active = true;

    if (!Number.isFinite(alertId) || alertId <= 0) {
      setError("Alerte invalide.");
      setLoading(false);

      return () => {
        active = false;
      };
    }

    void getTrainerAlertDetail(alertId)
      .then((loaded) => {
        if (active) {
          setData(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible d’ouvrir cette alerte ou elle ne fait pas partie de votre périmètre.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [alertId]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError("Impossible d’actualiser cette alerte.");
    } finally {
      setRefreshing(false);
    }
  }

  async function act(
    action: "IN_PROGRESS" | "RESOLVE" | "IGNORE",
  ) {
    if (!data || acting) {
      return;
    }

    setActing(true);
    setError("");
    setSuccess("");

    try {
      let updated: TrainerAlert;

      if (action === "IN_PROGRESS") {
        updated = await markTrainerAlertInProgress(
          data.alert.id,
        );
        setSuccess(
          "L’alerte est maintenant prise en charge.",
        );
      } else if (action === "RESOLVE") {
        updated = await resolveTrainerAlert(data.alert.id);
        setSuccess("L’alerte a été résolue.");
      } else {
        updated = await ignoreTrainerAlert(data.alert.id);
        setSuccess("L’alerte a été ignorée.");
      }

      setData({
        ...data,
        alert: updated,
      });
    } catch {
      setError(
        "L’action n’a pas pu être enregistrée.",
      );
    } finally {
      setActing(false);
    }
  }

  const factors = useMemo(
    () => fallbackFactors(data?.risk ?? null),
    [data?.risk],
  );

  if (loading) {
    return (
      <LoadingState message="Ouverture de l’alerte..." />
    );
  }

  if (!data) {
    return (
      <ScreenContainer>
        <View style={styles.fallback}>
          <ErrorMessage
            message={error || "Alerte indisponible."}
            onRetry={() => void refresh()}
          />
        </View>
      </ScreenContainer>
    );
  }

  const riskIsInsufficient = insufficient(data.risk);

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: theme.shape.cardPadding * 2,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <SectionHeader
            title={data.alert.title || "Alerte pédagogique"}
            subtitle={`${learnerName(data)} · ${data.training.title}`}
          />

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => void refresh()}
            />
          ) : null}

          {success ? (
            <View
              style={[
                styles.success,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderRadius: theme.shape.cardRadius,
                },
              ]}
            >
              <Text
                style={[
                  styles.successText,
                  { color: theme.colors.foreground },
                ]}
              >
                {success}
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.alertCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <View style={styles.badges}>
              <Badge text={statusLabel(data.alert.status)} />
              <Badge text={severityLabel(data.alert.severity)} />
              <Badge text={typeLabel(data.alert.alertType)} />
            </View>

            {data.alert.message ? (
              <Text
                style={[
                  styles.message,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                {data.alert.message}
              </Text>
            ) : null}

            <Text
              style={[
                styles.date,
                { color: theme.colors.foregroundSubtle },
              ]}
            >
              Créée le {formatDate(data.alert.createdAt)}
            </Text>
          </View>

          <SectionHeader
            title="Lecture du risque"
            subtitle="Une synthèse explicable pour préparer votre accompagnement."
          />

          <View
            style={[
              styles.riskCard,
              {
                backgroundColor: riskIsInsufficient
                  ? theme.colors.surfaceSoft
                  : theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <Text
              style={[
                styles.riskTitle,
                { color: theme.colors.foreground },
              ]}
            >
              {riskLabel(data.risk)}
            </Text>

            {riskIsInsufficient ? (
              <Text
                style={[
                  styles.riskText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Il n’y a pas encore assez d’activité pour
                conclure à un niveau de risque. Continuez le
                suivi sans classer cet apprenant en risque élevé.
              </Text>
            ) : (
              <View style={styles.metrics}>
                <Metric
                  label="Progression"
                  value={`${data.risk?.averageProgress ?? 0} %`}
                />
                <Metric
                  label="Score moyen"
                  value={`${data.risk?.averageScore ?? 0} %`}
                />
                <Metric
                  label="Activités"
                  value={String(data.risk?.totalEvents ?? 0)}
                />
                <Metric
                  label="Demandes d’aide"
                  value={String(data.risk?.helpRequests ?? 0)}
                />
              </View>
            )}
          </View>

          <SectionHeader
            title="Facteurs observés"
            subtitle="Les éléments concrets qui expliquent la situation."
          />

          {factors.length === 0 ? (
            <View
              style={[
                styles.empty,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Aucun facteur explicable supplémentaire n’est disponible.
              </Text>
            </View>
          ) : (
            factors.map((factor, index) => (
              <View
                key={`${factor.type ?? factor.label ?? "facteur"}-${index}`}
                style={[
                  styles.factor,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.shape.cardRadius,
                    borderWidth: theme.shape.borderWidth,
                    padding: theme.shape.cardPadding,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.factorTitle,
                    { color: theme.colors.foreground },
                  ]}
                >
                  {factor.label || "Facteur observé"}
                </Text>
                {factor.explanation ? (
                  <Text
                    style={[
                      styles.factorText,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    {factor.explanation}
                  </Text>
                ) : null}
              </View>
            ))
          )}

          {(data.risk?.recommendations?.length ?? 0) > 0 ? (
            <>
              <SectionHeader
                title="Pistes d’accompagnement"
                subtitle="Des actions pédagogiques à considérer."
              />
              <View
                style={[
                  styles.recommendations,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderRadius: theme.shape.cardRadius,
                    padding: theme.shape.cardPadding,
                  },
                ]}
              >
                {data.risk?.recommendations?.map(
                  (recommendation, index) => (
                    <Text
                      key={`${recommendation}-${index}`}
                      style={[
                        styles.recommendation,
                        { color: theme.colors.foregroundMuted },
                      ]}
                    >
                      • {recommendation}
                    </Text>
                  ),
                )}
              </View>
            </>
          ) : null}

          <SectionHeader
            title="Traitement de l’alerte"
            subtitle="Enregistrez l’état de votre prise en charge."
          />

          <View style={styles.actions}>
            {data.alert.status === "OPEN" ? (
              <AppButton
                title={acting ? "Enregistrement..." : "Prendre en charge"}
                onPress={() => void act("IN_PROGRESS")}
                disabled={acting}
                style={styles.actionButton}
              />
            ) : null}

            {data.alert.status === "OPEN" ||
            data.alert.status === "IN_PROGRESS" ? (
              <>
                <AppButton
                  title={acting ? "Enregistrement..." : "Marquer comme résolue"}
                  onPress={() => void act("RESOLVE")}
                  disabled={acting}
                  style={styles.actionButton}
                />
                <AppButton
                  title={acting ? "Enregistrement..." : "Ignorer l’alerte"}
                  onPress={() => void act("IGNORE")}
                  disabled={acting}
                  variant="secondary"
                  style={styles.actionButton}
                />
              </>
            ) : (
              <View
                style={[
                  styles.closed,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderRadius: theme.shape.cardRadius,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.closedText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Cette alerte est clôturée pour le suivi courant.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function Badge({ text }: { text: string }) {
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: theme.colors.surfaceSoft,
            borderColor: theme.colors.border,
            borderWidth: theme.shape.borderWidth,
          },
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            { color: theme.colors.accent },
          ]}
        >
          {text}
        </Text>
      </View>
    );
  }

  function Metric({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) {
    return (
      <View style={styles.metric}>
        <Text
          style={[
            styles.metricLabel,
            { color: theme.colors.foregroundSubtle },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.metricValue,
            { color: theme.colors.foreground },
          ]}
        >
          {value}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fallback: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingTop: 24,
  },
  scrollArea: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
    maxWidth: 1080,
    alignSelf: "center",
  },
  success: {
    padding: 13,
    marginBottom: 14,
  },
  successText: {
    fontSize: 13,
    fontWeight: "800",
  },
  alertCard: {
    marginBottom: 22,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
  },
  date: {
    fontSize: 11,
    marginTop: 12,
  },
  riskCard: {
    marginBottom: 20,
  },
  riskTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  riskText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 130,
    minWidth: 0,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "800",
  },
  metricValue: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },
  factor: {
    marginBottom: 10,
  },
  factorTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  factorText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  empty: {
    padding: 17,
    marginBottom: 18,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  recommendations: {
    marginBottom: 20,
  },
  recommendation: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 7,
  },
  actions: {
    marginBottom: 20,
  },
  actionButton: {
    marginBottom: 10,
  },
  closed: {
    padding: 14,
  },
  closedText: {
    fontSize: 13,
    lineHeight: 19,
  },
});