package com.smarttraining.training.dto;

import java.time.LocalDateTime;

/**
 * Résumé apprenant d'une formation réellement inscrite.
 * Le learnerId est volontairement absent : l'identité vient du JWT.
 */
public class LearnerMyTrainingResponse {

    private final Long id;
    private final String title;
    private final String shortDescription;
    private final String category;
    private final String language;
    private final String coverImageUrl;
    private final String level;
    private final Integer estimatedDurationHours;
    private final Double averageRating;
    private final Integer reviewCount;
    private final Double progressPercentage;
    private final String enrollmentStatus;
    private final LocalDateTime enrolledAt;
    private final LocalDateTime completedAt;
    private final LocalDateTime dueAt;

    public LearnerMyTrainingResponse(
            TrainingResponse training,
            EnrollmentResponse enrollment
    ) {
        this.id = training.getId();
        this.title = training.getTitle();
        this.shortDescription = training.getShortDescription();
        this.category = training.getCategory();
        this.language = training.getLanguage();
        this.coverImageUrl = training.getCoverImageUrl();
        this.level = training.getLevel() == null
                ? null
                : training.getLevel().name();
        this.estimatedDurationHours = training.getEstimatedDurationHours();
        this.averageRating = training.getAverageRating();
        this.reviewCount = training.getReviewCount();
        this.progressPercentage = enrollment.getProgressPercentage();
        this.enrollmentStatus = enrollment.getStatus() == null
                ? null
                : enrollment.getStatus().name();
        this.enrolledAt = enrollment.getEnrolledAt();
        this.completedAt = enrollment.getCompletedAt();
        this.dueAt = enrollment.getDueAt();
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getShortDescription() { return shortDescription; }
    public String getCategory() { return category; }
    public String getLanguage() { return language; }
    public String getCoverImageUrl() { return coverImageUrl; }
    public String getLevel() { return level; }
    public Integer getEstimatedDurationHours() { return estimatedDurationHours; }
    public Double getAverageRating() { return averageRating; }
    public Integer getReviewCount() { return reviewCount; }
    public Double getProgressPercentage() { return progressPercentage; }
    public String getEnrollmentStatus() { return enrollmentStatus; }
    public LocalDateTime getEnrolledAt() { return enrolledAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public LocalDateTime getDueAt() { return dueAt; }
}