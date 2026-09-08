import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../AppButton";
import { TrainingCover } from "../ux/RichPrimitives";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import { buildLearnerMediaUrl } from "../../features/trainings/learnerTrainingService";
import { LearnerMyTraining } from "../../types/learnerTraining";

type Props = {
  training: LearnerMyTraining;
  onOpen: () => void;
};

function clampProgress(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusLabel(status?: string | null): string {
  if (status === "COMPLETED") {
    return "Termin\u00E9e";
  }

  if (status === "ACTIVE") {
    return "En cours";
  }

  return "Disponible";
}

type DeadlinePresentation = {
  label: string;
  detail: string;
  tone: "info" | "warning" | "danger";
};

function formatDeadline(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function deadlinePresentation(
  dueAt?: string | null,
  completed = false,
): DeadlinePresentation | null {
  if (!dueAt) {
    return null;
  }

  const due = new Date(dueAt);

  if (Number.isNaN(due.getTime())) {
    return null;
  }

  const detail = formatDeadline(dueAt);

  if (completed) {
    return {
      label: "\u00c9ch\u00e9ance",
      detail,
      tone: "info",
    };
  }

  const remainingMs = due.getTime() - Date.now();

  if (remainingMs < 0) {
    return {
      label: "\u00c9ch\u00e9ance d\u00e9pass\u00e9e",
      detail,
      tone: "danger",
    };
  }

  const remainingDays = Math.ceil(
    remainingMs / (24 * 60 * 60 * 1000),
  );

  if (remainingDays <= 3) {
    return {
      label:
        remainingDays <= 1
          ? "\u00c9ch\u00e9ance dans moins de 24 h"
          : `\u00c9ch\u00e9ance dans ${remainingDays} jours`,
      detail,
      tone: "warning",
    };
  }

  return {
    label: "\u00c0 terminer avant",
    detail,
    tone: "info",
  };
}

function levelLabel(level?: string | null): string {
  if (level === "DEBUTANT") return "D\u00E9butant";
  if (level === "INTERMEDIAIRE") return "Interm\u00E9diaire";
  if (level === "AVANCE") return "Avanc\u00E9";

  return level || "Niveau non indiqu\u00E9";
}

export default function LearnerMyTrainingCard({
  training,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const progress = clampProgress(training.progressPercentage);
  const completed =
    training.enrollmentStatus === "COMPLETED" || progress >= 100;

  const statusColor = completed
    ? theme.colors.success
    : progress > 0
      ? theme.colors.info
      : theme.colors.accent;

  const deadline = deadlinePresentation(
    training.dueAt,
    completed,
  );

  const deadlineColor = deadline
    ? deadline.tone === "danger"
      ? theme.colors.danger
      : deadline.tone === "warning"
        ? theme.colors.warning
        : theme.colors.info
    : theme.colors.info;

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
          shadowColor: theme.colors.foreground,
          shadowOpacity: theme.shape.shadowOpacity,
        },
      ]}
    >
      <View
        style={[
          styles.coverFrame,
          { borderRadius: theme.shape.controlRadius },
        ]}
      >
        <TrainingCover
          title={training.title}
          coverUrl={buildLearnerMediaUrl(training.coverImageUrl)}
        />
      </View>

      <View style={styles.topRow}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: statusColor,
              borderWidth: Math.max(
                1,
                theme.shape.borderWidth,
              ),
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: statusColor,
              },
            ]}
          >
            {statusLabel(training.enrollmentStatus)}
          </Text>
        </View>

        {training.category ? (
          <Text
            style={[
              styles.category,
              {
                color: theme.colors.foregroundSubtle,
              },
            ]}
          >
            {training.category}
          </Text>
        ) : null}
      </View>

      <Text
        style={[
          styles.title,
          {
            color: theme.colors.foreground,
          },
        ]}
      >
        {training.title}
      </Text>

      {training.shortDescription ? (
        <Text
          numberOfLines={2}
          style={[
            styles.description,
            {
              color: theme.colors.foregroundMuted,
            },
          ]}
        >
          {training.shortDescription}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        <View
          style={[
            styles.metaPill,
            {
              backgroundColor: theme.colors.surfaceSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.meta,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {levelLabel(training.level)}
          </Text>
        </View>

        <View
          style={[
            styles.metaPill,
            {
              backgroundColor: theme.colors.surfaceSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.meta,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {training.estimatedDurationHours
              ? `${training.estimatedDurationHours} h`
              : "Dur\u00E9e non indiqu\u00E9e"}
          </Text>
        </View>
      </View>

      {deadline ? (
        <View
          style={[
            styles.deadlinePanel,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: deadlineColor,
              borderWidth: Math.max(1, theme.shape.borderWidth),
              borderRadius: theme.shape.controlRadius,
            },
          ]}
        >
          <Text
            style={[
              styles.deadlineLabel,
              { color: deadlineColor },
            ]}
          >
            {deadline.label}
          </Text>
          <Text
            style={[
              styles.deadlineDetail,
              { color: theme.colors.foreground },
            ]}
          >
            {deadline.detail}
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.progressPanel,
          {
            backgroundColor: theme.colors.surfaceSoft,
            borderRadius: theme.shape.controlRadius,
            padding: 10,
          },
        ]}
      >
        <View style={styles.progressHeader}>
          <View>
            <Text
              style={[
                styles.progressEyebrow,
                {
                  color: theme.colors.foregroundSubtle,
                },
              ]}
            >
              PROGRESSION
            </Text>
            <Text
              style={[
                styles.progressLabel,
                {
                  color: theme.colors.foreground,
                },
              ]}
            >
              {completed
                ? "Parcours termin\u00E9"
                : progress > 0
                  ? "Parcours en cours"
                  : "Parcours \u00E0 commencer"}
            </Text>
          </View>

          <Text
            style={[
              styles.progressValue,
              {
                color: statusColor,
              },
            ]}
          >
            {progress} %
          </Text>
        </View>

        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor: theme.colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>
      </View>

      <AppButton
        title={
          completed
            ? "Voir la formation"
            : progress > 0
              ? "Reprendre"
              : "Commencer"
        }
        onPress={onOpen}
        variant={completed ? "secondary" : "primary"}
        style={styles.action}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    marginBottom: 12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },
  coverFrame: {
    height: 112,
    overflow: "hidden",
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "900",
  },
  category: {
    fontSize: 11,
    fontWeight: "700",
    flexShrink: 1,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    marginBottom: 5,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 9,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  metaPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  meta: {
    fontSize: 11,
    fontWeight: "700",
  },
  deadlinePanel: {
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  deadlineLabel: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 2,
  },
  deadlineDetail: {
    fontSize: 12,
    fontWeight: "800",
  },
  progressPanel: {
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 7,
  },
  progressEyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  progressValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  progressTrack: {
    width: "100%",
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  action: {
    alignSelf: "flex-start",
    minWidth: 145,
  },
});
