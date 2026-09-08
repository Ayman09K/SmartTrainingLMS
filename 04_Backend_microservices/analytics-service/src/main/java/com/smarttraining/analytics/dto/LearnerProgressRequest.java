package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.enums.ProgressStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class LearnerProgressRequest {
    @NotNull(message = "L'identifiant de l'apprenant est obligatoire")
    @Positive(message = "L'identifiant de l'apprenant doit être positif")
    private Long learnerId;
    @NotNull(message = "L'identifiant de la formation est obligatoire")
    @Positive(message = "L'identifiant de la formation doit être positif")
    private Long trainingId;
    @NotNull(message = "Le pourcentage de progression est obligatoire")
    @Min(value = 0, message = "La progression doit être supérieure ou égale à 0")
    @Max(value = 100, message = "La progression doit être inférieure ou égale à 100")
    private Integer progressPercentage;
    private Integer completedLessons;
    private Integer totalLessons;
    private Integer completedQuizzes;
    private Integer totalQuizzes;
    private Integer averageScore;
    private ProgressStatus status;

    public LearnerProgressRequest() {}
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
}
