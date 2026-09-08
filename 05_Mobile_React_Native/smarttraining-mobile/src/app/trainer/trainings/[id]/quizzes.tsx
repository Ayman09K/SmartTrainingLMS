import { Stack, router, useLocalSearchParams } from "expo-router";

import QuizBuilderScreen from "../../../../screens/evaluation/QuizBuilderScreen";
import { navigateBackOrReplace } from "../../../../components/navigation/mobileNavigation";

function parseId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default function TrainerQuizBuilderRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const trainingId = parseId(params.id);

  if (!trainingId) {
    router.replace("/trainer/trainings");
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: "Quiz Builder" }} />
      <QuizBuilderScreen
        trainingId={trainingId}
        onBack={() =>
          navigateBackOrReplace(
            `/trainer/trainings/${trainingId}`,
          )
        }
      />
    </>
  );
}
