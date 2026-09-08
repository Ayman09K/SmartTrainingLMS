import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import { StyleSheet, Text, View } from "react-native";



import { LearnerAnalyticsSummaryResponse } from "../../types/analytics";

export default function AnalyticsSummaryCard({ summary }: { summary: LearnerAnalyticsSummaryResponse }) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Synthèse d’apprentissage</Text>
      <Text style={styles.metric}>Événements : {summary.totalEvents}</Text>
      <Text style={styles.metric}>Formations démarrées : {summary.totalTrainingsStarted}</Text>
      <Text style={styles.metric}>Formations terminées : {summary.totalTrainingsCompleted}</Text>
      <Text style={styles.metric}>Progression moyenne : {summary.averageProgress}%</Text>
      <Text style={styles.metric}>Score moyen : {summary.averageScore}%</Text>
      <Text style={styles.risk}>Formations à risque : {summary.atRiskTrainings}</Text>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useSmartTrainingTheme>["theme"]) {
  return StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.shape.cardRadius, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 14 },
  title: { fontSize: 19, fontWeight: "800", color: theme.colors.foreground, marginBottom: 14 },
  metric: { fontSize: 14, color: theme.colors.foregroundMuted, marginBottom: 5 },
  risk: { fontSize: 14, fontWeight: "700", color: theme.colors.danger, marginTop: 8 },
});
}
