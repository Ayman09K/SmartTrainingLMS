package com.smarttraining.analytics.entity;

import com.smarttraining.analytics.enums.SupportSessionStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "support_sessions",
    indexes = {
        @Index(name = "idx_support_session_learner", columnList = "learner_id"),
        @Index(name = "idx_support_session_trainer", columnList = "trainer_id"),
        @Index(name = "idx_support_session_training", columnList = "training_id"),
        @Index(name = "idx_support_session_scheduled", columnList = "scheduled_at")
    }
)
public class SupportSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "learner_id", nullable = false)
    private Long learnerId;

    @Column(name = "trainer_id", nullable = false)
    private Long trainerId;

    @Column(name = "training_id", nullable = false)
    private Long trainingId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "objective", nullable = false, length = 1500)
    private String objective;

    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    @Column(name = "meeting_link", nullable = false, length = 1000)
    private String meetingLink;

    @Column(name = "note", length = 2000)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private SupportSessionStatus status = SupportSessionStatus.SCHEDULED;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    public SupportSession() {
    }

    public SupportSession(
            Long learnerId,
            Long trainerId,
            Long trainingId,
            String title,
            String objective,
            LocalDateTime scheduledAt,
            String meetingLink,
            String note
    ) {
        this.learnerId = learnerId;
        this.trainerId = trainerId;
        this.trainingId = trainingId;
        this.title = title;
        this.objective = objective;
        this.scheduledAt = scheduledAt;
        this.meetingLink = meetingLink;
        this.note = note;
        this.status = SupportSessionStatus.SCHEDULED;
    }

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (status == null) {
            status = SupportSessionStatus.SCHEDULED;
        }
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void updateSchedule(
            Long learnerId,
            Long trainingId,
            String title,
            String objective,
            LocalDateTime scheduledAt,
            String meetingLink,
            String note
    ) {
        requireScheduled();
        this.learnerId = learnerId;
        this.trainingId = trainingId;
        this.title = title;
        this.objective = objective;
        this.scheduledAt = scheduledAt;
        this.meetingLink = meetingLink;
        this.note = note;
    }

    public void markCompleted() {
        requireScheduled();
        status = SupportSessionStatus.COMPLETED;
        closedAt = LocalDateTime.now();
    }

    public void markCancelled() {
        requireScheduled();
        status = SupportSessionStatus.CANCELLED;
        closedAt = LocalDateTime.now();
    }

    private void requireScheduled() {
        if (status != SupportSessionStatus.SCHEDULED) {
            throw new IllegalArgumentException(
                "Seule une seance planifiee peut encore etre modifiee."
            );
        }
    }

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public Long getTrainerId() { return trainerId; }
    public Long getTrainingId() { return trainingId; }
    public String getTitle() { return title; }
    public String getObjective() { return objective; }
    public LocalDateTime getScheduledAt() { return scheduledAt; }
    public String getMeetingLink() { return meetingLink; }
    public String getNote() { return note; }
    public SupportSessionStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getClosedAt() { return closedAt; }
}
