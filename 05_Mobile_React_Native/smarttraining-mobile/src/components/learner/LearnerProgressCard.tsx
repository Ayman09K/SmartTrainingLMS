import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../AppButton";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import { LearnerProgressResponse } from "../../types/analytics";

type Props = {
  trainingTitle: string;
  fallbackPercentage?: number | null;
  progress?: LearnerProgressResponse;
  onOpenTraining: () => void;
};

function clamp(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusLabel(
  status: string | undefined,
  percentage: number,
): string {
  if (status === "COMPLETED" || percentage >= 100) {
    return "Termin\u00E9e";
  }

  if (status === "AT_RISK") {
    return "\u00C0 reprendre";
  }

  if (status === "IN_PROGRESS" || percentage > 0) {
    return "En cours";
  }

  return "Pas commenc\u00E9e";
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

export default function LearnerProgressCard({
  trainingTitle,
  fallbackPercentage,
  progress,
  onOpenTraining,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const percentage = clamp(
    progress?.progressPercentage ?? fallbackPercentage,
  );
  const status = statusLabel(progress?.status, percentage);
  const lastActivity = formatDate(
    progress?.lastActivityAt,
  );

  const hasLessonCounters =
    typeof progress?.completedLessons === "number" &&
    typeof progress?.totalLessons === "number" &&
    progress.totalLessons > 0;

  const hasQuizCounters =
    typeof progress?.completedQuizzes === "number" &&
    typeof progress?.totalQuizzes === "number" &&
    progress.totalQuizzes > 0;

  const hasScore =
    typeof progress?.averageScore === "number" &&
    Number.isFinite(progress.averageScore);

  const statusColor =
    progress?.status === "AT_RISK"
      ? theme.colors.warning
      : percentage >= 100
        ? theme.colors.success
        : percentage > 0
          ? theme.colors.accent
          : theme.colors.foregroundSubtle;

  return (
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
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text
            style={[
              styles.title,
              { color: theme.colors.foreground },
            ]}
          >
            {trainingTitle}
          </Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColor },
              ]}
            />
            <Text
              style={[
                styles.status,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {status}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.percentage,
            { color: statusColor },
          ]}
        >
          {percentage} %
        </Text>
      </View>

      <View
        style={[
          styles.track,
          { backgroundColor: theme.colors.border },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: statusColor,
            },
          ]}
        />
      </View>

      <View style={styles.metaGrid}>
        {hasLessonCounters ? (
          <MetaItem
            label={"Le\u00E7ons"}
            value={`${progress?.completedLessons} / ${progress?.totalLessons}`}
          />
        ) : null}

        {hasQuizCounters ? (
          <MetaItem
            label={"\u00C9valuations"}
            value={`${progress?.completedQuizzes} / ${progress?.totalQuizzes}`}
          />
        ) : null}

        {hasScore ? (
          <MetaItem
            label="Score moyen"
            value={`${Math.round(progress?.averageScore ?? 0)} %`}
          />
        ) : null}

        {lastActivity ? (
          <MetaItem
            label={"Derni\u00E8re activit\u00E9"}
            value={lastActivity}
          />
        ) : null}
      </View>

      <AppButton
        title={
          percentage >= 100
            ? "Voir la formation"
            : percentage > 0
              ? "Reprendre la formation"
              : "Ouvrir la formation"
        }
        onPress={onOpenTraining}
        variant="secondary"
        style={styles.action}
      />
    </View>
  );

  function MetaItem({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) {
    return (
      <View
        style={[
          styles.metaItem,
          {
            backgroundColor: theme.colors.surfaceSoft,
            borderRadius: theme.shape.controlRadius,
          },
        ]}
      >
        <Text
          style={[
            styles.metaLabel,
            { color: theme.colors.foregroundSubtle },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.metaValue,
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
  card: {
    marginBottom: 14,
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 14,
  },
  headingText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  status: {
    fontSize: 13,
    fontWeight: "700",
  },
  percentage: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "900",
  },
  track: {
    height: 9,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 15,
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaItem: {
    flexGrow: 1,
    flexBasis: 145,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  metaValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 3,
  },
  action: {
    alignSelf: "flex-start",
    marginTop: 15,
  },
});