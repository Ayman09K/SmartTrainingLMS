package com.smarttraining.training.dto.scorm;

import java.util.Map;

public record ScormBootstrapResponse(
    Long attemptId,
    Integer attemptNumber,
    String scormVersion,
    String attemptStatus,
    String learnerId,
    String learnerName,
    String entryMode,
    String launchPathWithinPackage,
    long totalTimeMs,
    Map<String, String> values
) {}