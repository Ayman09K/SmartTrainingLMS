import {
  Href,
  router,
  useLocalSearchParams,
} from "expo-router";

import ErrorMessage from "../../../components/ErrorMessage";
import ScreenContainer from "../../../components/ScreenContainer";
import TrainerInterventionDetailScreen from "../../../screens/trainer/TrainerInterventionDetailScreen";

export default function TrainerInterventionDetailRoute() {
  const { interventionId } =
    useLocalSearchParams<{ interventionId: string }>();

  const parsedId = Number(interventionId);

  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message="Intervention invalide."
          onRetry={() =>
            router.replace(
              "/trainer/interventions" as Href,
            )
          }
        />
      </ScreenContainer>
    );
  }

  return (
    <TrainerInterventionDetailScreen
      interventionId={parsedId}
    />
  );
}