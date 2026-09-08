package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.enums.DataStatus;
import com.smarttraining.analytics.enums.RiskLevel;
import java.util.List;

public class RiskIndicatorResponse {

    private final Long learnerId;
    private final Long trainingId;
    private final Integer riskScore;
    private final RiskLevel riskLevel;
    private final DataStatus dataStatus;
    private final Integer averageProgress;
    private final Integer averageScore;
    private final Integer totalEvents;
    private final Integer totalTrainingsStarted;
    private final Integer totalTrainingsCompleted;
    private final Integer atRiskTrainings;
    private final Integer totalFeedbacks;
    private final Integer helpRequests;
    private final List<String> riskFactors;
    private final List<String> recommendations;

    /*
     * Contrat 15L ajoute en compatibilite :
     * les anciens clients continuent d'utiliser riskFactors (List<String>).
     * Les nouvelles interfaces peuvent exploiter factors (facteurs structures).
     */
    private List<RiskFactorResponse> factors = List.of();

    public RiskIndicatorResponse(
            Long learnerId,
            Long trainingId,
            Integer riskScore,
            RiskLevel riskLevel,
            DataStatus dataStatus,
            Integer averageProgress,
            Integer averageScore,
            Integer totalEvents,
            Integer totalTrainingsStarted,
            Integer totalTrainingsCompleted,
            Integer atRiskTrainings,
            Integer totalFeedbacks,
            Integer helpRequests,
            List<String> riskFactors,
            List<String> recommendations
    ) {
        this.learnerId = learnerId;
        this.trainingId = trainingId;
        this.riskScore = riskScore;
        this.riskLevel = riskLevel;
        this.dataStatus = dataStatus;
        this.averageProgress = averageProgress;
        this.averageScore = averageScore;
        this.totalEvents = totalEvents;
        this.totalTrainingsStarted = totalTrainingsStarted;
        this.totalTrainingsCompleted = totalTrainingsCompleted;
        this.atRiskTrainings = atRiskTrainings;
        this.totalFeedbacks = totalFeedbacks;
        this.helpRequests = helpRequests;
        this.riskFactors = riskFactors;
        this.recommendations = recommendations;
    }

    public Long getLearnerId() { return learnerId; }
    public Long getTrainingId() { return trainingId; }
    public Integer getRiskScore() { return riskScore; }
    public RiskLevel getRiskLevel() { return riskLevel; }
    public DataStatus getDataStatus() { return dataStatus; }
    public Integer getAverageProgress() { return averageProgress; }
    public Integer getAverageScore() { return averageScore; }
    public Integer getTotalEvents() { return totalEvents; }
    public Integer getTotalTrainingsStarted() { return totalTrainingsStarted; }
    public Integer getTotalTrainingsCompleted() { return totalTrainingsCompleted; }
    public Integer getAtRiskTrainings() { return atRiskTrainings; }
    public Integer getTotalFeedbacks() { return totalFeedbacks; }
    public Integer getHelpRequests() { return helpRequests; }
    public List<String> getRiskFactors() { return riskFactors; }
    public List<String> getRecommendations() { return recommendations; }

    public List<RiskFactorResponse> getFactors() {
        return factors;
    }

    public void setFactors(List<RiskFactorResponse> factors) {
        this.factors = factors == null ? List.of() : List.copyOf(factors);
    }
}
