import { useSmartTrainingTheme } from "../theme/provider/SmartTrainingThemeProvider";
import { StyleSheet, Text, View } from "react-native";



import { FullModule } from "../types/training";
import LessonCard from "./LessonCard";

type ModuleCardProps = {
  module: FullModule;
};

export default function ModuleCard({ module }: ModuleCardProps) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.card}>
      <View style={styles.moduleNumber}>
        <Text style={styles.moduleNumberText}>{module.orderIndex}</Text>
      </View>

      <Text style={styles.title}>{module.title}</Text>

      <Text style={styles.description}>
        {module.description || "Aucune description renseignée pour ce module."}
      </Text>

      <Text style={styles.lessonCount}>
        {module.lessons.length} leçon(s)
      </Text>

      {module.lessons.length === 0 && (
        <Text style={styles.emptyText}>
          Aucune leçon associée à ce module.
        </Text>
      )}

      {module.lessons.map((lesson) => (
        <LessonCard key={lesson.id} lesson={lesson} />
      ))}
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
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 2,
  },
  moduleNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  moduleNumberText: {
    color: theme.colors.accent,
    fontWeight: "900",
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 8,
  },
  description: {
    color: theme.colors.foregroundMuted,
    lineHeight: 21,
    marginBottom: 8,
  },
  lessonCount: {
    color: theme.colors.accent,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptyText: {
    color: theme.colors.foregroundMuted,
    fontStyle: "italic",
  },
});
}
