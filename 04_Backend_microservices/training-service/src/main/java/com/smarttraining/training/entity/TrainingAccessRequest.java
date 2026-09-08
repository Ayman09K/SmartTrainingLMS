package com.smarttraining.training.entity;

import com.smarttraining.training.enums.TrainingAccessRequestStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "training_access_requests")
public class TrainingAccessRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long learnerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "training_id", nullable = false)
    private Training training;

    @Column(length = 1000)
    private String learnerMessage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TrainingAccessRequestStatus status = TrainingAccessRequestStatus.PENDING;

    @Column(nullable = false)
    private LocalDateTime requestedAt = LocalDateTime.now();

    private LocalDateTime decidedAt;

    private Long decidedBy;

    @Column(length = 1000)
    private String decisionComment;

    private Long enrollmentId;

    public TrainingAccessRequest() {
    }

    @PrePersist
    public void beforeCreate() {
        if (status == null) {
            status = TrainingAccessRequestStatus.PENDING;
        }

        if (requestedAt == null) {
            requestedAt = LocalDateTime.now();
        }
    }

    public void approve(Long adminOrTrainerId, String comment, Long enrollmentId) {
        this.status = TrainingAccessRequestStatus.APPROVED;
        this.decidedBy = adminOrTrainerId;
        this.decisionComment = comment;
        this.decidedAt = LocalDateTime.now();
        this.enrollmentId = enrollmentId;
    }

    public void reject(Long adminOrTrainerId, String comment) {
        this.status = TrainingAccessRequestStatus.REJECTED;
        this.decidedBy = adminOrTrainerId;
        this.decisionComment = comment;
        this.decidedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }

    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }

    public Training getTraining() { return training; }
    public void setTraining(Training training) { this.training = training; }

    public String getLearnerMessage() { return learnerMessage; }
    public void setLearnerMessage(String learnerMessage) { this.learnerMessage = learnerMessage; }

    public TrainingAccessRequestStatus getStatus() { return status; }
    public void setStatus(TrainingAccessRequestStatus status) { this.status = status; }

    public LocalDateTime getRequestedAt() { return requestedAt; }

    public LocalDateTime getDecidedAt() { return decidedAt; }

    public Long getDecidedBy() { return decidedBy; }
    public void setDecidedBy(Long decidedBy) { this.decidedBy = decidedBy; }

    public String getDecisionComment() { return decisionComment; }
    public void setDecisionComment(String decisionComment) { this.decisionComment = decisionComment; }

    public Long getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(Long enrollmentId) { this.enrollmentId = enrollmentId; }
}
