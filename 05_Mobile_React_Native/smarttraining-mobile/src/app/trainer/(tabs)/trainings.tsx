import { Href, router } from "expo-router";
import { useEffect, useState } from "react";

import LoadingState from "../../../components/LoadingState";
import TrainerTrainingsScreen from "../../../screens/trainer/TrainerTrainingsScreen";
import {
  getConnectedUser,
} from "../../../storage/tokenStorage";
import { ConnectedUser } from "../../../types/auth";

export default function TrainerTrainingsRoute() {
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
      <LoadingState message="Chargement de vos formations..." />
    );
  }

  return (
    <TrainerTrainingsScreen
      trainerId={user.userId}
      onCreateTraining={() =>
        router.push("/trainer/trainings/new" as Href)
      }
      onEditTraining={(trainingId) =>
        router.push(
          `/trainer/trainings/edit/${trainingId}` as Href,
        )
      }
      onOpenTraining={(trainingId) =>
        router.push(
          `/trainer/trainings/${trainingId}` as Href,
        )
      }
    />
  );
}