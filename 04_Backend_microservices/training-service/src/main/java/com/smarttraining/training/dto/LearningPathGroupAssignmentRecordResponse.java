package com.smarttraining.training.dto;

import com.smarttraining.training.entity.LearningPathGroupAssignment;
import java.time.LocalDateTime;

public class LearningPathGroupAssignmentRecordResponse {

    private final Long id;
    private final Long pathId;
    private final Long groupId;
    private final Long assignedBy;
    private final LocalDateTime dueAt;
    private final LocalDateTime assignedAt;

    public LearningPathGroupAssignmentRecordResponse(
            LearningPathGroupAssignment assignment
    ) {
        this.id = assignment.getId();
        this.pathId = assignment.getPathId();
        this.groupId = assignment.getGroupId();
        this.assignedBy = assignment.getAssignedBy();
        this.dueAt = assignment.getDueAt();
        this.assignedAt = assignment.getAssignedAt();
    }

    public Long getId() { return id; }
    public Long getPathId() { return pathId; }
    public Long getGroupId() { return groupId; }
    public Long getAssignedBy() { return assignedBy; }
    public LocalDateTime getDueAt() { return dueAt; }
    public LocalDateTime getAssignedAt() { return assignedAt; }
}