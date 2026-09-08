package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.enums.DataStatus;

public class LearnerAiRiskResponse {

    private final Long learnerId;
    private final Long trainingId;
    private final Integer prediction;
    private final String riskLabel;
    private final Double riskProbability;
    private final String riskLevel;
    private final DataStatus dataStatus;
    private final String modelName;
    private final String modelVersion;
    private final String explanation;
    private final Double progressPercentage;
    private final Double averageScore;
    private final Integer totalEvents;
    private final Integer daysSinceLastActivity;

    public LearnerAiRiskResponse(
            Long learnerId,
            Long trainingId,
            Integer prediction,
            String riskLabel,
            Double riskProbability,
            String riskLevel,
            DataStatus dataStatus,
            String modelName,
            String modelVersion,
            String explanation,
            Double progressPercentage,
            Double averageScore,
            Integer totalEvents,
            Integer daysSinceLastActivity
    ) {
        this.learnerId = learnerId;
        this.trainingId = trainingId;
        this.prediction = prediction;
        this.riskLabel = riskLabel;
        this.riskProbability = riskProbability;
        this.riskLevel = riskLevel;
        this.dataStatus = dataStatus;
        this.modelName = modelName;
        this.modelVersion = modelVersion;
        this.explanation = explanation;
        this.progressPercentage = progressPercentage;
        this.averageScore = averageScore;
        this.totalEvents = totalEvents;
        this.daysSinceLastActivity = daysSinceLastActivity;
    }

    public Long getLearnerId() { return learnerId; }
    public Long getTrainingId() { return trainingId; }
    public Integer getPrediction() { return prediction; }
    public String getRiskLabel() { return riskLabel; }
    public Double getRiskProbability() { return riskProbability; }
    public String getRiskLevel() { return riskLevel; }
    public DataStatus getDataStatus() { return dataStatus; }
    public String getModelName() { return modelName; }
    public String getModelVersion() { return modelVersion; }
    public String getExplanation() { return explanation; }
    public Double getProgressPercentage() { return progressPercentage; }
    public Double getAverageScore() { return averageScore; }
    public Integer getTotalEvents() { return totalEvents; }
    public Integer getDaysSinceLastActivity() { return daysSinceLastActivity; }
}
