package com.smarttraining.analytics.dto;

import java.time.LocalDateTime;

public record AssistantMessageResponse(
    Long id,
    String role,
    String content,
    Long trainingId,
    Long lessonId,
    String surface,
    String model,
    boolean contextUsed,
    LocalDateTime createdAt
) {
}
