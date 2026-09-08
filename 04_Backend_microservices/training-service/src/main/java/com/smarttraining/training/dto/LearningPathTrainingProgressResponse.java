package com.smarttraining.training.dto;

import com.smarttraining.training.enums.EnrollmentStatus;
import java.time.LocalDateTime;

public class LearningPathTrainingProgressResponse {

    private final Long stepId;
    private final Long trainingId;
    private final String trainingTitle;
    private final Integer position;
    private final boolean required;
    private final boolean trainingMissing;
    private final boolean enrolled;
    private final Long enrollmentId;
    private final EnrollmentStatus enrollmentStatus;
    private final double progressPercentage;
    private final LocalDateTime completedAt;
    private final LocalDateTime dueAt;

    public LearningPathTrainingProgressResponse(
            Long stepId,
            Long trainingId,
            String trainingTitle,
            Integer position,
            boolean required,
            boolean trainingMissing,
            boolean enrolled,
            Long enrollmentId,
            EnrollmentStatus enrollmentStatus,
            double progressPercentage,
            LocalDateTime completedAt,
            LocalDateTime dueAt
    ) {
        this.stepId = stepId;
        this.trainingId = trainingId;
        this.trainingTitle = trainingTitle;
        this.position = position;
        this.required = required;
        this.trainingMissing = trainingMissing;
        this.enrolled = enrolled;
        this.enrollmentId = enrollmentId;
        this.enrollmentStatus = enrollmentStatus;
        this.progressPercentage = progressPercentage;
        this.completedAt = completedAt;
        this.dueAt = dueAt;
    }

    public Long getStepId() { return stepId; }
    public Long getTrainingId() { return trainingId; }
    public String getTrainingTitle() { return trainingTitle; }
    public Integer getPosition() { return position; }
    public boolean isRequired() { return required; }
    public boolean isTrainingMissing() { return trainingMissing; }
    public boolean isEnrolled() { return enrolled; }
    public Long getEnrollmentId() { return enrollmentId; }
    public EnrollmentStatus getEnrollmentStatus() { return enrollmentStatus; }
    public double getProgressPercentage() { return progressPercentage; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public LocalDateTime getDueAt() { return dueAt; }
}