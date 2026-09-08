import {
  Href,
  router,
  useLocalSearchParams,
} from "expo-router";

import ErrorMessage from "../../../components/ErrorMessage";
import ScreenContainer from "../../../components/ScreenContainer";
import TrainerGroupDetailScreen from "../../../screens/trainer/TrainerGroupDetailScreen";

export default function TrainerGroupDetailRoute() {
  const { groupId } =
    useLocalSearchParams<{ groupId: string }>();

  const parsedGroupId = Number(groupId);

  if (
    !Number.isFinite(parsedGroupId) ||
    parsedGroupId <= 0
  ) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message="Groupe invalide."
          onRetry={() =>
            router.replace("/trainer/groups" as Href)
          }
        />
      </ScreenContainer>
    );
  }

  return (
    <TrainerGroupDetailScreen
      groupId={parsedGroupId}
    />
  );
}