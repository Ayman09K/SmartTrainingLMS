package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.entity.LearnerNotification;
import com.smarttraining.analytics.enums.LearnerNotificationType;
import java.time.LocalDateTime;

public class LearnerNotificationResponse {

    private final Long id;
    private final Long userId;
    private final Long learnerId;
    private final Long supportSessionId;
    private final Long trainingId;
    private final LearnerNotificationType notificationType;
    private final String title;
    private final String message;
    private final String actionUrl;
    private final String eventKey;
    private final LocalDateTime createdAt;
    private final LocalDateTime readAt;
    private final boolean read;

    public LearnerNotificationResponse(LearnerNotification notification) {
        this.id = notification.getId();
        this.userId = notification.getUserId();
        this.learnerId = notification.getUserId();
        this.supportSessionId = notification.getSupportSessionId();
        this.trainingId = notification.getTrainingId();
        this.notificationType = notification.getNotificationType();
        this.title = notification.getTitle();
        this.message = notification.getMessage();
        this.actionUrl = notification.getActionUrl();
        this.eventKey = notification.getEventKey();
        this.createdAt = notification.getCreatedAt();
        this.readAt = notification.getReadAt();
        this.read = notification.isRead();
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Long getLearnerId() { return learnerId; }
    public Long getSupportSessionId() { return supportSessionId; }
    public Long getTrainingId() { return trainingId; }
    public LearnerNotificationType getNotificationType() { return notificationType; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public String getActionUrl() { return actionUrl; }
    public String getEventKey() { return eventKey; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getReadAt() { return readAt; }
    public boolean isRead() { return read; }
}