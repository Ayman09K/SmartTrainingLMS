package com.smarttraining.training.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public class LearningPathStepReorderRequest {

    @Valid
    @NotEmpty(message = "L'ordre des etapes est obligatoire")
    private List<@NotNull Long> stepIds;

    public List<Long> getStepIds() { return stepIds; }
    public void setStepIds(List<Long> stepIds) { this.stepIds = stepIds; }
}