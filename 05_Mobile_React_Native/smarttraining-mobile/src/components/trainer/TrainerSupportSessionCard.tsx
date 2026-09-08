import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../AppButton";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerSupportSessionListItem,
} from "../../types/trainerActionMobile";

type Props = {
  item: TrainerSupportSessionListItem;
  onOpen: () => void;
};

function learnerName(
  item: TrainerSupportSessionListItem,
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

function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    SCHEDULED: "Planifiée",
    COMPLETED: "Réalisée",
    CANCELLED: "Annulée",
  };

  return labels[value] || "À examiner";
}

function formatDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function TrainerSupportSessionCard({
  item,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const { session } = item;

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
      <View style={styles.topRow}>
        <Text
          style={[
            styles.status,
            { color: theme.colors.accent },
          ]}
        >
          {statusLabel(session.status)}
        </Text>
        <Text
          style={[
            styles.date,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {formatDate(session.scheduledAt)}
        </Text>
      </View>

      <Text
        style={[
          styles.title,
          { color: theme.colors.foreground },
        ]}
      >
        {session.title}
      </Text>

      <Text
        style={[
          styles.name,
          { color: theme.colors.foreground },
        ]}
      >
        {learnerName(item)}
      </Text>

      <Text
        style={[
          styles.training,
          { color: theme.colors.foregroundMuted },
        ]}
      >
        {item.training?.title || "Formation suivie"}
      </Text>

      <Text
        numberOfLines={3}
        style={[
          styles.objective,
          { color: theme.colors.foregroundMuted },
        ]}
      >
        {session.objective}
      </Text>

      <AppButton
        title="Ouvrir la séance"
        onPress={onOpen}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
  },
  topRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  status: {
    fontSize: 12,
    fontWeight: "900",
  },
  date: {
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    marginTop: 13,
  },
  name: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 10,
  },
  training: {
    fontSize: 12,
    marginTop: 2,
  },
  objective: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  button: {
    marginTop: 14,
  },
});