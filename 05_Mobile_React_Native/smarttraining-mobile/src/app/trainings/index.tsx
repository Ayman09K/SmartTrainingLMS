import { Href, router } from "expo-router";
import { useEffect, useState } from "react";
import LoadingState from "../../components/LoadingState";
import { createSelfLearningEvent } from "../../features/analytics/analyticsService";
import TrainingListScreen from "../../screens/trainings/TrainingListScreen";
import { getConnectedUser, getToken } from "../../storage/tokenStorage";
import { createRequestId } from "../../utils/requestId";

export default function TrainingsRoute() {
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const [token, user] = await Promise.all([
        getToken(),
        getConnectedUser(),
      ]);

      if (!token || !user) {
        router.replace("/");
        return;
      }

      setCheckingAuth(false);
    }

    void checkSession();
  }, []);

  function handleSelectTraining(trainingId: number) {
    router.push(`/trainings/${trainingId}`);

    void createSelfLearningEvent({
      requestId: createRequestId(`training-${trainingId}-opened`),
      trainingId,
      eventType: "TRAINING_OPENED",
      description: "Formation ouverte depuis le mobile.",
    }).catch((error: unknown) => {
    });
  }

  if (checkingAuth) {
    return <LoadingState message="Verification de la session..." />;
  }

  return (
    <TrainingListScreen
      onSelectTraining={handleSelectTraining}
      onOpenProgress={() => router.push("/learner/progress" as Href)}
      onLogout={() => router.replace("/")}
    />
  );
}