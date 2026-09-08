package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.LearningEventResponse;
import com.smarttraining.analytics.dto.TrustedLearningEventRequest;
import com.smarttraining.analytics.security.InternalServiceKeyValidator;
import com.smarttraining.analytics.service.AuthoritativeAnalyticsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/analytics/internal/events")
public class InternalLearningEventController {

    private static final String SERVICE_KEY_HEADER = "X-SmartTraining-Service-Key";

    private final InternalServiceKeyValidator keyValidator;
    private final AuthoritativeAnalyticsService authoritativeAnalyticsService;

    public InternalLearningEventController(
        InternalServiceKeyValidator keyValidator,
        AuthoritativeAnalyticsService authoritativeAnalyticsService
    ) {
        this.keyValidator = keyValidator;
        this.authoritativeAnalyticsService = authoritativeAnalyticsService;
    }

    @PostMapping
    public LearningEventResponse createTrustedEvent(
        @RequestHeader(name = SERVICE_KEY_HEADER, required = false) String serviceKey,
        @Valid @RequestBody TrustedLearningEventRequest request
    ) {
        keyValidator.validate(serviceKey);
        return authoritativeAnalyticsService.recordTrustedEvent(request);
    }
}