package com.smarttraining.auth.controller;

import com.smarttraining.auth.dto.InternalJwtVersionValidationResponse;
import com.smarttraining.auth.entity.User;
import com.smarttraining.auth.repository.UserRepository;
import com.smarttraining.auth.security.InternalServiceKeyValidator;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth/internal/jwt")
public class InternalJwtVersionController {

    private static final String SERVICE_KEY_HEADER =
            "X-SmartTraining-Service-Key";

    private final InternalServiceKeyValidator keyValidator;
    private final UserRepository userRepository;

    public InternalJwtVersionController(
            InternalServiceKeyValidator keyValidator,
            UserRepository userRepository
    ) {
        this.keyValidator = keyValidator;
        this.userRepository = userRepository;
    }

    @GetMapping("/validate")
    public InternalJwtVersionValidationResponse validate(
            @RequestHeader(
                    name = SERVICE_KEY_HEADER,
                    required = false
            ) String serviceKey,
            @RequestParam Long userId,
            @RequestParam long authVersion
    ) {
        keyValidator.validate(serviceKey);

        if (userId == null || userId <= 0 || authVersion < 0) {
            return new InternalJwtVersionValidationResponse(false);
        }

        User user = userRepository.findById(userId).orElse(null);

        boolean valid =
                user != null
                && user.isActiveAccount()
                && user.getAuthTokenVersion() == authVersion;

        return new InternalJwtVersionValidationResponse(valid);
    }
}