package com.smarttraining.training.dto;

import java.util.List;

public class LearnerGroupTrainingAssignmentResponse {

    private final int totalMembers;
    private final int assigned;
    private final int alreadyEnrolled;
    private final int failed;
    private final List<EnrollmentResponse> assignedEnrollments;

    public LearnerGroupTrainingAssignmentResponse(
            int totalMembers,
            int assigned,
            int alreadyEnrolled,
            int failed,
            List<EnrollmentResponse> assignedEnrollments
    ) {
        this.totalMembers = totalMembers;
        this.assigned = assigned;
        this.alreadyEnrolled = alreadyEnrolled;
        this.failed = failed;
        this.assignedEnrollments =
                assignedEnrollments == null
                ? List.of()
                : List.copyOf(assignedEnrollments);
    }

    public int getTotalMembers() {
        return totalMembers;
    }

    public int getAssigned() {
        return assigned;
    }

    public int getAlreadyEnrolled() {
        return alreadyEnrolled;
    }

    public int getFailed() {
        return failed;
    }

    public List<EnrollmentResponse> getAssignedEnrollments() {
        return assignedEnrollments;
    }
}