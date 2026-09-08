package com.smarttraining.analytics.entity;

import com.smarttraining.analytics.enums.DifficultyLevel;
import com.smarttraining.analytics.enums.FeedbackStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "feedbacks")
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long learnerId;
    private Long trainingId;
    private Long moduleId;
    private Long lessonId;
    private Long resourceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DifficultyLevel difficultyLevel = DifficultyLevel.NORMAL;

    @Column(nullable = false)
    private Boolean needHelp = false;

    @Column(length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FeedbackStatus status = FeedbackStatus.OPEN;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
    private LocalDateTime resolvedAt;
    private Long handledBy;

    @Column(length = 1000)
    private String trainerResponse;

    public Feedback() {
    }

    @PrePersist
    public void beforeCreate() {
        if (difficultyLevel == null) {
            difficultyLevel = DifficultyLevel.NORMAL;
        }

        if (needHelp == null) {
            needHelp = false;
        }

        if (status == null) {
            status = FeedbackStatus.OPEN;
        }

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void markResolved(Long handledBy, String trainerResponse) {
        this.status = FeedbackStatus.RESOLVED;
        this.handledBy = handledBy;
        this.trainerResponse = trainerResponse;
        this.resolvedAt = LocalDateTime.now();
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

    public DifficultyLevel getDifficultyLevel() { return difficultyLevel; }
    public void setDifficultyLevel(DifficultyLevel difficultyLevel) { this.difficultyLevel = difficultyLevel; }

    public Boolean getNeedHelp() { return needHelp; }
    public void setNeedHelp(Boolean needHelp) { this.needHelp = needHelp; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public FeedbackStatus getStatus() { return status; }
    public void setStatus(FeedbackStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public LocalDateTime getResolvedAt() { return resolvedAt; }

    public Long getHandledBy() { return handledBy; }
    public void setHandledBy(Long handledBy) { this.handledBy = handledBy; }

    public String getTrainerResponse() { return trainerResponse; }
    public void setTrainerResponse(String trainerResponse) { this.trainerResponse = trainerResponse; }
}
