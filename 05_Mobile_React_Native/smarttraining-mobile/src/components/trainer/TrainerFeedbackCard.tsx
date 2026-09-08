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
  TrainerFeedbackListItem,
} from "../../types/trainerFeedbackReviewMobile";

type Props = {
  item: TrainerFeedbackListItem;
  onOpen: () => void;
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

export default function TrainerFeedbackCard({
  item,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const { feedback } = item;

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
            {statusLabel(feedback.status)}
          </Text>
        </View>

        {feedback.needHelp ? (
          <Text
            style={[
              styles.help,
              { color: theme.colors.accent },
            ]}
          >
            Demande d’aide
          </Text>
        ) : null}
      </View>

      <Text
        style={[
          styles.person,
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
        style={[
          styles.difficulty,
          { color: theme.colors.foregroundSubtle },
        ]}
      >
        Difficulté ressentie : {difficultyLabel(feedback.difficultyLevel)}
      </Text>

      {feedback.message ? (
        <Text
          numberOfLines={4}
          style={[
            styles.message,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {feedback.message}
        </Text>
      ) : (
        <Text
          style={[
            styles.message,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          Aucun commentaire ajouté.
        </Text>
      )}

      <Text
        style={[
          styles.date,
          { color: theme.colors.foregroundSubtle },
        ]}
      >
        {formatDate(feedback.createdAt)}
      </Text>

      <AppButton
        title="Examiner le feedback"
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
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
  help: {
    fontSize: 12,
    fontWeight: "900",
  },
  person: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 14,
  },
  training: {
    fontSize: 12,
    marginTop: 3,
  },
  difficulty: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 11,
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  date: {
    fontSize: 11,
    marginTop: 11,
  },
  button: {
    marginTop: 15,
  },
});