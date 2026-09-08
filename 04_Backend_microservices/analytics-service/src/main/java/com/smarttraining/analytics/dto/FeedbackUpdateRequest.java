package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.enums.DifficultyLevel;

public class FeedbackUpdateRequest {

    private DifficultyLevel difficultyLevel;
    private Boolean needHelp;
    private String message;

    public FeedbackUpdateRequest() {
    }

    public DifficultyLevel getDifficultyLevel() {
        return difficultyLevel;
    }

    public void setDifficultyLevel(DifficultyLevel difficultyLevel) {
        this.difficultyLevel = difficultyLevel;
    }

    public Boolean getNeedHelp() {
        return needHelp;
    }

    public void setNeedHelp(Boolean needHelp) {
        this.needHelp = needHelp;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
