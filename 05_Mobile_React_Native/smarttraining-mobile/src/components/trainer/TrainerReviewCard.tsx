import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerReviewListItem,
} from "../../types/trainerFeedbackReviewMobile";

type Props = {
  item: TrainerReviewListItem;
};

function learnerName(
  item: TrainerReviewListItem,
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
  if (value === "HIDDEN") {
    return "Masqué";
  }

  return "Publié";
}

function stars(value: number): string {
  const normalized = Math.max(
    1,
    Math.min(5, Math.round(value)),
  );

  return `${"★".repeat(normalized)}${"☆".repeat(5 - normalized)}`;
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
  }).format(parsed);
}

export default function TrainerReviewCard({
  item,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const { review } = item;

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
            styles.stars,
            { color: theme.colors.accent },
          ]}
        >
          {stars(review.rating)} · {review.rating}/5
        </Text>
        <Text
          style={[
            styles.status,
            { color: theme.colors.foregroundSubtle },
          ]}
        >
          {statusLabel(review.status)}
        </Text>
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

      {review.comment ? (
        <Text
          style={[
            styles.comment,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {review.comment}
        </Text>
      ) : (
        <Text
          style={[
            styles.comment,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          Aucun commentaire.
        </Text>
      )}

      <Text
        style={[
          styles.date,
          { color: theme.colors.foregroundSubtle },
        ]}
      >
        {formatDate(review.updatedAt || review.createdAt)}
      </Text>
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
  stars: {
    fontSize: 15,
    fontWeight: "900",
  },
  status: {
    fontSize: 11,
    fontWeight: "800",
  },
  person: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 13,
  },
  training: {
    fontSize: 12,
    marginTop: 3,
  },
  comment: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 11,
  },
  date: {
    fontSize: 11,
    marginTop: 11,
  },
});