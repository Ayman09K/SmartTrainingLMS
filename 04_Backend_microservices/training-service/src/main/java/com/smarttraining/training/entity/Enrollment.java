package com.smarttraining.training.entity;

import com.smarttraining.training.enums.EnrollmentSource;
import com.smarttraining.training.enums.EnrollmentStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "enrollments",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_enrollment_learner_training", columnNames = {"learner_id", "training_id"})
    }
)
public class Enrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Identifiant apprenant venant de auth-service.
    // Pas de relation JPA directe avec User.
    @Column(name = "learner_id", nullable = false)
    private Long learnerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "training_id", nullable = false)
    private Training training;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EnrollmentStatus status = EnrollmentStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private EnrollmentSource source = EnrollmentSource.ADMIN_ASSIGNMENT;

    private Long assignedBy;

    @Column(length = 100)
    private String accessCodeUsed;

    @Column(length = 150)
    private String invitationToken;

    private Double progressPercentage = 0.0;

    @Column(nullable = false)
    private LocalDateTime enrolledAt = LocalDateTime.now();

    private LocalDateTime completedAt;

    private LocalDateTime cancelledAt;

    @Column(name = "due_at")
    private LocalDateTime dueAt;

    public Enrollment() {
    }

    public Enrollment(Long learnerId, Training training) {
        this.learnerId = learnerId;
        this.training = training;
        this.status = EnrollmentStatus.ACTIVE;
        this.source = EnrollmentSource.ADMIN_ASSIGNMENT;
        this.progressPercentage = 0.0;
        this.enrolledAt = LocalDateTime.now();
    }

    public Enrollment(Long learnerId, Training training, EnrollmentSource source) {
        this.learnerId = learnerId;
        this.training = training;
        this.status = EnrollmentStatus.ACTIVE;
        this.source = source == null ? EnrollmentSource.ADMIN_ASSIGNMENT : source;
        this.progressPercentage = 0.0;
        this.enrolledAt = LocalDateTime.now();
    }

    @PrePersist
    public void beforeCreate() {
        if (status == null) {
            status = EnrollmentStatus.ACTIVE;
        }

        if (source == null) {
            source = EnrollmentSource.ADMIN_ASSIGNMENT;
        }

        if (progressPercentage == null) {
            progressPercentage = 0.0;
        }

        if (enrolledAt == null) {
            enrolledAt = LocalDateTime.now();
        }
    }

    public void complete() {
        this.status = EnrollmentStatus.COMPLETED;
        this.progressPercentage = 100.0;
        this.completedAt = LocalDateTime.now();
    }

    public void cancel() {
        this.status = EnrollmentStatus.CANCELLED;
        this.cancelledAt = LocalDateTime.now();
    }

    public void reactivate() {
        boolean alreadyCompleted = completedAt != null
                || (progressPercentage != null && progressPercentage >= 100.0);

        this.status = alreadyCompleted
                ? EnrollmentStatus.COMPLETED
                : EnrollmentStatus.ACTIVE;
        this.cancelledAt = null;
    }

    public Long getId() { return id; }

    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }

    public Training getTraining() { return training; }
    public void setTraining(Training training) { this.training = training; }

    public EnrollmentStatus getStatus() { return status; }
    public void setStatus(EnrollmentStatus status) { this.status = status; }

    public EnrollmentSource getSource() { return source; }
    public void setSource(EnrollmentSource source) { this.source = source; }

    public Long getAssignedBy() { return assignedBy; }
    public void setAssignedBy(Long assignedBy) { this.assignedBy = assignedBy; }

    public String getAccessCodeUsed() { return accessCodeUsed; }
    public void setAccessCodeUsed(String accessCodeUsed) { this.accessCodeUsed = accessCodeUsed; }

    public String getInvitationToken() { return invitationToken; }
    public void setInvitationToken(String invitationToken) { this.invitationToken = invitationToken; }

    public Double getProgressPercentage() { return progressPercentage; }
    public void setProgressPercentage(Double progressPercentage) { this.progressPercentage = progressPercentage; }

    public LocalDateTime getEnrolledAt() { return enrolledAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public LocalDateTime getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(LocalDateTime cancelledAt) { this.cancelledAt = cancelledAt; }

    public LocalDateTime getDueAt() { return dueAt; }
    public void setDueAt(LocalDateTime dueAt) { this.dueAt = dueAt; }
}
