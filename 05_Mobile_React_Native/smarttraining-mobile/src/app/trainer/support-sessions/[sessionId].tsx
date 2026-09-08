import {
  Href,
  router,
  useLocalSearchParams,
} from "expo-router";

import ErrorMessage from "../../../components/ErrorMessage";
import ScreenContainer from "../../../components/ScreenContainer";
import TrainerSupportSessionDetailScreen from "../../../screens/trainer/TrainerSupportSessionDetailScreen";

export default function TrainerSupportSessionDetailRoute() {
  const { sessionId } =
    useLocalSearchParams<{ sessionId: string }>();

  const parsedId = Number(sessionId);

  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message="Séance invalide."
          onRetry={() =>
            router.replace(
              "/trainer/support-sessions" as Href,
            )
          }
        />
      </ScreenContainer>
    );
  }

  return (
    <TrainerSupportSessionDetailScreen
      sessionId={parsedId}
    />
  );
}