package com.smarttraining.analytics.service;

import com.smarttraining.analytics.dto.AiAssistantRequest;
import com.smarttraining.analytics.dto.AiAssistantResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AiAssistantClient {

    private final RestClient restClient;

    public AiAssistantClient(
            RestClient.Builder restClientBuilder,
            @Value("${smarttraining.ai-service.url}") String aiServiceUrl
    ) {
        this.restClient = restClientBuilder
                .baseUrl(aiServiceUrl)
                .build();
    }

    public AiAssistantResponse chat(AiAssistantRequest request) {
        try {
            return restClient
                    .post()
                    .uri("/assistant/chat")
                    .body(request)
                    .retrieve()
                    .body(AiAssistantResponse.class);
        } catch (HttpServerErrorException.GatewayTimeout exception) {
            throw new ResponseStatusException(
                    HttpStatus.GATEWAY_TIMEOUT,
                    "L’assistant met plus de temps que prévu à répondre.",
                    exception
            );
        } catch (RestClientException exception) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "L’assistant est temporairement indisponible.",
                    exception
            );
        }
    }
}
