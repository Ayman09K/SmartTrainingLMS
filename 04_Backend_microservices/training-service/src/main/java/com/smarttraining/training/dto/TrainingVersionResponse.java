package com.smarttraining.training.dto;

import com.smarttraining.training.entity.TrainingVersion;
import com.smarttraining.training.enums.TrainingVersionStatus;
import java.time.LocalDateTime;

public class TrainingVersionResponse {

    private Long id;
    private Long trainingId;
    private Integer versionNumber;
    private TrainingVersionStatus status;
    private String contentHash;
    private Long publishedBy;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private String snapshotJson;

    public TrainingVersionResponse() {
    }

    public TrainingVersionResponse(TrainingVersion version, boolean includeSnapshot) {
        this.id = version.getId();
        this.trainingId = version.getTraining().getId();
        this.versionNumber = version.getVersionNumber();
        this.status = version.getStatus();
        this.contentHash = version.getContentHash();
        this.publishedBy = version.getPublishedBy();
        this.publishedAt = version.getPublishedAt();
        this.createdAt = version.getCreatedAt();
        this.snapshotJson = includeSnapshot ? version.getSnapshotJson() : null;
    }

    public Long getId() { return id; }
    public Long getTrainingId() { return trainingId; }
    public Integer getVersionNumber() { return versionNumber; }
    public TrainingVersionStatus getStatus() { return status; }
    public String getContentHash() { return contentHash; }
    public Long getPublishedBy() { return publishedBy; }
    public LocalDateTime getPublishedAt() { return publishedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public String getSnapshotJson() { return snapshotJson; }
}
