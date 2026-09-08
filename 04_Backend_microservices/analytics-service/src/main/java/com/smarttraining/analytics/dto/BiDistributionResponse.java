package com.smarttraining.analytics.dto;

import java.util.Map;

public record BiDistributionResponse(
        Map<String, Long> progress,
        Map<String, Long> scores,
        Map<String, Long> risk
) {
}