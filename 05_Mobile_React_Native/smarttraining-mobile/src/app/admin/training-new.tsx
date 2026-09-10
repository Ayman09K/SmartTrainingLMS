import { SymbolView } from "expo-symbols";
import {
  Href,
  Stack,
  router,
  useFocusEffect,
} from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  BackHandler,
  Pressable,
} from "react-native";

import LoadingState from "../../components/LoadingState";
import {
  ScormQuickCreateMobileScreen,
  TrainingCreationMethodScreen,
} from "../../screens/training/ScormQuickCreateMobileScreen";
import AdminTrainingEditorScreen from "../../screens/admin/AdminTrainingEditorScreen";
import {
  getConnectedUser,
} from "../../storage/tokenStorage";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

function CreationHeaderBackButton({
  onPress,
}: {
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour aux formations"
      hitSlop={10}
      onPress={onPress}
      android_ripple={{ color: "transparent" }}
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
        tintColor={theme.colors.headerForeground}
        size={24}
        weight="bold"
      />
    </Pressable>
  );
}

export default function AdminTrainingNewRoute() {
  const [authorized, setAuthorized] =
    useState(false);
  const [creationMethod, setCreationMethod] =
    useState<"MANUAL" | "SCORM" | null>(null);

  function returnToCatalogue() {
    setCreationMethod(null);

    const navigationRouter = router as typeof router & {
      dismissTo?: (href: Href) => void;
    };

    if (typeof navigationRouter.dismissTo === "function") {
      navigationRouter.dismissTo("/admin/trainings" as Href);
      return;
    }

    router.replace("/admin/trainings" as Href);
  }

  function returnToMethodChoice() {
    setCreationMethod(null);
  }

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((user) => {
        if (!active) return;

        if (!user || user.role !== "ADMIN") {
          router.replace("/");
          return;
        }

        setAuthorized(true);
      })
      .catch(() => {
        if (active) router.replace("/");
      });

    return () => {
      active = false;
    };
  }, []);

  /*
   * Android :
   * quel que soit le sous-écran de création affiché
   * (choix, création manuelle ou SCORM), le bouton Retour
   * du téléphone revient DIRECTEMENT au catalogue.
   *
   * Si l'éditeur contient des modifications non enregistrées,
   * son propre BackHandler, enregistré plus tard, conserve
   * la confirmation de sortie avant d'appeler onCancel().
   */
  useFocusEffect(
    useCallback(() => {
      if (!authorized) {
        return undefined;
      }

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (creationMethod) {
            returnToMethodChoice();
            return true;
          }

          returnToCatalogue();
          return true;
        },
      );

      return () => subscription.remove();
    }, [authorized, creationMethod]),
  );

  if (!authorized) {
    return (
      <LoadingState message="Vérification administrateur..." />
    );
  }

  const headerTitle =
    creationMethod === "MANUAL"
      ? "Création manuelle"
      : creationMethod === "SCORM"
        ? "Import SCORM"
        : "Nouvelle formation";

  const header = (
    <Stack.Screen
      options={{
        title: headerTitle,
        headerBackVisible: false,
        headerLeft: () => (
          <CreationHeaderBackButton
            onPress={
              creationMethod
                ? returnToMethodChoice
                : returnToCatalogue
            }
          />
        ),
      }}
    />
  );

  if (!creationMethod) {
    return (
      <>
        {header}
        <TrainingCreationMethodScreen
          onManual={() => setCreationMethod("MANUAL")}
          onScorm={() => setCreationMethod("SCORM")}
          onCancel={returnToCatalogue}
        />
      </>
    );
  }

  if (creationMethod === "SCORM") {
    return (
      <>
        {header}
        <ScormQuickCreateMobileScreen
          role="ADMIN"
          /*
           * "Changer de méthode" reste une action interne :
           * elle revient au choix Manuel / SCORM.
           * Le bouton du header et le bouton Android, eux,
           * reviennent directement au catalogue.
           */
          onBack={returnToMethodChoice}
          onCreated={(trainingId) =>
            router.replace(
              `/admin/training-edit/${trainingId}` as Href,
            )
          }
        />
      </>
    );
  }

  return (
    <>
      {header}
      <AdminTrainingEditorScreen
        onCancel={returnToMethodChoice}
        onSaved={(trainingId) =>
          router.replace(
            `/admin/training-edit/${trainingId}` as Href,
          )
        }
      />
    </>
  );
}
