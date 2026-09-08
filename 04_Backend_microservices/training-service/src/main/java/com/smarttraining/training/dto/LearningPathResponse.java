package com.smarttraining.training.dto;

import com.smarttraining.training.entity.LearningPath;
import com.smarttraining.training.enums.LearningPathStatus;
import com.smarttraining.training.enums.TrainingVisibility;
import java.time.LocalDateTime;

public class LearningPathResponse {

    private final Long id;
    private final Long ownerId;
    private final String ownerRole;
    private final String title;
    private final String shortDescription;
    private final String description;
    private final String objectives;
    private final String coverImageUrl;
    private final String coverImagePath;
    private final Long versionRootId;
    private final Long previousVersionId;
    private final Integer versionNumber;
    private final String versionNote;
    private final LearningPathStatus status;
    private final TrainingVisibility visibility;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public LearningPathResponse(LearningPath path) {
        this.id = path.getId();
        this.ownerId = path.getOwnerId();
        this.ownerRole = path.getOwnerRole();
        this.title = path.getTitle();
        this.shortDescription = path.getShortDescription();
        this.description = path.getDescription();
        this.objectives = path.getObjectives();
        this.coverImageUrl = path.getCoverImageUrl();
        this.coverImagePath = path.getCoverImagePath();
        this.versionRootId = path.getVersionRootId() == null
                ? path.getId()
                : path.getVersionRootId();
        this.previousVersionId = path.getPreviousVersionId();
        this.versionNumber = path.getVersionNumber() == null
                ? 1
                : path.getVersionNumber();
        this.versionNote = path.getVersionNote();
        this.status = path.getStatus();
        this.visibility = path.getVisibility();
        this.createdAt = path.getCreatedAt();
        this.updatedAt = path.getUpdatedAt();
    }

    public Long getId() { return id; }
    public Long getOwnerId() { return ownerId; }
    public String getOwnerRole() { return ownerRole; }
    public String getTitle() { return title; }
    public String getShortDescription() { return shortDescription; }
    public String getDescription() { return description; }
    public String getObjectives() { return objectives; }
    public String getCoverImageUrl() { return coverImageUrl; }
    public String getCoverImagePath() { return coverImagePath; }
    public Long getVersionRootId() { return versionRootId; }
    public Long getPreviousVersionId() { return previousVersionId; }
    public Integer getVersionNumber() { return versionNumber; }
    public String getVersionNote() { return versionNote; }
    public LearningPathStatus getStatus() { return status; }
    public TrainingVisibility getVisibility() { return visibility; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
