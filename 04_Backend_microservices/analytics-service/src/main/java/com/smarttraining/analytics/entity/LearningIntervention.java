package com.smarttraining.analytics.entity;

import com.smarttraining.analytics.enums.ActionSource;
import com.smarttraining.analytics.enums.InterventionStatus;
import com.smarttraining.analytics.enums.InterventionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "learning_interventions")
public class LearningIntervention {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "learner_id", nullable = false)
    private Long learnerId;

    @Column(name = "trainer_id", nullable = false)
    private Long trainerId;

    @Column(name = "training_id", nullable = false)
    private Long trainingId;

    @Enumerated(EnumType.STRING)
    @Column(name = "intervention_type", nullable = false, length = 50)
    private InterventionType interventionType;

    @Column(name = "note", nullable = false, length = 1500)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 30)
    private ActionSource source;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private InterventionStatus status = InterventionStatus.PLANNED;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) {
            status = InterventionStatus.PLANNED;
        }
    }

    public LearningIntervention() {
    }

    public LearningIntervention(Long learnerId, Long trainerId, Long trainingId,
            InterventionType interventionType, String note, ActionSource source) {
        this.learnerId = learnerId;
        this.trainerId = trainerId;
        this.trainingId = trainingId;
        this.interventionType = interventionType;
        this.note = note;
        this.source = source;
        this.status = InterventionStatus.PLANNED;
    }

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }
    public Long getTrainerId() { return trainerId; }
    public void setTrainerId(Long trainerId) { this.trainerId = trainerId; }
    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }
    public InterventionType getInterventionType() { return interventionType; }
    public void setInterventionType(InterventionType interventionType) { this.interventionType = interventionType; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public ActionSource getSource() { return source; }
    public void setSource(ActionSource source) { this.source = source; }
    public InterventionStatus getStatus() { return status; }
    public void setStatus(InterventionStatus status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getClosedAt() { return closedAt; }

    public void markDone() {
        this.status = InterventionStatus.DONE;
        this.closedAt = LocalDateTime.now();
    }

    public void markCancelled() {
        this.status = InterventionStatus.CANCELLED;
        this.closedAt = LocalDateTime.now();
    }
}
