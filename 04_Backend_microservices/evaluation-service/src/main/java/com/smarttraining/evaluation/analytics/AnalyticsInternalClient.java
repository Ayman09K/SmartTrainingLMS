package com.smarttraining.evaluation.analytics;

import com.smarttraining.evaluation.dto.AnalyticsLearningEventRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AnalyticsInternalClient {

    private static final String SERVICE_KEY_HEADER =
        "X-SmartTraining-Service-Key";

    private final RestClient restClient;

    public AnalyticsInternalClient(
        @Value("${smarttraining.analytics-service.url:http://localhost:8084}")
        String analyticsServiceUrl,
        @Value("${SMARTTRAINING_INTERNAL_SERVICE_KEY:}")
        String internalServiceKey
    ) {
        if (internalServiceKey == null
            || internalServiceKey.isBlank()
            || internalServiceKey.length() < 48) {
            throw new IllegalStateException(
                "SMARTTRAINING_INTERNAL_SERVICE_KEY est absente ou trop courte."
            );
        }

        this.restClient = RestClient.builder()
            .baseUrl(analyticsServiceUrl.replaceAll("/+$", ""))
            .defaultHeader(SERVICE_KEY_HEADER, internalServiceKey)
            .build();
    }

    public void send(AnalyticsLearningEventRequest request) {
        restClient.post()
            .uri("/analytics/internal/events")
            .contentType(MediaType.APPLICATION_JSON)
            .body(request)
            .retrieve()
            .toBodilessEntity();
    }
}