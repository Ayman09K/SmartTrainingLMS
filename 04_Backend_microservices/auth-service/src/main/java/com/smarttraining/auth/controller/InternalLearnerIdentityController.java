package com.smarttraining.auth.controller;

import com.smarttraining.auth.dto.InternalLearnerIdentityResponse;
import com.smarttraining.auth.dto.UserResponse;
import com.smarttraining.auth.security.InternalServiceKeyValidator;
import com.smarttraining.auth.service.UserDirectoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth/internal/learners")
public class InternalLearnerIdentityController {

    private static final String SERVICE_KEY_HEADER =
            "X-SmartTraining-Service-Key";

    private final InternalServiceKeyValidator keyValidator;
    private final UserDirectoryService userDirectoryService;

    public InternalLearnerIdentityController(
            InternalServiceKeyValidator keyValidator,
            UserDirectoryService userDirectoryService
    ) {
        this.keyValidator = keyValidator;
        this.userDirectoryService = userDirectoryService;
    }

    @GetMapping("/{learnerId}/identity")
    public InternalLearnerIdentityResponse resolveIdentity(
            @RequestHeader(
                    name = SERVICE_KEY_HEADER,
                    required = false
            ) String serviceKey,
            @PathVariable Long learnerId
    ) {
        keyValidator.validate(serviceKey);

        UserResponse learner = userDirectoryService.getLearner(learnerId);

        String fullName = learner.getFullName();
        if (fullName == null || fullName.isBlank()) {
            fullName = (
                    (learner.getFirstName() == null ? "" : learner.getFirstName())
                    + " "
                    + (learner.getLastName() == null ? "" : learner.getLastName())
            ).trim();
        }

        if (fullName.isBlank()) {
            throw new IllegalArgumentException(
                    "Nom apprenant indisponible pour le certificat."
            );
        }

        return new InternalLearnerIdentityResponse(
                learner.getId(),
                fullName
        );
    }
}