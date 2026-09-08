package com.smarttraining.auth.dto;

public class InternalLearnerIdentityResponse {

    private final Long learnerId;
    private final String fullName;

    public InternalLearnerIdentityResponse(Long learnerId, String fullName) {
        this.learnerId = learnerId;
        this.fullName = fullName;
    }

    public Long getLearnerId() {
        return learnerId;
    }

    public String getFullName() {
        return fullName;
    }
}