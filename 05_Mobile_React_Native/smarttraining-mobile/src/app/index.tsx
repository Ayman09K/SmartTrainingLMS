import ScreenContainer from "../components/ScreenContainer";
import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../components/LoadingState";
import LoginScreen from "../screens/auth/LoginScreen";
import { getConnectedUser, getToken } from "../storage/tokenStorage";
import {
  useSmartTrainingTheme,
} from "../theme/provider/SmartTrainingThemeProvider";
import { ConnectedUser } from "../types/auth";

function destinationFor(user: ConnectedUser): Href {
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
  const [checkingSession, setCheckingSession] = useState(true);

  const {
    syncPreferencesFromServer,
  } = useSmartTrainingTheme();

  useEffect(() => {
    let active = true;

    void Promise.all([getToken(), getConnectedUser()])
      .then(([token, user]) => {
        if (!active) {
          return;
        }

        if (token && user) {
          router.replace(destinationFor(user));
          return;
        }

        setCheckingSession(false);
      })
      .catch(() => {
        if (active) {
          setCheckingSession(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleLoginSuccess(
    user: ConnectedUser,
  ): Promise<void> {
    try {
      await syncPreferencesFromServer();
    }
    catch {
      // The local cache remains the degraded fallback if Auth is unreachable.
    }

    router.replace(destinationFor(user));
  }

  if (checkingSession) {
    return (
      <LoadingState message="Verification de la session..." />
    );
  }

  return (
    <ScreenContainer edges={["top", "right", "bottom", "left"]}>
      <LoginScreen
        onLoginSuccess={(user) => {
          void handleLoginSuccess(user);
        }}
        onCreateAccount={() => router.push("/register" as Href)}
        onForgotPassword={() =>
          router.push("/forgot-password" as Href)
        }
      />
    </ScreenContainer>
  );
}