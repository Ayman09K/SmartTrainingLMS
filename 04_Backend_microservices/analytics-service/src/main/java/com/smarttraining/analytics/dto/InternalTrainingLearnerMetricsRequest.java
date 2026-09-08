package com.smarttraining.analytics.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public class InternalTrainingLearnerMetricsRequest {

    @NotEmpty
    @Size(max = 200)
    private List<@NotNull @Positive Long> learnerIds;

    public InternalTrainingLearnerMetricsRequest() {
    }

    public List<Long> getLearnerIds() {
        return learnerIds;
    }

    public void setLearnerIds(List<Long> learnerIds) {
        this.learnerIds = learnerIds;
    }
}