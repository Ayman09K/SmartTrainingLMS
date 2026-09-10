import { Href, router } from "expo-router";
import { useEffect, useState } from "react";
import LoadingState from "../../components/LoadingState";
import LearnerInvitationsScreen from "../../screens/learner/LearnerInvitationsScreen";
import { getConnectedUser } from "../../storage/tokenStorage";
import { ConnectedUser } from "../../types/auth";

export default function LearnerInvitationsRoute() {
  const [user, setUser] = useState<ConnectedUser | null>(null);

  useEffect(() => {
    let active = true;

    void getConnectedUser()
      .then((connectedUser) => {
        if (!active) return;

        if (
          !connectedUser ||
          !["APPRENANT", "FORMATEUR", "ADMIN"].includes(
            connectedUser.role,
          )
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
    return <LoadingState message="Ouverture de tes invitations..." />;
  }

  return (
    <LearnerInvitationsScreen
      learnerId={user.userId}
      learnerEmail={user.email}
      onOpenMyTrainings={() => router.push("/learner/my-trainings" as Href)}
    />
  );
}