package com.smarttraining.training.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "training_deletion_outbox",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_training_deletion_outbox_training",
                columnNames = "training_id"
        )
)
public class TrainingDeletionOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "training_id", nullable = false)
    private Long trainingId;

    @Column(nullable = false)
    private boolean completed;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "last_error", length = 1000)
    private String lastError;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    protected TrainingDeletionOutbox() {
    }

    public static TrainingDeletionOutbox pending(Long trainingId) {
        if (trainingId == null || trainingId <= 0L) {
            throw new IllegalArgumentException("trainingId invalide.");
        }

        LocalDateTime now = LocalDateTime.now();

        TrainingDeletionOutbox item = new TrainingDeletionOutbox();
        item.trainingId = trainingId;
        item.completed = false;
        item.attempts = 0;
        item.createdAt = now;
        item.updatedAt = now;
        return item;
    }

    public void markCompleted() {
        LocalDateTime now = LocalDateTime.now();
        this.completed = true;
        this.completedAt = now;
        this.updatedAt = now;
        this.lastError = null;
    }

    public void markFailure(Throwable throwable) {
        this.attempts = this.attempts + 1;
        this.updatedAt = LocalDateTime.now();

        String message = throwable == null
                ? "Erreur inconnue"
                : throwable.getClass().getSimpleName()
                    + ": "
                    + String.valueOf(throwable.getMessage());

        this.lastError = message.length() > 950
                ? message.substring(0, 950)
                : message;
    }

    public Long getId() {
        return id;
    }

    public Long getTrainingId() {
        return trainingId;
    }

    public boolean isCompleted() {
        return completed;
    }

    public int getAttempts() {
        return attempts;
    }

    public String getLastError() {
        return lastError;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public LocalDateTime getCompletedAt() {
        return completedAt;
    }
}