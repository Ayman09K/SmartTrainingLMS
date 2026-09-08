package com.smarttraining.training.dto;

import com.smarttraining.training.entity.Enrollment;
import com.smarttraining.training.enums.EnrollmentSource;
import com.smarttraining.training.enums.EnrollmentStatus;
import java.time.LocalDateTime;

public class EnrollmentResponse {

    private Long id;
    private Long learnerId;
    private Long trainingId;
    private String trainingTitle;
    private EnrollmentStatus status;
    private EnrollmentSource source;
    private Long assignedBy;
    private Double progressPercentage;
    private LocalDateTime enrolledAt;
    private LocalDateTime completedAt;
    private LocalDateTime cancelledAt;
    private LocalDateTime dueAt;

    public EnrollmentResponse() {
    }

    public EnrollmentResponse(Enrollment enrollment) {
        this.id = enrollment.getId();
        this.learnerId = enrollment.getLearnerId();
        this.trainingId = enrollment.getTraining().getId();
        this.trainingTitle = enrollment.getTraining().getTitle();
        this.status = enrollment.getStatus();
        this.source = enrollment.getSource();
        this.assignedBy = enrollment.getAssignedBy();
        this.progressPercentage = enrollment.getProgressPercentage();
        this.enrolledAt = enrollment.getEnrolledAt();
        this.completedAt = enrollment.getCompletedAt();
        this.cancelledAt = enrollment.getCancelledAt();
        this.dueAt = enrollment.getDueAt();
    }

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public Long getTrainingId() { return trainingId; }
    public String getTrainingTitle() { return trainingTitle; }
    public EnrollmentStatus getStatus() { return status; }
    public EnrollmentSource getSource() { return source; }
    public Long getAssignedBy() { return assignedBy; }
    public Double getProgressPercentage() { return progressPercentage; }
    public LocalDateTime getEnrolledAt() { return enrolledAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public LocalDateTime getCancelledAt() { return cancelledAt; }
    public LocalDateTime getDueAt() { return dueAt; }
}
