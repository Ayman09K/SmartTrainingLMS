package com.smarttraining.gateway.security;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.security.oauth2.jwt.Jwt;

class AuthJwtVersionValidatorTest {

    @Test
    void missingAuthVersionIsRejected() {
        AuthJwtVersionValidator validator =
                new AuthJwtVersionValidator(
                        emptyDiscovery(),
                        "012345678901234567890123456789012345678901234567"
                );

        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "HS512")
                .subject("learner@example.com")
                .claim("userId", 8L)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        assertTrue(
                validator.validate(jwt).hasErrors()
        );
    }

    @Test
    void unavailableAuthServiceFailsClosed() {
        AuthJwtVersionValidator validator =
                new AuthJwtVersionValidator(
                        emptyDiscovery(),
                        "012345678901234567890123456789012345678901234567"
                );

        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "HS512")
                .subject("learner@example.com")
                .claim("userId", 8L)
                .claim("authVersion", 0L)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        assertTrue(
                validator.validate(jwt).hasErrors()
        );
    }

    private DiscoveryClient emptyDiscovery() {
        return new DiscoveryClient() {
            @Override
            public String description() {
                return "AM14E1B test";
            }

            @Override
            public List<ServiceInstance> getInstances(
                    String serviceId
            ) {
                return List.of();
            }

            @Override
            public List<String> getServices() {
                return List.of();
            }
        };
    }
}