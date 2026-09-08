import { useSmartTrainingTheme } from "../theme/provider/SmartTrainingThemeProvider";
import { StyleSheet, Text, View } from "react-native";



import { FullLesson } from "../types/training";
import ResourceCard from "./ResourceCard";

type LessonCardProps = {
  lesson: FullLesson;
};

export default function LessonCard({ lesson }: LessonCardProps) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Leçon {lesson.orderIndex} — {lesson.title}
      </Text>

      <Text style={styles.content}>
        {lesson.content || "Aucun contenu renseigné pour cette leçon."}
      </Text>

      <Text style={styles.duration}>
        Durée estimée : {lesson.estimatedDurationMinutes ?? 0} min
      </Text>

      <Text style={styles.resourceSectionTitle}>Ressources</Text>

      {lesson.resources.length === 0 && (
        <Text style={styles.emptyText}>
          Aucune ressource associée à cette leçon.
        </Text>
      )}

      {lesson.resources.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} />
      ))}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useSmartTrainingTheme>["theme"]) {
  return StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.shape.cardRadius,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },
  content: {
    color: theme.colors.foregroundMuted,
    lineHeight: 21,
    marginBottom: 8,
  },
  duration: {
    color: theme.colors.foregroundMuted,
    fontWeight: "700",
    marginBottom: 14,
  },
  resourceSectionTitle: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    color: theme.colors.foregroundMuted,
    fontStyle: "italic",
  },
});
}
