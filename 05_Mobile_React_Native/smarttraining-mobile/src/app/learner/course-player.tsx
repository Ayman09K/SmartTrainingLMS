import { Href, Stack, router, useLocalSearchParams } from "expo-router";
import RoleHeaderShortcuts from "../../components/assistant/RoleHeaderShortcuts";
import { StyleSheet, Text, View } from "react-native";

import AppButton from "../../components/AppButton";
import ScreenContainer from "../../components/ScreenContainer";
import LearnerCoursePlayerScreen from "../../screens/learner/LearnerCoursePlayerScreen";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

export default function LearnerCoursePlayerRoute() {
  const { theme } = useSmartTrainingTheme();

  const params = useLocalSearchParams<{
    trainingId?: string | string[];
    replay?: string | string[];
  }>();

  const replayValue = Array.isArray(params.replay)
    ? params.replay[0]
    : params.replay;
  const replayMode = replayValue === "1";

  const rawTrainingId = Array.isArray(params.trainingId)
    ? params.trainingId[0]
    : params.trainingId;
  const trainingId = Number(rawTrainingId);

  if (!Number.isInteger(trainingId) || trainingId <= 0) {
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
            Le lecteur ne peut pas ouvrir cette formation.
          </Text>

          <AppButton
            title={"Retour \u00E0 mes formations"}
            onPress={() =>
              router.replace("/learner/my-trainings" as Href)
            }
            variant="secondary"
          />
        </View>
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
                  `/learner/assistant?trainingId=${trainingId}` as Href,
                )
              }
            />
          ),
        }}
      />
      <LearnerCoursePlayerScreen
      trainingId={trainingId}
      replayMode={replayMode}
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }

        router.replace(
          `/learner/training-detail?trainingId=${trainingId}` as Href,
        );
      }}
      onOpenScorm={(resourceId) =>
        router.push(`/scorm/${resourceId}` as Href)
      }
      onOpenQuizzes={() =>
        router.push(
          `/trainings/${trainingId}/quizzes?fromCourse=1` as Href,
        )
      }
      />
    </>
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
