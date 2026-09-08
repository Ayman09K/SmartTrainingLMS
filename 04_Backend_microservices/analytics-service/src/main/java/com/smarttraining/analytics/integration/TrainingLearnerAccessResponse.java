package com.smarttraining.analytics.integration;

import java.util.List;

public record TrainingLearnerAccessResponse(
        Long actorId,
        String actorRole,
        Long learnerId,
        boolean allowed,
        List<Long> trainingIds
) {
}