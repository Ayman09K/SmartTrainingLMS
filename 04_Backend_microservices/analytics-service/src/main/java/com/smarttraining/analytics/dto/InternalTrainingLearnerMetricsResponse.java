package com.smarttraining.analytics.dto;

import java.time.LocalDateTime;

public record InternalTrainingLearnerMetricsResponse(
        Long learnerId,
        Long trainingId,
        Integer averageScore,
        String riskLevel,
        String dataStatus,
        LocalDateTime lastActivityAt
) {
}