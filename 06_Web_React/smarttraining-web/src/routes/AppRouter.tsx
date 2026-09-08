import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { AdminAlertsPage } from "../pages/admin/AdminAlertsPage";
import { AdminAssignmentsPage } from "../pages/admin/AdminAssignmentsPage";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AdminFeedbacksPage } from "../pages/admin/AdminFeedbacksPage";
import { AdminReviewsPage } from "../pages/admin/AdminReviewsPage";
import { AdminTrainerRequestsPage } from "../pages/admin/AdminTrainerRequestsPage";
import { AdminAccountDeletionRequestsPage } from "../pages/admin/AdminAccountDeletionRequestsPage";
import { AdminTrainingsPage } from "../pages/admin/AdminTrainingsPage";
import { AdminTrainingEditorPage } from "../pages/admin/AdminTrainingEditorPage";
import { AdminTrainingCategoriesPage } from "../pages/admin/AdminTrainingCategoriesPage";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage";
import { AdminLearnerActivityPage } from "../pages/admin/AdminLearnerActivityPage";
import { LearnerGroupsPage } from "../pages/groups/LearnerGroupsPage";
import { LearnerGroupDetailPage } from "../pages/groups/LearnerGroupDetailPage";

import { AdminStatisticsPage } from "../pages/admin/AdminStatisticsPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage";
import { UnauthorizedPage } from "../pages/auth/UnauthorizedPage";
import { PrivacyPage } from "../pages/privacy/PrivacyPage";
import { AccountDeletionPage } from "../pages/accountDeletion/AccountDeletionPage";
import { AccountPage } from "../pages/account/AccountPage";
import { LearnerCatalogPage } from "../pages/learner/LearnerCatalogPage";
import { LearnerDashboardPage } from "../pages/learner/LearnerDashboardPage";
import { LearnerFeedbacksPage } from "../pages/learner/LearnerFeedbacksPage";
import { LearnerInvitationsPage } from "../pages/learner/LearnerInvitationsPage";
import { LearnerProgressPage } from "../pages/learner/LearnerProgressPage";
import { LearnerQuizzesPage } from "../pages/learner/LearnerQuizzesPage";
import { LearnerTrainingDetailPage } from "../pages/learner/LearnerTrainingDetailPage";
import { LearnerLearningPathDetailPage } from "../pages/learner/LearnerLearningPathDetailPage";
import { LearnerTrainingsPage } from "../pages/learner/LearnerTrainingsPage";
import { LearnerCertificatesPage } from "../pages/learner/LearnerCertificatesPage";
import { LearnerSupportSessionsPage } from "../pages/learner/LearnerSupportSessionsPage";
import { LearnerNotificationsPage } from "../pages/learner/LearnerNotificationsPage";
import { TrainerAlertsPage } from "../pages/trainer/TrainerAlertsPage";
import { TrainerContentBuilderPage } from "../pages/trainer/TrainerContentBuilderPage";
import { TrainerDashboardPage } from "../pages/trainer/TrainerDashboardPage";
import { TrainerFeedbacksPage } from "../pages/trainer/TrainerFeedbacksPage";
import { TrainerInterventionsPage } from "../pages/trainer/TrainerInterventionsPage";
import { TrainerSupportSessionsPage } from "../pages/trainer/TrainerSupportSessionsPage";
import { TrainerLearnersPage } from "../pages/trainer/TrainerLearnersPage";
import { TrainerLearnerDetailPage } from "../pages/trainer/TrainerLearnerDetailPage";
import { TrainerTrainingsPage } from "../pages/trainer/TrainerTrainingsPage";
import { TrainerTrainingEditorPage } from "../pages/trainer/TrainerTrainingEditorPage";
import { TrainerUploadsPage } from "../pages/trainer/TrainerUploadsPage";
import { LearningPathsPage } from "../pages/learningPaths/LearningPathsPage";
import { LearningPathEditorPage } from "../pages/learningPaths/LearningPathEditorPage";
import { LearningPathDetailPage } from "../pages/learningPaths/LearningPathDetailPage";

