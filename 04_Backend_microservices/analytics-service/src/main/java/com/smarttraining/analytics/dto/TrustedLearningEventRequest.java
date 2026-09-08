package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.enums.EventSource;
import com.smarttraining.analytics.enums.LearningEventType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class TrustedLearningEventRequest {

    @NotNull @Positive
    private Long learnerId;

    @NotNull @Positive
    private Long trainingId;

    @Positive
    private Long moduleId;

    @Positive
    private Long lessonId;

    @Positive
    private Long resourceId;

    @Positive
    private Long quizId;

    @Positive
    private Long attemptId;

    @NotNull
    private LearningEventType eventType;

    @NotNull
    private EventSource source;

    @NotBlank
    @Size(max = 160)
    private String idempotencyKey;

    @Size(max = 1000)
    private String description;

    @Min(0)
    private Integer score;

    @Min(0)
    private Integer totalPoints;

    @Min(0)
    private Integer totalLessons;

    @Min(0)
    private Integer totalQuizzes;

    public TrustedLearningEventRequest() {}

    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }
    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }
    public Long getModuleId() { return moduleId; }
    public void setModuleId(Long moduleId) { this.moduleId = moduleId; }
    public Long getLessonId() { return lessonId; }
    public void setLessonId(Long lessonId) { this.lessonId = lessonId; }
    public Long getResourceId() { return resourceId; }
    public void setResourceId(Long resourceId) { this.resourceId = resourceId; }
    public Long getQuizId() { return quizId; }
    public void setQuizId(Long quizId) { this.quizId = quizId; }
    public Long getAttemptId() { return attemptId; }
    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }
    public LearningEventType getEventType() { return eventType; }
    public void setEventType(LearningEventType eventType) { this.eventType = eventType; }
    public EventSource getSource() { return source; }
    public void setSource(EventSource source) { this.source = source; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }
    public Integer getTotalPoints() { return totalPoints; }
    public void setTotalPoints(Integer totalPoints) { this.totalPoints = totalPoints; }
    public Integer getTotalLessons() { return totalLessons; }
    public void setTotalLessons(Integer totalLessons) { this.totalLessons = totalLessons; }
    public Integer getTotalQuizzes() { return totalQuizzes; }
    public void setTotalQuizzes(Integer totalQuizzes) { this.totalQuizzes = totalQuizzes; }
}