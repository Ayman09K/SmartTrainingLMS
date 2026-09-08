package com.smarttraining.analytics.integration;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class TrainingAssistantContent {

    private Long id;
    private String title;
    private String shortDescription;
    private String description;
    private String objectives;
    private String prerequisites;
    private String targetAudience;
    private String category;
    private String language;
    private String level;
    private Integer estimatedDurationHours;
    private Double progressPercentage;
    private String enrollmentStatus;
    private LocalDateTime dueAt;
    private List<ModuleContent> modules = new ArrayList<>();

    public TrainingAssistantContent() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public Integer getEstimatedDurationHours() { return estimatedDurationHours; }
    public void setEstimatedDurationHours(Integer estimatedDurationHours) {
        this.estimatedDurationHours = estimatedDurationHours;
    }

    public Double getProgressPercentage() { return progressPercentage; }
    public void setProgressPercentage(Double progressPercentage) {
        this.progressPercentage = progressPercentage;
    }

    public String getEnrollmentStatus() { return enrollmentStatus; }
    public void setEnrollmentStatus(String enrollmentStatus) {
        this.enrollmentStatus = enrollmentStatus;
    }

    public LocalDateTime getDueAt() { return dueAt; }
    public void setDueAt(LocalDateTime dueAt) { this.dueAt = dueAt; }

    public List<ModuleContent> getModules() { return modules; }
    public void setModules(List<ModuleContent> modules) {
        this.modules = modules == null ? new ArrayList<>() : modules;
    }

    public static class ModuleContent {
        private Long id;
        private String title;
        private String description;
        private Integer orderIndex;
        private List<LessonContent> lessons = new ArrayList<>();

        public ModuleContent() {
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }

        public List<LessonContent> getLessons() { return lessons; }
        public void setLessons(List<LessonContent> lessons) {
            this.lessons = lessons == null ? new ArrayList<>() : lessons;
        }
    }

    public static class LessonContent {
        private Long id;
        private String title;
        private String description;
        private String objective;
        private String content;
        private Integer orderIndex;
        private List<ResourceContent> resources = new ArrayList<>();

        public LessonContent() {
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getObjective() { return objective; }
        public void setObjective(String objective) { this.objective = objective; }

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }

        public Integer getOrderIndex() { return orderIndex; }
        public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }

        public List<ResourceContent> getResources() { return resources; }
        public void setResources(List<ResourceContent> resources) {
            this.resources = resources == null ? new ArrayList<>() : resources;
        }
    }

    public static class ResourceContent {
        private Long id;
        private String title;
        private String description;
        private String type;
        private String textContent;
        private String mimeType;
        private Boolean active;

        public ResourceContent() {
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public String getTextContent() { return textContent; }
        public void setTextContent(String textContent) { this.textContent = textContent; }

        public String getMimeType() { return mimeType; }
        public void setMimeType(String mimeType) { this.mimeType = mimeType; }

        public Boolean getActive() { return active; }
        public void setActive(Boolean active) { this.active = active; }
    }
}