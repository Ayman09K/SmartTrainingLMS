package com.smarttraining.analytics.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class TrainingBiScopeClient {

    private final RestClient restClient;
    private final String serviceKey;

    public TrainingBiScopeClient(
            @Value(
                "${SMARTTRAINING_TRAINING_INTERNAL_URL:"
                + "http://localhost:8082}"
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

    public TrainingBiScopeResponse resolve(
            Long actorId,
            String actorRole,
            Long trainingId
    ) {
        requireServiceKey();

        try {
            TrainingBiScopeResponse response =
                    restClient
                            .get()
                            .uri(uriBuilder -> {
                                var builder =
                                        uriBuilder
                                                .path(
                                                    "/enrollments/internal/bi/scope"
                                                )
                                                .queryParam(
                                                    "actorId",
                                                    actorId
                                                )
                                                .queryParam(
                                                    "actorRole",
                                                    actorRole
                                                );

                                if (trainingId != null) {
                                    builder.queryParam(
                                            "trainingId",
                                            trainingId
                                    );
                                }

                                return builder.build();
                            })
                            .header(
                                    "X-SmartTraining-Service-Key",
                                    serviceKey
                            )
                            .retrieve()
                            .body(
                                    TrainingBiScopeResponse.class
                            );

            if (response == null) {
                throw new IllegalStateException(
                        "Reponse vide de training-service pour le BI."
                );
            }

            return response;
        }
        catch (RestClientResponseException exception) {
            int status =
                    exception
                            .getStatusCode()
                            .value();

            if (status == 403) {
                throw new AccessDeniedException(
                        "Formation hors perimetre BI "
                        + "de cet utilisateur.",
                        exception
                );
            }

            if (
                status == 400
                || status == 404
            ) {
                throw new IllegalArgumentException(
                        "Formation ou requete BI invalide.",
                        exception
                );
            }

            throw exception;
        }
    }

    private void requireServiceKey() {
        if (
            serviceKey == null
            || serviceKey.isBlank()
        ) {
            throw new IllegalStateException(
                    "Cle de service interne non configuree "
                    + "dans analytics-service."
            );
        }
    }
}