import {
  Href,
  router,
  useLocalSearchParams,
} from "expo-router";
import { useEffect, useState } from "react";

import ErrorMessage from "../../../components/ErrorMessage";
import LoadingState from "../../../components/LoadingState";
import ScreenContainer from "../../../components/ScreenContainer";
import TrainerFeedbackDetailScreen from "../../../screens/trainer/TrainerFeedbackDetailScreen";
import {
  getConnectedUser,
} from "../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../types/auth";

export default function TrainerFeedbackDetailRoute() {
  const { feedbackId } =
    useLocalSearchParams<{ feedbackId: string }>();

  const parsedFeedbackId = Number(feedbackId);
  const [user, setUser] =
    useState<ConnectedUser | null>(null);

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((connectedUser) => {
        if (!active) {
          return;
        }

        if (
          !connectedUser ||
          connectedUser.role !== "FORMATEUR"
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

  if (
    !Number.isFinite(parsedFeedbackId) ||
    parsedFeedbackId <= 0
  ) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message="Feedback invalide."
          onRetry={() =>
            router.replace(
              "/trainer/feedbacks" as Href,
            )
          }
        />
      </ScreenContainer>
    );
  }

  if (!user) {
    return (
      <LoadingState message="Ouverture du feedback..." />
    );
  }

  return (
    <TrainerFeedbackDetailScreen
      trainerId={user.userId}
      feedbackId={parsedFeedbackId}
    />
  );
}