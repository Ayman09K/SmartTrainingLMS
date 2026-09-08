import ScreenContainer from "../../components/ScreenContainer";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import QuizCard from "../../components/evaluation/QuizCard";
import { getPublishedQuizzesByTraining } from "../../features/evaluation/evaluationService";



import { Quiz } from "../../types/evaluation";

export default function QuizListScreen({
  trainingId,
  onOpenQuiz,
  onBack,
}: {
  trainingId: number;
  onOpenQuiz: (id: number) => void;
  onBack: () => void;
}) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void getPublishedQuizzesByTraining(trainingId)
      .then((data) => {
        if (active) {
          setQuizzes(data);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger les quiz de cette formation.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [trainingId]);

  async function refresh(): Promise<void> {
    try {
      setRefreshing(true);
      setError("");
      setQuizzes(await getPublishedQuizzesByTraining(trainingId));
    } catch {
      setError("Impossible d’actualiser les quiz.");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement des quiz..." />;
  }

  return (
    <ScreenContainer>
      <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      <AppButton
        title="Retour à la formation"
        onPress={onBack}
        variant="secondary"
      />

      <Text style={styles.title}>Quiz de la formation</Text>
      <Text style={styles.subtitle}>
        Les évaluations disponibles pour ton parcours.
      </Text>

      {error ? <ErrorMessage message={error} onRetry={refresh} /> : null}

      {quizzes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Aucun quiz disponible</Text>
          <Text style={styles.emptyText}>
            Aucun quiz publié n’est actuellement accessible pour cette
            formation.
          </Text>
        </View>
      ) : (
        quizzes.map((quiz) => (
          <QuizCard
            key={quiz.id}
            quiz={quiz}
            onPress={() => onOpenQuiz(quiz.id)}
          />
        ))
      )}
      </ScrollView>
    </ScreenContainer>
  );
}

function makeStyles(theme: ReturnType<typeof useSmartTrainingTheme>["theme"]) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 14,
    paddingBottom: theme.shape.cardPadding * 2,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 18,
  },
  subtitle: {
    color: theme.colors.foregroundMuted,
    lineHeight: 20,
    marginTop: 5,
    marginBottom: 18,
  },
  empty: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: theme.shape.cardPadding,
  },
  emptyTitle: {
    color: theme.colors.foreground,
    fontWeight: "900",
    fontSize: 17,
    textAlign: "center",
  },
  emptyText: {
    color: theme.colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
});
}
