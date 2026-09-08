package com.smarttraining.training.dto.internal;

import java.time.LocalDateTime;
import java.util.List;

public record InternalBiScopeResponse(
        Long actorId,
        String actorRole,
        List<TrainingScope> trainings
) {
    public record TrainingScope(
            Long trainingId,
            String title,
            String status,
            List<EnrollmentScope> enrollments
    ) {
    }

    public record EnrollmentScope(
            Long enrollmentId,
            Long learnerId,
            String status,
            Double progressPercentage,
            LocalDateTime enrolledAt,
            LocalDateTime completedAt,
            LocalDateTime dueAt
    ) {
    }
}