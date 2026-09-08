package com.smarttraining.analytics.dto;

public class AiRiskPredictionRequest {
    private Long learnerId;
    private Long trainingId;
    private Double progressPercentage;
    private Double averageScore;
    private Integer completedLessons;
    private Integer totalLessons;
    private Integer completedQuizzes;
    private Integer totalQuizzes;
    private Integer totalEvents;
    private Integer totalTrainingsStarted;
    private Integer totalTrainingsCompleted;
    private Double lessonCompletionRate;
    private Double quizCompletionRate;
    private Double scoreRatio;
    private Integer daysSinceLastActivity;
    private Double avgEventsPerTraining;

    public Long getLearnerId() { return learnerId; }
    public void setLearnerId(Long learnerId) { this.learnerId = learnerId; }
    public Long getTrainingId() { return trainingId; }
    public void setTrainingId(Long trainingId) { this.trainingId = trainingId; }
    public Double getProgressPercentage() { return progressPercentage; }
    public void setProgressPercentage(Double progressPercentage) { this.progressPercentage = progressPercentage; }
    public Double getAverageScore() { return averageScore; }
    public void setAverageScore(Double averageScore) { this.averageScore = averageScore; }
    public Integer getCompletedLessons() { return completedLessons; }
    public void setCompletedLessons(Integer completedLessons) { this.completedLessons = completedLessons; }
    public Integer getTotalLessons() { return totalLessons; }
    public void setTotalLessons(Integer totalLessons) { this.totalLessons = totalLessons; }
    public Integer getCompletedQuizzes() { return completedQuizzes; }
    public void setCompletedQuizzes(Integer completedQuizzes) { this.completedQuizzes = completedQuizzes; }
    public Integer getTotalQuizzes() { return totalQuizzes; }
    public void setTotalQuizzes(Integer totalQuizzes) { this.totalQuizzes = totalQuizzes; }
    public Integer getTotalEvents() { return totalEvents; }
    public void setTotalEvents(Integer totalEvents) { this.totalEvents = totalEvents; }
    public Integer getTotalTrainingsStarted() { return totalTrainingsStarted; }
    public void setTotalTrainingsStarted(Integer totalTrainingsStarted) { this.totalTrainingsStarted = totalTrainingsStarted; }
    public Integer getTotalTrainingsCompleted() { return totalTrainingsCompleted; }
    public void setTotalTrainingsCompleted(Integer totalTrainingsCompleted) { this.totalTrainingsCompleted = totalTrainingsCompleted; }
    public Double getLessonCompletionRate() { return lessonCompletionRate; }
    public void setLessonCompletionRate(Double lessonCompletionRate) { this.lessonCompletionRate = lessonCompletionRate; }
    public Double getQuizCompletionRate() { return quizCompletionRate; }
    public void setQuizCompletionRate(Double quizCompletionRate) { this.quizCompletionRate = quizCompletionRate; }
    public Double getScoreRatio() { return scoreRatio; }
    public void setScoreRatio(Double scoreRatio) { this.scoreRatio = scoreRatio; }
    public Integer getDaysSinceLastActivity() { return daysSinceLastActivity; }
    public void setDaysSinceLastActivity(Integer daysSinceLastActivity) { this.daysSinceLastActivity = daysSinceLastActivity; }
    public Double getAvgEventsPerTraining() { return avgEventsPerTraining; }
    public void setAvgEventsPerTraining(Double avgEventsPerTraining) { this.avgEventsPerTraining = avgEventsPerTraining; }
}
