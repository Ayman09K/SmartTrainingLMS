package com.smarttraining.auth.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AnalyticsNotificationInternalClient {

    private final RestClient restClient;
    private final String serviceKey;

    public AnalyticsNotificationInternalClient(
            @Value("${SMARTTRAINING_ANALYTICS_INTERNAL_URL:http://localhost:8084}")
            String baseUrl,
            @Value("${SMARTTRAINING_INTERNAL_SERVICE_KEY:}")
            String serviceKey
    ) {
        this.restClient =
            RestClient.builder()
                .baseUrl(baseUrl)
                .build();
        this.serviceKey = serviceKey;
    }

    public void create(
            Long userId,
            String notificationType,
            String title,
            String message,
            String actionUrl,
            String eventKey
    ) {
        if (serviceKey == null || serviceKey.isBlank()) {
            throw new IllegalStateException(
                "Cle de service interne non configuree dans auth-service."
            );
        }

        restClient
            .post()
            .uri("/analytics/internal/notifications")
            .header(
                "X-SmartTraining-Service-Key",
                serviceKey
            )
            .body(
                new NotificationBody(
                    userId,
                    null,
                    null,
                    notificationType,
                    title,
                    message,
                    actionUrl,
                    eventKey
                )
            )
            .retrieve()
            .toBodilessEntity();
    }

    private record NotificationBody(
            Long userId,
            Long trainingId,
            Long supportSessionId,
            String notificationType,
            String title,
            String message,
            String actionUrl,
            String eventKey
    ) {
    }
}
