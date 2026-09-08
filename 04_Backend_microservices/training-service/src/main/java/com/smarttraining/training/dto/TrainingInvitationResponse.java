package com.smarttraining.training.dto;

import com.smarttraining.training.entity.TrainingInvitation;
import com.smarttraining.training.enums.TrainingInvitationStatus;
import java.time.LocalDateTime;

public class TrainingInvitationResponse {

    private Long id;
    private Long trainingId;
    private String trainingTitle;
    private Long learnerId;
    private String learnerEmail;
    private Long invitedBy;
    private String token;
    private String message;
    private TrainingInvitationStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime respondedAt;
    private Long enrollmentId;

    public TrainingInvitationResponse() {
    }

    public TrainingInvitationResponse(TrainingInvitation invitation) {
        this.id = invitation.getId();
        this.trainingId = invitation.getTraining().getId();
        this.trainingTitle = invitation.getTraining().getTitle();
        this.learnerId = invitation.getLearnerId();
        this.learnerEmail = invitation.getLearnerEmail();
        this.invitedBy = invitation.getInvitedBy();
        this.token = invitation.getToken();
        this.message = invitation.getMessage();
        this.status = invitation.getStatus();
        this.createdAt = invitation.getCreatedAt();
        this.expiresAt = invitation.getExpiresAt();
        this.respondedAt = invitation.getRespondedAt();
        this.enrollmentId = invitation.getEnrollmentId();
    }

    public Long getId() { return id; }
    public Long getTrainingId() { return trainingId; }
    public String getTrainingTitle() { return trainingTitle; }
    public Long getLearnerId() { return learnerId; }
    public String getLearnerEmail() { return learnerEmail; }
    public Long getInvitedBy() { return invitedBy; }
    public String getToken() { return token; }
    public String getMessage() { return message; }
    public TrainingInvitationStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public LocalDateTime getRespondedAt() { return respondedAt; }
    public Long getEnrollmentId() { return enrollmentId; }
}
