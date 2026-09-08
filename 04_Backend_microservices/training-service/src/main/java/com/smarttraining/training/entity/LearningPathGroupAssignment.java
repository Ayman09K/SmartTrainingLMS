package com.smarttraining.training.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "learning_path_group_assignments",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_learning_path_group_assignment",
                        columnNames = {"path_id", "group_id"}
                )
        },
        indexes = {
                @Index(
                        name = "idx_learning_path_group_assignments_path",
                        columnList = "path_id"
                ),
                @Index(
                        name = "idx_learning_path_group_assignments_group",
                        columnList = "group_id"
                )
        }
)
public class LearningPathGroupAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "path_id", nullable = false)
    private Long pathId;

    @Column(name = "group_id", nullable = false)
    private Long groupId;

    @Column(name = "assigned_by", nullable = false)
    private Long assignedBy;

    @Column(name = "due_at")
    private LocalDateTime dueAt;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt = LocalDateTime.now();

    public LearningPathGroupAssignment() {
    }

    @PrePersist
    public void beforeCreate() {
        if (assignedAt == null) {
            assignedAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }

    public Long getPathId() { return pathId; }
    public void setPathId(Long pathId) { this.pathId = pathId; }

    public Long getGroupId() { return groupId; }
    public void setGroupId(Long groupId) { this.groupId = groupId; }

    public Long getAssignedBy() { return assignedBy; }
    public void setAssignedBy(Long assignedBy) { this.assignedBy = assignedBy; }

    public LocalDateTime getDueAt() { return dueAt; }
    public void setDueAt(LocalDateTime dueAt) { this.dueAt = dueAt; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
}