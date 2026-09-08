package com.smarttraining.training.dto;

import com.smarttraining.training.enums.EnrollmentMode;
import com.smarttraining.training.enums.ScormQuickCreateMode;
import com.smarttraining.training.enums.TrainingLevel;
import com.smarttraining.training.enums.TrainingVisibility;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public class ScormQuickCreateConfirmRequest {

    private String title;
    private String shortDescription;
    private String description;
    private String objectives;
    private String prerequisites;
    private String targetAudience;

    @NotNull(message = "La categorie est obligatoire")
    private Long categoryId;

    private String language;

    @NotNull(message = "Le niveau est obligatoire")
    private TrainingLevel level;

    @PositiveOrZero(message = "La duree estimee doit etre positive ou egale a zero")
    private Integer estimatedDurationHours;

    private TrainingVisibility visibility;
    private EnrollmentMode enrollmentMode;
    private String accessCode;

    @PositiveOrZero(message = "Le nombre maximal d'apprenants doit etre positif ou egal a zero")
    private Integer maxLearners;

    private ScormQuickCreateMode mode;

    public ScormQuickCreateConfirmRequest() {
    }

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
    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public TrainingLevel getLevel() { return level; }
    public void setLevel(TrainingLevel level) { this.level = level; }
    public Integer getEstimatedDurationHours() { return estimatedDurationHours; }
    public void setEstimatedDurationHours(Integer estimatedDurationHours) { this.estimatedDurationHours = estimatedDurationHours; }
    public TrainingVisibility getVisibility() { return visibility; }
    public void setVisibility(TrainingVisibility visibility) { this.visibility = visibility; }
    public EnrollmentMode getEnrollmentMode() { return enrollmentMode; }
    public void setEnrollmentMode(EnrollmentMode enrollmentMode) { this.enrollmentMode = enrollmentMode; }
    public String getAccessCode() { return accessCode; }
    public void setAccessCode(String accessCode) { this.accessCode = accessCode; }
    public Integer getMaxLearners() { return maxLearners; }
    public void setMaxLearners(Integer maxLearners) { this.maxLearners = maxLearners; }
    public ScormQuickCreateMode getMode() { return mode; }
    public void setMode(ScormQuickCreateMode mode) { this.mode = mode; }
}
