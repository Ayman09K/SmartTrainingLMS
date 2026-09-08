package com.smarttraining.training.dto;

import com.smarttraining.training.entity.TrainingAccessRequest;
import com.smarttraining.training.enums.TrainingAccessRequestStatus;
import java.time.LocalDateTime;

public class TrainingAccessRequestResponse {

    private Long id;
    private Long learnerId;
    private Long trainingId;
    private String trainingTitle;
    private String learnerMessage;
    private TrainingAccessRequestStatus status;
    private LocalDateTime requestedAt;
    private LocalDateTime decidedAt;
    private Long decidedBy;
    private String decisionComment;
    private Long enrollmentId;

    public TrainingAccessRequestResponse() {
    }

    public TrainingAccessRequestResponse(TrainingAccessRequest request) {
        this.id = request.getId();
        this.learnerId = request.getLearnerId();
        this.trainingId = request.getTraining().getId();
        this.trainingTitle = request.getTraining().getTitle();
        this.learnerMessage = request.getLearnerMessage();
        this.status = request.getStatus();
        this.requestedAt = request.getRequestedAt();
        this.decidedAt = request.getDecidedAt();
        this.decidedBy = request.getDecidedBy();
        this.decisionComment = request.getDecisionComment();
        this.enrollmentId = request.getEnrollmentId();
    }

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public Long getTrainingId() { return trainingId; }
    public String getTrainingTitle() { return trainingTitle; }
    public String getLearnerMessage() { return learnerMessage; }
    public TrainingAccessRequestStatus getStatus() { return status; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public LocalDateTime getDecidedAt() { return decidedAt; }
    public Long getDecidedBy() { return decidedBy; }
    public String getDecisionComment() { return decisionComment; }
    public Long getEnrollmentId() { return enrollmentId; }
}
