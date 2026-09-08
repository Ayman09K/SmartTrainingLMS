import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
type SmartTheme = ReturnType<typeof useSmartTrainingTheme>["theme"];
import { StyleSheet, Text, View } from "react-native";



import { AiRiskPredictionResponse, RiskLevel } from "../../types/analytics";

function getPredictionLabel(riskLabel: AiRiskPredictionResponse["riskLabel"]): string {
  return riskLabel === "AT_RISK"
    ? "Apprenant prédit à risque"
    : "Apprenant non prédit à risque";
}

function getRiskLevelLabel(riskLevel: RiskLevel): string {
  if (riskLevel === "HIGH") return "Risque élevé";
  if (riskLevel === "MEDIUM") return "Risque moyen";
  return "Risque faible";
}

function getRiskColor(
  riskLevel: RiskLevel,
  theme: SmartTheme,
): string {
  if (riskLevel === "HIGH") return theme.colors.danger;
  if (riskLevel === "MEDIUM") return theme.colors.warning;
  return theme.colors.success;
}

export default function AiRiskPredictionCard({
  prediction,
}: {
  prediction: AiRiskPredictionResponse;
}) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  const riskColor = getRiskColor(prediction.riskLevel, theme);
  const probabilityPercent = Math.round(prediction.riskProbability * 100);
  const boundedProbability = Math.min(Math.max(probabilityPercent, 0), 100);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Prédiction IA</Text>
      <Text style={[styles.predictionLabel, { color: riskColor }]}>
        {getPredictionLabel(prediction.riskLabel)}
      </Text>
      <Text style={styles.level}>Niveau IA : {getRiskLevelLabel(prediction.riskLevel)}</Text>
      <Text style={styles.probability}>Probabilité de risque : {probabilityPercent}%</Text>

      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            { width: `${boundedProbability}%`, backgroundColor: riskColor },
          ]}
        />
      </View>

      <View style={styles.metrics}>
        <Text style={styles.metric}>Modèle : {prediction.modelName}</Text>
        <Text style={styles.metric}>Version : {prediction.modelVersion}</Text>
        <Text style={styles.metric}>Progression envoyée au modèle : {prediction.progressPercentage}%</Text>
        <Text style={styles.metric}>Score moyen envoyé au modèle : {prediction.averageScore}%</Text>
        <Text style={styles.metric}>Événements analysés : {prediction.totalEvents}</Text>
        <Text style={styles.metric}>
          Dernière activité : il y a {prediction.daysSinceLastActivity} jour(s)
        </Text>
      </View>

      <Text style={styles.explanationTitle}>Explication</Text>
      <Text style={styles.explanation}>{prediction.explanation}</Text>
      <Text style={styles.note}>
        Cette prédiction est une aide à la décision pédagogique. Elle ne remplace pas l’analyse du formateur.
      </Text>
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
  title: { fontSize: 19, fontWeight: "800", color: theme.colors.foreground, marginBottom: 8 },
  predictionLabel: { fontSize: 18, fontWeight: "800", marginBottom: 5 },
  level: { fontSize: 15, color: theme.colors.foreground, marginBottom: 5 },
  probability: { fontSize: 15, color: theme.colors.foreground, marginBottom: 8 },
  barBackground: {
    height: 10,
    backgroundColor: theme.colors.border,
    borderRadius: theme.shape.controlRadius,
    overflow: "hidden",
    marginBottom: 14,
  },
  barFill: { height: "100%" },
  metrics: { marginBottom: 14 },
  metric: { fontSize: 14, color: theme.colors.foregroundMuted, marginBottom: 5 },
  explanationTitle: { fontSize: 15, fontWeight: "800", color: theme.colors.foreground, marginBottom: 5 },
  explanation: { fontSize: 14, color: theme.colors.foregroundMuted, marginBottom: 14 },
  note: { fontSize: 14, color: theme.colors.foregroundMuted, fontStyle: "italic" },
});
}
