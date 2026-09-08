package com.smarttraining.training.dto.internal;

import com.smarttraining.training.entity.Enrollment;
import java.time.LocalDateTime;

public class ProgressProjectionResponse {

    private final Long enrollmentId;
    private final Long learnerId;
    private final Long trainingId;
    private final Double progressPercentage;
    private final String enrollmentStatus;
    private final LocalDateTime completedAt;
    private final boolean applied;

    public ProgressProjectionResponse(Enrollment enrollment, boolean applied) {
        this.enrollmentId = enrollment.getId();
        this.learnerId = enrollment.getLearnerId();
        this.trainingId = enrollment.getTraining().getId();
        this.progressPercentage = enrollment.getProgressPercentage();
        this.enrollmentStatus = enrollment.getStatus().name();
        this.completedAt = enrollment.getCompletedAt();
        this.applied = applied;
    }

    public Long getEnrollmentId() { return enrollmentId; }
    public Long getLearnerId() { return learnerId; }
    public Long getTrainingId() { return trainingId; }
    public Double getProgressPercentage() { return progressPercentage; }
    public String getEnrollmentStatus() { return enrollmentStatus; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public boolean isApplied() { return applied; }
}