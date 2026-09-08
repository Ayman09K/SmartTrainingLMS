package com.smarttraining.training.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public class ModuleRequest {

    @NotNull(message = "L'identifiant de la formation est obligatoire")
    private Long trainingId;

    @NotBlank(message = "Le titre du module est obligatoire")
    private String title;

    private String description;

    @NotNull(message = "L'ordre du module est obligatoire")
    @Positive(message = "L'ordre du module doit etre superieur a zero")
    private Integer orderIndex;

    private Boolean required;

    @PositiveOrZero(message = "La duree estimee doit etre positive ou egale a zero")
    private Integer estimatedDurationMinutes;

    public ModuleRequest() {
    }

    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    public Boolean getRequired() { return required; }
    public void setRequired(Boolean required) { this.required = required; }
    public Integer getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
    public void setEstimatedDurationMinutes(Integer estimatedDurationMinutes) { this.estimatedDurationMinutes = estimatedDurationMinutes; }
}
