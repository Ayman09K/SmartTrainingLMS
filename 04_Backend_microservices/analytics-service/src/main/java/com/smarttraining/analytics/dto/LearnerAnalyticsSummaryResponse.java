package com.smarttraining.analytics.dto;

public class LearnerAnalyticsSummaryResponse {
    private Long learnerId;
    private Integer totalEvents;
    private Integer totalTrainingsStarted;
    private Integer totalTrainingsCompleted;
    private Integer averageProgress;
    private Integer averageScore;
    private Integer atRiskTrainings;

    public LearnerAnalyticsSummaryResponse() {}
    public LearnerAnalyticsSummaryResponse(Long learnerId, Integer totalEvents, Integer totalTrainingsStarted,
            Integer totalTrainingsCompleted, Integer averageProgress, Integer averageScore, Integer atRiskTrainings) {
        this.learnerId = learnerId; this.totalEvents = totalEvents;
        this.totalTrainingsStarted = totalTrainingsStarted; this.totalTrainingsCompleted = totalTrainingsCompleted;
        this.averageProgress = averageProgress; this.averageScore = averageScore; this.atRiskTrainings = atRiskTrainings;
    }
    public Long getLearnerId() { return learnerId; }
    public Integer getTotalEvents() { return totalEvents; }
    public Integer getTotalTrainingsStarted() { return totalTrainingsStarted; }
    public Integer getTotalTrainingsCompleted() { return totalTrainingsCompleted; }
    public Integer getAverageProgress() { return averageProgress; }
    public Integer getAverageScore() { return averageScore; }
    public Integer getAtRiskTrainings() { return atRiskTrainings; }
}
