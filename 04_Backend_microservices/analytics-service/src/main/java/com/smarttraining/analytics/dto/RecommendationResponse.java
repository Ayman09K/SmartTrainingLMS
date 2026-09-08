package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.entity.LearningRecommendation;
import com.smarttraining.analytics.enums.ActionSource;
import com.smarttraining.analytics.enums.RecommendationPriority;
import com.smarttraining.analytics.enums.RecommendationStatus;
import com.smarttraining.analytics.enums.RecommendationType;
import java.time.LocalDateTime;

public class RecommendationResponse {
    private Long id;
    private Long learnerId;
    private Long trainingId;
    private RecommendationType recommendationType;
    private RecommendationPriority priority;
    private String title;
    private String description;
    private ActionSource source;
    private RecommendationStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    public RecommendationResponse() {
    }

    public RecommendationResponse(LearningRecommendation recommendation) {
        this.id = recommendation.getId();
        this.learnerId = recommendation.getLearnerId();
        this.trainingId = recommendation.getTrainingId();
        this.recommendationType = recommendation.getRecommendationType();
        this.priority = recommendation.getPriority();
        this.title = recommendation.getTitle();
        this.description = recommendation.getDescription();
        this.source = recommendation.getSource();
        this.status = recommendation.getStatus();
        this.createdAt = recommendation.getCreatedAt();
        this.completedAt = recommendation.getCompletedAt();
    }

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public Long getTrainingId() { return trainingId; }
    public RecommendationType getRecommendationType() { return recommendationType; }
    public RecommendationPriority getPriority() { return priority; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public ActionSource getSource() { return source; }
    public RecommendationStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
}
