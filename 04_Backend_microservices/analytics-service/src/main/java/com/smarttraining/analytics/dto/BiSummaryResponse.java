package com.smarttraining.analytics.dto;

import java.time.LocalDate;

public record BiSummaryResponse(
        LocalDate from,
        LocalDate to,
        long totalTrainings,
        long publishedTrainings,
        long totalLearners,
        long totalEnrollments,
        long activeEnrollments,
        long completedEnrollments,
        double completionRate,
        Double averageProgress,
        Double averageQuizScore,
        long activeLearners,
        long atRiskLearners,
        long dataInsufficientLearners,
        long totalEvents
) {
}