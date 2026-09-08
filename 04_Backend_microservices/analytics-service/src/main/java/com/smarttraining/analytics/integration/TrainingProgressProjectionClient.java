package com.smarttraining.analytics.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class TrainingProgressProjectionClient {

    private final RestClient restClient;
    private final String serviceKey;

    public TrainingProgressProjectionClient(
            @Value("${SMARTTRAINING_TRAINING_INTERNAL_URL:http://localhost:8082}") String baseUrl,
            @Value("${SMARTTRAINING_INTERNAL_SERVICE_KEY:}") String serviceKey
    ) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
        this.serviceKey = serviceKey;
    }

    public void project(ProgressProjectionEvent event) {
        if (serviceKey == null || serviceKey.isBlank()) {
            throw new IllegalStateException("Cle de service interne non configuree dans analytics-service.");
        }

        restClient
                .post()
                .uri("/enrollments/internal/progress")
                .header("X-SmartTraining-Service-Key", serviceKey)
                .body(new ProjectionBody(
                        event.learnerId(),
                        event.trainingId(),
                        event.progressPercentage(),
                        event.status(),
                        event.completedAt()
                ))
                .retrieve()
                .toBodilessEntity();
    }

    private record ProjectionBody(
            Long learnerId,
            Long trainingId,
            Integer progressPercentage,
            String status,
            java.time.LocalDateTime completedAt
    ) {}
}