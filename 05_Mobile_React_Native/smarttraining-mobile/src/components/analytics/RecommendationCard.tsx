import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
type SmartTheme = ReturnType<typeof useSmartTrainingTheme>["theme"];
import { StyleSheet, Text, View } from "react-native";
import AppButton from "../AppButton";
import {
  ActionSource,
  RecommendationPriority,
  RecommendationResponse,
  RecommendationStatus,
  RecommendationType,
} from "../../types/analytics";




interface RecommendationCardProps {
  recommendation: RecommendationResponse;
  onComplete: (recommendationId: number) => void;
  onDismiss: (recommendationId: number) => void;
}

function getPriorityLabel(priority: RecommendationPriority): string {
  if (priority === "HIGH") return "Priorité élevée";
  if (priority === "MEDIUM") return "Priorité moyenne";
  return "Priorité faible";
}

function getPriorityColor(
  priority: RecommendationPriority,
  theme: SmartTheme,
): string {
  if (priority === "HIGH") return theme.colors.danger;
  if (priority === "MEDIUM") return theme.colors.warning;
  return theme.colors.success;
}

function getTypeLabel(type: RecommendationType): string {
  const labels: Record<RecommendationType, string> = {
    REVIEW_LESSON: "Revoir une leçon",
    RETAKE_QUIZ: "Refaire un quiz",
    CONSULT_RESOURCE: "Consulter une ressource",
    CONTACT_TRAINER: "Contacter le formateur",
    CONTINUE_TRAINING: "Continuer la formation",
  };
  return labels[type];
}

function getStatusLabel(status: RecommendationStatus): string {
  const labels: Record<RecommendationStatus, string> = {
    PROPOSED: "Proposée",
    ACCEPTED: "Acceptée",
    COMPLETED: "Terminée",
    DISMISSED: "Ignorée",
  };
  return labels[status];
}

function getSourceLabel(source: ActionSource): string {
  if (source === "AI_BASED") return "Signal IA";
  if (source === "RULE_BASED") return "Règle pédagogique";
  return "Action manuelle";
}

export default function RecommendationCard({
  recommendation,
  onComplete,
  onDismiss,
}: RecommendationCardProps) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  const isActionDisabled =
    recommendation.status === "COMPLETED" || recommendation.status === "DISMISSED";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{recommendation.title}</Text>
        <Text style={[styles.priority, { color: getPriorityColor(recommendation.priority, theme) }]}>
          {getPriorityLabel(recommendation.priority)}
        </Text>
      </View>

      <Text style={styles.type}>Type : {getTypeLabel(recommendation.recommendationType)}</Text>
      <Text style={styles.description}>{recommendation.description}</Text>

      <View style={styles.metaBox}>
        <Text style={styles.meta}>Statut : {getStatusLabel(recommendation.status)}</Text>
        <Text style={styles.meta}>Source : {getSourceLabel(recommendation.source)}</Text>
      </View>

      {isActionDisabled ? (
        <Text style={styles.closedText}>Cette recommandation est déjà traitée.</Text>
      ) : (
        <View style={styles.actions}>
          <AppButton
            title="Marquer comme terminée"
            onPress={() => onComplete(recommendation.id)}
          />
          <AppButton
            title="Ignorer"
            onPress={() => onDismiss(recommendation.id)}
            variant="secondary"
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
    borderRadius: theme.shape.cardRadius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 14,
  },
  header: { marginBottom: 8 },
  title: { fontSize: 17, fontWeight: "800", color: theme.colors.foreground, marginBottom: 5 },
  priority: { fontSize: 14, fontWeight: "800" },
  type: { fontSize: 14, color: theme.colors.foreground, fontWeight: "700", marginBottom: 8 },
  description: { fontSize: 14, color: theme.colors.foregroundMuted, marginBottom: 14, lineHeight: 20 },
  metaBox: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
    marginBottom: 14,
  },
  meta: { fontSize: 13, color: theme.colors.foregroundMuted, marginBottom: 5 },
  actions: { gap: 8 },
  closedText: { fontSize: 14, color: theme.colors.foregroundMuted, fontStyle: "italic" },
});
}
