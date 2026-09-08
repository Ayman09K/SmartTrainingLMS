package com.smarttraining.training.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
public class InternalServiceKeyValidator {

    private final byte[] expectedKey;

    public InternalServiceKeyValidator(
            @Value("${SMARTTRAINING_INTERNAL_SERVICE_KEY:}") String serviceKey
    ) {
        this.expectedKey = serviceKey == null
                ? new byte[0]
                : serviceKey.getBytes(StandardCharsets.UTF_8);
    }

    public void validate(String providedKey) {
        if (expectedKey.length == 0 || providedKey == null || providedKey.isBlank()) {
            throw new AccessDeniedException("Cle de service interne absente ou non configuree.");
        }

        byte[] candidate = providedKey.getBytes(StandardCharsets.UTF_8);

        if (!MessageDigest.isEqual(expectedKey, candidate)) {
            throw new AccessDeniedException("Cle de service interne invalide.");
        }
    }
}