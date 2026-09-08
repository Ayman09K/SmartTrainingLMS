package com.smarttraining.training.entity;

import com.smarttraining.training.enums.EnrollmentMode;
import com.smarttraining.training.enums.TrainingLevel;
import com.smarttraining.training.enums.TrainingStatus;
import com.smarttraining.training.enums.TrainingVisibility;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "trainings")
public class Training {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Identifiant du formateur venant de auth-service.
    // Pas de relation JPA directe avec users.
    @Column(nullable = false)
    private Long trainerId;

    // Propriétaire fonctionnel de la formation.
    // Pour l’instant, il peut être identique à trainerId.
    private Long ownerId;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(length = 500)
    private String shortDescription;

    @Column(length = 1000)
    private String description;

    @Column(length = 1000)
    private String objectives;

    @Column(length = 1000)
    private String prerequisites;

    @Column(length = 500)
    private String targetAudience;

    @Column(length = 100)
    private String category;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id")
    private TrainingCategory categoryRef;

    @Column(length = 20)
    private String language = "fr";

    @Column(length = 1500)
    private String coverImageUrl;

    @Column(length = 1500)
    private String coverImagePath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TrainingLevel level;

    private Integer estimatedDurationHours;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private TrainingStatus status = TrainingStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private TrainingVisibility visibility = TrainingVisibility.PRIVATE;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private EnrollmentMode enrollmentMode = EnrollmentMode.ASSIGNMENT_ONLY;

    @Column(length = 100)
    private String accessCode;

    private Integer maxLearners;

    private Double averageRating = 0.0;

    private Integer reviewCount = 0;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    @Column(name = "current_version_number", nullable = false)
    private Integer currentVersionNumber = 0;

    private LocalDateTime publishedAt;

    private LocalDateTime archivedAt;

    @OneToMany(mappedBy = "training", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TrainingModule> modules = new ArrayList<>();

    public Training() {
    }

    public Training(Long trainerId, String title, String description, String objectives,
                    TrainingLevel level, Integer estimatedDurationHours, TrainingStatus status) {
        this.trainerId = trainerId;
        this.ownerId = trainerId;
        this.title = title;
        this.description = description;
        this.objectives = objectives;
        this.level = level;
        this.estimatedDurationHours = estimatedDurationHours;
        this.status = status == null ? TrainingStatus.DRAFT : status;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    public void beforeCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }

        if (status == null) {
            status = TrainingStatus.DRAFT;
        }

        if (visibility == null) {
            visibility = TrainingVisibility.PRIVATE;
        }

        if (enrollmentMode == null) {
            enrollmentMode = EnrollmentMode.ASSIGNMENT_ONLY;
        }

        if (language == null || language.isBlank()) {
            language = "fr";
        }

        if (ownerId == null) {
            ownerId = trainerId;
        }

        if (averageRating == null) {
            averageRating = 0.0;
        }

        if (reviewCount == null) {
            reviewCount = 0;
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        updatedAt = LocalDateTime.now();

        if (ownerId == null) {
            ownerId = trainerId;
        }

        if (averageRating == null) {
            averageRating = 0.0;
        }

        if (reviewCount == null) {
            reviewCount = 0;
        }
    }

    public void publish() {
        this.status = TrainingStatus.PUBLISHED;
        this.publishedAt = LocalDateTime.now();
        this.archivedAt = null;
    }

    public void archive() {
        this.status = TrainingStatus.ARCHIVED;
        this.archivedAt = LocalDateTime.now();
    }

    public void moveToDraft() {
        this.status = TrainingStatus.DRAFT;
        this.publishedAt = null;
        this.archivedAt = null;
    }

    public boolean isPublished() {
        return status != null && status.normalized() == TrainingStatus.PUBLISHED;
    }

    public Long getId() { return id; }

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

    public TrainingCategory getCategoryRef() { return categoryRef; }
    public void setCategoryRef(TrainingCategory categoryRef) { this.categoryRef = categoryRef; }

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

    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }

    public Integer getReviewCount() { return reviewCount; }
    public void setReviewCount(Integer reviewCount) { this.reviewCount = reviewCount; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public Integer getCurrentVersionNumber() { return currentVersionNumber; }
    public void setCurrentVersionNumber(Integer currentVersionNumber) { this.currentVersionNumber = currentVersionNumber; }

    public LocalDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; }

    public LocalDateTime getArchivedAt() { return archivedAt; }
    public void setArchivedAt(LocalDateTime archivedAt) { this.archivedAt = archivedAt; }

    public List<TrainingModule> getModules() { return modules; }
    public void setModules(List<TrainingModule> modules) { this.modules = modules; }
}
