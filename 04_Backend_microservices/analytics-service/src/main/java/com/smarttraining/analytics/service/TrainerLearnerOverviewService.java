package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.AlertResponse;
import com.smarttraining.analytics.dto.FeedbackResponse;
import com.smarttraining.analytics.dto.InterventionResponse;
import com.smarttraining.analytics.dto.LearnerProgressResponse;
import com.smarttraining.analytics.dto.LearningEventResponse;
import com.smarttraining.analytics.dto.RecommendationResponse;
import com.smarttraining.analytics.dto.RiskIndicatorResponse;
import com.smarttraining.analytics.dto.TrainerLearnerOverviewResponse;
import com.smarttraining.analytics.dto.TrainerLearnerOverviewResponse.TrainerLearnerOverviewSummary;
import com.smarttraining.analytics.security.AuthenticatedUser;
import com.smarttraining.analytics.security.TrainerLearnerAccessGuard;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrainerLearnerOverviewService {

    private static final int MAX_RECENT_EVENTS = 50;

    private final TrainerLearnerAccessGuard accessGuard;
    private final AnalyticsService analyticsService;
    private final LearningAlertService alertService;
    private final LearningRecommendationService recommendationService;
    private final LearningInterventionService interventionService;
    private final ReviewFeedbackService feedbackService;

    public TrainerLearnerOverviewService(
            TrainerLearnerAccessGuard accessGuard,
            AnalyticsService analyticsService,
            LearningAlertService alertService,
            LearningRecommendationService recommendationService,
            LearningInterventionService interventionService,
            ReviewFeedbackService feedbackService
    ) {
        this.accessGuard = accessGuard;
        this.analyticsService = analyticsService;
        this.alertService = alertService;
        this.recommendationService = recommendationService;
        this.interventionService = interventionService;
        this.feedbackService = feedbackService;
    }

    @Transactional(readOnly = true)
    public TrainerLearnerOverviewResponse getOverview(
            Long learnerId,
            AuthenticatedUser actor
    ) {
        List<Long> allowedTrainingIds =
                accessGuard.requireAccess(actor, learnerId);

        Set<Long> allowed =
                Set.copyOf(allowedTrainingIds);

        List<LearnerProgressResponse> progress =
                analyticsService
                        .getProgressByLearner(learnerId)
                        .stream()
                        .filter(item ->
                                item.getTrainingId() != null
                                && allowed.contains(item.getTrainingId())
                        )
                        .sorted(
                                Comparator.comparing(
                                        LearnerProgressResponse::getLastActivityAt,
                                        Comparator.nullsLast(
                                                Comparator.reverseOrder()
                                        )
                                )
                        )
                        .toList();

        List<LearningEventResponse> allEvents =
                analyticsService
                        .getEventsByLearner(learnerId)
                        .stream()
                        .filter(item ->
                                item.getTrainingId() != null
                                && allowed.contains(item.getTrainingId())
                        )
                        .sorted(
                                Comparator.comparing(
                                        LearningEventResponse::getEventDate,
                                        Comparator.nullsLast(
                                                Comparator.reverseOrder()
                                        )
                                )
                        )
                        .toList();

        List<LearningEventResponse> recentEvents =
                allEvents.stream()
                        .limit(MAX_RECENT_EVENTS)
                        .toList();

        List<FeedbackResponse> feedbacks =
                feedbackService
                        .getFeedbacksByLearner(learnerId)
                        .stream()
                        .filter(item ->
                                item.getTrainingId() != null
                                && allowed.contains(item.getTrainingId())
                        )
                        .toList();

        List<AlertResponse> alerts =
                alertService
                        .getAlertsByLearner(learnerId)
                        .stream()
                        .filter(item ->
                                item.getTrainingId() != null
                                && allowed.contains(item.getTrainingId())
                        )
                        .toList();

        List<RecommendationResponse> recommendations =
                recommendationService
                        .getRecommendationsByLearner(learnerId)
                        .stream()
                        .filter(item ->
                                item.getTrainingId() != null
                                && allowed.contains(item.getTrainingId())
                        )
                        .toList();

        List<InterventionResponse> interventions =
                interventionService
                        .getInterventionsByLearner(learnerId)
                        .stream()
                        .filter(item ->
                                item.getTrainingId() != null
                                && allowed.contains(item.getTrainingId())
                        )
                        .filter(item ->
                                "ADMIN".equals(actor.getRole())
                                || actor.getUserId().equals(item.getTrainerId())
                        )
                        .toList();

        List<RiskIndicatorResponse> risks =
                allowedTrainingIds
                        .stream()
                        .map(trainingId ->
                                analyticsService
                                        .getLearnerTrainingRiskIndicator(
                                                learnerId,
                                                trainingId
                                        )
                        )
                        .toList();

        TrainerLearnerOverviewSummary summary =
                buildSummary(
                        allowedTrainingIds,
                        progress,
                        allEvents,
                        feedbacks,
                        alerts
                );

        return new TrainerLearnerOverviewResponse(
                learnerId,
                List.copyOf(allowedTrainingIds),
                summary,
                progress,
                risks,
                recentEvents,
                feedbacks,
                alerts,
                recommendations,
                interventions
        );
    }

    private TrainerLearnerOverviewSummary buildSummary(
            List<Long> allowedTrainingIds,
            List<LearnerProgressResponse> progress,
            List<LearningEventResponse> events,
            List<FeedbackResponse> feedbacks,
            List<AlertResponse> alerts
    ) {
        int completedTrainings =
                (int) progress.stream()
                        .filter(item ->
                                "COMPLETED".equals(
                                        String.valueOf(item.getStatus())
                                )
                        )
                        .count();

        int averageProgress =
                average(
                        progress.stream()
                                .map(LearnerProgressResponse::getProgressPercentage)
                                .toList()
                );

        int averageScore =
                average(
                        progress.stream()
                                .map(LearnerProgressResponse::getAverageScore)
                                .toList()
                );

        int completedLessons =
                progress.stream()
                        .map(LearnerProgressResponse::getCompletedLessons)
                        .mapToInt(this::valueOrZero)
                        .sum();

        int totalLessons =
                progress.stream()
                        .map(LearnerProgressResponse::getTotalLessons)
                        .mapToInt(this::valueOrZero)
                        .sum();

        int completedQuizzes =
                progress.stream()
                        .map(LearnerProgressResponse::getCompletedQuizzes)
                        .mapToInt(this::valueOrZero)
                        .sum();

        int totalQuizzes =
                progress.stream()
                        .map(LearnerProgressResponse::getTotalQuizzes)
                        .mapToInt(this::valueOrZero)
                        .sum();

        int openAlerts =
                (int) alerts.stream()
                        .filter(item -> {
                            String status =
                                    String.valueOf(item.getStatus());
                            return "OPEN".equals(status)
                                    || "IN_PROGRESS".equals(status);
                        })
                        .count();

        int helpRequests =
                (int) feedbacks.stream()
                        .filter(item ->
                                Boolean.TRUE.equals(item.getNeedHelp())
                        )
                        .count();

        LocalDateTime lastActivityAt =
                events.stream()
                        .map(LearningEventResponse::getEventDate)
                        .filter(java.util.Objects::nonNull)
                        .max(LocalDateTime::compareTo)
                        .orElseGet(() ->
                                progress.stream()
                                        .map(
                                            LearnerProgressResponse::getLastActivityAt
                                        )
                                        .filter(
                                            java.util.Objects::nonNull
                                        )
                                        .max(
                                            LocalDateTime::compareTo
                                        )
                                        .orElse(null)
                        );

        return new TrainerLearnerOverviewSummary(
                allowedTrainingIds.size(),
                completedTrainings,
                averageProgress,
                averageScore,
                completedLessons,
                totalLessons,
                completedQuizzes,
                totalQuizzes,
                events.size(),
                openAlerts,
                helpRequests,
                lastActivityAt
        );
    }

    private int average(List<Integer> values) {
        List<Integer> usable =
                values.stream()
                        .filter(java.util.Objects::nonNull)
                        .toList();

        if (usable.isEmpty()) {
            return 0;
        }

        return (int) Math.round(
                usable.stream()
                        .mapToInt(Integer::intValue)
                        .average()
                        .orElse(0.0)
        );
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }
}