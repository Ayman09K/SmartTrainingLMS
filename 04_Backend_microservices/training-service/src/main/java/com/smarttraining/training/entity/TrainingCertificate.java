package com.smarttraining.training.entity;

import com.smarttraining.training.enums.CertificateStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "training_certificates",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_training_certificate_public_code",
                    columnNames = {"public_code"}
            ),
            @UniqueConstraint(
                    name = "uk_training_certificate_learner_training",
                    columnNames = {"learner_id", "training_id"}
            )
        },
        indexes = {
            @Index(
                    name = "idx_training_certificate_learner",
                    columnList = "learner_id"
            ),
            @Index(
                    name = "idx_training_certificate_training",
                    columnList = "training_id"
            )
        }
)
public class TrainingCertificate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_code", nullable = false, length = 64)
    private String publicCode;

    @Column(name = "learner_id", nullable = false)
    private Long learnerId;

    @Column(name = "training_id", nullable = false)
    private Long trainingId;

    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    @Column(name = "training_version_number")
    private Integer trainingVersionNumber;

    @Column(
            name = "learner_display_name_snapshot",
            nullable = false,
            length = 250
    )
    private String learnerDisplayNameSnapshot;

    @Column(
            name = "training_title_snapshot",
            nullable = false,
            length = 250
    )
    private String trainingTitleSnapshot;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CertificateStatus status = CertificateStatus.ACTIVE;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public TrainingCertificate() {
    }

    @PrePersist
    public void beforeCreate() {
        LocalDateTime now = LocalDateTime.now();

        if (issuedAt == null) {
            issuedAt = now;
        }

        if (createdAt == null) {
            createdAt = now;
        }

        if (status == null) {
            status = CertificateStatus.ACTIVE;
        }
    }

    public Long getId() {
        return id;
    }

    public String getPublicCode() {
        return publicCode;
    }

    public void setPublicCode(String publicCode) {
        this.publicCode = publicCode;
    }

    public Long getLearnerId() {
        return learnerId;
    }

    public void setLearnerId(Long learnerId) {
        this.learnerId = learnerId;
    }

    public Long getTrainingId() {
        return trainingId;
    }

    public void setTrainingId(Long trainingId) {
        this.trainingId = trainingId;
    }

    public Long getEnrollmentId() {
        return enrollmentId;
    }

    public void setEnrollmentId(Long enrollmentId) {
        this.enrollmentId = enrollmentId;
    }

    public Integer getTrainingVersionNumber() {
        return trainingVersionNumber;
    }

    public void setTrainingVersionNumber(Integer trainingVersionNumber) {
        this.trainingVersionNumber = trainingVersionNumber;
    }

    public String getLearnerDisplayNameSnapshot() {
        return learnerDisplayNameSnapshot;
    }

    public void setLearnerDisplayNameSnapshot(
            String learnerDisplayNameSnapshot
    ) {
        this.learnerDisplayNameSnapshot =
                learnerDisplayNameSnapshot;
    }

    public String getTrainingTitleSnapshot() {
        return trainingTitleSnapshot;
    }

    public void setTrainingTitleSnapshot(
            String trainingTitleSnapshot
    ) {
        this.trainingTitleSnapshot = trainingTitleSnapshot;
    }

    public LocalDateTime getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(LocalDateTime issuedAt) {
        this.issuedAt = issuedAt;
    }

    public LocalDateTime getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(LocalDateTime revokedAt) {
        this.revokedAt = revokedAt;
    }

    public CertificateStatus getStatus() {
        return status;
    }

    public void setStatus(CertificateStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}