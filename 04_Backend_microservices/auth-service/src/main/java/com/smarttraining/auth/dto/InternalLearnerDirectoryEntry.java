package com.smarttraining.auth.dto;

public record InternalLearnerDirectoryEntry(
        Long learnerId,
        String fullName,
        String email
) {
}