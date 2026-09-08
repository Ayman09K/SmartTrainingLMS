package com.smarttraining.training.client;

public class InternalLearnerIdentityResponse {

    private Long learnerId;
    private String fullName;

    public InternalLearnerIdentityResponse() {
    }

    public Long getLearnerId() {
        return learnerId;
    }

    public void setLearnerId(Long learnerId) {
        this.learnerId = learnerId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }
}