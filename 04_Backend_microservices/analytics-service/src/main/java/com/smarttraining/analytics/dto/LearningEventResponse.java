package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.entity.LearningEvent;
import com.smarttraining.analytics.enums.EventSource;
import com.smarttraining.analytics.enums.LearningEventType;
import java.time.LocalDateTime;

public class LearningEventResponse {
    private Long id;
    private Long learnerId;
    private Long trainingId;
    private Long moduleId;
    private Long lessonId;
    private Long resourceId;
    private Long quizId;
    private Long attemptId;
    private LearningEventType eventType;
    private EventSource source;
    private String description;
    private Integer score;
    private Integer totalPoints;
    private Integer progressPercentage;
    private Integer totalLessonsSnapshot;
    private Integer totalQuizzesSnapshot;
    private LocalDateTime eventDate;

    public LearningEventResponse() {}

    public LearningEventResponse(LearningEvent event) {
        this.id = event.getId();
        this.learnerId = event.getLearnerId();
        this.trainingId = event.getTrainingId();
        this.moduleId = event.getModuleId();
        this.lessonId = event.getLessonId();
        this.resourceId = event.getResourceId();
        this.quizId = event.getQuizId();
        this.attemptId = event.getAttemptId();
        this.eventType = event.getEventType();
        this.source = event.getSource();
        this.description = event.getDescription();
        this.score = event.getScore();
        this.totalPoints = event.getTotalPoints();
        this.progressPercentage = event.getProgressPercentage();
        this.totalLessonsSnapshot = event.getTotalLessonsSnapshot();
        this.totalQuizzesSnapshot = event.getTotalQuizzesSnapshot();
        this.eventDate = event.getEventDate();
    }

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public Long getTrainingId() { return trainingId; }
    public Long getModuleId() { return moduleId; }
    public Long getLessonId() { return lessonId; }
    public Long getResourceId() { return resourceId; }
    public Long getQuizId() { return quizId; }
    public Long getAttemptId() { return attemptId; }
    public LearningEventType getEventType() { return eventType; }
    public EventSource getSource() { return source; }
    public String getDescription() { return description; }
    public Integer getScore() { return score; }
    public Integer getTotalPoints() { return totalPoints; }
    public Integer getProgressPercentage() { return progressPercentage; }
    public Integer getTotalLessonsSnapshot() { return totalLessonsSnapshot; }
    public Integer getTotalQuizzesSnapshot() { return totalQuizzesSnapshot; }
    public LocalDateTime getEventDate() { return eventDate; }
}