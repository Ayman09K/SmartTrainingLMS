package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.enums.LearningEventType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class LearningEventRequest {
    @NotNull(message = "L'identifiant de l'apprenant est obligatoire")
    @Positive(message = "L'identifiant de l'apprenant doit être positif")
    private Long learnerId;
    @NotNull(message = "L'identifiant de la formation est obligatoire")
    @Positive(message = "L'identifiant de la formation doit être positif")
    private Long trainingId;
    private Long moduleId;
    private Long lessonId;
    private Long resourceId;
    private Long quizId;
    private Long attemptId;
    @NotNull(message = "Le type d'événement est obligatoire")
    private LearningEventType eventType;
    private String description;
    private Integer score;
    private Integer totalPoints;
    private Integer progressPercentage;

    public LearningEventRequest() {}
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
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }
    public Integer getTotalPoints() { return totalPoints; }
    public void setTotalPoints(Integer totalPoints) { this.totalPoints = totalPoints; }
    public Integer getProgressPercentage() { return progressPercentage; }
    public void setProgressPercentage(Integer progressPercentage) { this.progressPercentage = progressPercentage; }
}
