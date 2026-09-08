package com.smarttraining.training.dto;

import jakarta.validation.constraints.NotBlank;

public class TrainingInvitationAcceptRequest {

    @NotBlank(message = "Le token d'invitation est obligatoire")
    private String token;

    // Compatibilité temporaire avec les anciens clients.
    // Cette valeur n'est plus utilisée côté serveur : l'identité vient du JWT.
    private Long learnerId;

    public TrainingInvitationAcceptRequest() {
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }
}
