package com.smarttraining.training.dto.internal;

import java.util.List;

public record TrainerLearnerAccessResponse(
        Long actorId,
        String actorRole,
        Long learnerId,
        boolean allowed,
        List<Long> trainingIds
) {
}