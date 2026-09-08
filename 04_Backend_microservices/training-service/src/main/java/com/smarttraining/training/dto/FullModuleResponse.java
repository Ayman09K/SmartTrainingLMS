package com.smarttraining.training.dto;

import com.smarttraining.training.entity.TrainingModule;
import java.util.List;

public class FullModuleResponse {

    private Long id;
    private String title;
    private String description;
    private Integer orderIndex;
    private Boolean required;
    private Integer estimatedDurationMinutes;
    private List<FullLessonResponse> lessons;

    public FullModuleResponse() {
    }

    public FullModuleResponse(TrainingModule module, List<FullLessonResponse> lessons) {
        this.id = module.getId();
        this.title = module.getTitle();
        this.description = module.getDescription();
        this.orderIndex = module.getOrderIndex();
        this.required = module.getRequired();
        this.estimatedDurationMinutes = module.getEstimatedDurationMinutes();
        this.lessons = lessons;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public Integer getOrderIndex() { return orderIndex; }
    public Boolean getRequired() { return required; }
    public Integer getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
    public List<FullLessonResponse> getLessons() { return lessons; }
}
