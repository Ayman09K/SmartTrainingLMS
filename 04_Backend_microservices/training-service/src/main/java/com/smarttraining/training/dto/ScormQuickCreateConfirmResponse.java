package com.smarttraining.training.dto;

import com.smarttraining.training.enums.ScormQuickCreateMode;
import com.smarttraining.training.enums.TrainingStatus;

public class ScormQuickCreateConfirmResponse {

    private Long trainingId;
    private String title;
    private TrainingStatus status;
    private ScormQuickCreateMode modeApplied;
    private Integer moduleCount;
    private Integer lessonCount;
    private Integer resourceCount;
    private String checksumSha256;
    private String message;

    public ScormQuickCreateConfirmResponse() {
    }

    public ScormQuickCreateConfirmResponse(
            Long trainingId,
            String title,
            TrainingStatus status,
            ScormQuickCreateMode modeApplied,
            Integer moduleCount,
            Integer lessonCount,
            Integer resourceCount,
            String checksumSha256,
            String message
    ) {
        this.trainingId = trainingId;
        this.title = title;
        this.status = status;
        this.modeApplied = modeApplied;
        this.moduleCount = moduleCount;
        this.lessonCount = lessonCount;
        this.resourceCount = resourceCount;
        this.checksumSha256 = checksumSha256;
        this.message = message;
    }

    public Long getTrainingId() { return trainingId; }
    public String getTitle() { return title; }
    public TrainingStatus getStatus() { return status; }
    public ScormQuickCreateMode getModeApplied() { return modeApplied; }
    public Integer getModuleCount() { return moduleCount; }
    public Integer getLessonCount() { return lessonCount; }
    public Integer getResourceCount() { return resourceCount; }
    public String getChecksumSha256() { return checksumSha256; }
    public String getMessage() { return message; }
}
