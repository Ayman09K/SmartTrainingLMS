import { useSmartTrainingTheme } from "../theme/provider/SmartTrainingThemeProvider";
import { StyleSheet, Text, View } from "react-native";



import { Training } from "../types/training";
import AppButton from "./AppButton";
import StatusBadge from "./StatusBadge";

type TrainingCardProps = {
  training: Training;
  onPress: () => void;
};

export default function TrainingCard({ training, onPress }: TrainingCardProps) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <StatusBadge
          label={training.status === "PUBLISHED" ? "Publiée" : training.status === "DRAFT" ? "Brouillon" : "Archivée"}
          variant={training.status === "PUBLISHED" ? "success" : "warning"}
        />
      </View>

      <Text style={styles.title}>{training.title}</Text>

      <Text style={styles.description}>
        {training.description || "Aucune description renseignée."}
      </Text>

      <View style={styles.metaBox}>
        <Text style={styles.meta}>Niveau : {training.level}</Text>
        <Text style={styles.meta}>
          Durée estimée : {training.estimatedDurationHours ?? 0} h
        </Text>
      </View>

      <AppButton
        title="Voir le parcours"
        onPress={onPress}
      />
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useSmartTrainingTheme>["theme"]) {
  return StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.cardRadius,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.foreground,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },
  topRow: {
    marginBottom: 14,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 8,
  },
  description: {
    color: theme.colors.foregroundMuted,
    lineHeight: 21,
    marginBottom: 14,
  },
  metaBox: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.shape.controlRadius,
    padding: 14,
    marginBottom: 14,
  },
  meta: {
    color: theme.colors.foregroundMuted,
    marginBottom: 5,
  },
});
}
