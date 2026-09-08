package com.smarttraining.gateway.security;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class AuthJwtVersionValidator
        implements OAuth2TokenValidator<Jwt> {

    private static final String SERVICE_ID = "auth-service";
    private static final String SERVICE_KEY_HEADER =
            "X-SmartTraining-Service-Key";

    private final DiscoveryClient discoveryClient;
    private final String serviceKey;
    private final HttpClient httpClient;

    public AuthJwtVersionValidator(
            DiscoveryClient discoveryClient,
            @Value("${SMARTTRAINING_INTERNAL_SERVICE_KEY:}")
            String serviceKey
    ) {
        this.discoveryClient = discoveryClient;
        this.serviceKey = serviceKey == null ? "" : serviceKey.trim();

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(2))
                .build();
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        Long userId = numberClaim(jwt, "userId");
        Long authVersion = numberClaim(jwt, "authVersion");

        if (
            userId == null
            || userId <= 0
            || authVersion == null
            || authVersion < 0
        ) {
            return invalid(
                    "JWT sans userId/authVersion valide."
            );
        }

        if (serviceKey.isBlank()) {
            return invalid(
                    "Validation de session indisponible."
            );
        }

        List<ServiceInstance> instances =
                discoveryClient.getInstances(SERVICE_ID);

        if (instances == null || instances.isEmpty()) {
            return invalid(
                    "Service d'authentification indisponible."
            );
        }

        for (ServiceInstance instance : instances) {
            OAuth2TokenValidatorResult result =
                    validateAgainstInstance(
                            instance,
                            userId,
                            authVersion
                    );

            if (result != null) {
                return result;
            }
        }

        return invalid(
                "Validation de session impossible."
        );
    }

    private OAuth2TokenValidatorResult validateAgainstInstance(
            ServiceInstance instance,
            long userId,
            long authVersion
    ) {
        try {
            String base = instance.getUri()
                    .toString()
                    .replaceAll("/+$", "");

            URI uri = URI.create(
                    base
                    + "/auth/internal/jwt/validate"
                    + "?userId=" + userId
                    + "&authVersion=" + authVersion
            );

            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(3))
                    .header(
                            SERVICE_KEY_HEADER,
                            serviceKey
                    )
                    .GET()
                    .build();

            HttpResponse<String> response =
                    httpClient.send(
                            request,
                            HttpResponse.BodyHandlers.ofString()
                    );

            if (response.statusCode() != 200) {
                return null;
            }

            String body = response.body();

            if (body == null) {
                return null;
            }

            String compact = body.replaceAll("\\s+", "");

            if (compact.contains("\"valid\":true")) {
                return OAuth2TokenValidatorResult.success();
            }

            if (compact.contains("\"valid\":false")) {
                return invalid(
                        "Session JWT revoquee ou utilisateur inactif."
                );
            }

            return null;
        }
        catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return invalid(
                    "Validation de session interrompue."
            );
        }
        catch (Exception exception) {
            return null;
        }
    }

    private Long numberClaim(
            Jwt jwt,
            String name
    ) {
        Object value = jwt.getClaims().get(name);

        if (value instanceof Number number) {
            return number.longValue();
        }

        if (value instanceof String text) {
            try {
                return Long.valueOf(text);
            }
            catch (NumberFormatException ignored) {
                return null;
            }
        }

        return null;
    }

    private OAuth2TokenValidatorResult invalid(
            String description
    ) {
        return OAuth2TokenValidatorResult.failure(
                new OAuth2Error(
                        "invalid_token",
                        description,
                        null
                )
        );
    }
}