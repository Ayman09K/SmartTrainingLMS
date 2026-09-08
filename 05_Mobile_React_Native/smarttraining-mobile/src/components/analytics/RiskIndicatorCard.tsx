import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
type SmartTheme = ReturnType<typeof useSmartTrainingTheme>["theme"];
import { StyleSheet, Text, View } from "react-native";



import { RiskIndicatorResponse, RiskLevel } from "../../types/analytics";

function getLevelLabel(level: RiskLevel): string {
  if (level === "DATA_INSUFFICIENT") return "Données insuffisantes";
  if (level === "HIGH") return "Accompagnement prioritaire";
  if (level === "MEDIUM") return "Accompagnement à renforcer";
  return "Accompagnement léger";
}

function getLevelColor(
  level: RiskLevel,
  theme: SmartTheme,
): string {
  if (level === "HIGH") return theme.colors.danger;
  if (level === "MEDIUM") return theme.colors.warning;
  if (level === "DATA_INSUFFICIENT") {
    return theme.colors.foregroundMuted;
  }
  return theme.colors.success;
}

export default function RiskIndicatorCard({
  risk,
}: {
  risk: RiskIndicatorResponse;
}) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  const levelColor = getLevelColor(risk.riskLevel, theme);
  const insufficient = risk.riskLevel === "DATA_INSUFFICIENT";

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Accompagnement pédagogique</Text>
      <Text style={[styles.level, { color: levelColor }]}>
        {getLevelLabel(risk.riskLevel)}
      </Text>

      {insufficient ? (
        <Text style={styles.message}>
          Il n’y a pas encore assez d’activité pour évaluer votre besoin
          d’accompagnement. Commencez ou poursuivez la formation : l’indicateur
          s’ajustera avec votre progression.
        </Text>
      ) : (
        <>
          <View style={styles.metrics}>
            <Text style={styles.metric}>
              Progression moyenne : {risk.averageProgress ?? 0}%
            </Text>
            <Text style={styles.metric}>
              Score moyen : {risk.averageScore ?? 0}%
            </Text>
            <Text style={styles.metric}>
              Activités enregistrées : {risk.totalEvents ?? 0}
            </Text>
          </View>

          {(risk.riskFactors ?? []).length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Points à surveiller</Text>
              {(risk.riskFactors ?? []).map((factor, index) => (
                <Text key={`factor-${index}`} style={styles.item}>
                  • {factor}
                </Text>
              ))}
            </>
          ) : null}
        </>
      )}

      <Text style={styles.sectionTitle}>Conseils</Text>
      {insufficient ? (
        <Text style={styles.item}>
          • Réalisez les premières activités de la formation pour obtenir des
          conseils personnalisés.
        </Text>
      ) : (risk.recommendations ?? []).length > 0 ? (
        (risk.recommendations ?? []).map((recommendation, index) => (
          <Text key={`recommendation-${index}`} style={styles.item}>
            • {recommendation}
          </Text>
        ))
      ) : (
        <Text style={styles.item}>
          • Continuez votre parcours et sollicitez votre formateur si nécessaire.
        </Text>
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
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: theme.colors.foreground,
    marginBottom: 8,
  },
  level: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: theme.colors.foregroundMuted,
    lineHeight: 20,
    marginBottom: 14,
  },
  metrics: {
    gap: 5,
    marginBottom: 14,
  },
  metric: {
    fontSize: 14,
    color: theme.colors.foreground,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: theme.colors.foreground,
    marginTop: 8,
    marginBottom: 5,
  },
  item: {
    fontSize: 14,
    color: theme.colors.foregroundMuted,
    lineHeight: 20,
    marginBottom: 5,
  },
});
}
