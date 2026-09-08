package com.smarttraining.auth.security;

import static org.junit.jupiter.api.Assertions.*;

import com.smarttraining.auth.entity.User;
import com.smarttraining.auth.enums.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class JwtAuthVersionTest {

    private JwtService service() {
        JwtService service = new JwtService();

        ReflectionTestUtils.setField(
                service,
                "jwtSecret",
                "0123456789012345678901234567890123456789012345678901234567890123"
        );

        ReflectionTestUtils.setField(
                service,
                "jwtExpirationMs",
                3_600_000L
        );

        return service;
    }

    @Test
    void tokenCarriesCurrentAuthVersion() {
        User user = new User(
                "Test",
                "Learner",
                "learner@example.com",
                "hash",
                UserRole.APPRENANT
        );
        user.setId(44L);

        JwtService service = service();
        String token = service.generateToken(user);

        assertEquals(0L, service.extractAuthVersion(token));
        assertTrue(service.isTokenValid(token, user));
    }

    @Test
    void tokenBecomesInvalidWhenAuthVersionChanges() {
        User user = new User(
                "Test",
                "Learner",
                "learner@example.com",
                "hash",
                UserRole.APPRENANT
        );
        user.setId(45L);

        JwtService service = service();
        String token = service.generateToken(user);

        user.bumpAuthTokenVersion();

        assertEquals(1L, user.getAuthTokenVersion());
        assertFalse(service.isTokenValid(token, user));
    }
}