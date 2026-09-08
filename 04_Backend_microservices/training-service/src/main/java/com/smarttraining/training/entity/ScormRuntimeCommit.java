package com.smarttraining.training.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "scorm_runtime_commits",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_scorm_commit_client_id",
        columnNames = "client_commit_id"
    )
)
public class ScormRuntimeCommit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "attempt_id", nullable = false)
    private Long attemptId;

    @Column(name = "client_commit_id", nullable = false, length = 160)
    private String clientCommitId;

    @Column(nullable = false)
    private Boolean finished = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public ScormRuntimeCommit() {}

    public Long getId() { return id; }
    public Long getAttemptId() { return attemptId; }
    public void setAttemptId(Long attemptId) { this.attemptId = attemptId; }
    public String getClientCommitId() { return clientCommitId; }
    public void setClientCommitId(String clientCommitId) { this.clientCommitId = clientCommitId; }
    public Boolean getFinished() { return finished; }
    public void setFinished(Boolean finished) { this.finished = finished; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}