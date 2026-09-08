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
  TrainerInterventionListItem,
} from "../../types/trainerActionMobile";

type Props = {
  item: TrainerInterventionListItem;
  onOpen: () => void;
};

function learnerName(
  item: TrainerInterventionListItem,
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
    return "Date non disponible";
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

export default function TrainerInterventionCard({
  item,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const { intervention } = item;

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
            styles.type,
            { color: theme.colors.accent },
          ]}
        >
          {typeLabel(intervention.interventionType)}
        </Text>
        <Text
          style={[
            styles.status,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {statusLabel(intervention.status)}
        </Text>
      </View>

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
        numberOfLines={4}
        style={[
          styles.note,
          { color: theme.colors.foregroundMuted },
        ]}
      >
        {intervention.note}
      </Text>

      <Text
        style={[
          styles.date,
          { color: theme.colors.foregroundSubtle },
        ]}
      >
        {formatDate(intervention.createdAt)}
      </Text>

      <AppButton
        title="Ouvrir l’intervention"
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
  type: {
    fontSize: 12,
    fontWeight: "900",
  },
  status: {
    fontSize: 12,
    fontWeight: "800",
  },
  name: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 13,
  },
  training: {
    fontSize: 12,
    marginTop: 3,
  },
  note: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 11,
  },
  date: {
    fontSize: 11,
    marginTop: 10,
  },
  button: {
    marginTop: 14,
  },
});