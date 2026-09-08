package com.smarttraining.analytics.integration;

import java.time.LocalDateTime;

public record ProgressProjectionEvent(
        Long learnerId,
        Long trainingId,
        Integer progressPercentage,
        String status,
        LocalDateTime completedAt
) {}