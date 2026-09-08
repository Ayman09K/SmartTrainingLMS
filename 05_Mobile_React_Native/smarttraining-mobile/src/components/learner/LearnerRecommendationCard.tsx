import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
type SmartTheme = ReturnType<typeof useSmartTrainingTheme>["theme"];
import { StyleSheet, Text, View } from "react-native";
import AppButton from "../AppButton";



import { RecommendationResponse } from "../../types/analytics";

type Props = {
  recommendation: RecommendationResponse;
  trainingTitle: string;
  busy: boolean;
  onAccept: () => void;
  onComplete: () => void;
  onDismiss: () => void;
  onOpenTraining: () => void;
};

function typeLabel(value: string): string {
  if (value === "REVIEW_LESSON") return "Revoir une leçon";
  if (value === "RETAKE_QUIZ") return "Refaire une évaluation";
  if (value === "CONSULT_RESOURCE") return "Consulter une ressource";
  if (value === "CONTACT_TRAINER") return "Contacter le formateur";
  if (value === "CONTINUE_TRAINING") return "Continuer la formation";

  return "Conseil pédagogique";
}

function priorityLabel(value: string): string {
  if (value === "HIGH") return "Prioritaire";
  if (value === "MEDIUM") return "À faire prochainement";

  return "Suggestion";
}

function statusLabel(value: string): string {
  if (value === "ACCEPTED") return "En cours";
  if (value === "COMPLETED") return "Terminée";
  if (value === "DISMISSED") return "Ignorée";

  return "À consulter";
}

function sourceLabel(value: string): string {
  if (value === "AI_BASED") return "Suggestion personnalisée";
  if (value === "RULE_BASED") return "Conseil pédagogique";
  if (value === "MANUAL") return "Conseil du formateur";

  return "Conseil";
}

export default function LearnerRecommendationCard({
  recommendation,
  trainingTitle,
  busy,
  onAccept,
  onComplete,
  onDismiss,
  onOpenTraining,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  const active =
    recommendation.status === "PROPOSED" ||
    recommendation.status === "ACCEPTED";

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.priority}>
          {priorityLabel(recommendation.priority)}
        </Text>
        <Text style={styles.status}>
          {statusLabel(recommendation.status)}
        </Text>
      </View>

      <Text style={styles.title}>{recommendation.title}</Text>
      <Text style={styles.training}>{trainingTitle}</Text>

      <View style={styles.typeBox}>
        <Text style={styles.type}>
          {typeLabel(recommendation.recommendationType)}
        </Text>
        <Text style={styles.source}>
          {sourceLabel(recommendation.source)}
        </Text>
      </View>

      <Text style={styles.description}>
        {recommendation.description}
      </Text>

      {busy ? (
        <Text style={styles.busy}>Mise à jour en cours...</Text>
      ) : (
        <View style={styles.actions}>
          {recommendation.status === "PROPOSED" ? (
            <AppButton
              title="Suivre cette recommandation"
              onPress={onAccept}
              style={styles.button}
            />
          ) : null}

          {recommendation.status === "ACCEPTED" ? (
            <AppButton
              title="Marquer comme faite"
              onPress={onComplete}
              style={styles.button}
            />
          ) : null}

          {active ? (
            <AppButton
              title="Ignorer"
              onPress={onDismiss}
              variant="secondary"
              style={styles.button}
            />
          ) : null}

          <AppButton
            title="Ouvrir la formation"
            onPress={onOpenTraining}
            variant="secondary"
            style={styles.button}
          />
        </View>
      )}
    </View>
  );
}

function makeStyles(theme: SmartTheme) {
  return StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: theme.shape.cardPadding,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  priority: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  status: {
    color: theme.colors.foregroundMuted,
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
  },
  training: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 5,
  },
  typeBox: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.shape.controlRadius,
    padding: 14,
    marginTop: 14,
  },
  type: {
    color: theme.colors.foreground,
    fontSize: 13,
    fontWeight: "800",
  },
  source: {
    color: theme.colors.foregroundMuted,
    fontSize: 12,
    marginTop: 5,
  },
  description: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
  },
  actions: {
    gap: 8,
    marginTop: 18,
  },
  button: {
    width: "100%",
  },
  busy: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 18,
  },
});
}
