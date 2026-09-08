package com.smarttraining.training.dto;

import jakarta.validation.constraints.NotNull;

public class SelfEnrollmentRequest {

    // Compatibilité temporaire avec les anciens clients.
    // Cette valeur n'est plus utilisée côté serveur : l'identité vient du JWT.
    private Long learnerId;

    @NotNull(message = "L'identifiant de la formation est obligatoire")
    private Long trainingId;

    public SelfEnrollmentRequest() {
    }

    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }

    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }
}
