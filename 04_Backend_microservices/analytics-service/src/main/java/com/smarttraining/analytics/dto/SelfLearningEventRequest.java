package com.smarttraining.analytics.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.smarttraining.analytics.enums.LearningEventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(
    value = {
        "learnerId",
        "score",
        "totalPoints",
        "progressPercentage",
        "completedLessons",
        "totalLessons",
        "completedQuizzes",
        "totalQuizzes",
        "averageScore",
        "status",
        "source",
        "idempotencyKey",
        "quizId",
        "attemptId"
    },
    allowGetters = false,
    allowSetters = false
)
public class SelfLearningEventRequest {

    @NotBlank
    @Pattern(regexp = "^[A-Za-z0-9._:-]{8,120}$")
    private String requestId;

    @NotNull
    @Positive
    private Long trainingId;

    @Positive
    private Long moduleId;

    @Positive
    private Long lessonId;

    @Positive
    private Long resourceId;

    @NotNull
    private LearningEventType eventType;

    @Size(max = 500)
    private String description;

    public SelfLearningEventRequest() {}

    public String getRequestId() { return requestId; }
    public void setRequestId(String requestId) { this.requestId = requestId; }
    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }
    public Long getModuleId() { return moduleId; }
    public void setModuleId(Long moduleId) { this.moduleId = moduleId; }
    public Long getLessonId() { return lessonId; }
    public void setLessonId(Long lessonId) { this.lessonId = lessonId; }
    public Long getResourceId() { return resourceId; }
    public void setResourceId(Long resourceId) { this.resourceId = resourceId; }
    public LearningEventType getEventType() { return eventType; }
    public void setEventType(LearningEventType eventType) { this.eventType = eventType; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}