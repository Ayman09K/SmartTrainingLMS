package com.smarttraining.training.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "learning_path_steps",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_learning_path_step_training",
                        columnNames = {"path_id", "training_id"}
                )
        },
        indexes = {
                @Index(
                        name = "idx_learning_path_steps_path_position",
                        columnList = "path_id,position"
                ),
                @Index(
                        name = "idx_learning_path_steps_training",
                        columnList = "training_id"
                )
        }
)
public class LearningPathStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * IDs scalaires intentionnels:
     * - aucun FK JPA vers trainings
     * - une formation referencee par un parcours ne bloque donc pas
     *   la suppression existante de Training.
     */
    @Column(name = "path_id", nullable = false)
    private Long pathId;

    @Column(name = "training_id", nullable = false)
    private Long trainingId;

    @Column(nullable = false)
    private Integer position;

    @Column(nullable = false)
    private Boolean required = Boolean.TRUE;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public LearningPathStep() {
    }

    @PrePersist
    public void beforeCreate() {
        if (required == null) {
            required = Boolean.TRUE;
        }

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }

    public Long getPathId() { return pathId; }
    public void setPathId(Long pathId) { this.pathId = pathId; }

    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }

    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }

    public Boolean getRequired() { return required; }
    public void setRequired(Boolean required) { this.required = required; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}