package com.smarttraining.training.dto;

import com.smarttraining.training.entity.Training;
import com.smarttraining.training.enums.EnrollmentMode;
import com.smarttraining.training.enums.TrainingLevel;
import com.smarttraining.training.enums.TrainingStatus;
import com.smarttraining.training.enums.TrainingVisibility;
import java.time.LocalDateTime;

public class TrainingResponse {

    private Long id;
    private Long trainerId;
    private Long ownerId;
    private String title;
    private String shortDescription;
    private String description;
    private String objectives;
    private String prerequisites;
    private String targetAudience;
    private String category;
    private Long categoryId;
    private String language;
    private String coverImageUrl;
    private String coverImagePath;
    private TrainingLevel level;
    private Integer estimatedDurationHours;
    private TrainingStatus status;
    private TrainingVisibility visibility;
    private EnrollmentMode enrollmentMode;
    private String accessCode;
    private Integer maxLearners;
    private Double averageRating;
    private Integer reviewCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime publishedAt;
    private LocalDateTime archivedAt;

    public TrainingResponse() {
    }

    public TrainingResponse(Training training) {
        this.id = training.getId();
        this.trainerId = training.getTrainerId();
        this.ownerId = training.getOwnerId();
        this.title = training.getTitle();
        this.shortDescription = training.getShortDescription();
        this.description = training.getDescription();
        this.objectives = training.getObjectives();
        this.prerequisites = training.getPrerequisites();
        this.targetAudience = training.getTargetAudience();
        this.category = training.getCategory();
        this.categoryId = training.getCategoryRef() == null
                ? null
                : training.getCategoryRef().getId();
        this.language = training.getLanguage();
        this.coverImageUrl = training.getCoverImageUrl();
        this.coverImagePath = training.getCoverImagePath();
        this.level = training.getLevel();
        this.estimatedDurationHours = training.getEstimatedDurationHours();
        this.status = training.getStatus();
        this.visibility = training.getVisibility();
        this.enrollmentMode = training.getEnrollmentMode();
        this.accessCode = training.getAccessCode();
        this.maxLearners = training.getMaxLearners();
        this.averageRating = training.getAverageRating();
        this.reviewCount = training.getReviewCount();
        this.createdAt = training.getCreatedAt();
        this.updatedAt = training.getUpdatedAt();
        this.publishedAt = training.getPublishedAt();
        this.archivedAt = training.getArchivedAt();
    }

    public Long getId() { return id; }
    public Long getTrainerId() { return trainerId; }
    public Long getOwnerId() { return ownerId; }
    public String getTitle() { return title; }
    public String getShortDescription() { return shortDescription; }
    public String getDescription() { return description; }
    public String getObjectives() { return objectives; }
    public String getPrerequisites() { return prerequisites; }
    public String getTargetAudience() { return targetAudience; }
    public String getCategory() { return category; }
    public Long getCategoryId() { return categoryId; }
    public String getLanguage() { return language; }
    public String getCoverImageUrl() { return coverImageUrl; }
    public String getCoverImagePath() { return coverImagePath; }
    public TrainingLevel getLevel() { return level; }
    public Integer getEstimatedDurationHours() { return estimatedDurationHours; }
    public TrainingStatus getStatus() { return status; }
    public TrainingVisibility getVisibility() { return visibility; }
    public EnrollmentMode getEnrollmentMode() { return enrollmentMode; }
    public String getAccessCode() { return accessCode; }
    public Integer getMaxLearners() { return maxLearners; }
    public Double getAverageRating() { return averageRating; }
    public Integer getReviewCount() { return reviewCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getPublishedAt() { return publishedAt; }
    public LocalDateTime getArchivedAt() { return archivedAt; }
}
