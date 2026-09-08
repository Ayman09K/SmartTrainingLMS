import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerAlertListItem,
} from "../../types/trainerAlertMobile";

type Props = {
  item: TrainerAlertListItem;
  onOpen: () => void;
};

function learnerName(
  item: TrainerAlertListItem,
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
    RESOLVED: "Résolue",
    IGNORED: "Ignorée",
  };

  return value ? labels[value] || "À examiner" : "À examiner";
}

function severityLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    LOW: "Priorité faible",
    MEDIUM: "Priorité moyenne",
    HIGH: "Priorité élevée",
  };

  return value ? labels[value] || "Priorité à examiner" : "Priorité à examiner";
}

function typeLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    LOW_PROGRESS: "Progression faible",
    LOW_SCORE: "Score à renforcer",
    INACTIVITY: "Inactivité",
    AI_RISK: "Signal d’accompagnement",
    QUIZ_FAILURE: "Quiz à reprendre",
    LOW_ACTIVITY: "Activité faible",
  };

  return value ? labels[value] || "Signal pédagogique" : "Signal pédagogique";
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

export default function TrainerAlertCard({
  item,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const { alert } = item;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Examiner l’alerte ${alert.title || typeLabel(alert.alertType)}`}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
          padding: theme.shape.cardPadding,
          opacity: pressed ? 0.82 : 1,
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
            {statusLabel(alert.status)}
          </Text>
        </View>

        <Text
          style={[
            styles.severity,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {severityLabel(alert.severity)}
        </Text>
      </View>

      <Text
        numberOfLines={2}
        style={[
          styles.title,
          { color: theme.colors.foreground },
        ]}
      >
        {alert.title || typeLabel(alert.alertType)}
      </Text>

      <Text
        style={[
          styles.type,
          { color: theme.colors.accent },
        ]}
      >
        {typeLabel(alert.alertType)}
      </Text>

      <Text
        style={[
          styles.person,
          { color: theme.colors.foreground },
        ]}
      >
        {learnerName(item)}
      </Text>

      <Text
        numberOfLines={1}
        style={[
          styles.training,
          { color: theme.colors.foregroundMuted },
        ]}
      >
        {item.training?.title || "Formation suivie"}
      </Text>

      {alert.message ? (
        <Text
          numberOfLines={2}
          style={[
            styles.message,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {alert.message}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        <Text
          style={[
            styles.date,
            { color: theme.colors.foregroundSubtle },
          ]}
        >
          {formatDate(alert.createdAt)}
        </Text>

        <Text
          style={[
            styles.openHint,
            { color: theme.colors.accent },
          ]}
        >
          Examiner ›
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  severity: {
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    marginTop: 11,
  },
  type: {
    fontSize: 10,
    fontWeight: "900",
    marginTop: 4,
  },
  person: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 10,
  },
  training: {
    fontSize: 11,
    marginTop: 2,
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  date: {
    flex: 1,
    minWidth: 0,
    fontSize: 10,
  },
  openHint: {
    fontSize: 12,
    fontWeight: "900",
  },
});
