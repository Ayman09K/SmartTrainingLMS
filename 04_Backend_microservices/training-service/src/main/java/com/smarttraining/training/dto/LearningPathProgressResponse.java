package com.smarttraining.training.dto;

import com.smarttraining.training.enums.LearningPathAssignmentSource;
import com.smarttraining.training.enums.LearningPathStatus;
import java.time.LocalDateTime;
import java.util.List;

public class LearningPathProgressResponse {

    private final Long pathId;
    private final String pathTitle;
    private final LearningPathStatus pathStatus;
    private final Long learnerId;
    private final LearningPathAssignmentSource assignmentSource;
    private final Long assignmentGroupId;
    private final LocalDateTime assignedAt;
    private final LocalDateTime pathDueAt;

    private final int totalSteps;
    private final int requiredSteps;
    private final int optionalSteps;
    private final int enrolledSteps;
    private final int completedSteps;
    private final int completedRequiredSteps;

    private final double overallProgressPercentage;
    private final double completionProgressPercentage;
    private final boolean completed;

    private final Long nextStepId;
    private final Long nextTrainingId;
    private final Integer nextPosition;

    private final List<LearningPathTrainingProgressResponse> trainings;

    public LearningPathProgressResponse(
            Long pathId,
            String pathTitle,
            LearningPathStatus pathStatus,
            Long learnerId,
            LearningPathAssignmentSource assignmentSource,
            Long assignmentGroupId,
            LocalDateTime assignedAt,
            LocalDateTime pathDueAt,
            int totalSteps,
            int requiredSteps,
            int optionalSteps,
            int enrolledSteps,
            int completedSteps,
            int completedRequiredSteps,
            double overallProgressPercentage,
            double completionProgressPercentage,
            boolean completed,
            Long nextStepId,
            Long nextTrainingId,
            Integer nextPosition,
            List<LearningPathTrainingProgressResponse> trainings
    ) {
        this.pathId = pathId;
        this.pathTitle = pathTitle;
        this.pathStatus = pathStatus;
        this.learnerId = learnerId;
        this.assignmentSource = assignmentSource;
        this.assignmentGroupId = assignmentGroupId;
        this.assignedAt = assignedAt;
        this.pathDueAt = pathDueAt;
        this.totalSteps = totalSteps;
        this.requiredSteps = requiredSteps;
        this.optionalSteps = optionalSteps;
        this.enrolledSteps = enrolledSteps;
        this.completedSteps = completedSteps;
        this.completedRequiredSteps = completedRequiredSteps;
        this.overallProgressPercentage = overallProgressPercentage;
        this.completionProgressPercentage = completionProgressPercentage;
        this.completed = completed;
        this.nextStepId = nextStepId;
        this.nextTrainingId = nextTrainingId;
        this.nextPosition = nextPosition;
        this.trainings = trainings == null
                ? List.of()
                : List.copyOf(trainings);
    }

    public Long getPathId() { return pathId; }
    public String getPathTitle() { return pathTitle; }
    public LearningPathStatus getPathStatus() { return pathStatus; }
    public Long getLearnerId() { return learnerId; }
    public LearningPathAssignmentSource getAssignmentSource() {
        return assignmentSource;
    }
    public Long getAssignmentGroupId() { return assignmentGroupId; }
    public LocalDateTime getAssignedAt() { return assignedAt; }
    public LocalDateTime getPathDueAt() { return pathDueAt; }

    public int getTotalSteps() { return totalSteps; }
    public int getRequiredSteps() { return requiredSteps; }
    public int getOptionalSteps() { return optionalSteps; }
    public int getEnrolledSteps() { return enrolledSteps; }
    public int getCompletedSteps() { return completedSteps; }
    public int getCompletedRequiredSteps() { return completedRequiredSteps; }

    public double getOverallProgressPercentage() {
        return overallProgressPercentage;
    }

    public double getCompletionProgressPercentage() {
        return completionProgressPercentage;
    }

    public boolean isCompleted() { return completed; }

    public Long getNextStepId() { return nextStepId; }
    public Long getNextTrainingId() { return nextTrainingId; }
    public Integer getNextPosition() { return nextPosition; }

    public List<LearningPathTrainingProgressResponse> getTrainings() {
        return trainings;
    }
}