package com.smarttraining.training.controller;

import com.smarttraining.training.dto.internal.InternalBiScopeResponse;
import com.smarttraining.training.security.InternalServiceKeyValidator;
import com.smarttraining.training.service.InternalBiScopeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/enrollments/internal/bi")
public class InternalBiScopeController {

    private static final String SERVICE_KEY_HEADER =
            "X-SmartTraining-Service-Key";

    private final InternalServiceKeyValidator keyValidator;
    private final InternalBiScopeService biScopeService;

    public InternalBiScopeController(
            InternalServiceKeyValidator keyValidator,
            InternalBiScopeService biScopeService
    ) {
        this.keyValidator = keyValidator;
        this.biScopeService = biScopeService;
    }

    @GetMapping("/scope")
    public InternalBiScopeResponse scope(
            @RequestHeader(
                    name = SERVICE_KEY_HEADER,
                    required = false
            ) String serviceKey,
            @RequestParam Long actorId,
            @RequestParam String actorRole,
            @RequestParam(
                    required = false
            ) Long trainingId
    ) {
        keyValidator.validate(serviceKey);

        return biScopeService.resolve(
                actorId,
                actorRole,
                trainingId
        );
    }
}