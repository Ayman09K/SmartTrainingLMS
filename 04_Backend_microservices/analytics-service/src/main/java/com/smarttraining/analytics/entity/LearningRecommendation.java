package com.smarttraining.analytics.entity;

import com.smarttraining.analytics.enums.ActionSource;
import com.smarttraining.analytics.enums.RecommendationPriority;
import com.smarttraining.analytics.enums.RecommendationStatus;
import com.smarttraining.analytics.enums.RecommendationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "learning_recommendations")
public class LearningRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "learner_id", nullable = false)
    private Long learnerId;

    @Column(name = "training_id", nullable = false)
    private Long trainingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "recommendation_type", nullable = false, length = 50)
    private RecommendationType recommendationType;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private RecommendationPriority priority;

    @Column(name = "title", nullable = false, length = 180)
    private String title;

    @Column(name = "description", nullable = false, length = 1200)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 30)
    private ActionSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private RecommendationStatus status = RecommendationStatus.PROPOSED;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = RecommendationStatus.PROPOSED;
        }
    }

    public LearningRecommendation() {
    }

    public LearningRecommendation(Long learnerId, Long trainingId,
            RecommendationType recommendationType, RecommendationPriority priority,
            String title, String description, ActionSource source) {
        this.learnerId = learnerId;
        this.trainingId = trainingId;
        this.recommendationType = recommendationType;
        this.priority = priority;
        this.title = title;
        this.description = description;
        this.source = source;
        this.status = RecommendationStatus.PROPOSED;
    }

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }
    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }
    public RecommendationType getRecommendationType() { return recommendationType; }
    public void setRecommendationType(RecommendationType recommendationType) { this.recommendationType = recommendationType; }
    public RecommendationPriority getPriority() { return priority; }
    public void setPriority(RecommendationPriority priority) { this.priority = priority; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public ActionSource getSource() { return source; }
    public void setSource(ActionSource source) { this.source = source; }
    public RecommendationStatus getStatus() { return status; }
    public void setStatus(RecommendationStatus status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }

    public void markAccepted() {
        this.status = RecommendationStatus.ACCEPTED;
    }

    public void markCompleted() {
        this.status = RecommendationStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    public void markDismissed() {
        this.status = RecommendationStatus.DISMISSED;
    }
}
