import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerLearnerListItem,
} from "../../types/trainerLearnerMobile";

type Props = {
  item: TrainerLearnerListItem;
  onOpen: () => void;
};

function learnerName(
  item: TrainerLearnerListItem,
): string {
  const { identity } = item;

  return (
    identity.fullName ||
    [identity.firstName, identity.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    identity.email
  );
}

function initials(value: string): string {
  const parts = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "AP";
  }

  return parts
    .map((part) => part.charAt(0).toLocaleUpperCase("fr"))
    .join("");
}

export default function TrainerLearnerCard({
  item,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const name = learnerName(item);
  const progress = Math.max(
    0,
    Math.min(100, item.averageProgress),
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le suivi 360 de ${name}`}
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
      <View style={styles.identityRow}>
        {item.identity.avatarDataUrl ? (
          <Image
            source={{ uri: item.identity.avatarDataUrl }}
            style={styles.avatar}
          />
        ) : (
          <View
            style={[
              styles.avatarFallback,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.border,
                borderWidth: theme.shape.borderWidth,
              },
            ]}
          >
            <Text
              style={[
                styles.initials,
                { color: theme.colors.accent },
              ]}
            >
              {initials(name)}
            </Text>
          </View>
        )}

        <View style={styles.identityCopy}>
          <Text
            style={[
              styles.name,
              { color: theme.colors.foreground },
            ]}
          >
            {name}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.email,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            {item.identity.email}
          </Text>
        </View>

        <Text
          style={[
            styles.openHint,
            { color: theme.colors.accent },
          ]}
        >
          Suivi 360 ›
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
          value={String(item.trainingsCount)}
          label="Formations"
        />
        <Metric
          value={`${item.averageProgress} %`}
          label="Progression"
        />
        <Metric
          value={String(item.completedTrainings)}
          label="Terminées"
        />
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
              backgroundColor: theme.colors.accent,
              width: `${progress}%`,
            },
          ]}
        />
      </View>

      <Text
        style={[
          styles.footerMeta,
          { color: theme.colors.foregroundMuted },
        ]}
      >
        {item.completedTrainings}/{item.trainingsCount} formation
        {item.trainingsCount > 1 ? "s" : ""} terminée
        {item.completedTrainings > 1 ? "s" : ""}
      </Text>
    </Pressable>
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
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 15,
    fontWeight: "900",
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 17,
    fontWeight: "900",
  },
  email: {
    fontSize: 11,
    marginTop: 2,
  },
  openHint: {
    fontSize: 11,
    fontWeight: "900",
  },
  metrics: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    marginTop: 12,
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
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  footerMeta: {
    fontSize: 10,
    marginTop: 7,
  },
});
