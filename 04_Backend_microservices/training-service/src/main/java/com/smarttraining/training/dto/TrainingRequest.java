package com.smarttraining.training.dto;

import com.smarttraining.training.enums.EnrollmentMode;
import com.smarttraining.training.enums.TrainingLevel;
import com.smarttraining.training.enums.TrainingStatus;
import com.smarttraining.training.enums.TrainingVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public class TrainingRequest {

    @NotNull(message = "L'identifiant du formateur est obligatoire")
    private Long trainerId;

    private Long ownerId;

    @NotBlank(message = "Le titre est obligatoire")
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

    @NotNull(message = "Le niveau est obligatoire")
    private TrainingLevel level;

    @PositiveOrZero(message = "La durée estimée doit être positive ou égale à zéro")
    private Integer estimatedDurationHours;

    private TrainingStatus status;
    private TrainingVisibility visibility;
    private EnrollmentMode enrollmentMode;
    private String accessCode;

    @PositiveOrZero(message = "Le nombre maximal d'apprenants doit être positif ou égal à zéro")
    private Integer maxLearners;

    public TrainingRequest() {
    }

    public Long getTrainerId() { return trainerId; }
    public void setTrainerId(Long trainerId) { this.trainerId = trainerId; }

    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getObjectives() { return objectives; }
    public void setObjectives(String objectives) { this.objectives = objectives; }

    public String getPrerequisites() { return prerequisites; }
    public void setPrerequisites(String prerequisites) { this.prerequisites = prerequisites; }

    public String getTargetAudience() { return targetAudience; }
    public void setTargetAudience(String targetAudience) { this.targetAudience = targetAudience; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) { this.coverImageUrl = coverImageUrl; }

    public String getCoverImagePath() { return coverImagePath; }
    public void setCoverImagePath(String coverImagePath) { this.coverImagePath = coverImagePath; }

    public TrainingLevel getLevel() { return level; }
    public void setLevel(TrainingLevel level) { this.level = level; }

    public Integer getEstimatedDurationHours() { return estimatedDurationHours; }
    public void setEstimatedDurationHours(Integer estimatedDurationHours) { this.estimatedDurationHours = estimatedDurationHours; }

    public TrainingStatus getStatus() { return status; }
    public void setStatus(TrainingStatus status) { this.status = status; }

    public TrainingVisibility getVisibility() { return visibility; }
    public void setVisibility(TrainingVisibility visibility) { this.visibility = visibility; }

    public EnrollmentMode getEnrollmentMode() { return enrollmentMode; }
    public void setEnrollmentMode(EnrollmentMode enrollmentMode) { this.enrollmentMode = enrollmentMode; }

    public String getAccessCode() { return accessCode; }
    public void setAccessCode(String accessCode) { this.accessCode = accessCode; }

    public Integer getMaxLearners() { return maxLearners; }
    public void setMaxLearners(Integer maxLearners) { this.maxLearners = maxLearners; }
}
