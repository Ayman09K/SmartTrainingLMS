package com.smarttraining.training.entity;

import com.smarttraining.training.enums.LearningPathStatus;
import com.smarttraining.training.enums.TrainingVisibility;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "learning_paths",
        indexes = {
                @Index(
                        name = "idx_learning_paths_owner",
                        columnList = "owner_id"
                ),
                @Index(
                        name = "idx_learning_paths_status_visibility",
                        columnList = "status,visibility"
                ),
                @Index(
                        name = "idx_learning_paths_version_root",
                        columnList = "version_root_id"
                )
        }
)
public class LearningPath {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(name = "owner_role", nullable = false, length = 30)
    private String ownerRole;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(name = "short_description", length = 500)
    private String shortDescription;

    @Column(length = 2000)
    private String description;

    @Column(length = 2000)
    private String objectives;

    @Column(name = "cover_image_url", length = 1500)
    private String coverImageUrl;

    @Column(name = "cover_image_path", length = 1500)
    private String coverImagePath;

    @Column(name = "version_root_id")
    private Long versionRootId;

    @Column(name = "previous_version_id")
    private Long previousVersionId;

    @Column(name = "version_number")
    private Integer versionNumber = 1;

    @Column(name = "version_note", length = 1500)
    private String versionNote;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private LearningPathStatus status = LearningPathStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TrainingVisibility visibility = TrainingVisibility.PRIVATE;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public LearningPath() {
    }

    @PrePersist
    public void beforeCreate() {
        title = normalize(title);

        if (status == null) {
            status = LearningPathStatus.DRAFT;
        }

        if (visibility == null) {
            visibility = TrainingVisibility.PRIVATE;
        }

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        title = normalize(title);
        updatedAt = LocalDateTime.now();
    }

    private static String normalize(String value) {
        return value == null
                ? null
                : value.trim().replaceAll("\\s+", " ");
    }

    public Long getId() { return id; }

    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }

    public String getOwnerRole() { return ownerRole; }
    public void setOwnerRole(String ownerRole) { this.ownerRole = ownerRole; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = normalize(title); }

    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) {
        this.shortDescription = shortDescription;
    }

    public String getDescription() { return description; }
    public void setDescription(String description) {
        this.description = description;
    }

    public String getObjectives() { return objectives; }
    public void setObjectives(String objectives) {
        this.objectives = objectives;
    }

    public String getCoverImageUrl() { return coverImageUrl; }
    public void setCoverImageUrl(String coverImageUrl) {
        this.coverImageUrl = coverImageUrl;
    }

    public String getCoverImagePath() { return coverImagePath; }
    public void setCoverImagePath(String coverImagePath) {
        this.coverImagePath = coverImagePath;
    }

    public Long getVersionRootId() { return versionRootId; }
    public void setVersionRootId(Long versionRootId) {
        this.versionRootId = versionRootId;
    }

    public Long getPreviousVersionId() { return previousVersionId; }
    public void setPreviousVersionId(Long previousVersionId) {
        this.previousVersionId = previousVersionId;
    }

    public Integer getVersionNumber() { return versionNumber; }
    public void setVersionNumber(Integer versionNumber) {
        this.versionNumber = versionNumber;
    }

    public String getVersionNote() { return versionNote; }
    public void setVersionNote(String versionNote) {
        this.versionNote = versionNote == null || versionNote.isBlank()
                ? null
                : versionNote.trim();
    }

    public LearningPathStatus getStatus() { return status; }
    public void setStatus(LearningPathStatus status) { this.status = status; }

    public TrainingVisibility getVisibility() { return visibility; }
    public void setVisibility(TrainingVisibility visibility) {
        this.visibility = visibility;
    }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
