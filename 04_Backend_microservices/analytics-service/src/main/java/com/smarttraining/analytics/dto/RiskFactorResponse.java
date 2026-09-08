package com.smarttraining.analytics.dto;

import com.smarttraining.analytics.enums.RiskFactorType;

public class RiskFactorResponse {

    private RiskFactorType type;
    private String label;
    private String explanation;
    private Integer impact;

    public RiskFactorResponse() {
    }

    public RiskFactorResponse(
            RiskFactorType type,
            String label,
            String explanation,
            Integer impact
    ) {
        this.type = type;
        this.label = label;
        this.explanation = explanation;
        this.impact = impact;
    }

    public RiskFactorType getType() {
        return type;
    }

    public String getLabel() {
        return label;
    }

    public String getExplanation() {
        return explanation;
    }

    public Integer getImpact() {
        return impact;
    }
}