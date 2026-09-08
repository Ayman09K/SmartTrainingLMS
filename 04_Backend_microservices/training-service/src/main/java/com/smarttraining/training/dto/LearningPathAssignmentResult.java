package com.smarttraining.training.dto;

import java.util.List;

public class LearningPathAssignmentResult {

    private final Long pathId;
    private final Long groupId;
    private final int totalLearners;
    private final int pathAssignmentsCreated;
    private final int pathAssignmentsExisting;
    private final int trainingSteps;
    private final int newEnrollments;
    private final int alreadyEnrolled;
    private final List<EnrollmentResponse> assignedEnrollments;

    public LearningPathAssignmentResult(
            Long pathId,
            Long groupId,
            int totalLearners,
            int pathAssignmentsCreated,
            int pathAssignmentsExisting,
            int trainingSteps,
            int newEnrollments,
            int alreadyEnrolled,
            List<EnrollmentResponse> assignedEnrollments
    ) {
        this.pathId = pathId;
        this.groupId = groupId;
        this.totalLearners = totalLearners;
        this.pathAssignmentsCreated = pathAssignmentsCreated;
        this.pathAssignmentsExisting = pathAssignmentsExisting;
        this.trainingSteps = trainingSteps;
        this.newEnrollments = newEnrollments;
        this.alreadyEnrolled = alreadyEnrolled;
        this.assignedEnrollments =
                assignedEnrollments == null
                        ? List.of()
                        : List.copyOf(assignedEnrollments);
    }

    public Long getPathId() { return pathId; }
    public Long getGroupId() { return groupId; }
    public int getTotalLearners() { return totalLearners; }
    public int getPathAssignmentsCreated() { return pathAssignmentsCreated; }
    public int getPathAssignmentsExisting() { return pathAssignmentsExisting; }
    public int getTrainingSteps() { return trainingSteps; }
    public int getNewEnrollments() { return newEnrollments; }
    public int getAlreadyEnrolled() { return alreadyEnrolled; }
    public List<EnrollmentResponse> getAssignedEnrollments() {
        return assignedEnrollments;
    }
}