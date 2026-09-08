import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../AppButton";
import { TrainingCover } from "../ux/RichPrimitives";
import {
  buildLearnerMediaUrl,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  LearningPathCatalog,
  LearningPathProgress,
} from "../../types/learningPath";

type Props = {
  progress: LearningPathProgress;
  catalog?: LearningPathCatalog;
  onOpen: () => void;
};

function clampProgress(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LearnerMyLearningPathCard({
  progress,
  catalog,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const value = clampProgress(progress.overallProgressPercentage);
  const coverUrl = buildLearnerMediaUrl(
    catalog?.coverImageUrl || catalog?.coverImagePath,
  );
  const dueAt = formatDate(progress.pathDueAt);
  const nextTraining = progress.trainings.find(
    (item) => item.trainingId === progress.nextTrainingId,
  );

  const statusLabel = progress.completed
    ? "Terminé"
    : value > 0
      ? "En cours"
      : "À commencer";

  const statusColor = progress.completed
    ? theme.colors.success
    : value > 0
      ? theme.colors.warning
      : theme.colors.info;

  const dueDateValid =
    !progress.pathDueAt ||
    !Number.isNaN(new Date(progress.pathDueAt).getTime());

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
          title={progress.pathTitle}
          coverUrl={coverUrl}
          resizeMode="contain"
        />
      </View>

      <View style={styles.badgeRow}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.accent,
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: theme.colors.accent }]}>
            Parcours
          </Text>
        </View>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: statusColor,
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <Text style={[styles.title, { color: theme.colors.foreground }]}>
        {progress.pathTitle}
      </Text>

      <Text numberOfLines={2} style={[styles.description, { color: theme.colors.foregroundMuted }]}>
        {catalog?.shortDescription ||
          catalog?.description ||
          "Parcours de formation affecté à ton compte."}
      </Text>

      <View style={styles.metaRow}>
        <View
          style={[
            styles.metaPill,
            { backgroundColor: theme.colors.surfaceSoft },
          ]}
        >
          <Text style={[styles.metaText, { color: theme.colors.foregroundMuted }]}>
            {progress.totalSteps} formation
            {progress.totalSteps > 1 ? "s" : ""}
          </Text>
        </View>

        {catalog?.estimatedDurationHours ? (
          <View
            style={[
              styles.metaPill,
              { backgroundColor: theme.colors.surfaceSoft },
            ]}
          >
            <Text style={[styles.metaText, { color: theme.colors.foregroundMuted }]}>
              {catalog.estimatedDurationHours} h
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.progressHeader}>
        <Text style={[styles.progressLabel, { color: theme.colors.foregroundMuted }]}>
          Progression globale
        </Text>
        <Text style={[styles.progressValue, { color: theme.colors.foreground }]}>
          {value} %
        </Text>
      </View>

      <View
        style={[
          styles.progressTrack,
          { backgroundColor: theme.colors.surfaceSoft },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${value}%`,
              backgroundColor: theme.colors.accent,
            },
          ]}
        />
      </View>

      {dueAt && dueDateValid ? (
        <Text
          style={[
            styles.infoText,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {`Échéance : ${dueAt}`}
        </Text>
      ) : null}

      {!progress.completed && nextTraining?.trainingTitle ? (
        <Text style={[styles.infoText, { color: theme.colors.foregroundMuted }]}>
          Prochaine étape :{" "}
          <Text style={[styles.nextTraining, { color: theme.colors.foreground }]}>
            {nextTraining.trainingTitle}
          </Text>
        </Text>
      ) : null}

      <AppButton
        title={
          progress.completed
            ? "Revoir le parcours"
            : value > 0
              ? "Reprendre le parcours"
              : "Commencer le parcours"
        }
        onPress={onOpen}
        variant="primary"
        style={styles.action}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", marginBottom: 12 },
  coverFrame: {
    height: 112,
    overflow: "hidden",
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 10, fontWeight: "800" },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "900", marginBottom: 5 },
  description: { fontSize: 13, lineHeight: 18, marginBottom: 9 },
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
  metaText: { fontSize: 10, fontWeight: "700" },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  progressLabel: { fontSize: 11, fontWeight: "700" },
  progressValue: { fontSize: 11, fontWeight: "900" },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", borderRadius: 999 },
  infoText: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  nextTraining: { fontWeight: "900" },
  action: { marginTop: 10 },
});
