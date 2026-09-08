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
import { LearningPathCatalog } from "../../types/learningPath";

type Props = {
  path: LearningPathCatalog;
  onOpen: () => void;
};

function visibilityLabel(value?: string | null): string {
  if (value === "PUBLIC") return "Public";
  if (value === "ASSIGNED_ONLY") {
    return "Affect\u00E9s uniquement";
  }
  if (value === "PRIVATE") return "Priv\u00E9";

  return value || "Acc\u00E8s encadr\u00E9";
}

export default function CatalogLearningPathCard({
  path,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const description =
    path.shortDescription ||
    path.description ||
    "D\u00E9couvre les formations organis\u00E9es dans ce parcours.";

  const coverUrl = buildLearnerMediaUrl(
    path.coverImageUrl || path.coverImagePath,
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: path.assignedToMe
            ? theme.colors.accent
            : theme.colors.border,
          borderRadius: theme.shape.cardRadius,
          borderWidth: Math.max(
            theme.shape.borderWidth,
            path.assignedToMe ? 2 : 1,
          ),
          padding: theme.shape.cardPadding,
          shadowColor: theme.colors.foreground,
          shadowOpacity: theme.shape.shadowOpacity,
        },
      ]}
    >
      <TrainingCover
        title={path.title}
        coverUrl={coverUrl}
        spacingAfter
        resizeMode="contain"
      />

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
          <Text
            style={[
              styles.badgeText,
              { color: theme.colors.accent },
            ]}
          >
            Parcours
          </Text>
        </View>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            {visibilityLabel(path.visibility)}
          </Text>
        </View>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: path.assignedToMe
                ? theme.colors.success
                : theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color: path.assignedToMe
                  ? theme.colors.success
                  : theme.colors.foregroundMuted,
              },
            ]}
          >
            {path.assignedToMe ? "Affect\u00E9" : "\u00C0 d\u00E9couvrir"}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.title,
          { color: theme.colors.foreground },
        ]}
      >
        {path.title}
      </Text>

      <Text
        style={[
          styles.description,
          { color: theme.colors.foregroundMuted },
        ]}
      >
        {description}
      </Text>

      <View style={styles.metaRow}>
        <View
          style={[
            styles.metaPill,
            { backgroundColor: theme.colors.surfaceSoft },
          ]}
        >
          <Text
            style={[
              styles.metaText,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            {path.totalTrainings} formation
            {path.totalTrainings > 1 ? "s" : ""}
          </Text>
        </View>

        <View
          style={[
            styles.metaPill,
            { backgroundColor: theme.colors.surfaceSoft },
          ]}
        >
          <Text
            style={[
              styles.metaText,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            {path.requiredTrainings} obligatoire
            {path.requiredTrainings > 1 ? "s" : ""}
          </Text>
        </View>

        {path.optionalTrainings > 0 ? (
          <View
            style={[
              styles.metaPill,
              { backgroundColor: theme.colors.surfaceSoft },
            ]}
          >
            <Text
              style={[
                styles.metaText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {path.optionalTrainings} facultative
              {path.optionalTrainings > 1 ? "s" : ""}
            </Text>
          </View>
        ) : null}

        {path.estimatedDurationHours > 0 ? (
          <View
            style={[
              styles.metaPill,
              { backgroundColor: theme.colors.surfaceSoft },
            ]}
          >
            <Text
              style={[
                styles.metaText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {path.estimatedDurationHours} h
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.stateBox,
          {
            backgroundColor: theme.colors.surfaceSoft,
            borderColor: path.canStart
              ? theme.colors.success
              : theme.colors.info,
            borderRadius: theme.shape.controlRadius,
            borderWidth: Math.max(
              1,
              theme.shape.borderWidth,
            ),
            padding: theme.shape.cardPadding,
          },
        ]}
      >
        <Text
          style={[
            styles.stateTitle,
            {
              color: path.canStart
                ? theme.colors.success
                : theme.colors.info,
            },
          ]}
        >
          {path.canStart
            ? "Pr\u00EAt \u00E0 d\u00E9marrer"
            : "Consultable"}
        </Text>

        <Text
          style={[
            styles.stateText,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {path.canStart
            ? "Ce parcours t\u2019est affect\u00E9. Ouvre-le pour voir ta progression."
            : "Tu peux d\u00E9couvrir son contenu. Une affectation est requise pour d\u00E9marrer."}
        </Text>

        <AppButton
          title={path.canStart ? "Ouvrir le parcours" : "D\u00E9couvrir"}
          onPress={onOpen}
          variant={path.canStart ? "primary" : "secondary"}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  metaPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "700",
  },
  stateBox: {
    marginTop: 2,
  },
  stateTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 5,
  },
  stateText: {
    fontSize: 13,
    lineHeight: 19,
  },
  action: {
    marginTop: 12,
  },
});