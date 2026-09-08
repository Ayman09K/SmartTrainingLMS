package com.smarttraining.training.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AnalyticsInternalClient {

    private final RestClient restClient;
    private final String serviceKey;

    public AnalyticsInternalClient(
            @Value("${SMARTTRAINING_ANALYTICS_INTERNAL_URL:http://localhost:8084}") String baseUrl,
            @Value("${SMARTTRAINING_INTERNAL_SERVICE_KEY:}") String serviceKey
    ) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
        this.serviceKey = serviceKey;
    }

    public TrustedAnalyticsEventResponse publish(TrustedAnalyticsEventRequest request) {
        if (serviceKey == null || serviceKey.isBlank()) {
            throw new IllegalStateException("Cle de service interne non configuree dans training-service.");
        }

        return restClient
                .post()
                .uri("/analytics/internal/events")
                .header("X-SmartTraining-Service-Key", serviceKey)
                .body(request)
                .retrieve()
                .body(TrustedAnalyticsEventResponse.class);
    }

    public void purgeTraining(Long trainingId) {
        if (serviceKey == null || serviceKey.isBlank()) {
            throw new IllegalStateException(
                    "Cle de service interne non configuree dans training-service."
            );
        }

        restClient.delete()
                .uri("/analytics/internal/trainings/{trainingId}", trainingId)
                .header("X-SmartTraining-Service-Key", serviceKey)
                .retrieve()
                .toBodilessEntity();
    }
}