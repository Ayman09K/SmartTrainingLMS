import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import LoadingState from "../../components/LoadingState";
import { navigateBackOrReplace } from "../../components/navigation/mobileNavigation";
import TrainingDetailScreen from "../../screens/trainings/TrainingDetailScreen";
import { getToken } from "../../storage/tokenStorage";

export default function TrainingDetailRoute() {
  const params = useLocalSearchParams();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const trainingId = Number(params.id);

  useEffect(() => {
    async function checkToken() {
      const token = await getToken();

      if (!token) {
        router.replace("/");
        return;
      }

      setCheckingAuth(false);
    }

    checkToken();
  }, []);

  function handleBack() {
    navigateBackOrReplace("/trainings");
  }

  function handleOpenQuizzes() {
    router.push(`/trainings/${trainingId}/quizzes`);
  }

  if (checkingAuth) {
    return <LoadingState message="Vérification de la session..." />;
  }

  if (!trainingId || Number.isNaN(trainingId)) {
    router.replace("/trainings");
    return <LoadingState message="Redirection..." />;
  }

  return (
    <TrainingDetailScreen
      trainingId={trainingId}
      onBack={handleBack}
      onOpenQuizzes={handleOpenQuizzes}
    />
  );
}
