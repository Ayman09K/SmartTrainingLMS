import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import ErrorMessage from "../../../../components/ErrorMessage";
import LoadingState from "../../../../components/LoadingState";
import { navigateBackOrReplace } from "../../../../components/navigation/mobileNavigation";
import QuizDetailScreen from "../../../../screens/evaluation/QuizDetailScreen";
import QuizResultScreen from "../../../../screens/evaluation/QuizResultScreen";
import { getToken } from "../../../../storage/tokenStorage";
import {
  QuizAttemptFullResponse,
  QuizFull,
} from "../../../../types/evaluation";

export default function QuizDetailRoute() {
  const { id, quizId, fromCourse } =
    useLocalSearchParams<{
      id: string;
      quizId: string;
      fromCourse?: string | string[];
    }>();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [result, setResult] =
    useState<QuizAttemptFullResponse | null>(null);
  const [selectedQuiz, setSelectedQuiz] =
    useState<QuizFull | null>(null);

  const trainingId = Number(id);
  const selectedQuizId = Number(quizId);
  const fromCoursePlayer = Array.isArray(fromCourse)
    ? fromCourse[0] === "1"
    : fromCourse === "1";

  useEffect(() => {
    let active = true;

    void getToken().then((token) => {
      if (!active) return;

      if (!token) {
        router.replace("/");
        return;
      }

      setCheckingAuth(false);
    });

    return () => {
      active = false;
    };
  }, []);

  function handleResult(
    attemptResult: QuizAttemptFullResponse,
    quiz: QuizFull,
  ): void {
    setResult(attemptResult);
    setSelectedQuiz(quiz);
  }

  function backToTraining(): void {
    if (fromCoursePlayer) {
      router.replace({
        pathname: "/learner/course-player",
        params: { trainingId: String(trainingId) },
      });
      return;
    }

    router.replace({
      pathname: "/learner/training-detail",
      params: { trainingId: String(trainingId) },
    });
  }

  function backToQuizzes(): void {
    router.replace(
      fromCoursePlayer
        ? `/trainings/${trainingId}/quizzes?fromCourse=1`
        : `/trainings/${trainingId}/quizzes`,
    );
  }

  if (checkingAuth) {
    return <LoadingState message="Vérification de la session..." />;
  }

  if (
    !Number.isInteger(trainingId) ||
    trainingId <= 0 ||
    !Number.isInteger(selectedQuizId) ||
    selectedQuizId <= 0
  ) {
    return <ErrorMessage message="Quiz invalide." />;
  }

  if (result && selectedQuiz) {
    return (
      <QuizResultScreen
        result={result}
        quiz={selectedQuiz}
        onBackToQuizzes={backToQuizzes}
        onBackToTraining={backToTraining}
      />
    );
  }

  return (
    <QuizDetailScreen
      quizId={selectedQuizId}
      onResult={handleResult}
      backLabel={
        fromCoursePlayer
          ? "Retour à la formation"
          : "Retour aux quiz"
      }
      onBack={() => {
        if (fromCoursePlayer) {
          backToTraining();
          return;
        }

        navigateBackOrReplace(
          `/trainings/${trainingId}/quizzes`,
        );
      }}
    />
  );
}
