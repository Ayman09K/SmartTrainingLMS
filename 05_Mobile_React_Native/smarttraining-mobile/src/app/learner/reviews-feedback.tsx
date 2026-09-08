import { Href, router } from "expo-router";
import LearnerReviewsFeedbackScreen from "../../screens/learner/LearnerReviewsFeedbackScreen";

export default function LearnerReviewsFeedbackRoute() {
  return (
    <LearnerReviewsFeedbackScreen
      onBackHome={() => router.replace("/learner" as Href)}
    />
  );
}