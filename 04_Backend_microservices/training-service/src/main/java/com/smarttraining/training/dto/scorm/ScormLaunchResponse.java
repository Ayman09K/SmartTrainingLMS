package com.smarttraining.training.dto.scorm;

public record ScormLaunchResponse(
    Long attemptId,
    Integer attemptNumber,
    String scormVersion,
    String attemptStatus,
    boolean resumed,
    String runtimePath
) {}