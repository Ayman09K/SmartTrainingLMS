package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.entity.Feedback;
import com.smarttraining.analytics.enums.DifficultyLevel;
import com.smarttraining.analytics.enums.FeedbackStatus;
import java.time.LocalDateTime;

public class FeedbackResponse {

    private Long id;
    private Long learnerId;
    private Long trainingId;
    private Long moduleId;
    private Long lessonId;
    private Long resourceId;
    private DifficultyLevel difficultyLevel;
    private Boolean needHelp;
    private String message;
    private FeedbackStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime resolvedAt;
    private Long handledBy;
    private String trainerResponse;

    public FeedbackResponse() {
    }

    public FeedbackResponse(Feedback feedback) {
        this.id = feedback.getId();
        this.learnerId = feedback.getLearnerId();
        this.trainingId = feedback.getTrainingId();
        this.moduleId = feedback.getModuleId();
        this.lessonId = feedback.getLessonId();
        this.resourceId = feedback.getResourceId();
        this.difficultyLevel = feedback.getDifficultyLevel();
        this.needHelp = feedback.getNeedHelp();
        this.message = feedback.getMessage();
        this.status = feedback.getStatus();
        this.createdAt = feedback.getCreatedAt();
        this.updatedAt = feedback.getUpdatedAt();
        this.resolvedAt = feedback.getResolvedAt();
        this.handledBy = feedback.getHandledBy();
        this.trainerResponse = feedback.getTrainerResponse();
    }

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public Long getTrainingId() { return trainingId; }
    public Long getModuleId() { return moduleId; }
    public Long getLessonId() { return lessonId; }
    public Long getResourceId() { return resourceId; }
    public DifficultyLevel getDifficultyLevel() { return difficultyLevel; }
    public Boolean getNeedHelp() { return needHelp; }
    public String getMessage() { return message; }
    public FeedbackStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public Long getHandledBy() { return handledBy; }
    public String getTrainerResponse() { return trainerResponse; }
}
