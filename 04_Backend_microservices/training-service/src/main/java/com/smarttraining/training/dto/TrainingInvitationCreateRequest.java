package com.smarttraining.training.dto;

import jakarta.validation.constraints.NotNull;

public class TrainingInvitationCreateRequest {

    @NotNull(message = "L'identifiant de la formation est obligatoire")
    private Long trainingId;

    private Long learnerId;

    private String learnerEmail;

    // Compatibilité temporaire avec les anciens clients.
    // Cette valeur n'est plus utilisée côté serveur : l'invitant vient du JWT.
    private Long invitedBy;

    private String message;

    private Integer validityDays;

    public TrainingInvitationCreateRequest() {
    }

    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }

    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }

    public String getLearnerEmail() { return learnerEmail; }
    public void setLearnerEmail(String learnerEmail) { this.learnerEmail = learnerEmail; }

    public Long getInvitedBy() { return invitedBy; }
    public void setInvitedBy(Long invitedBy) { this.invitedBy = invitedBy; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public Integer getValidityDays() { return validityDays; }
    public void setValidityDays(Integer validityDays) { this.validityDays = validityDays; }
}
