package com.smarttraining.analytics.entity;

import com.smarttraining.analytics.enums.ActionSource;
import com.smarttraining.analytics.enums.AlertSeverity;
import com.smarttraining.analytics.enums.AlertStatus;
import com.smarttraining.analytics.enums.AlertType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "learning_alerts")
public class LearningAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "learner_id", nullable = false)
    private Long learnerId;

    @Column(name = "training_id", nullable = false)
    private Long trainingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", nullable = false, length = 50)
    private AlertType alertType;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private AlertSeverity severity;

    @Column(name = "title", nullable = false, length = 180)
    private String title;

    @Column(name = "message", nullable = false, length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 30)
    private ActionSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private AlertStatus status = AlertStatus.OPEN;

    @Column(name = "risk_probability")
    private Double riskProbability;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = AlertStatus.OPEN;
        }
    }

    public LearningAlert() {
    }

    public LearningAlert(Long learnerId, Long trainingId, AlertType alertType,
            AlertSeverity severity, String title, String message,
            ActionSource source, Double riskProbability) {
        this.learnerId = learnerId;
        this.trainingId = trainingId;
        this.alertType = alertType;
        this.severity = severity;
        this.title = title;
        this.message = message;
        this.source = source;
        this.riskProbability = riskProbability;
        this.status = AlertStatus.OPEN;
    }

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }
    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }
    public AlertType getAlertType() { return alertType; }
    public void setAlertType(AlertType alertType) { this.alertType = alertType; }
    public AlertSeverity getSeverity() { return severity; }
    public void setSeverity(AlertSeverity severity) { this.severity = severity; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public ActionSource getSource() { return source; }
    public void setSource(ActionSource source) { this.source = source; }
    public AlertStatus getStatus() { return status; }
    public void setStatus(AlertStatus status) { this.status = status; }
    public Double getRiskProbability() { return riskProbability; }
    public void setRiskProbability(Double riskProbability) { this.riskProbability = riskProbability; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }

    public void markResolved() {
        this.status = AlertStatus.RESOLVED;
        this.resolvedAt = LocalDateTime.now();
    }

    public void markIgnored() {
        this.status = AlertStatus.IGNORED;
        this.resolvedAt = LocalDateTime.now();
    }

    public void markInProgress() {
        this.status = AlertStatus.IN_PROGRESS;
    }
}
