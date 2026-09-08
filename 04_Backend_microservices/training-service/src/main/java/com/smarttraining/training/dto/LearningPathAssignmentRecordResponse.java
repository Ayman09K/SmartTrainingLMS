package com.smarttraining.training.dto;

import com.smarttraining.training.entity.LearningPathAssignment;
import com.smarttraining.training.enums.LearningPathAssignmentSource;
import java.time.LocalDateTime;

public class LearningPathAssignmentRecordResponse {

    private final Long id;
    private final Long pathId;
    private final Long learnerId;
    private final LearningPathAssignmentSource source;
    private final Long groupId;
    private final Long assignedBy;
    private final LocalDateTime dueAt;
    private final LocalDateTime assignedAt;

    public LearningPathAssignmentRecordResponse(
            LearningPathAssignment assignment
    ) {
        this.id = assignment.getId();
        this.pathId = assignment.getPathId();
        this.learnerId = assignment.getLearnerId();
        this.source = assignment.getSource();
        this.groupId = assignment.getGroupId();
        this.assignedBy = assignment.getAssignedBy();
        this.dueAt = assignment.getDueAt();
        this.assignedAt = assignment.getAssignedAt();
    }

    public Long getId() { return id; }
    public Long getPathId() { return pathId; }
    public Long getLearnerId() { return learnerId; }
    public LearningPathAssignmentSource getSource() { return source; }
    public Long getGroupId() { return groupId; }
    public Long getAssignedBy() { return assignedBy; }
    public LocalDateTime getDueAt() { return dueAt; }
    public LocalDateTime getAssignedAt() { return assignedAt; }
}