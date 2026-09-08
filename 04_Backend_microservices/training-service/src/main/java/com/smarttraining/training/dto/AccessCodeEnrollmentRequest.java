package com.smarttraining.training.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AccessCodeEnrollmentRequest {

    // Compatibilité temporaire avec les anciens clients.
    // Cette valeur n'est plus utilisée côté serveur : l'identité vient du JWT.
    private Long learnerId;

    @NotNull(message = "L'identifiant de la formation est obligatoire")
    private Long trainingId;

    @NotBlank(message = "Le code d'accès est obligatoire")
    private String accessCode;

    public AccessCodeEnrollmentRequest() {
    }

    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }

    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }

    public String getAccessCode() { return accessCode; }
    public void setAccessCode(String accessCode) { this.accessCode = accessCode; }
}
