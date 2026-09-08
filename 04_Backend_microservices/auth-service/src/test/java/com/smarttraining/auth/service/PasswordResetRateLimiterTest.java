package com.smarttraining.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

class PasswordResetRateLimiterTest {

    @Test
    void blocksSameClientAfterLimit() {
        PasswordResetRateLimiter limiter =
                new PasswordResetRateLimiter(3, 60);

        assertTrue(limiter.tryAcquire("203.0.113.10"));
        assertTrue(limiter.tryAcquire("203.0.113.10"));
        assertTrue(limiter.tryAcquire("203.0.113.10"));
        assertFalse(limiter.tryAcquire("203.0.113.10"));
    }

    @Test
    void clientsHaveIndependentBuckets() {
        PasswordResetRateLimiter limiter =
                new PasswordResetRateLimiter(1, 60);

        assertTrue(limiter.tryAcquire("203.0.113.10"));
        assertFalse(limiter.tryAcquire("203.0.113.10"));
        assertTrue(limiter.tryAcquire("203.0.113.11"));
    }

    @Test
    void invalidConfigurationIsRejected() {
        assertThrows(
                IllegalArgumentException.class,
                () -> new PasswordResetRateLimiter(0, 60)
        );
        assertThrows(
                IllegalArgumentException.class,
                () -> new PasswordResetRateLimiter(5, 1)
        );
    }
}