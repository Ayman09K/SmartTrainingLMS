package com.smarttraining.training.dto;

import com.smarttraining.training.entity.LearningPath;
import com.smarttraining.training.enums.LearningPathStatus;
import com.smarttraining.training.enums.TrainingVisibility;
import java.time.LocalDateTime;
import java.util.List;

public class LearningPathCatalogResponse {

    private final String itemType = "LEARNING_PATH";

    private final Long id;
    private final String title;
    private final String shortDescription;
    private final String description;
    private final String objectives;
    private final LearningPathStatus status;
    private final TrainingVisibility visibility;

    private final int totalTrainings;
    private final int requiredTrainings;
    private final int optionalTrainings;
    private final int estimatedDurationHours;

    private final String coverImageUrl;
    private final String coverImagePath;

    private final boolean assignedToMe;
    private final boolean canStart;

    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    private final List<LearningPathStepResponse> trainings;

    public LearningPathCatalogResponse(
            LearningPath path,
            int totalTrainings,
            int requiredTrainings,
            int optionalTrainings,
            int estimatedDurationHours,
            String coverImageUrl,
            String coverImagePath,
            boolean assignedToMe,
            List<LearningPathStepResponse> trainings
    ) {
        this.id = path.getId();
        this.title = path.getTitle();
        this.shortDescription = path.getShortDescription();
        this.description = path.getDescription();
        this.objectives = path.getObjectives();
        this.status = path.getStatus();
        this.visibility = path.getVisibility();

        this.totalTrainings = totalTrainings;
        this.requiredTrainings = requiredTrainings;
        this.optionalTrainings = optionalTrainings;
        this.estimatedDurationHours = estimatedDurationHours;

        this.coverImageUrl = coverImageUrl;
        this.coverImagePath = coverImagePath;

        this.assignedToMe = assignedToMe;
        this.canStart = assignedToMe;

        this.createdAt = path.getCreatedAt();
        this.updatedAt = path.getUpdatedAt();

        this.trainings = trainings == null
                ? List.of()
                : List.copyOf(trainings);
    }

    public String getItemType() { return itemType; }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getShortDescription() { return shortDescription; }
    public String getDescription() { return description; }
    public String getObjectives() { return objectives; }

    public LearningPathStatus getStatus() { return status; }
    public TrainingVisibility getVisibility() { return visibility; }

    public int getTotalTrainings() { return totalTrainings; }
    public int getRequiredTrainings() { return requiredTrainings; }
    public int getOptionalTrainings() { return optionalTrainings; }

    public int getEstimatedDurationHours() {
        return estimatedDurationHours;
    }

    public String getCoverImageUrl() { return coverImageUrl; }
    public String getCoverImagePath() { return coverImagePath; }

    public boolean isAssignedToMe() { return assignedToMe; }
    public boolean isCanStart() { return canStart; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public List<LearningPathStepResponse> getTrainings() {
        return trainings;
    }
}