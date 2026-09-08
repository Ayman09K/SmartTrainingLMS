import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import { Pressable, StyleSheet, Text, View } from "react-native";



import { Quiz } from "../../types/evaluation";

function attemptLabel(maxAttempts: number): string {
  return maxAttempts === 1
    ? "1 tentative maximum"
    : `${maxAttempts} tentatives maximum`;
}

export default function QuizCard({
  quiz,
  onPress,
}: {
  quiz: Quiz;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le quiz ${quiz.title}`}
      style={styles.card}
      onPress={onPress}
    >
      <View style={styles.topRow}>
        <Text style={styles.title}>{quiz.title}</Text>
        <Text style={styles.badge}>Disponible</Text>
      </View>

      {quiz.description ? (
        <Text style={styles.description}>{quiz.description}</Text>
      ) : null}

      <View style={styles.metaBox}>
        <Text style={styles.meta}>
          Score requis : {quiz.passingScore} %
        </Text>
        <Text style={styles.meta}>
          Durée : {quiz.timeLimitMinutes} min
        </Text>
        <Text style={styles.meta}>
          {attemptLabel(quiz.maxAttempts)}
        </Text>
      </View>

      <Text style={styles.action}>Ouvrir le quiz</Text>
    </Pressable>
  );
}

function makeStyles(theme: ReturnType<typeof useSmartTrainingTheme>["theme"]) {
  return StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: 18,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: 17,
    fontWeight: "900",
  },
  badge: {
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.success,
    fontWeight: "800",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  description: {
    color: theme.colors.foregroundMuted,
    lineHeight: 20,
    marginTop: 8,
  },
  metaBox: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.shape.controlRadius,
    padding: 14,
    marginTop: 14,
    gap: 5,
  },
  meta: {
    color: theme.colors.foregroundSubtle,
    fontSize: 13,
    fontWeight: "700",
  },
  action: {
    color: theme.colors.accent,
    fontWeight: "900",
    marginTop: 14,
  },
});
}
