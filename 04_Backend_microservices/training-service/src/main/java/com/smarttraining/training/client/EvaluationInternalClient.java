package com.smarttraining.training.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class EvaluationInternalClient {

    private final RestClient restClient;
    private final String serviceKey;

    public EvaluationInternalClient(
            @Value("${SMARTTRAINING_EVALUATION_INTERNAL_URL:http://localhost:8083}")
            String baseUrl,
            @Value("${SMARTTRAINING_INTERNAL_SERVICE_KEY:}")
            String serviceKey
    ) {
        this.restClient =
                RestClient.builder().baseUrl(baseUrl).build();
        this.serviceKey = serviceKey;
    }

    public void purgeTraining(Long trainingId) {
        requireServiceKey();

        restClient.delete()
                .uri("/evaluation/internal/trainings/{trainingId}", trainingId)
                .header("X-SmartTraining-Service-Key", serviceKey)
                .retrieve()
                .toBodilessEntity();
    }

    private void requireServiceKey() {
        if (serviceKey == null || serviceKey.isBlank()) {
            throw new IllegalStateException(
                    "Cle de service interne non configuree dans training-service."
            );
        }
    }
}