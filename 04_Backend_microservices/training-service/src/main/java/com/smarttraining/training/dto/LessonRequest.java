package com.smarttraining.training.dto;

import com.smarttraining.training.enums.LessonCompletionRule;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public class LessonRequest {

    @NotNull(message = "L'identifiant du module est obligatoire")
    private Long moduleId;

    @NotBlank(message = "Le titre de la lecon est obligatoire")
    private String title;

    private String description;
    private String objective;
    private String content;

    @NotNull(message = "L'ordre de la lecon est obligatoire")
    @Positive(message = "L'ordre de la lecon doit etre superieur a zero")
    private Integer orderIndex;

    @PositiveOrZero(message = "La duree estimee doit etre positive ou egale a zero")
    private Integer estimatedDurationMinutes;

    private Boolean required;
    private LessonCompletionRule completionRule;

    public LessonRequest() {
    }

    public Long getModuleId() { return moduleId; }
    public void setModuleId(Long moduleId) { this.moduleId = moduleId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getObjective() { return objective; }
    public void setObjective(String objective) { this.objective = objective; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    public Integer getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
    public void setEstimatedDurationMinutes(Integer estimatedDurationMinutes) { this.estimatedDurationMinutes = estimatedDurationMinutes; }
    public Boolean getRequired() { return required; }
    public void setRequired(Boolean required) { this.required = required; }
    public LessonCompletionRule getCompletionRule() { return completionRule; }
    public void setCompletionRule(LessonCompletionRule completionRule) { this.completionRule = completionRule; }
}
