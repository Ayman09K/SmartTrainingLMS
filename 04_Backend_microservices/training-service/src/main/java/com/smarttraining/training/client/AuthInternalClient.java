package com.smarttraining.training.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AuthInternalClient {

    private final RestClient restClient;
    private final String serviceKey;

    public AuthInternalClient(
            @Value("${smarttraining.internal.auth-url:http://localhost:8081}") String baseUrl,
            @Value(
                "${SMARTTRAINING_INTERNAL_SERVICE_KEY:}"
            ) String serviceKey
    ) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
        this.serviceKey = serviceKey;
    }

    public InternalLearnerIdentityResponse getLearnerIdentity(
            Long learnerId
    ) {
        if (serviceKey == null || serviceKey.isBlank()) {
            throw new IllegalStateException(
                    "Cle de service interne non configuree dans training-service."
            );
        }

        InternalLearnerIdentityResponse response =
                restClient
                        .get()
                        .uri(
                            "/auth/internal/learners/{learnerId}/identity",
                            learnerId
                        )
                        .header(
                            "X-SmartTraining-Service-Key",
                            serviceKey
                        )
                        .retrieve()
                        .body(
                            InternalLearnerIdentityResponse.class
                        );

        if (response == null
                || response.getLearnerId() == null
                || response.getFullName() == null
                || response.getFullName().isBlank()) {
            throw new IllegalStateException(
                    "Identite apprenant indisponible dans auth-service."
            );
        }

        if (!learnerId.equals(response.getLearnerId())) {
            throw new IllegalStateException(
                    "Identite apprenant incoherente dans auth-service."
            );
        }

        return response;
    }
}