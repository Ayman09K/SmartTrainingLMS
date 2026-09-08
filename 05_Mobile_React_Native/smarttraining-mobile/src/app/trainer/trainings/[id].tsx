import {
  Href,
  Stack,
  router,
  useLocalSearchParams,
} from "expo-router";
import RoleHeaderShortcuts from "../../../components/assistant/RoleHeaderShortcuts";

import ErrorMessage from "../../../components/ErrorMessage";
import ScreenContainer from "../../../components/ScreenContainer";
import TrainerTrainingDetailScreen from "../../../screens/trainer/TrainerTrainingDetailScreen";

export default function TrainerTrainingDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trainingId = Number(id);

  if (!Number.isFinite(trainingId) || trainingId <= 0) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message="Formation invalide."
          onRetry={() =>
            router.replace("/trainer/trainings" as Href)
          }
        />
      </ScreenContainer>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <RoleHeaderShortcuts
              onAssistantPress={() =>
                router.push(
                  `/trainer/assistant?trainingId=${trainingId}` as Href,
                )
              }
            />
          ),
        }}
      />
      <TrainerTrainingDetailScreen
      trainingId={trainingId}
      onDeleted={() =>
        router.replace("/trainer/trainings" as Href)
      }
      onManageContent={() =>
        router.push(
          `/trainer/trainings/${trainingId}/content` as Href,
        )
      }
      onPreview={() =>
        router.push(
          `/trainer/trainings/${trainingId}/preview` as Href,
        )
      }
      />
    </>
  );
}
