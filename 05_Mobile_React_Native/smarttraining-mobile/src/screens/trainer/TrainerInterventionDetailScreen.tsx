import { useEffect, useState } from "react";
import {
  Platform,
  Alert,
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
  cancelTrainerIntervention,
  getTrainerInterventionDetail,
  markTrainerInterventionDone,
} from "../../features/trainer/trainerActionService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerInterventionDetailData,
  TrainerInterventionResponse,
} from "../../types/trainerActionMobile";

type Props = {
  interventionId: number;
};

function learnerName(
  data: TrainerInterventionDetailData,
): string {
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

function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    PLANNED: "Planifiée",
    DONE: "Réalisée",
    CANCELLED: "Annulée",
  };

  return labels[value] || "À examiner";
}

function typeLabel(value: string): string {
  const labels: Record<string, string> = {
    MESSAGE: "Message",
    CALL: "Appel",
    SUPPORT_SESSION: "Séance d’accompagnement",
    MANUAL_REVIEW: "Revue manuelle",
    FOLLOW_UP: "Suivi",
  };

  return labels[value] || "Intervention";
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


type ConfirmAction = () => void;

function confirmMobileAction(
  title: string,
  message: string,
  destructive: boolean,
  action: ConfirmAction,
) {
  const browserConfirm = (
    globalThis as typeof globalThis & {
      confirm?: (message?: string) => boolean;
    }
  ).confirm;

  if (Platform.OS === "web" && typeof browserConfirm === "function") {
    if (browserConfirm(`${title}\n\n${message}`)) {
      action();
    }
    return;
  }

  Alert.alert(title, message, [
    {
      text: "Retour",
      style: "cancel",
    },
    {
      text: "Confirmer",
      style: destructive ? "destructive" : "default",
      onPress: action,
    },
  ]);
}

// PATCH15BIS_H_MOBILE_NATIVE_WEB_CONFIRM_HELPER

export default function TrainerInterventionDetailScreen({
  interventionId,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [data, setData] =
    useState<TrainerInterventionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const loaded =
      await getTrainerInterventionDetail(interventionId);
    setData(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerInterventionDetail(interventionId)
      .then((loaded) => {
        if (active) {
          setData(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible d’ouvrir cette intervention.",
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
  }, [interventionId]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError(
        "Impossible d’actualiser cette intervention.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  function apply(
    intervention: TrainerInterventionResponse,
  ) {
    setData((current) =>
      current
        ? {
            ...current,
            intervention,
          }
        : current,
    );
  }

  async function done() {
    if (!data || acting) {
      return;
    }

    setActing(true);
    setError("");
    setSuccess("");

    try {
      const updated =
        await markTrainerInterventionDone(
          data.intervention.id,
        );
      apply(updated);
      setSuccess("Intervention marquée comme réalisée.");
    } catch {
      setError(
        "Impossible de clôturer cette intervention.",
      );
    } finally {
      setActing(false);
    }
  }

  async function cancel() {
    if (!data || acting) {
      return;
    }

    setActing(true);
    setError("");
    setSuccess("");

    try {
      const updated =
        await cancelTrainerIntervention(
          data.intervention.id,
        );
      apply(updated);
      setSuccess("Intervention annulée.");
    } catch {
      setError(
        "Impossible d’annuler cette intervention.",
      );
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <LoadingState message="Ouverture de l’intervention..." />
    );
  }

  if (!data) {
    return (
      <ScreenContainer>
        <View style={styles.fallback}>
          <ErrorMessage
            message={error || "Intervention indisponible."}
            onRetry={() => void refresh()}
          />
        </View>
      </ScreenContainer>
    );
  }

  const planned = data.intervention.status === "PLANNED";

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
            title={typeLabel(
              data.intervention.interventionType,
            )}
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
              styles.card,
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
                styles.status,
                { color: theme.colors.accent },
              ]}
            >
              {statusLabel(data.intervention.status)}
            </Text>

            <Text
              style={[
                styles.note,
                { color: theme.colors.foreground },
              ]}
            >
              {data.intervention.note}
            </Text>

            <Text
              style={[
                styles.date,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Créée le {formatDate(data.intervention.createdAt)}
            </Text>

            {data.intervention.closedAt ? (
              <Text
                style={[
                  styles.date,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Clôturée le {formatDate(data.intervention.closedAt)}
              </Text>
            ) : null}
          </View>

          {planned ? (
            <View style={styles.actions}>
              <AppButton
                title={
                  acting
                    ? "Enregistrement..."
                    : "Marquer comme réalisée"
                }
                onPress={() =>
                  confirmMobileAction(
                    "Confirmer la clôture",
                    "Marquer cette intervention comme réalisée ?",
                    false,
                    () => void done(),
                  )
                }
                disabled={acting}
                style={styles.action}
              />
              <AppButton
                title={
                  acting
                    ? "Enregistrement..."
                    : "Annuler l’intervention"
                }
                onPress={() =>
                  confirmMobileAction(
                    "Confirmer l’annulation",
                    "Annuler cette intervention ?",
                    true,
                    () => void cancel(),
                  )
                }
                disabled={acting}
                variant="secondary"
                style={styles.action}
              />
            </View>
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
                Cette intervention est clôturée.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
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
    maxWidth: 900,
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
  card: {
    marginBottom: 16,
  },
  status: {
    fontSize: 12,
    fontWeight: "900",
  },
  note: {
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
  },
  date: {
    fontSize: 11,
    marginTop: 12,
  },
  actions: {},
  action: {
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