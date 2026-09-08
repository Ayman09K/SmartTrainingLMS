package com.smarttraining.training.dto;

import jakarta.validation.constraints.NotNull;

public class LearningPathStepAddRequest {

    @NotNull(message = "La formation est obligatoire")
    private Long trainingId;

    private Boolean required;

    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }

    public Boolean getRequired() { return required; }
    public void setRequired(Boolean required) { this.required = required; }
}