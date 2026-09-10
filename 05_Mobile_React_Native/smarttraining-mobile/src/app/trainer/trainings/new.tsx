// PATCH16_A8C5P_POST_CREATE_DETAIL_ROUTE_V1
// PATCH16_A8C5N_POST_CREATE_CONTENT_ROUTE_V1

import { SymbolView } from "expo-symbols";
import {
  Href,
  Stack,
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  useEffect,
  useState,
} from "react";
import {
  Pressable,
} from "react-native";

import LoadingState from "../../../components/LoadingState";
import {
  ScormQuickCreateMobileScreen,
  TrainingCreationMethodScreen,
} from "../../../screens/training/ScormQuickCreateMobileScreen";
import TrainerTrainingEditorScreen from "../../../screens/trainer/TrainerTrainingEditorScreen";
import {
  getConnectedUser,
} from "../../../storage/tokenStorage";
import {
  useSmartTrainingTheme,
} from "../../../theme/provider/SmartTrainingThemeProvider";
import type {
  ConnectedUser,
} from "../../../types/auth";

function CreationHeaderBackButton({
  onPress,
}: {
  onPress: () => void;
}) {
  const { theme } =
    useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour"
      hitSlop={10}
      onPress={onPress}
      android_ripple={{
        color: "transparent",
      }}
      style={{
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SymbolView
        name={{
          ios: "chevron.left",
          android: "chevron_left",
          web: "chevron_left",
        }}
        tintColor={
          theme.colors.headerForeground
        }
        size={24}
        weight="bold"
      />
    </Pressable>
  );
}

export default function TrainerTrainingNewRoute() {
  const { method } =
    useLocalSearchParams<{
      method?: string | string[];
    }>();

  const requestedMethod =
    Array.isArray(method)
      ? method[0]
      : method;

  const directScorm =
    requestedMethod?.toLowerCase() ===
    "scorm";

  const [user, setUser] =
    useState<ConnectedUser | null>(null);

  const [
    creationMethod,
    setCreationMethod,
  ] = useState<
    "MANUAL" | "SCORM" | null
  >(null);

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((connectedUser) => {
        if (!active) {
          return;
        }

        if (
          !connectedUser ||
          connectedUser.role !==
            "FORMATEUR"
        ) {
          router.replace("/");
          return;
        }

        setUser(connectedUser);
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

  if (!user) {
    return (
      <LoadingState message="Préparation du formulaire..." />
    );
  }

  const activeMethod =
    creationMethod ??
    (directScorm
      ? "SCORM"
      : null);

  /*
   * Écran 1 : choix de la méthode.
   * Le bouton du header retourne directement
   * au catalogue avec UNE SEULE navigation.
   */
  if (!activeMethod) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Nouvelle formation",
            headerBackVisible: false,
            headerLeft: () => (
              <CreationHeaderBackButton
                onPress={() =>
                  router.replace(
                    "/trainer/trainings" as Href,
                  )
                }
              />
            ),
          }}
        />

        <TrainingCreationMethodScreen
          onManual={() =>
            setCreationMethod("MANUAL")
          }
          onScorm={() =>
            setCreationMethod("SCORM")
          }
          onCancel={() =>
            router.replace(
              "/trainer/trainings" as Href,
            )
          }
        />
      </>
    );
  }

  /*
   * Écran SCORM :
   * retour vers le choix de méthode,
   * sauf ouverture SCORM directe depuis l'accueil.
   */
  if (activeMethod === "SCORM") {
    const handleScormBack = () => {
      if (directScorm) {
        router.replace(
          "/trainer" as Href,
        );
        return;
      }

      setCreationMethod(null);
    };

    return (
      <>
        <Stack.Screen
          options={{
            title: "Importer un SCORM",
            headerBackVisible: false,
            headerLeft: () => (
              <CreationHeaderBackButton
                onPress={handleScormBack}
              />
            ),
          }}
        />

        <ScormQuickCreateMobileScreen
          role="FORMATEUR"
          onBack={handleScormBack}
          onCreated={(trainingId) =>
            router.replace(
              `/trainer/trainings/${trainingId}` as Href,
            )
          }
        />
      </>
    );
  }

  /*
   * Écran de création manuelle :
   * le retour du header revient d'abord
   * au choix de méthode au lieu de dépiler
   * plusieurs écrans.
   */
  return (
    <>
      <Stack.Screen
        options={{
          title: "Créer manuellement",
          headerBackVisible: false,
          headerLeft: () => (
            <CreationHeaderBackButton
              onPress={() =>
                setCreationMethod(null)
              }
            />
          ),
        }}
      />

      <TrainerTrainingEditorScreen
        trainerId={user.userId}
        onSaved={(trainingId) =>
          router.replace(
            `/trainer/trainings/${trainingId}/content` as Href,
          )
        }
        onCancel={() =>
          setCreationMethod(null)
        }
      />
    </>
  );
}
