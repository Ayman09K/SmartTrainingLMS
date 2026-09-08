package com.smarttraining.analytics.entity;

import com.smarttraining.analytics.enums.ProgressStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(name = "learner_progress", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"learnerId", "trainingId"})
})
public class LearnerProgress {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long learnerId;
    private Long trainingId;
    private Integer progressPercentage = 0;
    private Integer completedLessons = 0;
    private Integer totalLessons = 0;
    private Integer completedQuizzes = 0;
    private Integer totalQuizzes = 0;
    private Integer averageScore = 0;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProgressStatus status = ProgressStatus.NOT_STARTED;
    private LocalDateTime firstActivityAt;
    private LocalDateTime lastActivityAt;
    private LocalDateTime completedAt;

    public LearnerProgress() {}

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (firstActivityAt == null) { firstActivityAt = now; }
        if (lastActivityAt == null) { lastActivityAt = now; }
        if (status == null) { status = ProgressStatus.NOT_STARTED; }
    }

    @PreUpdate
    public void onUpdate() { lastActivityAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }
    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }
    public Integer getProgressPercentage() { return progressPercentage; }
    public void setProgressPercentage(Integer progressPercentage) { this.progressPercentage = progressPercentage; }
    public Integer getCompletedLessons() { return completedLessons; }
    public void setCompletedLessons(Integer completedLessons) { this.completedLessons = completedLessons; }
    public Integer getTotalLessons() { return totalLessons; }
    public void setTotalLessons(Integer totalLessons) { this.totalLessons = totalLessons; }
    public Integer getCompletedQuizzes() { return completedQuizzes; }
    public void setCompletedQuizzes(Integer completedQuizzes) { this.completedQuizzes = completedQuizzes; }
    public Integer getTotalQuizzes() { return totalQuizzes; }
    public void setTotalQuizzes(Integer totalQuizzes) { this.totalQuizzes = totalQuizzes; }
    public Integer getAverageScore() { return averageScore; }
    public void setAverageScore(Integer averageScore) { this.averageScore = averageScore; }
    public ProgressStatus getStatus() { return status; }
    public void setStatus(ProgressStatus status) { this.status = status; }
    public LocalDateTime getFirstActivityAt() { return firstActivityAt; }
    public void setFirstActivityAt(LocalDateTime firstActivityAt) { this.firstActivityAt = firstActivityAt; }
    public LocalDateTime getLastActivityAt() { return lastActivityAt; }
    public void setLastActivityAt(LocalDateTime lastActivityAt) { this.lastActivityAt = lastActivityAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
