package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.entity.LearningAlert;
import com.smarttraining.analytics.enums.ActionSource;
import com.smarttraining.analytics.enums.AlertSeverity;
import com.smarttraining.analytics.enums.AlertStatus;
import com.smarttraining.analytics.enums.AlertType;
import java.time.LocalDateTime;

public class AlertResponse {
    private Long id;
    private Long learnerId;
    private Long trainingId;
    private AlertType alertType;
    private AlertSeverity severity;
    private String title;
    private String message;
    private ActionSource source;
    private AlertStatus status;
    private Double riskProbability;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;

    public AlertResponse() {
    }

    public AlertResponse(LearningAlert alert) {
        this.id = alert.getId();
        this.learnerId = alert.getLearnerId();
        this.trainingId = alert.getTrainingId();
        this.alertType = alert.getAlertType();
        this.severity = alert.getSeverity();
        this.title = alert.getTitle();
        this.message = alert.getMessage();
        this.source = alert.getSource();
        this.status = alert.getStatus();
        this.riskProbability = alert.getRiskProbability();
        this.createdAt = alert.getCreatedAt();
        this.resolvedAt = alert.getResolvedAt();
    }

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public Long getTrainingId() { return trainingId; }
    public AlertType getAlertType() { return alertType; }
    public AlertSeverity getSeverity() { return severity; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public ActionSource getSource() { return source; }
    public AlertStatus getStatus() { return status; }
    public Double getRiskProbability() { return riskProbability; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }
}
