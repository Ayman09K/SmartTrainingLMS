import { Href, Stack, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../components/LoadingState";
import {
  SafeHeaderBackButton,
} from "../../components/navigation/RoleStackHeaderActions";
import {
  getConnectedUser,
  getToken,
} from "../../storage/tokenStorage";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

export default function TrainerLayout() {
  const { theme } = useSmartTrainingTheme();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    void Promise.all([
      getToken(),
      getConnectedUser(),
    ])
      .then(([token, user]) => {
        if (!active) {
          return;
        }

        if (
          !token ||
          !user ||
          user.role !== "FORMATEUR"
        ) {
          router.replace("/");
          return;
        }

        setAuthorized(true);
      })
      .catch(() => {
        if (active) {
          router.replace("/");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (!authorized) {
    return (
      <LoadingState message="Vérification de l’accès formateur..." />
    );
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
          <SafeHeaderBackButton fallback={"/trainer" as Href} />
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
        name="trainings/new"
        options={{
          title: "Nouvelle formation",
        }}
      />
      <Stack.Screen
        name="trainings/edit/[id]"
        options={{
          title: "Modifier la formation",
        }}
      />
      <Stack.Screen
        name="trainings/[id]"
        options={{
          title: "Suivi de la formation",
        }}
      />
      <Stack.Screen
        name="trainings/[id]/content"
        options={{
          title: "Contenu de la formation",
        }}
      />
      <Stack.Screen
        name="trainings/[id]/resources/[lessonId]"
        options={{
          title: "Ressources de la leçon",
        }}
      />
      <Stack.Screen
        name="trainings/[id]/preview"
        options={{
          title: "Prévisualisation",
        }}
      />
      <Stack.Screen
        name="learning-paths/index"
        options={{
          title: "Parcours de formation",
        }}
      />
      <Stack.Screen
        name="learning-paths/new"
        options={{
          title: "Nouveau parcours",
        }}
      />
      <Stack.Screen
        name="learning-paths/[pathId]"
        options={{
          title: "Gestion du parcours",
        }}
      />
      <Stack.Screen
        name="groups/index"
        options={{
          title: "Groupes / cohortes",
        }}
      />
      <Stack.Screen
        name="groups/[groupId]"
        options={{
          title: "Détail du groupe",
        }}
      />
      <Stack.Screen
        name="learners/[learnerId]"
        options={{
          title: "Suivi 360",
        }}
      />
      <Stack.Screen
        name="alerts/[alertId]"
        options={{
          title: "Détail de l’alerte",
        }}
      />
      <Stack.Screen
        name="feedbacks/index"
        options={{
          title: "Feedbacks apprenants",
        }}
      />
      <Stack.Screen
        name="feedbacks/[feedbackId]"
        options={{
          title: "Détail du feedback",
        }}
      />
      <Stack.Screen
        name="reviews/index"
        options={{
          title: "Avis sur mes formations",
        }}
      />
      <Stack.Screen
        name="interventions/index"
        options={{
          title: "Interventions",
        }}
      />
      <Stack.Screen
        name="interventions/new"
        options={{
          title: "Nouvelle intervention",
        }}
      />
      <Stack.Screen
        name="interventions/[interventionId]"
        options={{
          title: "Détail de l’intervention",
        }}
      />
      <Stack.Screen
        name="support-sessions/index"
        options={{
          title: "Séances d’accompagnement",
        }}
      />
      <Stack.Screen
        name="support-sessions/new"
        options={{
          title: "Planifier une séance",
        }}
      />
      <Stack.Screen
        name="support-sessions/[sessionId]"
        options={{
          title: "Détail de la séance",
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: "Mon compte",
        }}
      />
      <Stack.Screen
        name="appearance"
        options={{
          title: "Apparence",
        }}
      />
      <Stack.Screen
        name="assistant"
        options={{ title: "Assistant SmartTraining" }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: "Notifications",
        }}
      />
    </Stack>
  );
}
