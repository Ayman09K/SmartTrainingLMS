package com.smarttraining.training.controller;

import com.smarttraining.training.dto.internal.TrainerLearnerAccessResponse;
import com.smarttraining.training.security.InternalServiceKeyValidator;
import com.smarttraining.training.service.InternalTrainerLearnerAccessService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/enrollments/internal/trainer-learner-access")
public class InternalTrainerLearnerAccessController {

    private static final String SERVICE_KEY_HEADER =
            "X-SmartTraining-Service-Key";

    private final InternalServiceKeyValidator keyValidator;
    private final InternalTrainerLearnerAccessService accessService;

    public InternalTrainerLearnerAccessController(
            InternalServiceKeyValidator keyValidator,
            InternalTrainerLearnerAccessService accessService
    ) {
        this.keyValidator = keyValidator;
        this.accessService = accessService;
    }

    @GetMapping("/{learnerId}")
    public TrainerLearnerAccessResponse resolve(
            @RequestHeader(
                    name = SERVICE_KEY_HEADER,
                    required = false
            ) String serviceKey,
            @PathVariable Long learnerId,
            @RequestParam Long actorId,
            @RequestParam String actorRole
    ) {
        keyValidator.validate(serviceKey);

        return accessService.resolve(
                actorId,
                actorRole,
                learnerId
        );
    }
}