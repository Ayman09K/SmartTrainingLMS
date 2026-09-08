package com.smarttraining.training.dto.scorm;

import java.time.LocalDateTime;

public class ScormAuthorPreviewLaunchResponse {

    private final String runtimePath;
    private final LocalDateTime expiresAt;

    public ScormAuthorPreviewLaunchResponse(
            String runtimePath,
            LocalDateTime expiresAt
    ) {
        this.runtimePath = runtimePath;
        this.expiresAt = expiresAt;
    }

    public String getRuntimePath() {
        return runtimePath;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }
}