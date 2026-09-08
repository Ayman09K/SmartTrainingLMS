package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.entity.SupportSession;
import com.smarttraining.analytics.enums.SupportSessionStatus;
import java.time.LocalDateTime;

public class SupportSessionResponse {

    private Long id;
    private Long learnerId;
    private Long trainerId;
    private Long trainingId;
    private String title;
    private String objective;
    private LocalDateTime scheduledAt;
    private String meetingLink;
    private String note;
    private SupportSessionStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime closedAt;

    public SupportSessionResponse() {
    }

    public SupportSessionResponse(SupportSession session) {
        this.id = session.getId();
        this.learnerId = session.getLearnerId();
        this.trainerId = session.getTrainerId();
        this.trainingId = session.getTrainingId();
        this.title = session.getTitle();
        this.objective = session.getObjective();
        this.scheduledAt = session.getScheduledAt();
        this.meetingLink = session.getMeetingLink();
        this.note = session.getNote();
        this.status = session.getStatus();
        this.createdAt = session.getCreatedAt();
        this.updatedAt = session.getUpdatedAt();
        this.closedAt = session.getClosedAt();
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
