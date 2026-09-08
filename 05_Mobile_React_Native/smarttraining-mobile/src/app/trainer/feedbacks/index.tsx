import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../../components/LoadingState";
import TrainerFeedbacksScreen from "../../../screens/trainer/TrainerFeedbacksScreen";
import {
  getConnectedUser,
} from "../../../storage/tokenStorage";
import type { ConnectedUser } from "../../../types/auth";

export default function TrainerFeedbacksRoute() {
  const [user, setUser] = useState<ConnectedUser | null>(null);

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

  if (!user) {
    return (
      <LoadingState message="Chargement des feedbacks..." />
    );
  }

  return (
    <TrainerFeedbacksScreen
      trainerId={user.userId}
      onOpenFeedback={(feedbackId) =>
        router.push(
          `/trainer/feedbacks/${feedbackId}` as Href,
        )
      }
      onOpenReviews={() =>
        router.push("/trainer/reviews" as Href)
      }
    />
  );
}