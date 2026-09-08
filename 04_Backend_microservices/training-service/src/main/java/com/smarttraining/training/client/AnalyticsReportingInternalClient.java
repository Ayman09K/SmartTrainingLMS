package com.smarttraining.training.client;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AnalyticsReportingInternalClient {

    private static final int MAX_BATCH = 200;

    private final RestClient restClient;
    private final String serviceKey;

    public AnalyticsReportingInternalClient(
            @Value(
                "${SMARTTRAINING_ANALYTICS_INTERNAL_URL:http://localhost:8084}"
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

    public List<InternalTrainingLearnerMetrics> resolve(
            Long trainingId,
            List<Long> learnerIds
    ) {
        if (learnerIds == null || learnerIds.isEmpty()) {
            return List.of();
        }

        requireServiceKey();

        List<Long> uniqueIds =
                learnerIds.stream()
                        .filter(id -> id != null && id > 0)
                        .distinct()
                        .toList();

        List<InternalTrainingLearnerMetrics> result =
                new ArrayList<>();

        for (
            int start = 0;
            start < uniqueIds.size();
            start += MAX_BATCH
        ) {
            int end =
                    Math.min(
                        start + MAX_BATCH,
                        uniqueIds.size()
                    );

            List<Long> chunk =
                    uniqueIds.subList(start, end);

            InternalTrainingLearnerMetrics[] response =
                    restClient
                            .post()
                            .uri(
                                "/analytics/internal/reporting/trainings/"
                                + trainingId
                                + "/learners"
                            )
                            .header(
                                "X-SmartTraining-Service-Key",
                                serviceKey
                            )
                            .body(
                                new MetricsRequest(chunk)
                            )
                            .retrieve()
                            .body(
                                InternalTrainingLearnerMetrics[].class
                            );

            if (response != null) {
                result.addAll(
                    Arrays.asList(response)
                );
            }
        }

        return List.copyOf(result);
    }

    private void requireServiceKey() {
        if (serviceKey == null || serviceKey.isBlank()) {
            throw new IllegalStateException(
                    "Cle de service interne non configuree dans training-service."
            );
        }
    }

    private record MetricsRequest(
            List<Long> learnerIds
    ) {
    }
}