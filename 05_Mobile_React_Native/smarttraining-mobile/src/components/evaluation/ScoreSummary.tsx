import { StyleSheet, Text, View } from "react-native";

import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { QuizAttemptFullResponse } from "../../types/evaluation";

function statusLabel(status: QuizAttemptFullResponse["status"]): string {
  if (status === "SUBMITTED") return "Terminée";
  if (status === "CANCELLED") return "Annulée";
  return "En cours";
}

function durationLabel(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes} min ${String(rest).padStart(2, "0")} s`;
}

export default function ScoreSummary({
  result,
}: {
  result: QuizAttemptFullResponse;
}) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  const accent = result.passed ? theme.colors.success : theme.colors.danger;

  return (
    <View style={styles.card}>
      <Text style={[styles.title, { color: accent }]}>
        {result.passed ? "Quiz réussi" : "Quiz non validé"}
      </Text>

      <Text style={[styles.percentage, { color: accent }]}>
        {result.scorePercent} %
      </Text>

      <Text style={styles.score}>
        {result.earnedPoints} / {result.maxPoints} points
      </Text>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Tentative</Text>
          <Text style={styles.metricValue}>{result.attemptNumber}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Durée</Text>
          <Text style={styles.metricValue}>
            {durationLabel(result.durationSeconds)}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Restantes</Text>
          <Text style={styles.metricValue}>{result.remainingAttempts}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Statut</Text>
          <Text style={styles.metricValue}>{statusLabel(result.status)}</Text>
        </View>
      </View>

      {result.globalFeedback ? (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackTitle}>Feedback</Text>
          <Text style={styles.feedbackText}>{result.globalFeedback}</Text>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(
  theme: ReturnType<typeof useSmartTrainingTheme>["theme"],
) {
  return StyleSheet.create({
    card: {
      borderRadius: theme.shape.cardRadius,
      padding: theme.shape.cardPadding,
      marginBottom: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      gap: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: "900",
    },
    percentage: {
      fontSize: 34,
      fontWeight: "900",
    },
    score: {
      color: theme.colors.foreground,
      fontSize: 16,
      fontWeight: "800",
    },
    metrics: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 4,
    },
    metric: {
      minWidth: 120,
      flexGrow: 1,
      borderRadius: 12,
      padding: 10,
      backgroundColor: theme.colors.surfaceSoft,
    },
    metricLabel: {
      color: theme.colors.foregroundMuted,
      fontSize: 11,
      fontWeight: "800",
    },
    metricValue: {
      color: theme.colors.foreground,
      marginTop: 3,
      fontWeight: "900",
    },
    feedbackBox: {
      marginTop: 6,
      borderRadius: 12,
      padding: 12,
      backgroundColor: theme.colors.surfaceSoft,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    feedbackTitle: {
      color: theme.colors.foreground,
      fontWeight: "900",
      marginBottom: 4,
    },
    feedbackText: {
      color: theme.colors.foregroundMuted,
      lineHeight: 20,
    },
  });
}
