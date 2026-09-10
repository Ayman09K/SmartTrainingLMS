import { Href, Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import LoadingState from "../../components/LoadingState";
import {
  SafeHeaderBackButton,
} from "../../components/navigation/RoleStackHeaderActions";
import {
  getConnectedUser,
  getToken,
} from "../../storage/tokenStorage";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";

export default function AdminLayout() {
  const { theme } = useSmartTrainingTheme();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    void Promise.all([getToken(), getConnectedUser()])
      .then(([token, user]) => {
        if (!active) {
          return;
        }

        if (!token || !user || user.role !== "ADMIN") {
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
    return <LoadingState message="Vérification de l’accès administrateur..." />;
  }

  return (
    <>
      <StatusBar style="light" animated />

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
          <SafeHeaderBackButton fallback={"/admin" as Href} />
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
        name="trainer-requests"
        options={{
          title: "Demandes formateur",
        }}
      />
      <Stack.Screen
        name="feedbacks"
        options={{
          title: "Feedbacks",
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
        name="account-deletion-requests"
        options={{
          title: "Demandes de suppression",
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
      <Stack.Screen
        name="training-categories"
        options={{
          title: "Catégories de formation",
        }}
      />
      <Stack.Screen
        name="training-new"
        options={{
          title: "Nouvelle formation",
        }}
      />
      <Stack.Screen
        name="training-edit/[id]"
        options={{
          title: "Modifier la formation",
        }}
      />
      <Stack.Screen
        name="training-quizzes/[id]"
        options={{
          title: "Quiz de la formation",
        }}
      />
      </Stack>
    </>
  );
}
