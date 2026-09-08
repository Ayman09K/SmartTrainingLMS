import "../../global.css";

import { Href, Stack } from "expo-router";

import { SafeHeaderBackButton } from "@/components/navigation/RoleStackHeaderActions";

import {
  SmartTrainingThemeProvider,
  useSmartTrainingTheme,
} from "@/theme/provider/SmartTrainingThemeProvider";

function RootNavigator() {
  const { theme } = useSmartTrainingTheme();

  return (
    <Stack
      screenOptions={{
        orientation: "portrait",
        headerStyle: {
          backgroundColor: theme.colors.headerBackground,
        },
        headerTintColor: theme.colors.headerForeground,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen
        name="privacy"
        options={{
          title: "Confidentialité",
        }}
      /><Stack.Screen name="learner" options={{ headerShown: false }} />
      <Stack.Screen name="trainer" options={{ headerShown: false }} />
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      <Stack.Screen
        name="unsupported-role"
        options={{ title: "Acces mobile", headerBackVisible: false }}
      />

      {/* Routes historiques conservees pendant la migration Patch 13. */}
      <Stack.Screen
        name="trainings/index"
        options={{ title: "Mes formations", headerBackVisible: false }}
      />
      <Stack.Screen name="trainings/[id]" options={{ title: "Formation" }} />
      <Stack.Screen
        name="trainings/[id]/quizzes/index"
        options={{
          title: "Quiz",
          headerLeft: () => (
            <SafeHeaderBackButton fallback={"/trainings" as Href} />
          ),
        }}
      />
      <Stack.Screen
        name="trainings/[id]/quizzes/[quizId]"
        options={{
          title: "Quiz",
          headerLeft: () => (
            <SafeHeaderBackButton fallback={"/trainings" as Href} />
          ),
        }}
      />
      <Stack.Screen
        name="scorm/[resourceId]"
        options={{
          headerShown: false,
          orientation: "landscape",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SmartTrainingThemeProvider>
      <RootNavigator />
    </SmartTrainingThemeProvider>
  );
}
