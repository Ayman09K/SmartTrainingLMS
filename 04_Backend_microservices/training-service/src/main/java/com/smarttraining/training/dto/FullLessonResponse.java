package com.smarttraining.training.dto;

import com.smarttraining.training.entity.Lesson;
import com.smarttraining.training.enums.LessonCompletionRule;
import java.util.List;

public class FullLessonResponse {

    private Long id;
    private String title;
    private String description;
    private String objective;
    private String content;
    private Integer orderIndex;
    private Integer estimatedDurationMinutes;
    private Boolean required;
    private LessonCompletionRule completionRule;
    private List<ResourceResponse> resources;

    public FullLessonResponse() {
    }

    public FullLessonResponse(Lesson lesson, List<ResourceResponse> resources) {
        this.id = lesson.getId();
        this.title = lesson.getTitle();
        this.description = lesson.getDescription();
        this.objective = lesson.getObjective();
        this.content = lesson.getContent();
        this.orderIndex = lesson.getOrderIndex();
        this.estimatedDurationMinutes = lesson.getEstimatedDurationMinutes();
        this.required = lesson.getRequired();
        this.completionRule = lesson.getCompletionRule();
        this.resources = resources;
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getObjective() { return objective; }
    public String getContent() { return content; }
    public Integer getOrderIndex() { return orderIndex; }
    public Integer getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
    public Boolean getRequired() { return required; }
    public LessonCompletionRule getCompletionRule() { return completionRule; }
    public List<ResourceResponse> getResources() { return resources; }
}
