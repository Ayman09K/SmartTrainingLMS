import { Href, Stack, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../components/LoadingState";
import {
  SafeHeaderBackButton,
} from "../../components/navigation/RoleStackHeaderActions";
import { getConnectedUser, getToken } from "../../storage/tokenStorage";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

export default function LearnerLayout() {
  const [authorized, setAuthorized] = useState(false);
  const { theme } = useSmartTrainingTheme();

  useEffect(() => {
    let active = true;

    void Promise.all([getToken(), getConnectedUser()])
      .then(([token, user]) => {
        if (!active) return;

        if (!token || !user) {
          router.replace("/" as Href);
          return;
        }

        if (
          !["APPRENANT", "FORMATEUR", "ADMIN"].includes(user.role)
        ) {
          router.replace("/unsupported-role" as Href);
          return;
        }

        setAuthorized(true);
      })
      .catch(() => {
        if (active) {
          router.replace("/" as Href);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (!authorized) {
    return <LoadingState message="Ouverture de ton espace..." />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.headerBackground,
        },
        headerTintColor: theme.colors.headerForeground,
        headerTitleStyle: {
          fontWeight: "700",
        },
        headerTitleAlign: "center",
        headerLeft: () => (
          <SafeHeaderBackButton fallback={"/learner" as Href} />
        ),
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="invitations"
        options={{ title: "Mes invitations" }}
      />
      <Stack.Screen
        name="certificates"
        options={{
          title: "Mes certificats",
          headerLeft: () => (
            <SafeHeaderBackButton
              fallback={"/learner/my-trainings" as Href}
            />
          ),
        }}
      />
      <Stack.Screen
        name="learning-path-detail"
        options={{ title: "Parcours" }}
      />
      <Stack.Screen
        name="training-detail"
        options={{ title: "Formation" }}
      />
      <Stack.Screen
        name="course-player"
        options={{ title: "Parcours" }}
      />
      <Stack.Screen
        name="recommendations"
        options={{ title: "Mes recommandations" }}
      />
      <Stack.Screen
        name="reviews-feedback"
        options={{ title: "Avis et feedback" }}
      />
      <Stack.Screen
        name="sessions"
        options={{ title: "Mes séances" }}
      />
      <Stack.Screen
        name="appearance"
        options={{ title: "Apparence" }}
      />
      <Stack.Screen
        name="become-trainer"
        options={{ title: "Devenir formateur" }}
      />
      <Stack.Screen
        name="assistant"
        options={{ title: "Assistant SmartTraining" }}
      />
      <Stack.Screen
        name="notifications"
        options={{ title: "Notifications" }}
      />
    </Stack>
  );
}
