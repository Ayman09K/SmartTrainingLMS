package com.smarttraining.training.scorm.integration;

import com.smarttraining.training.client.TrustedAnalyticsEventRequest;

public record ScormAnalyticsEvent(
    TrustedAnalyticsEventRequest request
) {}