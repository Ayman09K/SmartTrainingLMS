package com.smarttraining.training.dto;

import java.time.LocalDateTime;

/**
 * Vue publique du catalogue destinee aux apprenants.
 *
 * Important :
 * - ne contient jamais accessCode ;
 * - ne contient pas ownerId / trainerId ;
 * - ne contient pas les chemins internes de stockage.
 */
public class LearnerCatalogTrainingResponse {

    private final Long id;
    private final String title;
    private final String shortDescription;
    private final String description;
    private final String objectives;
    private final String prerequisites;
    private final String targetAudience;
    private final String category;
    private final String language;
    private final String coverImageUrl;
    private final Object level;
    private final Integer estimatedDurationHours;
    private final Object enrollmentMode;
    private final Integer maxLearners;
    private final Double averageRating;
    private final Integer reviewCount;
    private final LocalDateTime publishedAt;

    public LearnerCatalogTrainingResponse(TrainingResponse training) {
        this.id = training.getId();
        this.title = training.getTitle();
        this.shortDescription = training.getShortDescription();
        this.description = training.getDescription();
        this.objectives = training.getObjectives();
        this.prerequisites = training.getPrerequisites();
        this.targetAudience = training.getTargetAudience();
        this.category = training.getCategory();
        this.language = training.getLanguage();
        this.coverImageUrl = training.getCoverImageUrl();
        this.level = training.getLevel();
        this.estimatedDurationHours = training.getEstimatedDurationHours();
        this.enrollmentMode = training.getEnrollmentMode();
        this.maxLearners = training.getMaxLearners();
        this.averageRating = training.getAverageRating();
        this.reviewCount = training.getReviewCount();
        this.publishedAt = training.getPublishedAt();
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getShortDescription() { return shortDescription; }
    public String getDescription() { return description; }
    public String getObjectives() { return objectives; }
    public String getPrerequisites() { return prerequisites; }
    public String getTargetAudience() { return targetAudience; }
    public String getCategory() { return category; }
    public String getLanguage() { return language; }
    public String getCoverImageUrl() { return coverImageUrl; }
    public Object getLevel() { return level; }
    public Integer getEstimatedDurationHours() { return estimatedDurationHours; }
    public Object getEnrollmentMode() { return enrollmentMode; }
    public Integer getMaxLearners() { return maxLearners; }
    public Double getAverageRating() { return averageRating; }
    public Integer getReviewCount() { return reviewCount; }
    public LocalDateTime getPublishedAt() { return publishedAt; }
}