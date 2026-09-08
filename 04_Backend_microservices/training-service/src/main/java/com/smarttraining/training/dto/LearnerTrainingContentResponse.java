package com.smarttraining.training.dto;

import com.smarttraining.training.entity.Lesson;
import com.smarttraining.training.entity.TrainingModule;
import java.time.LocalDateTime;
import java.util.List;

public class LearnerTrainingContentResponse {

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
    private final String level;
    private final Integer estimatedDurationHours;
    private final String status;
    private final String enrollmentMode;
    private final Double averageRating;
    private final Integer reviewCount;
    private final Double progressPercentage;
    private final String enrollmentStatus;
    private final LocalDateTime enrolledAt;
    private final LocalDateTime completedAt;
    private final LocalDateTime dueAt;
    private final boolean canSelfUnenroll;
    private final List<ModuleContent> modules;

    public LearnerTrainingContentResponse(
            TrainingResponse training,
            EnrollmentResponse enrollment,
            List<ModuleContent> modules
    ) {
        this(training, enrollment, modules, false);
    }

    public LearnerTrainingContentResponse(
            TrainingResponse training,
            EnrollmentResponse enrollment,
            List<ModuleContent> modules,
            boolean canSelfUnenroll
    ) {
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
        this.level = training.getLevel() == null
                ? null
                : training.getLevel().name();
        this.estimatedDurationHours = training.getEstimatedDurationHours();
        this.status = training.getStatus() == null
                ? null
                : training.getStatus().normalized().name();
        this.enrollmentMode = training.getEnrollmentMode() == null
                ? null
                : training.getEnrollmentMode().name();
        this.averageRating = training.getAverageRating();
        this.reviewCount = training.getReviewCount();
        this.progressPercentage = enrollment.getProgressPercentage();
        this.enrollmentStatus = enrollment.getStatus() == null
                ? null
                : enrollment.getStatus().name();
        this.enrolledAt = enrollment.getEnrolledAt();
        this.completedAt = enrollment.getCompletedAt();
        this.dueAt = enrollment.getDueAt();
        this.canSelfUnenroll = canSelfUnenroll;
        this.modules = modules;
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
    public String getLevel() { return level; }
    public Integer getEstimatedDurationHours() { return estimatedDurationHours; }
    public String getStatus() { return status; }
    public String getEnrollmentMode() { return enrollmentMode; }
    public Double getAverageRating() { return averageRating; }
    public Integer getReviewCount() { return reviewCount; }
    public Double getProgressPercentage() { return progressPercentage; }
    public String getEnrollmentStatus() { return enrollmentStatus; }
    public LocalDateTime getEnrolledAt() { return enrolledAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public LocalDateTime getDueAt() { return dueAt; }
    public boolean isCanSelfUnenroll() { return canSelfUnenroll; }
    public List<ModuleContent> getModules() { return modules; }

    public static class ModuleContent {
        private final Long id;
        private final String title;
        private final String description;
        private final Integer orderIndex;
        private final Boolean required;
        private final Integer estimatedDurationMinutes;
        private final List<LessonContent> lessons;

        public ModuleContent(
                TrainingModule module,
                List<LessonContent> lessons
        ) {
            this.id = module.getId();
            this.title = module.getTitle();
            this.description = module.getDescription();
            this.orderIndex = module.getOrderIndex();
            this.required = module.getRequired();
            this.estimatedDurationMinutes =
                    module.getEstimatedDurationMinutes();
            this.lessons = lessons;
        }

        public Long getId() { return id; }
        public String getTitle() { return title; }
        public String getDescription() { return description; }
        public Integer getOrderIndex() { return orderIndex; }
        public Boolean getRequired() { return required; }
        public Integer getEstimatedDurationMinutes() {
            return estimatedDurationMinutes;
        }
        public List<LessonContent> getLessons() { return lessons; }
    }

    public static class LessonContent {
        private final Long id;
        private final String title;
        private final String description;
        private final String objective;
        private final String content;
        private final Integer orderIndex;
        private final Integer estimatedDurationMinutes;
        private final Boolean required;
        private final String completionRule;
        private final List<ResourceContent> resources;

        public LessonContent(
                Lesson lesson,
                List<ResourceContent> resources
        ) {
            this.id = lesson.getId();
            this.title = lesson.getTitle();
            this.description = lesson.getDescription();
            this.objective = lesson.getObjective();
            this.content = lesson.getContent();
            this.orderIndex = lesson.getOrderIndex();
            this.estimatedDurationMinutes =
                    lesson.getEstimatedDurationMinutes();
            this.required = lesson.getRequired();
            this.completionRule = lesson.getCompletionRule() == null
                    ? null
                    : lesson.getCompletionRule().name();
            this.resources = resources;
        }

        public Long getId() { return id; }
        public String getTitle() { return title; }
        public String getDescription() { return description; }
        public String getObjective() { return objective; }
        public String getContent() { return content; }
        public Integer getOrderIndex() { return orderIndex; }
        public Integer getEstimatedDurationMinutes() {
            return estimatedDurationMinutes;
        }
        public Boolean getRequired() { return required; }
        public String getCompletionRule() { return completionRule; }
        public List<ResourceContent> getResources() { return resources; }
    }

    public static class ResourceContent {
        private final Long id;
        private final String title;
        private final String description;
        private final String type;
        private final String storageMode;
        private final String url;
        private final String textContent;
        private final String publicUrl;
        private final String mimeType;
        private final Long fileSize;
        private final Integer durationSeconds;
        private final Boolean active;
        private final Integer orderIndex;

        public ResourceContent(ResourceResponse resource) {
            this.id = resource.getId();
            this.title = resource.getTitle();
            this.description = resource.getDescription();
            this.type = resource.getType() == null
                    ? null
                    : resource.getType().name();
            this.storageMode = resource.getStorageMode() == null
                    ? null
                    : resource.getStorageMode().name();
            this.url = resource.getUrl();
            this.textContent = resource.getTextContent();
            this.publicUrl = resource.getPublicUrl();
            this.mimeType = resource.getMimeType();
            this.fileSize = resource.getFileSize();
            this.durationSeconds = resource.getDurationSeconds();
            this.active = resource.getActive();
            this.orderIndex = resource.getOrderIndex();
        }

        public Long getId() { return id; }
        public String getTitle() { return title; }
        public String getDescription() { return description; }
        public String getType() { return type; }
        public String getStorageMode() { return storageMode; }
        public String getUrl() { return url; }
        public String getTextContent() { return textContent; }
        public String getPublicUrl() { return publicUrl; }
        public String getMimeType() { return mimeType; }
        public Long getFileSize() { return fileSize; }
        public Integer getDurationSeconds() { return durationSeconds; }
        public Boolean getActive() { return active; }
        public Integer getOrderIndex() { return orderIndex; }
    }
}