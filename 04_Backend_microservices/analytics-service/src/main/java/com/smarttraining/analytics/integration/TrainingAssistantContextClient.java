package com.smarttraining.analytics.integration;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class TrainingAssistantContextClient {

    private final RestClient restClient;

    public TrainingAssistantContextClient(
            @Value(
                "${SMARTTRAINING_TRAINING_INTERNAL_URL:http://localhost:8082}"
            ) String baseUrl
    ) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public List<TrainingAssistantSummary> getMyTrainings(
            String jwtToken
    ) {
        requireJwt(jwtToken);

        List<TrainingAssistantSummary> response =
                restClient
                        .get()
                        .uri("/trainings/learner/me")
                        .header("Authorization", "Bearer " + jwtToken)
                        .retrieve()
                        .body(
                            new ParameterizedTypeReference<
                                List<TrainingAssistantSummary>
                            >() {}
                        );

        return response == null ? List.of() : List.copyOf(response);
    }

    public List<TrainingAssistantSummary> getTrainerTrainings(
            Long trainerId,
            String jwtToken
    ) {
        requireJwt(jwtToken);

        if (trainerId == null || trainerId <= 0) {
            throw new IllegalArgumentException(
                    "Identifiant formateur invalide."
            );
        }

        List<TrainingAssistantSummary> response =
                restClient
                        .get()
                        .uri("/trainings/trainer/{trainerId}", trainerId)
                        .header("Authorization", "Bearer " + jwtToken)
                        .retrieve()
                        .body(
                            new ParameterizedTypeReference<
                                List<TrainingAssistantSummary>
                            >() {}
                        );

        return response == null ? List.of() : List.copyOf(response);
    }

    public List<TrainingAssistantSummary> getAdminTrainings(
            String jwtToken
    ) {
        requireJwt(jwtToken);

        List<TrainingAssistantSummary> response =
                restClient
                        .get()
                        .uri("/trainings/admin")
                        .header("Authorization", "Bearer " + jwtToken)
                        .retrieve()
                        .body(
                            new ParameterizedTypeReference<
                                List<TrainingAssistantSummary>
                            >() {}
                        );

        return response == null ? List.of() : List.copyOf(response);
    }

    public TrainingAssistantContent getMyTrainingContent(
            Long trainingId,
            String jwtToken
    ) {
        requireJwt(jwtToken);

        if (trainingId == null || trainingId <= 0) {
            throw new IllegalArgumentException(
                    "Identifiant de formation invalide."
            );
        }

        TrainingAssistantContent response =
                restClient
                        .get()
                        .uri(
                            "/trainings/learner/me/{trainingId}/full",
                            trainingId
                        )
                        .header("Authorization", "Bearer " + jwtToken)
                        .retrieve()
                        .body(TrainingAssistantContent.class);

        if (response == null) {
            throw new IllegalStateException(
                    "Contexte de formation indisponible."
            );
        }

        return response;
    }

    public TrainingAssistantContent getStaffTrainingContent(
            Long trainingId,
            String jwtToken
    ) {
        requireJwt(jwtToken);

        if (trainingId == null || trainingId <= 0) {
            throw new IllegalArgumentException(
                    "Identifiant de formation invalide."
            );
        }

        TrainingAssistantContent response =
                restClient
                        .get()
                        .uri("/trainings/{trainingId}/full", trainingId)
                        .header("Authorization", "Bearer " + jwtToken)
                        .retrieve()
                        .body(TrainingAssistantContent.class);

        if (response == null) {
            throw new IllegalStateException(
                    "Contexte de formation indisponible."
            );
        }

        return response;
    }

    private void requireJwt(String jwtToken) {
        if (jwtToken == null || jwtToken.isBlank()) {
            throw new IllegalArgumentException(
                    "Jeton utilisateur interne absent."
            );
        }
    }
}
