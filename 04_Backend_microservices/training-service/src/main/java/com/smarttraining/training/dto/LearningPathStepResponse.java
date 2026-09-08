package com.smarttraining.training.dto;

import com.smarttraining.training.entity.LearningPathStep;
import com.smarttraining.training.entity.Training;
import com.smarttraining.training.enums.TrainingStatus;

public class LearningPathStepResponse {

    private final Long id;
    private final Long pathId;
    private final Long trainingId;
    private final Integer position;
    private final Boolean required;

    private final boolean trainingMissing;
    private final String trainingTitle;
    private final TrainingStatus trainingStatus;
    private final String coverImageUrl;
    private final String coverImagePath;
    private final Integer estimatedDurationHours;

    public LearningPathStepResponse(
            LearningPathStep step,
            Training training
    ) {
        this.id = step.getId();
        this.pathId = step.getPathId();
        this.trainingId = step.getTrainingId();
        this.position = step.getPosition();
        this.required = step.getRequired();

        this.trainingMissing = training == null;
        this.trainingTitle = training == null ? null : training.getTitle();
        this.trainingStatus = training == null ? null : training.getStatus();
        this.coverImageUrl = training == null ? null : training.getCoverImageUrl();
        this.coverImagePath = training == null ? null : training.getCoverImagePath();
        this.estimatedDurationHours = training == null
                ? null
                : training.getEstimatedDurationHours();
    }

    public Long getId() { return id; }
    public Long getPathId() { return pathId; }
    public Long getTrainingId() { return trainingId; }
    public Integer getPosition() { return position; }
    public Boolean getRequired() { return required; }

    public boolean isTrainingMissing() { return trainingMissing; }
    public String getTrainingTitle() { return trainingTitle; }
    public TrainingStatus getTrainingStatus() { return trainingStatus; }
    public String getCoverImageUrl() { return coverImageUrl; }
    public String getCoverImagePath() { return coverImagePath; }
    public Integer getEstimatedDurationHours() { return estimatedDurationHours; }
}