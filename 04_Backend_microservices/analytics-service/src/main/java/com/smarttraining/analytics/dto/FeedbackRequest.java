package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.enums.DifficultyLevel;
import jakarta.validation.constraints.NotNull;

public class FeedbackRequest {

    private Long learnerId;

    @NotNull(message = "L'identifiant de la formation est obligatoire")
    private Long trainingId;

    private Long moduleId;
    private Long lessonId;
    private Long resourceId;

    private DifficultyLevel difficultyLevel;
    private Boolean needHelp;
    private String message;

    public FeedbackRequest() {
    }

    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }

    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }

    public Long getModuleId() { return moduleId; }
    public void setModuleId(Long moduleId) { this.moduleId = moduleId; }

    public Long getLessonId() { return lessonId; }
    public void setLessonId(Long lessonId) { this.lessonId = lessonId; }

    public Long getResourceId() { return resourceId; }
    public void setResourceId(Long resourceId) { this.resourceId = resourceId; }

    public DifficultyLevel getDifficultyLevel() { return difficultyLevel; }
    public void setDifficultyLevel(DifficultyLevel difficultyLevel) { this.difficultyLevel = difficultyLevel; }

    public Boolean getNeedHelp() { return needHelp; }
    public void setNeedHelp(Boolean needHelp) { this.needHelp = needHelp; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
