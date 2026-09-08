package com.smarttraining.auth.controller;

import com.smarttraining.auth.dto.InternalLearnerDirectoryEntry;
import com.smarttraining.auth.dto.LearnerDirectoryResolveRequest;
import com.smarttraining.auth.dto.UserResponse;
import com.smarttraining.auth.security.InternalServiceKeyValidator;
import com.smarttraining.auth.service.UserDirectoryService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth/internal/directory/learners")
public class InternalLearnerDirectoryController {

    private static final String SERVICE_KEY_HEADER =
            "X-SmartTraining-Service-Key";

    private final InternalServiceKeyValidator keyValidator;
    private final UserDirectoryService directoryService;

    public InternalLearnerDirectoryController(
            InternalServiceKeyValidator keyValidator,
            UserDirectoryService directoryService
    ) {
        this.keyValidator = keyValidator;
        this.directoryService = directoryService;
    }

    @PostMapping("/resolve")
    public List<InternalLearnerDirectoryEntry> resolve(
            @RequestHeader(
                    name = SERVICE_KEY_HEADER,
                    required = false
            ) String serviceKey,
            @Valid @RequestBody LearnerDirectoryResolveRequest request
    ) {
        keyValidator.validate(serviceKey);

        return directoryService
                .resolveLearners(request.getLearnerIds())
                .stream()
                .map(user -> new InternalLearnerDirectoryEntry(
                        user.getId(),
                        displayName(user),
                        user.getEmail()
                ))
                .toList();
    }

    private String displayName(UserResponse user) {
        if (user.getFullName() != null
                && !user.getFullName().isBlank()) {
            return user.getFullName().trim();
        }

        String firstName =
                user.getFirstName() == null
                ? ""
                : user.getFirstName().trim();

        String lastName =
                user.getLastName() == null
                ? ""
                : user.getLastName().trim();

        String combined =
                (firstName + " " + lastName).trim();

        if (!combined.isBlank()) {
            return combined;
        }

        return user.getEmail() == null
                ? "Apprenant"
                : user.getEmail();
    }
}