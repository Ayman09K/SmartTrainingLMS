package com.smarttraining.training.dto.scorm;

import com.smarttraining.training.entity.ScormAttempt;
import java.time.LocalDateTime;

public record ScormRuntimeStateResponse(
    Long attemptId,
    Integer attemptNumber,
    String scormVersion,
    String status,
    String lessonStatus,
    String completionStatus,
    String successStatus,
    String location,
    Double scoreRaw,
    Double scoreMin,
    Double scoreMax,
    Double scoreScaled,
    Double progressMeasure,
    Long sessionTimeMs,
    Long totalTimeMs,
    LocalDateTime startedAt,
    LocalDateTime lastActivityAt,
    LocalDateTime completedAt
) {
    public ScormRuntimeStateResponse(ScormAttempt attempt) {
        this(
            attempt.getId(),
            attempt.getAttemptNumber(),
            attempt.getScormVersion(),
            attempt.getStatus(),
            attempt.getLessonStatus(),
            attempt.getCompletionStatus(),
            attempt.getSuccessStatus(),
            attempt.getLocation(),
            attempt.getScoreRaw(),
            attempt.getScoreMin(),
            attempt.getScoreMax(),
            attempt.getScoreScaled(),
            attempt.getProgressMeasure(),
            attempt.getSessionTimeMs(),
            attempt.getTotalTimeMs(),
            attempt.getStartedAt(),
            attempt.getLastActivityAt(),
            attempt.getCompletedAt()
        );
    }
}