package com.smarttraining.evaluation.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class TrainingLearnerAccessClient {

    private final RestClient restClient;

    public TrainingLearnerAccessClient(
            @Value("${TRAINING_SERVICE_URL:http://localhost:8082}") String trainingServiceUrl
    ) {
        this.restClient = RestClient.builder()
                .baseUrl(trainingServiceUrl)
                .build();
    }

    public void requireEnrollment(
            Long trainingId,
            String jwtToken
    ) {
        if (trainingId == null || trainingId <= 0) {
            throw new IllegalArgumentException("trainingId invalide.");
        }

        if (jwtToken == null || jwtToken.isBlank()) {
            throw new AccessDeniedException("JWT apprenant absent.");
        }

        try {
            restClient.get()
                    .uri("/trainings/learner/me/{trainingId}/full", trainingId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken)
                    .retrieve()
                    .toBodilessEntity();
        } catch (HttpClientErrorException exception) {
            throw new AccessDeniedException(
                    "Vous n'avez pas acces a cette formation."
            );
        } catch (RestClientException exception) {
            throw new IllegalStateException(
                    "Impossible de verifier l'inscription a la formation.",
                    exception
            );
        }
    }
}
