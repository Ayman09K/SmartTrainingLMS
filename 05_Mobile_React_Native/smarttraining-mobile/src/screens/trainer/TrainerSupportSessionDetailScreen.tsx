import { useEffect, useState } from "react";
import {
  Platform,
  Alert,
  Linking,
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
  cancelTrainerSupportSession,
  completeTrainerSupportSession,
  getTrainerSupportSessionDetail,
} from "../../features/trainer/trainerActionService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerSupportSessionDetailData,
  TrainerSupportSessionResponse,
} from "../../types/trainerActionMobile";

type Props = {
  sessionId: number;
};

function learnerName(
  data: TrainerSupportSessionDetailData,
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
    SCHEDULED: "Planifiée",
    COMPLETED: "Réalisée",
    CANCELLED: "Annulée",
  };

  return labels[value] || "À examiner";
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

export default function TrainerSupportSessionDetailScreen({
  sessionId,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [data, setData] =
    useState<TrainerSupportSessionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const loaded =
      await getTrainerSupportSessionDetail(sessionId);
    setData(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerSupportSessionDetail(sessionId)
      .then((loaded) => {
        if (active) {
          setData(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible d’ouvrir cette séance.",
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
  }, [sessionId]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError(
        "Impossible d’actualiser cette séance.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  function apply(
    session: TrainerSupportSessionResponse,
  ) {
    setData((current) =>
      current
        ? {
            ...current,
            session,
          }
        : current,
    );
  }

  async function openMeeting() {
    if (!data) {
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(
        data.session.meetingLink,
      );

      if (!canOpen) {
        setError(
          "Ce lien de réunion ne peut pas être ouvert sur cet appareil.",
        );
        return;
      }

      await Linking.openURL(data.session.meetingLink);
    } catch {
      setError(
        "Impossible d’ouvrir le lien de réunion.",
      );
    }
  }

  async function complete() {
    if (!data || acting) {
      return;
    }

    setActing(true);
    setError("");
    setSuccess("");

    try {
      const updated =
        await completeTrainerSupportSession(
          data.session.id,
        );
      apply(updated);
      setSuccess("Séance marquée comme réalisée.");
    } catch {
      setError(
        "Impossible de clôturer cette séance.",
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
        await cancelTrainerSupportSession(
          data.session.id,
        );
      apply(updated);
      setSuccess("Séance annulée.");
    } catch {
      setError(
        "Impossible d’annuler cette séance.",
      );
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <LoadingState message="Ouverture de la séance..." />
    );
  }

  if (!data) {
    return (
      <ScreenContainer>
        <View style={styles.fallback}>
          <ErrorMessage
            message={error || "Séance indisponible."}
            onRetry={() => void refresh()}
          />
        </View>
      </ScreenContainer>
    );
  }

  const scheduled = data.session.status === "SCHEDULED";

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
            title={data.session.title}
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
              {statusLabel(data.session.status)}
            </Text>

            <Text
              style={[
                styles.dateMain,
                { color: theme.colors.foreground },
              ]}
            >
              {formatDate(data.session.scheduledAt)}
            </Text>

            <Text
              style={[
                styles.label,
                { color: theme.colors.foregroundSubtle },
              ]}
            >
              OBJECTIF
            </Text>
            <Text
              style={[
                styles.text,
                { color: theme.colors.foreground },
              ]}
            >
              {data.session.objective}
            </Text>

            {data.session.note ? (
              <>
                <Text
                  style={[
                    styles.label,
                    { color: theme.colors.foregroundSubtle },
                  ]}
                >
                  NOTE
                </Text>
                <Text
                  style={[
                    styles.text,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {data.session.note}
                </Text>
              </>
            ) : null}

            {data.session.closedAt ? (
              <Text
                style={[
                  styles.closedDate,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Clôturée le {formatDate(data.session.closedAt)}
              </Text>
            ) : null}
          </View>

          <AppButton
            title="Ouvrir le lien de réunion"
            onPress={() => void openMeeting()}
            style={styles.action}
          />

          {scheduled ? (
            <>
              <AppButton
                title={
                  acting
                    ? "Enregistrement..."
                    : "Marquer comme réalisée"
                }
                onPress={() =>
                  confirmMobileAction(
                    "Confirmer la clôture",
                    "Marquer cette séance comme réalisée ?",
                    false,
                    () => void complete(),
                  )
                }
                disabled={acting}
                style={styles.action}
              />
              <AppButton
                title={
                  acting
                    ? "Enregistrement..."
                    : "Annuler la séance"
                }
                onPress={() =>
                  confirmMobileAction(
                    "Confirmer l’annulation",
                    "Annuler cette séance d’accompagnement ?",
                    true,
                    () => void cancel(),
                  )
                }
                disabled={acting}
                variant="secondary"
                style={styles.action}
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
                Cette séance est clôturée pour le suivi courant.
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
    marginBottom: 14,
  },
  status: {
    fontSize: 12,
    fontWeight: "900",
  },
  dateMain: {
    fontSize: 19,
    fontWeight: "900",
    marginTop: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 18,
  },
  text: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },
  closedDate: {
    fontSize: 11,
    marginTop: 15,
  },
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