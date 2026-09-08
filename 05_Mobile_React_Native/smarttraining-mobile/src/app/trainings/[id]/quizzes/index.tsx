import { router, useLocalSearchParams } from "expo-router";

import QuizListScreen from "../../../../screens/evaluation/QuizListScreen";

export default function QuizListRoute() {
  const { id, fromCourse } =
    useLocalSearchParams<{
      id: string;
      fromCourse?: string | string[];
    }>();
  const trainingId = Number(id);
  const fromCoursePlayer = Array.isArray(fromCourse)
    ? fromCourse[0] === "1"
    : fromCourse === "1";

  return (
    <QuizListScreen
      trainingId={trainingId}
      onOpenQuiz={(quizId) =>
        router.push(
          fromCoursePlayer
            ? `/trainings/${trainingId}/quizzes/${quizId}?fromCourse=1`
            : `/trainings/${trainingId}/quizzes/${quizId}`,
        )
      }
      onBack={() => {
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
      }}
    />
  );
}
