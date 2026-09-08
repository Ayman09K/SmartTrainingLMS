package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.entity.LearnerProgress;
import com.smarttraining.analytics.enums.ProgressStatus;
import java.time.LocalDateTime;

public class LearnerProgressResponse {
    private Long id;
    private Long learnerId;
    private Long trainingId;
    private Integer progressPercentage;
    private Integer completedLessons;
    private Integer totalLessons;
    private Integer completedQuizzes;
    private Integer totalQuizzes;
    private Integer averageScore;
    private ProgressStatus status;
    private LocalDateTime firstActivityAt;
    private LocalDateTime lastActivityAt;
    private LocalDateTime completedAt;

    public LearnerProgressResponse() {}
    public LearnerProgressResponse(LearnerProgress progress) {
        id = progress.getId(); learnerId = progress.getLearnerId(); trainingId = progress.getTrainingId();
        progressPercentage = progress.getProgressPercentage(); completedLessons = progress.getCompletedLessons();
        totalLessons = progress.getTotalLessons(); completedQuizzes = progress.getCompletedQuizzes();
        totalQuizzes = progress.getTotalQuizzes(); averageScore = progress.getAverageScore();
        status = progress.getStatus(); firstActivityAt = progress.getFirstActivityAt();
        lastActivityAt = progress.getLastActivityAt(); completedAt = progress.getCompletedAt();
    }
    public Long getId() { return id; }
    public Long getLearnerId() { return learnerId; }
    public Long getTrainingId() { return trainingId; }
    public Integer getProgressPercentage() { return progressPercentage; }
    public Integer getCompletedLessons() { return completedLessons; }
    public Integer getTotalLessons() { return totalLessons; }
    public Integer getCompletedQuizzes() { return completedQuizzes; }
    public Integer getTotalQuizzes() { return totalQuizzes; }
    public Integer getAverageScore() { return averageScore; }
    public ProgressStatus getStatus() { return status; }
    public LocalDateTime getFirstActivityAt() { return firstActivityAt; }
    public LocalDateTime getLastActivityAt() { return lastActivityAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
}
