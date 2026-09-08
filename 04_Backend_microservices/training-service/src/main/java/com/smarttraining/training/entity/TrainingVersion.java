package com.smarttraining.training.entity;

import com.smarttraining.training.enums.TrainingVersionStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "training_versions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_training_versions_number",
                columnNames = {"training_id", "version_number"}
        )
)
public class TrainingVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "training_id", nullable = false)
    private Training training;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TrainingVersionStatus status;

    @Lob
    @Column(name = "snapshot_json", nullable = false, columnDefinition = "LONGTEXT")
    private String snapshotJson;

    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    @Column(name = "published_by")
    private Long publishedBy;

    @Column(name = "published_at", nullable = false)
    private LocalDateTime publishedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public TrainingVersion() {
    }

    public TrainingVersion(
            Training training,
            Integer versionNumber,
            TrainingVersionStatus status,
            String snapshotJson,
            String contentHash,
            Long publishedBy
    ) {
        this.training = training;
        this.versionNumber = versionNumber;
        this.status = status;
        this.snapshotJson = snapshotJson;
        this.contentHash = contentHash;
        this.publishedBy = publishedBy;
        this.publishedAt = LocalDateTime.now();
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    public void beforeCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (publishedAt == null) {
            publishedAt = now;
        }
        if (createdAt == null) {
            createdAt = now;
        }
    }

    public void markSuperseded() {
        if (status == TrainingVersionStatus.PUBLISHED) {
            status = TrainingVersionStatus.SUPERSEDED;
        }
    }

    public void markArchived() {
        if (status == TrainingVersionStatus.PUBLISHED) {
            status = TrainingVersionStatus.ARCHIVED;
        }
    }

    public Long getId() { return id; }
    public Training getTraining() { return training; }
    public Integer getVersionNumber() { return versionNumber; }
    public TrainingVersionStatus getStatus() { return status; }
    public String getSnapshotJson() { return snapshotJson; }
    public String getContentHash() { return contentHash; }
    public Long getPublishedBy() { return publishedBy; }
    public LocalDateTime getPublishedAt() { return publishedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
