package com.smarttraining.analytics.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TrainerLearnerOverviewResponse(
        Long learnerId,
        List<Long> trainingIds,
        TrainerLearnerOverviewSummary summary,
        List<LearnerProgressResponse> progress,
        List<RiskIndicatorResponse> risks,
        List<LearningEventResponse> recentEvents,
        List<FeedbackResponse> feedbacks,
        List<AlertResponse> alerts,
        List<RecommendationResponse> recommendations,
        List<InterventionResponse> interventions
) {
    public record TrainerLearnerOverviewSummary(
            int totalTrainings,
            int completedTrainings,
            int averageProgress,
            int averageScore,
            int completedLessons,
            int totalLessons,
            int completedQuizzes,
            int totalQuizzes,
            int totalEvents,
            int openAlerts,
            int helpRequests,
            LocalDateTime lastActivityAt
    ) {
    }
}