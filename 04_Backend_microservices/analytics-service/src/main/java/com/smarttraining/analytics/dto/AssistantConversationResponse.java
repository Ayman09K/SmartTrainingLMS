package com.smarttraining.analytics.dto;

import java.time.LocalDateTime;

public record AssistantConversationResponse(
    Long id,
    String title,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
