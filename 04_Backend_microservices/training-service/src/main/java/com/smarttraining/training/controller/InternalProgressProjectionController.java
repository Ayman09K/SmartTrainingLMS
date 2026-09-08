package com.smarttraining.training.controller;

import com.smarttraining.training.dto.internal.ProgressProjectionRequest;
import com.smarttraining.training.dto.internal.ProgressProjectionResponse;
import com.smarttraining.training.security.InternalServiceKeyValidator;
import com.smarttraining.training.service.InternalProgressProjectionService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/enrollments/internal/progress")
public class InternalProgressProjectionController {

    private static final String SERVICE_KEY_HEADER = "X-SmartTraining-Service-Key";

    private final InternalServiceKeyValidator keyValidator;
    private final InternalProgressProjectionService projectionService;

    public InternalProgressProjectionController(
            InternalServiceKeyValidator keyValidator,
            InternalProgressProjectionService projectionService
    ) {
        this.keyValidator = keyValidator;
        this.projectionService = projectionService;
    }

    @PostMapping
    public ProgressProjectionResponse project(
            @RequestHeader(name = SERVICE_KEY_HEADER, required = false) String serviceKey,
            @Valid @RequestBody ProgressProjectionRequest request
    ) {
        keyValidator.validate(serviceKey);
        return projectionService.apply(request);
    }
}