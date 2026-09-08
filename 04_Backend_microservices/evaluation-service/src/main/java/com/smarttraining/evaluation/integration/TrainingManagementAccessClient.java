package com.smarttraining.evaluation.integration;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class TrainingManagementAccessClient {

    private final RestClient restClient;

    public TrainingManagementAccessClient(
            @Value("${TRAINING_SERVICE_URL:http://localhost:8082}") String trainingServiceUrl
    ) {
        this.restClient = RestClient.builder()
                .baseUrl(trainingServiceUrl)
                .build();
    }

    public TrainingScope requireManageTraining(
            Long trainingId,
            String jwtToken
    ) {
        if (trainingId == null || trainingId <= 0) {
            throw new IllegalArgumentException("trainingId invalide.");
        }
        if (jwtToken == null || jwtToken.isBlank()) {
            throw new AccessDeniedException("JWT staff absent.");
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = restClient.get()
                    .uri("/trainings/{trainingId}/full", trainingId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken)
                    .retrieve()
                    .body(Map.class);

            if (body == null) {
                throw new IllegalStateException(
                        "Reponse Training vide pendant la verification d'ownership."
                );
            }

            Long responseTrainingId = asLong(body.get("id"));
            if (responseTrainingId == null || !trainingId.equals(responseTrainingId)) {
                throw new IllegalStateException(
                        "Reponse Training incoherente pendant la verification d'ownership."
                );
            }

            Set<Long> moduleIds = new HashSet<>();
            Object rawModules = body.get("modules");

            if (rawModules instanceof List<?> modules) {
                for (Object rawModule : modules) {
                    if (rawModule instanceof Map<?, ?> module) {
                        Long moduleId = asLong(module.get("id"));
                        if (moduleId != null && moduleId > 0) {
                            moduleIds.add(moduleId);
                        }
                    }
                }
            }

            return new TrainingScope(responseTrainingId, moduleIds);
        } catch (HttpClientErrorException exception) {
            if (exception.getStatusCode().value() == 404) {
                throw new IllegalArgumentException("Formation introuvable.");
            }
            throw new AccessDeniedException(
                    "Vous ne pouvez pas gerer cette formation."
            );
        } catch (RestClientException exception) {
            throw new IllegalStateException(
                    "Impossible de verifier l'ownership de la formation.",
                    exception
            );
        }
    }

    public boolean canManageTraining(Long trainingId, String jwtToken) {
        try {
            requireManageTraining(trainingId, jwtToken);
            return true;
        } catch (AccessDeniedException | IllegalArgumentException exception) {
            return false;
        }
    }

    private Long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Long.valueOf(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    public record TrainingScope(Long trainingId, Set<Long> moduleIds) {
    }
}
