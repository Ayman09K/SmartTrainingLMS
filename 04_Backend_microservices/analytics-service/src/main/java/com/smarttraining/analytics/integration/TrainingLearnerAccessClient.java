package com.smarttraining.analytics.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class TrainingLearnerAccessClient {

    private final RestClient restClient;
    private final String serviceKey;

    public TrainingLearnerAccessClient(
            @Value(
                "${SMARTTRAINING_TRAINING_INTERNAL_URL:http://localhost:8082}"
            ) String baseUrl,
            @Value(
                "${SMARTTRAINING_INTERNAL_SERVICE_KEY:}"
            ) String serviceKey
    ) {
        this.restClient =
                RestClient.builder()
                        .baseUrl(baseUrl)
                        .build();
        this.serviceKey = serviceKey;
    }

    public TrainingLearnerAccessResponse resolve(
            Long actorId,
            String actorRole,
            Long learnerId
    ) {
        if (serviceKey == null || serviceKey.isBlank()) {
            throw new IllegalStateException(
                    "Cle de service interne non configuree dans analytics-service."
            );
        }

        TrainingLearnerAccessResponse response =
                restClient
                        .get()
                        .uri(uriBuilder ->
                                uriBuilder
                                        .path(
                                            "/enrollments/internal/trainer-learner-access/{learnerId}"
                                        )
                                        .queryParam(
                                            "actorId",
                                            actorId
                                        )
                                        .queryParam(
                                            "actorRole",
                                            actorRole
                                        )
                                        .build(
                                            learnerId
                                        )
                        )
                        .header(
                                "X-SmartTraining-Service-Key",
                                serviceKey
                        )
                        .retrieve()
                        .body(
                                TrainingLearnerAccessResponse.class
                        );

        if (response == null) {
            throw new IllegalStateException(
                    "Reponse vide de training-service pour le controle d'acces."
            );
        }

        return response;
    }
}