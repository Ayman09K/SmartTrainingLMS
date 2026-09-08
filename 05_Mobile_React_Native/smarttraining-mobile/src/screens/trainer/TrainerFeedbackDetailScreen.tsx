import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import {
  getTrainerFeedbackDetail,
  markTrainerFeedbackInProgress,
  resolveTrainerFeedback,
} from "../../features/trainer/trainerFeedbackReviewService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerFeedback,
  TrainerFeedbackListItem,
} from "../../types/trainerFeedbackReviewMobile";

type Props = {
  trainerId: number;
  feedbackId: number;
};

function learnerName(
  item: TrainerFeedbackListItem,
): string {
  const learner = item.learner;

  if (!learner) {
    return "Apprenant";
  }

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
    RESOLVED: "Traité",
    CLOSED: "Clôturé",
  };

  return value ? labels[value] || "À examiner" : "À examiner";
}

function difficultyLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    VERY_EASY: "Très facile",
    EASY: "Facile",
    NORMAL: "Normal",
    HARD: "Difficile",
    VERY_HARD: "Très difficile",
  };

  return value ? labels[value] || "Non renseignée" : "Non renseignée";
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

export default function TrainerFeedbackDetailScreen({
  trainerId,
  feedbackId,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [item, setItem] =
    useState<TrainerFeedbackListItem | null>(null);
  const [trainerResponse, setTrainerResponse] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const loaded =
      await getTrainerFeedbackDetail(trainerId, feedbackId);

    if (!loaded) {
      throw new Error("Feedback hors périmètre.");
    }

    setItem(loaded);

    if (loaded.feedback.trainerResponse) {
      setTrainerResponse(loaded.feedback.trainerResponse);
    }
  }

  useEffect(() => {
    let active = true;

    void getTrainerFeedbackDetail(trainerId, feedbackId)
      .then((loaded) => {
        if (!active) {
          return;
        }

        if (!loaded) {
          setError(
            "Feedback introuvable ou hors de votre périmètre.",
          );
          return;
        }

        setItem(loaded);
        setTrainerResponse(
          loaded.feedback.trainerResponse ?? "",
        );
        setError("");
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible d’ouvrir ce feedback ou il ne fait pas partie de votre périmètre.",
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
  }, [feedbackId, trainerId]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError("Impossible d’actualiser ce feedback.");
    } finally {
      setRefreshing(false);
    }
  }

  function applyUpdatedFeedback(
    updated: TrainerFeedback,
  ) {
    setItem((current) =>
      current
        ? {
            ...current,
            feedback: updated,
          }
        : current,
    );
  }

  async function markInProgress() {
    if (!item || acting) {
      return;
    }

    setActing(true);
    setError("");
    setSuccess("");

    try {
      const updated =
        await markTrainerFeedbackInProgress(
          item.feedback.id,
        );

      applyUpdatedFeedback(updated);
      setSuccess(
        "Le feedback est maintenant pris en charge.",
      );
    } catch {
      setError(
        "La prise en charge n’a pas pu être enregistrée.",
      );
    } finally {
      setActing(false);
    }
  }

  async function resolve() {
    if (!item || acting) {
      return;
    }

    setActing(true);
    setError("");
    setSuccess("");

    try {
      const updated = await resolveTrainerFeedback(
        item.feedback.id,
        trainerResponse,
      );

      applyUpdatedFeedback(updated);
      setTrainerResponse(
        updated.trainerResponse ?? trainerResponse,
      );
      setSuccess(
        "Le feedback a été traité.",
      );
    } catch {
      setError(
        "La résolution du feedback n’a pas pu être enregistrée.",
      );
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <LoadingState message="Ouverture du feedback..." />
    );
  }

  if (!item) {
    return (
      <ScreenContainer>
        <View style={styles.fallback}>
          <ErrorMessage
            message={error || "Feedback indisponible."}
            onRetry={() => void refresh()}
          />
        </View>
      </ScreenContainer>
    );
  }

  const { feedback } = item;
  const canAct =
    feedback.status === "OPEN" ||
    feedback.status === "IN_PROGRESS";

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
            title="Feedback apprenant"
            subtitle={`${learnerName(item)} · ${item.training?.title || "Formation suivie"}`}
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
              styles.feedbackCard,
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
              <Badge text={statusLabel(feedback.status)} />
              <Badge
                text={`Difficulté : ${difficultyLabel(feedback.difficultyLevel)}`}
              />
              {feedback.needHelp ? (
                <Badge text="Demande d’aide" />
              ) : null}
            </View>

            <Text
              style={[
                styles.messageLabel,
                { color: theme.colors.foregroundSubtle },
              ]}
            >
              MESSAGE DE L’APPRENANT
            </Text>
            <Text
              style={[
                styles.message,
                { color: theme.colors.foreground },
              ]}
            >
              {feedback.message || "Aucun commentaire ajouté."}
            </Text>

            <Text
              style={[
                styles.date,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Envoyé le {formatDate(feedback.createdAt)}
            </Text>
          </View>

          <SectionHeader
            title="Réponse formateur"
            subtitle="Votre réponse est visible par l’apprenant après traitement."
          />

          {canAct ? (
            <>
              <TextInput
                value={trainerResponse}
                onChangeText={setTrainerResponse}
                multiline
                textAlignVertical="top"
                placeholder="Ajouter une réponse pédagogique (facultatif)..."
                placeholderTextColor={theme.colors.foregroundSubtle}
                style={[
                  styles.responseInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.shape.cardRadius,
                    borderWidth: theme.shape.borderWidth,
                    color: theme.colors.foreground,
                  },
                ]}
              />

              <View style={styles.actions}>
                {feedback.status === "OPEN" ? (
                  <AppButton
                    title={
                      acting
                        ? "Enregistrement..."
                        : "Prendre en charge"
                    }
                    onPress={() =>
                      void markInProgress()
                    }
                    disabled={acting}
                    variant="secondary"
                    style={styles.actionButton}
                  />
                ) : null}

                <AppButton
                  title={
                    acting
                      ? "Enregistrement..."
                      : "Répondre et marquer traité"
                  }
                  onPress={() => void resolve()}
                  disabled={acting}
                  style={styles.actionButton}
                />
              </View>
            </>
          ) : (
            <View
              style={[
                styles.resolved,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderRadius: theme.shape.cardRadius,
                  padding: theme.shape.cardPadding,
                },
              ]}
            >
              <Text
                style={[
                  styles.resolvedLabel,
                  { color: theme.colors.foregroundSubtle },
                ]}
              >
                RÉPONSE ENREGISTRÉE
              </Text>
              <Text
                style={[
                  styles.resolvedText,
                  { color: theme.colors.foreground },
                ]}
              >
                {feedback.trainerResponse ||
                  "Feedback traité sans réponse écrite."}
              </Text>
              <Text
                style={[
                  styles.date,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Traitement : {formatDate(feedback.resolvedAt)}
              </Text>
            </View>
          )}
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
    maxWidth: 980,
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
  feedbackCard: {
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
  messageLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 18,
  },
  message: {
    fontSize: 15,
    lineHeight: 23,
    marginTop: 6,
  },
  date: {
    fontSize: 11,
    marginTop: 13,
  },
  responseInput: {
    minHeight: 130,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    marginTop: 14,
  },
  actionButton: {
    marginBottom: 10,
  },
  resolved: {
    marginBottom: 20,
  },
  resolvedLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  resolvedText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
});