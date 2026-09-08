package com.smarttraining.analytics.entity;

import com.smarttraining.analytics.enums.LearnerNotificationType;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "learner_notifications",
    indexes = {
        @Index(name = "idx_learner_notification_learner", columnList = "learner_id"),
        @Index(name = "idx_learner_notification_created", columnList = "created_at"),
        @Index(name = "idx_learner_notification_read", columnList = "read_at"),
        @Index(name = "idx_learner_notification_session", columnList = "support_session_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_learner_notification_event_key",
            columnNames = {"event_key"}
        )
    }
)
public class LearnerNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Generic recipient for LP6.
     * The historical DB column learner_id is intentionally preserved.
     */
    @Column(name = "learner_id", nullable = false)
    private Long userId;

    @Column(name = "support_session_id")
    private Long supportSessionId;

    @Column(name = "training_id")
    private Long trainingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false, length = 50)
    private LearnerNotificationType notificationType;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "message", nullable = false, length = 1500)
    private String message;

    @Column(name = "action_url", nullable = false, length = 500)
    private String actionUrl;

    @Column(name = "event_key", length = 220)
    private String eventKey;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    public LearnerNotification() {
    }

    public LearnerNotification(
            Long userId,
            Long supportSessionId,
            Long trainingId,
            LearnerNotificationType notificationType,
            String title,
            String message,
            String actionUrl,
            String eventKey
    ) {
        this.userId = userId;
        this.supportSessionId = supportSessionId;
        this.trainingId = trainingId;
        this.notificationType = notificationType;
        this.title = title;
        this.message = message;
        this.actionUrl = actionUrl;
        this.eventKey = eventKey;
    }

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public void markRead() {
        if (readAt == null) {
            readAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }

    // Compatibility accessor for the historical learner notification code.
    public Long getLearnerId() { return userId; }

    public Long getSupportSessionId() { return supportSessionId; }
    public Long getTrainingId() { return trainingId; }
    public LearnerNotificationType getNotificationType() { return notificationType; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public String getActionUrl() { return actionUrl; }
    public String getEventKey() { return eventKey; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getReadAt() { return readAt; }
    public boolean isRead() { return readAt != null; }
}
