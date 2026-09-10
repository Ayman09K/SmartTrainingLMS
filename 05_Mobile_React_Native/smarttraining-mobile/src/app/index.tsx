import {
  Href,
  router,
  useLocalSearchParams,
} from "expo-router";
import { useEffect, useState } from "react";

import ScreenContainer from "../components/ScreenContainer";
import LoginScreen from "../screens/auth/LoginScreen";
import SplashIntroScreen from "../screens/onboarding/SplashIntroScreen";

import {
  isOnboardingCompleted,
} from "../storage/onboardingStorage";

import {
  getConnectedUser,
  getToken,
} from "../storage/tokenStorage";

import {
  useSmartTrainingTheme,
} from "../theme/provider/SmartTrainingThemeProvider";

import type {
  ConnectedUser,
} from "../types/auth";

/**
 * Durée minimale du SplashIntroScreen.
 *
 * 2100 ms = 2,1 secondes.
 */
const SPLASH_DURATION = 2100;

function destinationFor(
  user: ConnectedUser,
): Href {
  if (user.role === "APPRENANT") {
    return "/learner" as Href;
  }

  if (user.role === "FORMATEUR") {
    return "/trainer" as Href;
  }

  if (user.role === "ADMIN") {
    return "/admin" as Href;
  }

  return "/unsupported-role" as Href;
}

export default function Index() {
  const params =
    useLocalSearchParams<{
      skipOnboarding?: string;
    }>();

  /**
   * Quand on revient depuis :
   * - l'onboarding
   * - l'inscription
   * - mot de passe oublié
   *
   * avec ?skipOnboarding=1,
   * on affiche directement le Login
   * sans relancer le splash ni l'onboarding.
   */
  const skipOnboarding =
    params.skipOnboarding === "1";

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(!skipOnboarding);

  const {
    syncPreferencesFromServer,
  } = useSmartTrainingTheme();

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        /**
         * RETOUR DIRECT VERS LOGIN
         *
         * Aucun splash.
         * Aucun onboarding.
         */
        if (skipOnboarding) {
          const [
            token,
            user,
          ] = await Promise.all([
            getToken(),
            getConnectedUser(),
          ]);

          if (!mounted) {
            return;
          }

          /**
           * Si une session existe déjà,
           * on redirige vers l'espace utilisateur.
           */
          if (token && user) {
            router.replace(
              destinationFor(user),
            );

            return;
          }

          /**
           * Sinon on affiche directement Login.
           */
          setCheckingSession(false);

          return;
        }

        /**
         * LANCEMENT NORMAL DE L'APPLICATION
         *
         * On vérifie :
         * - la session
         * - si l'onboarding a déjà été terminé
         *
         * pendant que le splash reste visible
         * au minimum 2,1 secondes.
         */
        const [
          token,
          user,
          onboardingCompleted,
        ] = await Promise.all([
          getToken(),
          getConnectedUser(),
          isOnboardingCompleted(),

          new Promise<void>((resolve) => {
            setTimeout(
              resolve,
              SPLASH_DURATION,
            );
          }),
        ]).then(
          ([
            storedToken,
            storedUser,
            completed,
          ]) => [
            storedToken,
            storedUser,
            completed,
          ] as const,
        );

        if (!mounted) {
          return;
        }

        /**
         * PREMIER ACCÈS UNIQUEMENT
         *
         * Si l'onboarding n'a jamais été terminé,
         * on l'affiche.
         *
         * Une fois terminé, completeOnboarding()
         * stocke la valeur dans AsyncStorage.
         *
         * Aux lancements suivants,
         * cette condition sera donc ignorée.
         */
        if (!onboardingCompleted) {
          router.replace(
            "/onboarding" as Href,
          );

          return;
        }

        /**
         * Onboarding déjà terminé
         * + utilisateur déjà connecté.
         */
        if (token && user) {
          router.replace(
            destinationFor(user),
          );

          return;
        }

        /**
         * Onboarding déjà terminé
         * + aucune session :
         * afficher Login.
         */
        setCheckingSession(false);
      } catch {
        if (!mounted) {
          return;
        }

        /**
         * En cas d'erreur locale,
         * on évite une boucle de navigation
         * et on affiche le Login.
         */
        setCheckingSession(false);
      }
    }

    void initialize();

    return () => {
      mounted = false;
    };
  }, [skipOnboarding]);

  async function handleLoginSuccess(
    user: ConnectedUser,
  ): Promise<void> {
    try {
      await syncPreferencesFromServer();
    } catch {
      /**
       * Une erreur de synchronisation du thème
       * ne bloque jamais la connexion.
       */
    }

    router.replace(
      destinationFor(user),
    );
  }

  /**
   * Splash React Native uniquement
   * pendant un lancement normal.
   *
   * Il n'apparaît pas lors d'un retour
   * avec ?skipOnboarding=1.
   */
  if (checkingSession) {
    return <SplashIntroScreen />;
  }

  return (
    <ScreenContainer
      edges={[
        "top",
        "right",
        "bottom",
        "left",
      ]}
    >
      <LoginScreen
        onLoginSuccess={(user) => {
          void handleLoginSuccess(user);
        }}
        onCreateAccount={() => {
          router.push(
            "/register" as Href,
          );
        }}
        onForgotPassword={() => {
          router.push(
            "/forgot-password" as Href,
          );
        }}
      />
    </ScreenContainer>
  );
}
