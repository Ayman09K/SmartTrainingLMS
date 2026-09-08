import {
  Pressable,
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
import {
  TrainerTrainingListItem,
} from "../../types/trainerMobile";

type Props = {
  item: TrainerTrainingListItem;
  onOpen: () => void;
  onEdit?: () => void;
};

function statusLabel(value?: string | null): string {
  if (value === "PUBLISHED") return "Publiée";
  if (value === "DRAFT") return "Brouillon";
  if (value === "ARCHIVED") return "Archivée";

  return value || "Non renseigné";
}

function levelLabel(value?: string | null): string {
  if (value === "DEBUTANT") return "Débutant";
  if (value === "INTERMEDIAIRE") return "Intermédiaire";
  if (value === "AVANCE") return "Avancé";

  return value || "Niveau non renseigné";
}

export default function TrainerTrainingCard({
  item,
  onOpen,
  onEdit,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const { training, metrics } = item;

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
      <View
        style={[
          styles.coverFrame,
          { borderRadius: theme.shape.controlRadius },
        ]}
      >
        <TrainingCover
          title={training.title}
          coverUrl={buildLearnerMediaUrl(
            training.coverImageUrl || training.coverImagePath,
          )}
        />
      </View>

      <View style={styles.topRow}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.border,
              borderWidth: theme.shape.borderWidth,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: theme.colors.accent },
            ]}
          >
            {statusLabel(training.status)}
          </Text>
        </View>

        <Text
          numberOfLines={1}
          style={[
            styles.category,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {training.category || "Sans catégorie"}
        </Text>
      </View>

      <Text
        style={[
          styles.title,
          { color: theme.colors.foreground },
        ]}
      >
        {training.title}
      </Text>

      {training.shortDescription ? (
        <Text
          style={[
            styles.description,
            { color: theme.colors.foregroundMuted },
          ]}
          numberOfLines={3}
        >
          {training.shortDescription}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        <Text
          style={[
            styles.meta,
            { color: theme.colors.foregroundSubtle },
          ]}
        >
          {levelLabel(training.level)}
        </Text>
        <Text
          style={[
            styles.meta,
            { color: theme.colors.foregroundSubtle },
          ]}
        >
          {training.estimatedDurationHours
            ? `${training.estimatedDurationHours} h`
            : "Durée non renseignée"}
        </Text>
      </View>

      <View
        style={[
          styles.metrics,
          {
            backgroundColor: theme.colors.surfaceSoft,
            borderRadius: theme.shape.controlRadius,
          },
        ]}
      >
        <Metric
          value={String(metrics.learners)}
          label="Apprenants"
        />
        <Metric
          value={`${metrics.averageProgress} %`}
          label="Progression"
        />
        <Metric
          value={
            typeof training.averageRating === "number"
              ? training.averageRating.toFixed(1)
              : "-"
          }
          label="Note"
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ouvrir le suivi de ${training.title}`}
          onPress={onOpen}
          style={({ pressed }) => [
            styles.openAction,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text
            style={[
              styles.openActionText,
              { color: theme.colors.accent },
            ]}
          >
            Ouvrir le suivi ›
          </Text>
        </Pressable>

        {onEdit ? (
          <AppButton
            title="Modifier"
            onPress={onEdit}
            variant="secondary"
            style={styles.editButton}
          />
        ) : null}
      </View>
    </View>
  );

  function Metric({
    value,
    label,
  }: {
    value: string;
    label: string;
  }) {
    return (
      <View style={styles.metric}>
        <Text
          style={[
            styles.metricValue,
            { color: theme.colors.foreground },
          ]}
        >
          {value}
        </Text>
        <Text
          style={[
            styles.metricLabel,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {label}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  coverFrame: {
    width: "100%",
    height: 118,
    overflow: "hidden",
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 9,
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
    flex: 1,
    minWidth: 0,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 9,
  },
  meta: {
    fontSize: 11,
    fontWeight: "700",
  },
  metrics: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    padding: 10,
  },
  metric: {
    flex: 1,
    minWidth: 0,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  metricLabel: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  openAction: {
    minHeight: 42,
    justifyContent: "center",
  },
  openActionText: {
    fontSize: 12,
    fontWeight: "900",
  },
  editButton: {
    minWidth: 108,
  },
});
