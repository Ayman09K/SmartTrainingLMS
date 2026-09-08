package com.smarttraining.training.dto;

import com.smarttraining.training.entity.TrainingModule;

public class ModuleResponse {

    private Long id;
    private Long trainingId;
    private String title;
    private String description;
    private Integer orderIndex;
    private Boolean required;
    private Integer estimatedDurationMinutes;

    public ModuleResponse() {
    }

    public ModuleResponse(TrainingModule module) {
        this.id = module.getId();
        this.trainingId = module.getTraining().getId();
        this.title = module.getTitle();
        this.description = module.getDescription();
        this.orderIndex = module.getOrderIndex();
        this.required = module.getRequired();
        this.estimatedDurationMinutes = module.getEstimatedDurationMinutes();
    }

    public Long getId() { return id; }
    public Long getTrainingId() { return trainingId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public Integer getOrderIndex() { return orderIndex; }
    public Boolean getRequired() { return required; }
    public Integer getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
}
