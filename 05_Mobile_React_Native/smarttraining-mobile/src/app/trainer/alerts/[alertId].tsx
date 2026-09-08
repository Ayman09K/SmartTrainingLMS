import {
  Href,
  router,
  useLocalSearchParams,
} from "expo-router";

import ErrorMessage from "../../../components/ErrorMessage";
import ScreenContainer from "../../../components/ScreenContainer";
import TrainerAlertDetailScreen from "../../../screens/trainer/TrainerAlertDetailScreen";

export default function TrainerAlertDetailRoute() {
  const { alertId } =
    useLocalSearchParams<{ alertId: string }>();

  const parsedAlertId = Number(alertId);

  if (
    !Number.isFinite(parsedAlertId) ||
    parsedAlertId <= 0
  ) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message="Alerte invalide."
          onRetry={() =>
            router.replace(
              "/trainer/alerts" as Href,
            )
          }
        />
      </ScreenContainer>
    );
  }

  return (
    <TrainerAlertDetailScreen
      alertId={parsedAlertId}
    />
  );
}