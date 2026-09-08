package com.smarttraining.analytics.controller;

import com.smarttraining.analytics.dto.InternalNotificationCreateRequest;
import com.smarttraining.analytics.dto.LearnerNotificationResponse;
import com.smarttraining.analytics.security.InternalServiceKeyValidator;
import com.smarttraining.analytics.service.LearnerNotificationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/analytics/internal/notifications")
public class InternalNotificationController {

    private static final String SERVICE_KEY_HEADER =
        "X-SmartTraining-Service-Key";

    private final InternalServiceKeyValidator keyValidator;
    private final LearnerNotificationService service;

    public InternalNotificationController(
            InternalServiceKeyValidator keyValidator,
            LearnerNotificationService service
    ) {
        this.keyValidator = keyValidator;
        this.service = service;
    }

    @PostMapping
    public LearnerNotificationResponse create(
            @RequestHeader(
                name = SERVICE_KEY_HEADER,
                required = false
            ) String serviceKey,
            @Valid @RequestBody InternalNotificationCreateRequest request
    ) {
        keyValidator.validate(serviceKey);

        return service.createInternal(request);
    }
}