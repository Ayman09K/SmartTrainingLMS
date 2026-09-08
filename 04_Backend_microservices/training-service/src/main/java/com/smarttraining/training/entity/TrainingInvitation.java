package com.smarttraining.training.entity;

import com.smarttraining.training.enums.TrainingInvitationStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "training_invitations")
public class TrainingInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long learnerId;

    @Column(length = 180)
    private String learnerEmail;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "training_id", nullable = false)
    private Training training;

    @Column(nullable = false)
    private Long invitedBy;

    @Column(nullable = false, unique = true, length = 120)
    private String token;

    @Column(length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TrainingInvitationStatus status = TrainingInvitationStatus.PENDING;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime expiresAt;

    private LocalDateTime respondedAt;

    private Long enrollmentId;

    public TrainingInvitation() {
    }

    @PrePersist
    public void beforeCreate() {
        if (status == null) {
            status = TrainingInvitationStatus.PENDING;
        }

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(LocalDateTime.now());
    }

    public void accept(Long learnerId, Long enrollmentId) {
        this.learnerId = learnerId;
        this.enrollmentId = enrollmentId;
        this.status = TrainingInvitationStatus.ACCEPTED;
        this.respondedAt = LocalDateTime.now();
    }

    public void decline() {
        this.status = TrainingInvitationStatus.DECLINED;
        this.respondedAt = LocalDateTime.now();
    }

    public void cancel() {
        this.status = TrainingInvitationStatus.CANCELLED;
        this.respondedAt = LocalDateTime.now();
    }

    public void expire() {
        this.status = TrainingInvitationStatus.EXPIRED;
        this.respondedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }

    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }

    public String getLearnerEmail() { return learnerEmail; }
    public void setLearnerEmail(String learnerEmail) { this.learnerEmail = learnerEmail; }

    public Training getTraining() { return training; }
    public void setTraining(Training training) { this.training = training; }

    public Long getInvitedBy() { return invitedBy; }
    public void setInvitedBy(Long invitedBy) { this.invitedBy = invitedBy; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public TrainingInvitationStatus getStatus() { return status; }
    public void setStatus(TrainingInvitationStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public LocalDateTime getRespondedAt() { return respondedAt; }

    public Long getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(Long enrollmentId) { this.enrollmentId = enrollmentId; }
}
