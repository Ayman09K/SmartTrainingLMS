package com.smarttraining.training.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "learner_group_training_assignments",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_learner_group_training_assignment",
                        columnNames = {"group_id", "training_id"}
                )
        },
        indexes = {
                @Index(
                        name = "idx_learner_group_training_group",
                        columnList = "group_id"
                ),
                @Index(
                        name = "idx_learner_group_training_training",
                        columnList = "training_id"
                )
        }
)
public class LearnerGroupTrainingAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id", nullable = false)
    private Long groupId;

    @Column(name = "training_id", nullable = false)
    private Long trainingId;

    @Column(name = "assigned_by", nullable = false)
    private Long assignedBy;

    @Column(name = "due_at")
    private LocalDateTime dueAt;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt = LocalDateTime.now();

    public LearnerGroupTrainingAssignment() {
    }

    @PrePersist
    public void beforeCreate() {
        if (assignedAt == null) {
            assignedAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }

    public Long getGroupId() { return groupId; }
    public void setGroupId(Long groupId) { this.groupId = groupId; }

    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }

    public Long getAssignedBy() { return assignedBy; }
    public void setAssignedBy(Long assignedBy) { this.assignedBy = assignedBy; }

    public LocalDateTime getDueAt() { return dueAt; }
    public void setDueAt(LocalDateTime dueAt) { this.dueAt = dueAt; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
}