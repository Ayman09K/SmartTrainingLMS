package com.smarttraining.analytics.entity;

import com.smarttraining.analytics.enums.EventSource;
import com.smarttraining.analytics.enums.LearningEventType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "learning_events",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_learning_event_idempotency",
            columnNames = "idempotency_key"
        )
    }
)
public class LearningEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "learner_id")
    private Long learnerId;

    @Column(name = "training_id")
    private Long trainingId;

    @Column(name = "module_id")
    private Long moduleId;

    @Column(name = "lesson_id")
    private Long lessonId;

    @Column(name = "resource_id")
    private Long resourceId;

    @Column(name = "quiz_id")
    private Long quizId;

    @Column(name = "attempt_id")
    private Long attemptId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type")
    private LearningEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", length = 40)
    private EventSource source;

    @Column(name = "idempotency_key", length = 160)
    private String idempotencyKey;

    @Column(length = 1000)
    private String description;

    private Integer score;

    @Column(name = "total_points")
    private Integer totalPoints;

    @Column(name = "progress_percentage")
    private Integer progressPercentage;

    @Column(name = "total_lessons_snapshot")
    private Integer totalLessonsSnapshot;

    @Column(name = "total_quizzes_snapshot")
    private Integer totalQuizzesSnapshot;

    @Column(name = "event_date")
    private LocalDateTime eventDate;

    public LearningEvent() {}

    @PrePersist
    public void onCreate() {
        if (eventDate == null) {
            eventDate = LocalDateTime.now();
        }
        if (source == null) {
            source = EventSource.LEGACY;
        }
    }

    public Long getId() { return id; }
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
    public Integer getProgressPercentage() { return progressPercentage; }
    public void setProgressPercentage(Integer progressPercentage) { this.progressPercentage = progressPercentage; }
    public Integer getTotalLessonsSnapshot() { return totalLessonsSnapshot; }
    public void setTotalLessonsSnapshot(Integer totalLessonsSnapshot) { this.totalLessonsSnapshot = totalLessonsSnapshot; }
    public Integer getTotalQuizzesSnapshot() { return totalQuizzesSnapshot; }
    public void setTotalQuizzesSnapshot(Integer totalQuizzesSnapshot) { this.totalQuizzesSnapshot = totalQuizzesSnapshot; }
    public LocalDateTime getEventDate() { return eventDate; }
    public void setEventDate(LocalDateTime eventDate) { this.eventDate = eventDate; }
}