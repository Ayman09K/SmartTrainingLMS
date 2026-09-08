package com.smarttraining.analytics.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
public class InternalServiceKeyValidator {

    private final byte[] expectedKey;

    public InternalServiceKeyValidator(
        @Value("${SMARTTRAINING_INTERNAL_SERVICE_KEY:}") String expectedKey
    ) {
        if (expectedKey == null || expectedKey.isBlank() || expectedKey.length() < 48) {
            throw new IllegalStateException(
                "SMARTTRAINING_INTERNAL_SERVICE_KEY est absente ou trop courte."
            );
        }
        this.expectedKey = expectedKey.getBytes(StandardCharsets.UTF_8);
    }

    public void validate(String providedKey) {
        if (providedKey == null || providedKey.isBlank()) {
            throw new AccessDeniedException("Cle de service interne absente.");
        }

        if (!MessageDigest.isEqual(
            expectedKey,
            providedKey.getBytes(StandardCharsets.UTF_8)
        )) {
            throw new AccessDeniedException("Cle de service interne invalide.");
        }
    }
}