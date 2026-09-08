import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import { StyleSheet, Text, View } from "react-native";



import { LearnerProgressResponse } from "../../types/analytics";

export default function ProgressCard({ progress }: { progress: LearnerProgressResponse }) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  const percentage = Math.max(0, Math.min(progress.progressPercentage, 100));
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Formation #{progress.trainingId}</Text>
      <Text style={styles.percentage}>Progression : {percentage}%</Text>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.meta}>Leçons : {progress.completedLessons} / {progress.totalLessons}</Text>
      <Text style={styles.meta}>Quiz : {progress.completedQuizzes} / {progress.totalQuizzes}</Text>
      <Text style={styles.meta}>Score moyen : {progress.averageScore}%</Text>
      <Text style={[styles.status, progress.status === "AT_RISK" && styles.risk]}>Statut : {progress.status}</Text>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useSmartTrainingTheme>["theme"]) {
  return StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.shape.cardRadius, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 14 },
  title: { fontSize: 17, fontWeight: "800", color: theme.colors.foreground, marginBottom: 8 },
  percentage: { fontSize: 16, fontWeight: "700", color: theme.colors.accent, marginBottom: 8 },
  barBackground: { height: 10, backgroundColor: theme.colors.border, borderRadius: theme.shape.controlRadius, overflow: "hidden", marginBottom: 14 },
  barFill: { height: "100%", backgroundColor: theme.colors.accent },
  meta: { fontSize: 14, color: theme.colors.foregroundMuted, marginBottom: 5 },
  status: { fontSize: 14, fontWeight: "700", color: theme.colors.foreground, marginTop: 5 },
  risk: { color: theme.colors.danger },
});
}
