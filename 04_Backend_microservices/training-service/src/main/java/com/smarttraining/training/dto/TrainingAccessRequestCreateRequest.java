package com.smarttraining.training.dto;

import jakarta.validation.constraints.NotNull;

public class TrainingAccessRequestCreateRequest {

    // Compatibilité temporaire avec les anciens clients.
    // Cette valeur n'est plus utilisée côté serveur : l'identité vient du JWT.
    private Long learnerId;

    @NotNull(message = "L'identifiant de la formation est obligatoire")
    private Long trainingId;

    private String learnerMessage;

    public TrainingAccessRequestCreateRequest() {
    }

    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }

    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }

    public String getLearnerMessage() { return learnerMessage; }
    public void setLearnerMessage(String learnerMessage) { this.learnerMessage = learnerMessage; }
}