import { TrainerStatisticsPage } from "../pages/trainer/TrainerStatisticsPage";
import { ReportingResultsPage } from "../pages/reporting/ReportingResultsPage";
import { AssistantPage } from "../pages/assistant/AssistantPage";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleBasedRedirect } from "./RoleBasedRedirect";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/account-deletion" element={<AccountDeletionPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<RoleBasedRedirect />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["APPRENANT", "FORMATEUR", "ADMIN"]} />}>
        <Route
          path="/learner/trainings/:trainingId/play"
          element={<LearnerTrainingDetailPage focused />}
        />
        <Route path="/learner" element={<AppLayout />}>
          <Route index element={<LearnerDashboardPage />} />
          <Route path="catalog" element={<LearnerCatalogPage />} />
          <Route
            path="learning-paths/:pathId"
            element={<LearnerLearningPathDetailPage />}
          />
          <Route path="invitations" element={<LearnerInvitationsPage />} />
          <Route path="trainings" element={<LearnerTrainingsPage />} />
          <Route path="certificates" element={<LearnerCertificatesPage />} />
          <Route path="trainings/:trainingId" element={<LearnerTrainingDetailPage />} />
          <Route path="progress" element={<LearnerProgressPage />} />
          <Route path="quizzes" element={<LearnerQuizzesPage />} />
          <Route path="feedbacks" element={<LearnerFeedbacksPage />} />
          <Route path="support-sessions" element={<LearnerSupportSessionsPage />} />
          <Route path="notifications" element={<LearnerNotificationsPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="account" element={<AccountPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["FORMATEUR", "ADMIN"]} />}>
        <Route path="/trainer" element={<AppLayout />}>
          <Route index element={<TrainerDashboardPage />} />
          <Route path="trainings" element={<TrainerTrainingsPage />} />
          <Route path="trainings/new" element={<TrainerTrainingEditorPage />} />
          <Route path="trainings/:trainingId/edit" element={<TrainerTrainingEditorPage />} />
          <Route path="learning-paths" element={<LearningPathsPage />} />
          <Route path="learning-paths/new" element={<LearningPathEditorPage />} />
          <Route path="learning-paths/:pathId/edit" element={<LearningPathEditorPage />} />
          <Route path="learning-paths/:pathId" element={<LearningPathDetailPage />} />
          <Route path="content" element={<TrainerContentBuilderPage />} />
          <Route path="trainings/:trainingId/content" element={<TrainerContentBuilderPage />} />
          <Route path="uploads" element={<TrainerUploadsPage />} />
          <Route path="learners" element={<TrainerLearnersPage />} />
          <Route path="learners/:learnerId" element={<TrainerLearnerDetailPage />} />
          <Route path="groups" element={<LearnerGroupsPage />} />
          <Route path="groups/:groupId" element={<LearnerGroupDetailPage />} />
          <Route path="feedbacks" element={<TrainerFeedbacksPage />} />
          <Route path="alerts" element={<TrainerAlertsPage />} />
          <Route path="interventions" element={<TrainerInterventionsPage />} />
          <Route path="support-sessions" element={<TrainerSupportSessionsPage />} />

          <Route path="results" element={<ReportingResultsPage />} />
          <Route path="statistics" element={<TrainerStatisticsPage />} />
          <Route path="notifications" element={<LearnerNotificationsPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="account" element={<AccountPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route path="/admin" element={<AppLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route
            path="users/:learnerId/activity"
            element={<AdminLearnerActivityPage />}
          />
          <Route path="trainer-requests" element={<AdminTrainerRequestsPage />} />
          <Route path="account-deletion-requests" element={<AdminAccountDeletionRequestsPage />} />
          <Route path="trainings" element={<AdminTrainingsPage />} />
          <Route path="learning-paths" element={<LearningPathsPage />} />
          <Route path="learning-paths/new" element={<LearningPathEditorPage />} />
          <Route path="learning-paths/:pathId/edit" element={<LearningPathEditorPage />} />
          <Route path="learning-paths/:pathId" element={<LearningPathDetailPage />} />
          <Route path="categories" element={<AdminTrainingCategoriesPage />} />
          <Route path="trainings/new" element={<AdminTrainingEditorPage />} />
          <Route path="trainings/:trainingId/edit" element={<AdminTrainingEditorPage />} />
          <Route path="trainings/:trainingId/content" element={<TrainerContentBuilderPage />} />
          <Route path="assignments" element={<AdminAssignmentsPage />} />
          <Route path="groups" element={<LearnerGroupsPage />} />
          <Route path="groups/:groupId" element={<LearnerGroupDetailPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="feedbacks" element={<AdminFeedbacksPage />} />
          <Route path="alerts" element={<AdminAlertsPage />} />

          <Route path="results" element={<ReportingResultsPage />} />
          <Route path="statistics" element={<AdminStatisticsPage />} />
          <Route path="notifications" element={<LearnerNotificationsPage />} />
          <Route path="assistant" element={<AssistantPage />} />
          <Route path="account" element={<AccountPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
