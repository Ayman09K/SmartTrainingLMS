package com.smarttraining.training.dto;

public class TrainingAccessRequestDecisionRequest {

    // Compatibilité temporaire avec les anciens clients.
    // Cette valeur n'est plus utilisée côté serveur : le décideur vient du JWT.
    private Long decidedBy;

    private String decisionComment;

    public TrainingAccessRequestDecisionRequest() {
    }

    public Long getDecidedBy() { return decidedBy; }
    public void setDecidedBy(Long decidedBy) { this.decidedBy = decidedBy; }

    public String getDecisionComment() { return decisionComment; }
    public void setDecisionComment(String decisionComment) { this.decisionComment = decisionComment; }
}
