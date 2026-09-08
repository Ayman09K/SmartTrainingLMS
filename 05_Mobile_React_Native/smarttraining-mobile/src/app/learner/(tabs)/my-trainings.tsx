import { Href, router } from "expo-router";
import LearnerMyTrainingsScreen from "../../../screens/learner/LearnerMyTrainingsScreen";

export default function LearnerMyTrainingsRoute() {
  return (
    <LearnerMyTrainingsScreen
      onOpenTraining={(trainingId) =>
        router.push(
          `/learner/training-detail?trainingId=${trainingId}` as Href,
        )
      }
      onBackHome={() => router.replace("/learner" as Href)}
      onOpenCertificates={() =>
        router.push("/learner/certificates" as Href)
      }
    />
  );
}