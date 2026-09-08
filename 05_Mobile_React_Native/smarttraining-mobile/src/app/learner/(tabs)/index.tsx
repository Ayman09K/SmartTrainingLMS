import { Href, router } from "expo-router";
import { useEffect, useState } from "react";
import LoadingState from "../../../components/LoadingState";
import LearnerHomeScreen from "../../../screens/learner/LearnerHomeScreen";
import {
  getConnectedUser,
  removeToken,
} from "../../../storage/tokenStorage";
import { ConnectedUser } from "../../../types/auth";

export default function LearnerHomeRoute() {
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

  async function handleLogout() {
    await removeToken();
    router.replace("/");
  }

  if (!user) {
    return <LoadingState message="Chargement de ton espace..." />;
  }

  return (
    <LearnerHomeScreen
      user={user}
      onOpenCatalog={() => router.push("/learner/catalog" as Href)}
      onOpenInvitations={() => router.push("/learner/invitations" as Href)}
      onOpenTrainings={() => router.push("/learner/my-trainings" as Href)}
      onOpenTraining={(trainingId) =>
        router.push(
          `/learner/training-detail?trainingId=${trainingId}` as Href,
        )
      }
      onOpenProgress={() => router.push("/learner/progress" as Href)}
      onOpenRecommendations={() => router.push("/learner/recommendations" as Href)}
      onOpenCertificates={() => router.push("/learner/certificates" as Href)}
      onOpenReviewsFeedback={() => router.push("/learner/reviews-feedback" as Href)}
      onOpenSessions={() => router.push("/learner/sessions" as Href)}
      onOpenProfile={() => router.push("/learner/profile" as Href)}
      onLogout={() => void handleLogout()}
    />
  );
}