package com.smarttraining.training.dto;

import com.smarttraining.training.entity.LearnerGroupTrainingAssignment;
import java.time.LocalDateTime;

public class LearnerGroupTrainingAssignmentRecordResponse {

    private final Long id;
    private final Long groupId;
    private final Long trainingId;
    private final String trainingTitle;
    private final Long assignedBy;
    private final LocalDateTime dueAt;
    private final LocalDateTime assignedAt;
    private final int totalMembers;
    private final int enrolledMembers;
    private final int missingMembers;

    public LearnerGroupTrainingAssignmentRecordResponse(
            LearnerGroupTrainingAssignment assignment,
            String trainingTitle,
            int totalMembers,
            int enrolledMembers
    ) {
        this.id = assignment.getId();
        this.groupId = assignment.getGroupId();
        this.trainingId = assignment.getTrainingId();
        this.trainingTitle = trainingTitle;
        this.assignedBy = assignment.getAssignedBy();
        this.dueAt = assignment.getDueAt();
        this.assignedAt = assignment.getAssignedAt();
        this.totalMembers = totalMembers;
        this.enrolledMembers = enrolledMembers;
        this.missingMembers = Math.max(0, totalMembers - enrolledMembers);
    }

    public Long getId() { return id; }
    public Long getGroupId() { return groupId; }
    public Long getTrainingId() { return trainingId; }
    public String getTrainingTitle() { return trainingTitle; }
    public Long getAssignedBy() { return assignedBy; }
    public LocalDateTime getDueAt() { return dueAt; }
    public LocalDateTime getAssignedAt() { return assignedAt; }
    public int getTotalMembers() { return totalMembers; }
    public int getEnrolledMembers() { return enrolledMembers; }
    public int getMissingMembers() { return missingMembers; }
}