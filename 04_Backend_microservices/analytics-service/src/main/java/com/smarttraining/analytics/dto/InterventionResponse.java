package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.entity.LearningIntervention;
import com.smarttraining.analytics.enums.ActionSource;
import com.smarttraining.analytics.enums.InterventionStatus;
import com.smarttraining.analytics.enums.InterventionType;
import java.time.LocalDateTime;

public class InterventionResponse {
    private Long id;
    private Long learnerId;
    private Long trainerId;
    private Long trainingId;
    private InterventionType interventionType;
    private String note;
    private ActionSource source;
    private InterventionStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime closedAt;

    public InterventionResponse() {
    }

    public InterventionResponse(LearningIntervention intervention) {
        this.id = intervention.getId();
        this.learnerId = intervention.getLearnerId();
        this.trainerId = intervention.getTrainerId();
        this.trainingId = intervention.getTrainingId();
        this.interventionType = intervention.getInterventionType();
        this.note = intervention.getNote();
        this.source = intervention.getSource();
        this.status = intervention.getStatus();
        this.createdAt = intervention.getCreatedAt();
        this.closedAt = intervention.getClosedAt();
    }

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public Long getTrainerId() { return trainerId; }
    public Long getTrainingId() { return trainingId; }
    public InterventionType getInterventionType() { return interventionType; }
    public String getNote() { return note; }
    public ActionSource getSource() { return source; }
    public InterventionStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getClosedAt() { return closedAt; }
}
