package com.smarttraining.training.entity;

import com.smarttraining.training.enums.LearningPathAssignmentSource;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "learning_path_assignments",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_learning_path_assignment_learner",
                        columnNames = {"path_id", "learner_id"}
                )
        },
        indexes = {
                @Index(
                        name = "idx_learning_path_assignments_path",
                        columnList = "path_id"
                ),
                @Index(
                        name = "idx_learning_path_assignments_learner",
                        columnList = "learner_id"
                )
        }
)
public class LearningPathAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "path_id", nullable = false)
    private Long pathId;

    @Column(name = "learner_id", nullable = false)
    private Long learnerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LearningPathAssignmentSource source;

    @Column(name = "group_id")
    private Long groupId;

    @Column(name = "assigned_by", nullable = false)
    private Long assignedBy;

    @Column(name = "due_at")
    private LocalDateTime dueAt;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt = LocalDateTime.now();

    public LearningPathAssignment() {
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

    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }

    public LearningPathAssignmentSource getSource() { return source; }
    public void setSource(LearningPathAssignmentSource source) {
        this.source = source;
    }

    public Long getGroupId() { return groupId; }
    public void setGroupId(Long groupId) { this.groupId = groupId; }

    public Long getAssignedBy() { return assignedBy; }
    public void setAssignedBy(Long assignedBy) { this.assignedBy = assignedBy; }

    public LocalDateTime getDueAt() { return dueAt; }
    public void setDueAt(LocalDateTime dueAt) { this.dueAt = dueAt; }

    public LocalDateTime getAssignedAt() { return assignedAt; }
}