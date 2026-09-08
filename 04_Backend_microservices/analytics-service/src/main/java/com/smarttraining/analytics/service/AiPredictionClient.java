package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.AiRiskPredictionRequest;
import com.smarttraining.analytics.dto.AiRiskPredictionResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class AiPredictionClient {
    private final RestClient restClient;

    public AiPredictionClient(RestClient.Builder restClientBuilder,
            @Value("${smarttraining.ai-service.url}") String aiServiceUrl) {
        this.restClient = restClientBuilder.baseUrl(aiServiceUrl).build();
    }

    public AiRiskPredictionResponse predictRisk(AiRiskPredictionRequest request) {
        return restClient.post().uri("/predict-risk").body(request).retrieve()
                .body(AiRiskPredictionResponse.class);
    }
}
