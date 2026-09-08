package com.smarttraining.training.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "scorm_attempts",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_scorm_attempt_number",
        columnNames = {"learner_id", "resource_id", "attempt_number"}
    )
)
public class ScormAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "learner_id", nullable = false)
    private Long learnerId;

    @Column(name = "training_id", nullable = false)
    private Long trainingId;

    @Column(name = "module_id", nullable = false)
    private Long moduleId;

    @Column(name = "lesson_id", nullable = false)
    private Long lessonId;

    @Column(name = "resource_id", nullable = false)
    private Long resourceId;

    @Column(name = "scorm_package_id", nullable = false)
    private Long scormPackageId;

    @Column(name = "attempt_number", nullable = false)
    private Integer attemptNumber;

    @Column(name = "scorm_version", nullable = false, length = 30)
    private String scormVersion;

    @Column(nullable = false, length = 30)
    private String status = "IN_PROGRESS";

    @Column(name = "lesson_status", length = 40)
    private String lessonStatus;

    @Column(name = "completion_status", length = 40)
    private String completionStatus;

    @Column(name = "success_status", length = 40)
    private String successStatus;

    @Column(length = 1000)
    private String location;

    @Lob
    @Column(name = "suspend_data", columnDefinition = "LONGTEXT")
    private String suspendData;

    @Column(name = "score_raw")
    private Double scoreRaw;

    @Column(name = "score_min")
    private Double scoreMin;

    @Column(name = "score_max")
    private Double scoreMax;

    @Column(name = "score_scaled")
    private Double scoreScaled;

    @Column(name = "progress_measure")
    private Double progressMeasure;

    @Column(name = "session_time_ms", nullable = false)
    private Long sessionTimeMs = 0L;

    @Column(name = "total_time_ms", nullable = false)
    private Long totalTimeMs = 0L;

    @Column(name = "entry_mode", length = 40)
    private String entryMode;

    @Column(name = "exit_mode", length = 40)
    private String exitMode;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt = LocalDateTime.now();

    @Column(name = "last_activity_at", nullable = false)
    private LocalDateTime lastActivityAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public ScormAttempt() {}

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (startedAt == null) startedAt = now;
        if (lastActivityAt == null) lastActivityAt = now;
        if (status == null || status.isBlank()) status = "IN_PROGRESS";
        if (sessionTimeMs == null) sessionTimeMs = 0L;
        if (totalTimeMs == null) totalTimeMs = 0L;
    }

    public boolean isTerminal() {
        return "COMPLETED".equals(status)
            || "PASSED".equals(status)
            || "FAILED".equals(status);
    }

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }
    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }
    public Long getModuleId() { return moduleId; }
    public void setModuleId(Long moduleId) { this.moduleId = moduleId; }
    public Long getLessonId() { return lessonId; }
    public void setLessonId(Long lessonId) { this.lessonId = lessonId; }
    public Long getResourceId() { return resourceId; }
    public void setResourceId(Long resourceId) { this.resourceId = resourceId; }
    public Long getScormPackageId() { return scormPackageId; }
    public void setScormPackageId(Long scormPackageId) { this.scormPackageId = scormPackageId; }
    public Integer getAttemptNumber() { return attemptNumber; }
    public void setAttemptNumber(Integer attemptNumber) { this.attemptNumber = attemptNumber; }
    public String getScormVersion() { return scormVersion; }
    public void setScormVersion(String scormVersion) { this.scormVersion = scormVersion; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getLessonStatus() { return lessonStatus; }
    public void setLessonStatus(String lessonStatus) { this.lessonStatus = lessonStatus; }
    public String getCompletionStatus() { return completionStatus; }
    public void setCompletionStatus(String completionStatus) { this.completionStatus = completionStatus; }
    public String getSuccessStatus() { return successStatus; }
    public void setSuccessStatus(String successStatus) { this.successStatus = successStatus; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getSuspendData() { return suspendData; }
    public void setSuspendData(String suspendData) { this.suspendData = suspendData; }
    public Double getScoreRaw() { return scoreRaw; }
    public void setScoreRaw(Double scoreRaw) { this.scoreRaw = scoreRaw; }
    public Double getScoreMin() { return scoreMin; }
    public void setScoreMin(Double scoreMin) { this.scoreMin = scoreMin; }
    public Double getScoreMax() { return scoreMax; }
    public void setScoreMax(Double scoreMax) { this.scoreMax = scoreMax; }
    public Double getScoreScaled() { return scoreScaled; }
    public void setScoreScaled(Double scoreScaled) { this.scoreScaled = scoreScaled; }
    public Double getProgressMeasure() { return progressMeasure; }
    public void setProgressMeasure(Double progressMeasure) { this.progressMeasure = progressMeasure; }
    public Long getSessionTimeMs() { return sessionTimeMs; }
    public void setSessionTimeMs(Long sessionTimeMs) { this.sessionTimeMs = sessionTimeMs; }
    public Long getTotalTimeMs() { return totalTimeMs; }
    public void setTotalTimeMs(Long totalTimeMs) { this.totalTimeMs = totalTimeMs; }
    public String getEntryMode() { return entryMode; }
    public void setEntryMode(String entryMode) { this.entryMode = entryMode; }
    public String getExitMode() { return exitMode; }
    public void setExitMode(String exitMode) { this.exitMode = exitMode; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
    public LocalDateTime getLastActivityAt() { return lastActivityAt; }
    public void setLastActivityAt(LocalDateTime lastActivityAt) { this.lastActivityAt = lastActivityAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}