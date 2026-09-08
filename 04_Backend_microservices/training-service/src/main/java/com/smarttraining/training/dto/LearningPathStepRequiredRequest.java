package com.smarttraining.training.dto;

import jakarta.validation.constraints.NotNull;

public class LearningPathStepRequiredRequest {

    @NotNull(message = "Le caractere obligatoire/facultatif est requis")
    private Boolean required;

    public Boolean getRequired() { return required; }
    public void setRequired(Boolean required) { this.required = required; }
}