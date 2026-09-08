import {
  Href,
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ScreenContainer from "../../components/ScreenContainer";
import LearnerLearningPathDetailScreen from "../../screens/learner/LearnerLearningPathDetailScreen";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

export default function LearnerLearningPathDetailRoute() {
  const { theme } = useSmartTrainingTheme();

  const params = useLocalSearchParams<{
    pathId?: string | string[];
  }>();

  const rawPathId = Array.isArray(params.pathId)
    ? params.pathId[0]
    : params.pathId;

  const pathId = Number(rawPathId);

  if (!Number.isInteger(pathId) || pathId <= 0) {
    return (
      <ScreenContainer>
        <View
          style={[
            styles.invalid,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.shape.cardRadius,
              borderWidth: theme.shape.borderWidth,
              padding: theme.shape.cardPadding,
            },
          ]}
        >
          <Text
            style={[
              styles.invalidTitle,
              { color: theme.colors.foreground },
            ]}
          >
            Parcours invalide
          </Text>

          <Text
            style={[
              styles.invalidText,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            Ce parcours ne peut pas \u00EAtre ouvert.
          </Text>

          <AppButton
            title="Retour au catalogue"
            onPress={() =>
              router.replace(
                "/learner/(tabs)/catalog" as Href,
              )
            }
            variant="secondary"
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <LearnerLearningPathDetailScreen
      pathId={pathId}
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace(
          "/learner/(tabs)/catalog" as Href,
        );
      }}
      onOpenTraining={(trainingId) =>
        router.push(
          `/learner/training-detail?trainingId=${trainingId}` as Href,
        )
      }
      onOpenCourse={(trainingId, replay = false) =>
        router.push(
          `/learner/course-player?trainingId=${trainingId}${
            replay ? "&replay=1" : ""
          }` as Href,
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  invalid: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  invalidTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  invalidText: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
});