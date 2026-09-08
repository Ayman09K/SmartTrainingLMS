package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.enums.LearnerNotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class InternalNotificationCreateRequest {

    @NotNull
    @Positive
    private Long userId;

    @Positive
    private Long trainingId;

    @Positive
    private Long supportSessionId;

    @NotNull
    private LearnerNotificationType notificationType;

    @NotBlank
    @Size(max = 200)
    private String title;

    @NotBlank
    @Size(max = 1500)
    private String message;

    @NotBlank
    @Size(max = 500)
    private String actionUrl;

    @NotBlank
    @Size(max = 220)
    private String eventKey;

    public InternalNotificationCreateRequest() {
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }

    public Long getSupportSessionId() { return supportSessionId; }
    public void setSupportSessionId(Long supportSessionId) {
        this.supportSessionId = supportSessionId;
    }

    public LearnerNotificationType getNotificationType() {
        return notificationType;
    }
    public void setNotificationType(
            LearnerNotificationType notificationType
    ) {
        this.notificationType = notificationType;
    }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getActionUrl() { return actionUrl; }
    public void setActionUrl(String actionUrl) { this.actionUrl = actionUrl; }

    public String getEventKey() { return eventKey; }
    public void setEventKey(String eventKey) { this.eventKey = eventKey; }
}
