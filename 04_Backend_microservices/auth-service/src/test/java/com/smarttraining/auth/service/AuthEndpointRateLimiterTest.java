package com.smarttraining.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

class AuthEndpointRateLimiterTest {

    @Test
    void loginBlocksSameClientAfterLimit() {
        AuthEndpointRateLimiter limiter =
                new AuthEndpointRateLimiter(3, 60, 5, 60);

        assertTrue(limiter.tryAcquireLogin("203.0.113.10"));
        assertTrue(limiter.tryAcquireLogin("203.0.113.10"));
        assertTrue(limiter.tryAcquireLogin("203.0.113.10"));
        assertFalse(limiter.tryAcquireLogin("203.0.113.10"));
    }

    @Test
    void registerBlocksSameClientAfterLimit() {
        AuthEndpointRateLimiter limiter =
                new AuthEndpointRateLimiter(5, 60, 2, 60);

        assertTrue(limiter.tryAcquireRegister("203.0.113.10"));
        assertTrue(limiter.tryAcquireRegister("203.0.113.10"));
        assertFalse(limiter.tryAcquireRegister("203.0.113.10"));
    }

    @Test
    void loginAndRegisterBucketsAreIndependent() {
        AuthEndpointRateLimiter limiter =
                new AuthEndpointRateLimiter(1, 60, 1, 60);

        assertTrue(limiter.tryAcquireLogin("203.0.113.10"));
        assertFalse(limiter.tryAcquireLogin("203.0.113.10"));

        assertTrue(limiter.tryAcquireRegister("203.0.113.10"));
        assertFalse(limiter.tryAcquireRegister("203.0.113.10"));
    }

    @Test
    void differentClientsHaveIndependentBuckets() {
        AuthEndpointRateLimiter limiter =
                new AuthEndpointRateLimiter(1, 60, 1, 60);

        assertTrue(limiter.tryAcquireLogin("203.0.113.10"));
        assertFalse(limiter.tryAcquireLogin("203.0.113.10"));
        assertTrue(limiter.tryAcquireLogin("203.0.113.11"));
    }

    @Test
    void invalidConfigurationIsRejected() {
        assertThrows(
                IllegalArgumentException.class,
                () -> new AuthEndpointRateLimiter(0, 60, 1, 60)
        );

        assertThrows(
                IllegalArgumentException.class,
                () -> new AuthEndpointRateLimiter(1, 1, 1, 60)
        );

        assertThrows(
                IllegalArgumentException.class,
                () -> new AuthEndpointRateLimiter(1, 60, 101, 60)
        );
    }
}