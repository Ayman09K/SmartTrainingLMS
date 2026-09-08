package com.smarttraining.evaluation.analytics;

import com.smarttraining.evaluation.dto.AnalyticsLearningEventRequest;

public record QuizAnalyticsEvent(
    AnalyticsLearningEventRequest request
) {}