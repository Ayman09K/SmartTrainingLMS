package com.smarttraining.analytics.dto;

import java.time.LocalDateTime;

public record BiTrainingMetricResponse(
        Long trainingId,
        String title,
        String status,
        long totalEnrollments,
        long activeEnrollments,
        long completedEnrollments,
        double completionRate,
        Double averageProgress,
        Double averageQuizScore,
        long activeLearners,
        long atRiskLearners,
        long dataInsufficientLearners,
        long totalEvents,
        LocalDateTime lastActivityAt
) {
}